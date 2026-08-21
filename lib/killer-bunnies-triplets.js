const ORDINARY_KINDS = Object.freeze([
  "congenial", "gleeful", "lumbering", "sinister", "timid",
  "evil", "hypnotic", "ludicrous", "spiffy", "truculent",
]);

const FREE_AGENT_COLORS = new Set(["blue", "green", "orange", "violet", "yellow"]);

const SPECIALTY_BUNNY_UNITS_BY_NUMBER = new Map([
  ...[221, 222, 276, 740, 991, 992, 1101].map((number) => [number, 1]),
  ...[223, 224, 277, 741, 993, 994, 1102].map((number) => [number, 2]),
  ...[225, 278, 279, 742, 995, 1103, 1104].map((number) => [number, 3]),
]);

export function getKillerBunniesExtraRunStatus(player) {
  const bunnies = player?.bunnies || [];
  if (!bunnies.length) return disabledStatus();

  const automatic = bunnies.find((bunny) => isAutomaticExtraRunBunny(bunny));
  if (automatic) {
    return enabledStatus(`${automatic.name} allows two RUN cards each turn.`, "specified-bunny");
  }

  const colorCounts = new Map();
  const nonRobotColorCounts = new Map();
  const kindCounts = new Map();
  const familyCounts = new Map();
  let wildUnits = 0;
  let robotUnits = 0;

  for (const bunny of bunnies) {
    const profile = bunnyTripletProfile(bunny);
    if (profile.wild) {
      wildUnits += profile.units;
      continue;
    }
    if (profile.family) addCount(familyCounts, profile.family, profile.units);
    if (profile.kind) addCount(kindCounts, profile.kind, profile.units);
    for (const color of profile.colors) {
      addCount(colorCounts, color, profile.units);
      if (!profile.robot) addCount(nonRobotColorCounts, color, profile.units);
    }
    if (profile.robot) robotUnits += profile.units;
  }

  const familyMatch = firstAtLeast(familyCounts, 3);
  if (familyMatch) return enabledStatus(`${capitalize(familyMatch)} bunnies form a Bunny Triplet.`, `family:${familyMatch}`);

  const colorMatch = firstAtLeastWithWild(colorCounts, wildUnits, 3, (color) => FREE_AGENT_COLORS.has(color));
  if (colorMatch) return enabledStatus(`Three ${capitalize(colorMatch)} bunnies form a Bunny Triplet.`, `color:${colorMatch}`);

  const kindMatch = firstAtLeastWithWild(kindCounts, wildUnits, 3);
  if (kindMatch) return enabledStatus(`Three ${capitalize(kindMatch)} bunnies form a Bunny Triplet.`, `kind:${kindMatch}`);

  if (wildUnits >= 3) return enabledStatus("Free Agent bunnies can form a Bunny Triplet.", "free-agents");

  for (const pawn of player?.pawns || []) {
    const pawnColor = String(pawn.declaredColor || pawn.color || "").toLowerCase();
    const eligibleWilds = FREE_AGENT_COLORS.has(pawnColor) ? wildUnits : 0;
    if ((colorCounts.get(pawnColor) || 0) + eligibleWilds >= 2) {
      return enabledStatus(`Two ${capitalize(pawnColor)} bunnies and the ${capitalize(pawnColor)} Pawn form a Bunny Triplet.`, `pawn:${pawnColor}`);
    }
  }

  if (robotUnits >= 3) return enabledStatus("Three Robot Bunnies form a Bunny Triplet.", "robots");
  if (robotUnits > 0) {
    const robotColorMatch = firstAtLeastWithWild(nonRobotColorCounts, wildUnits, 2, (color) => FREE_AGENT_COLORS.has(color));
    if (robotColorMatch) {
      return enabledStatus(`A Robot Bunny and two ${capitalize(robotColorMatch)} bunnies form a Bunny Triplet.`, `robot:${robotColorMatch}`);
    }
  }

  return disabledStatus();
}

function bunnyTripletProfile(bunny) {
  const name = String(bunny?.name || "");
  const normalized = name.toLowerCase();
  const cardNumber = Number(bunny?.number || bunny?.catalogNumber);
  const specialtyUnits = SPECIALTY_BUNNY_UNITS_BY_NUMBER.get(cardNumber) || 0;
  const wild = /\bfree agent\b/i.test(name);
  const robot = /\brobot bunny\b/i.test(name);
  const family = bunny?.tripletFamily || (specialtyUnits || /\bspecialty bunny\b/i.test(name) ? "specialty"
    : /\bcelebrity bunny\b/i.test(name) ? "celebrity"
      : /\bbritish bunny\b/i.test(name) ? "british" : null);
  const kind = ORDINARY_KINDS.find((entry) => new RegExp(`\\b${entry}\\b`, "i").test(name)) || null;
  const printedColors = [...name.matchAll(/\b(blue|green|orange|yellow|violet|red|pink|white|black|brown)\b/gi)]
    .map((match) => match[1].toLowerCase());
  const storedColors = Array.isArray(bunny?.colors)
    ? bunny.colors.map((color) => String(color).toLowerCase())
    : [String(bunny?.color || "").toLowerCase()].filter(Boolean);
  const inferredColors = normalized === "enginerds" ? ["green"]
    : /holographic bunny/i.test(name) ? ["red"]
      : [];
  const colors = [...new Set([...printedColors, ...storedColors, ...inferredColors])];
  const units = Number.isFinite(bunny?.tripletUnits) ? Math.max(1, bunny.tripletUnits)
    : specialtyUnits || (/\bquintet\b/i.test(name) ? 5
      : /\b(?:triple|triplet)\b/i.test(name) ? 3
        : /\b(?:double|pair)\b/i.test(name) || normalized === "enginerds" ? 2 : 1);
  return { colors, family, kind, robot, units, wild };
}

function isAutomaticExtraRunBunny(bunny) {
  const name = String(bunny?.name || "");
  return /^(?:Extra )?Super\b.*\bBunny\b/i.test(name)
    || /\bSemi-Super Specialty Bunny\b/i.test(name);
}

function addCount(counts, key, amount) {
  counts.set(key, (counts.get(key) || 0) + amount);
}

function firstAtLeast(counts, minimum) {
  return [...counts.entries()].find(([, count]) => count >= minimum)?.[0] || null;
}

function firstAtLeastWithWild(counts, wildUnits, minimum, acceptsWild = () => true) {
  return [...counts.entries()].find(([key, count]) => count >= minimum || (acceptsWild(key) && count + wildUnits >= minimum))?.[0] || null;
}

function enabledStatus(reason, qualification) {
  return { enabled: true, maxRunPlays: 2, qualification, reason };
}

function disabledStatus() {
  return {
    enabled: false,
    maxRunPlays: 1,
    qualification: null,
    reason: "Form a Bunny Triplet or play a bunny with a two-RUN ability to unlock a second RUN card.",
  };
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
