const ORDINARY_KINDS = Object.freeze([
  "congenial", "gleeful", "lumbering", "sinister", "timid",
  "evil", "hypnotic", "ludicrous", "spiffy", "truculent",
]);

const FREE_AGENT_COLORS = new Set(["blue", "green", "orange", "violet", "yellow"]);
const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const AUTOMATIC_EXTRA_RUN_BUNNY_NUMBERS = new Set([441, 442, 443, 444, 445, 615, 616, 720]);

const GROUPED_BUNNY_PROFILE_BY_NUMBER = new Map([
  ...groupedBunnies("specialty", 1, [221, 222, 276, 740, 991, 992, 1101]),
  ...groupedBunnies("specialty", 2, [223, 224, 277, 741, 993, 994, 1102]),
  ...groupedBunnies("specialty", 3, [225, 278, 279, 742, 995, 1103, 1104]),
  ...groupedBunnies("celebrity", 1, [606, 607, 608, 721, 1046]),
  ...groupedBunnies("celebrity", 2, [609, 610, 611, 1076]),
  ...groupedBunnies("celebrity", 3, [612, 613, 614, 1077]),
  ...groupedBunnies("celebrity", 5, [1047]),
  ...groupedBunnies("british", 1, [1266, 1267, 1268]),
  ...groupedBunnies("british", 2, [1269, 1270, 1271]),
  ...groupedBunnies("british", 3, [1272, 1273, 1274]),
]);

export function getKillerBunniesExtraRunStatus(player) {
  const bunnies = player?.bunnies || [];
  const zodiacStatus = getZodiacExtraRunStatus(player?.zodiacCards || []);
  if (zodiacStatus) return zodiacStatus;
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

function getZodiacExtraRunStatus(cards) {
  const indexes = new Set(cards.map((card) => Number.isInteger(card.zodiacIndex)
    ? card.zodiacIndex
    : ZODIAC_SIGNS.indexOf(card.sign || card.name)).filter((index) => index >= 0));
  for (let start = 0; start < ZODIAC_SIGNS.length; start += 1) {
    if ([0, 1, 2].every((offset) => indexes.has((start + offset) % ZODIAC_SIGNS.length))) {
      return enabledStatus("Three consecutive Zodiac signs allow two RUN cards each turn.", "zodiac:consecutive");
    }
  }
  const elementCounts = new Map();
  for (const card of cards) {
    const element = String(card.element || "").toLowerCase();
    if (element) addCount(elementCounts, element, 1);
  }
  const element = firstAtLeast(elementCounts, 3);
  return element
    ? enabledStatus(`Three ${capitalize(element)} Zodiac signs allow two RUN cards each turn.`, `zodiac:${element}`)
    : null;
}

function bunnyTripletProfile(bunny) {
  const name = String(bunny?.name || "");
  const normalized = name.toLowerCase();
  const cardNumber = Number(bunny?.number || bunny?.catalogNumber);
  const groupedProfile = GROUPED_BUNNY_PROFILE_BY_NUMBER.get(cardNumber);
  const wild = /\bfree agent\b/i.test(name);
  const robot = /\brobot bunny\b/i.test(name);
  const family = bunny?.tripletFamily || groupedProfile?.family || (/\bspecialty bunny\b/i.test(name) ? "specialty"
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
    : groupedProfile?.units || (/\bquintet\b/i.test(name) ? 5
      : /\b(?:triple|triplet)\b/i.test(name) ? 3
        : /\b(?:double|pair)\b/i.test(name) || normalized === "enginerds" ? 2 : 1);
  return { colors, family, kind, robot, units, wild };
}

function groupedBunnies(family, units, numbers) {
  return numbers.map((number) => [number, { family, units }]);
}

function isAutomaticExtraRunBunny(bunny) {
  const name = String(bunny?.name || "");
  const cardNumber = Number(bunny?.number || bunny?.catalogNumber);
  return AUTOMATIC_EXTRA_RUN_BUNNY_NUMBERS.has(cardNumber)
    || /^(?:Extra )?Super\b.*\bBunny\b/i.test(name)
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
