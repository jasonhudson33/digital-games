const CLOVER_VALUES = Object.freeze({
  single: 1,
  double: 2,
  triple: 3,
  quadruple: 4,
  quindruple: 5,
  hexdruple: 6,
  heptdruple: 7,
  octdruple: 8,
  nondruple: 9,
  decadruple: 10,
  hendecadruple: 11,
  dodecadruple: 12,
});

export function getKillerBunniesCloverValue(card) {
  if (Number.isFinite(card?.cloverValue)) return Math.max(0, card.cloverValue);
  const name = String(card?.name || "");
  if (!/lucky clover/i.test(name)) return 0;
  const label = Object.keys(CLOVER_VALUES).find((entry) => new RegExp(`\\b${entry}\\b`, "i").test(name));
  return label ? CLOVER_VALUES[label] : 0;
}

export function getKillerBunniesCloverReduction(bunny) {
  const modifierReduction = (bunny?.modifiers || []).reduce(
    (total, modifier) => total + getKillerBunniesCloverValue(modifier),
    0,
  );
  return modifierReduction + builtInCloverValue(bunny);
}

export function getKillerBunniesCloverCards(bunny) {
  return (bunny?.modifiers || []).filter((modifier) => getKillerBunniesCloverValue(modifier) > 0);
}

function builtInCloverValue(bunny) {
  const name = String(bunny?.name || "");
  if (/^Half Red Lumbering Bunny$/i.test(name)) return 1;
  if (/^Red Lumbering Bunny$/i.test(name) || /^Extra Super Bunny\s*[–-]\s*Red$/i.test(name)) return 3;
  if (/^Pink Lumbering Bunny$/i.test(name) || /^Extra Super Bunny\s*[–-]\s*Pink$/i.test(name)) return 5;
  return 0;
}
