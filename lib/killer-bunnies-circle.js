export function ensureKillerBunniesCircle(game) {
  const liveIds = new Set(game.players.flatMap((player) => player.bunnies.map((bunny) => bunny.id)));
  const ordered = (game.bunnyCircle || []).filter((id, index, values) => liveIds.has(id) && values.indexOf(id) === index);
  for (const player of game.players) {
    for (const bunny of player.bunnies) {
      if (!ordered.includes(bunny.id)) ordered.push(bunny.id);
    }
  }
  game.bunnyCircle = ordered;
  return ordered;
}

export function addKillerBunnyToCircle(game, bunnyId, beforeBunnyId = null) {
  const circle = ensureKillerBunniesCircle(game).filter((id) => id !== bunnyId);
  const beforeIndex = beforeBunnyId ? circle.indexOf(beforeBunnyId) : -1;
  if (beforeIndex >= 0) circle.splice(beforeIndex, 0, bunnyId);
  else circle.push(bunnyId);
  game.bunnyCircle = circle;
  return circle;
}

export function removeKillerBunnyFromCircle(game, bunnyId) {
  game.bunnyCircle = ensureKillerBunniesCircle(game).filter((id) => id !== bunnyId);
}

export function getKillerBunniesCircleEntries(game) {
  const byId = new Map();
  game.players.forEach((player, playerIndex) => {
    player.bunnies.forEach((bunny, bunnyIndex) => byId.set(bunny.id, { player, playerIndex, bunny, bunnyIndex }));
  });
  return ensureKillerBunniesCircle(game).map((id, circleIndex) => ({ ...byId.get(id), circleIndex })).filter((entry) => entry.bunny);
}

export function getKillerBunniesCircleRange(game, bunnyId, maximumDistance = Infinity) {
  const entries = getKillerBunniesCircleEntries(game);
  const centerIndex = entries.findIndex((entry) => entry.bunny.id === bunnyId);
  if (centerIndex < 0) return [];
  return entries.map((entry, index) => {
    const clockwise = (index - centerIndex + entries.length) % entries.length;
    const counterClockwise = (centerIndex - index + entries.length) % entries.length;
    return { ...entry, distance: Math.min(clockwise, counterClockwise) };
  }).filter((entry) => entry.distance <= maximumDistance);
}

export function getNextKillerBunnyInCircle(game, bunnyId, direction = 1, predicate = () => true) {
  const entries = getKillerBunniesCircleEntries(game);
  const startIndex = entries.findIndex((entry) => entry.bunny.id === bunnyId);
  if (startIndex < 0 || entries.length < 2) return null;
  for (let offset = 1; offset < entries.length; offset += 1) {
    const index = (startIndex + direction * offset + entries.length * 2) % entries.length;
    if (predicate(entries[index])) return entries[index];
  }
  return null;
}

export function findKillerBunnyInCircle(game, bunnyId) {
  return getKillerBunniesCircleEntries(game).find((entry) => entry.bunny.id === bunnyId) || null;
}
