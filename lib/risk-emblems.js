/*
 * A shape per player, so ownership is not carried by colour alone.
 *
 * The old six-colour set had four pairs that collapse under common colour
 * blindness — red and green separated by an RGB distance of 26 under
 * deuteranopia, blue and purple by 16, where anything under about 40 reads as
 * the same colour. With the chip's fill as the only ownership signal, a player
 * with red or green could not tell their own armies from an opponent's.
 *
 * The colours in PLAYER_STYLES were rebuilt on a lightness ladder, which fixes
 * the worst of it; these emblems are the channel that also survives greyscale,
 * a thumbnail, and the monochromacy no palette can help with.
 *
 * Each path is drawn in a 12-unit box centred on the origin.
 */

export const EMBLEM_PATHS = {
  star: "M0-5.4 1.6-1.7 5.4-1.7 2.3.6 3.4 4.4 0 2.2-3.4 4.4-2.3.6-5.4-1.7-1.6-1.7Z",
  crown: "M-5-3 -3 1 0-3 3 1 5-3 4 4-4 4Z",
  anchor: "M0-5.2a1.7 1.7 0 010 3.4 1.7 1.7 0 010-3.4ZM-.9-1.6h1.8V4.6H-.9ZM-4.4 1.4C-4.4 4 -2.4 5 0 5s4.4-1 4.4-3.6h-1.7C2.7 3.1 1.5 3.5 0 3.5s-2.7-.4-2.7-2.1Z",
  shield: "M0-5.2 4.8-3.4V.6C4.8 3.1 2.6 4.6 0 5.4-2.6 4.6-4.8 3.1-4.8.6V-3.4Z",
  diamond: "M0-5.4 4.6 0 0 5.4-4.6 0Z",
  leaf: "M0-5.4C3.4-3.2 4.8-.4 3.4 2.4 2.4 4.4.6 5.4 0 5.4S-2.4 4.4-3.4 2.4C-4.8-.4-3.4-3.2 0-5.4Z",
};

const CHANNEL = "0123456789abcdef";

function luminance(hex) {
  const clean = hex.replace("#", "").toLowerCase();
  const part = (at) => parseInt(clean.slice(at, at + 2), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return (0.2126 * lin(part(0))) + (0.7152 * lin(part(2))) + (0.0722 * lin(part(4)));
}

/**
 * Ink that stays legible on a given player colour.
 *
 * Games saved before the palette changed still carry their original hex, so this
 * has to work for any colour rather than only the six in PLAYER_STYLES — which
 * is also why the army count is drawn on a plate rather than straight onto the
 * fill. Returns whichever of the two inks has more contrast, which is at worst
 * 4.5:1 for any colour whose luminance is not right in the middle.
 */
export function inkFor(color) {
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) return "#0f1618";
  return luminance(color) > 0.19 ? "#0f1618" : "#fffdf5";
}

/*
 * The ground the army count is drawn on.
 *
 * A colour whose luminance sits in the middle takes no legible ink at all —
 * neither black nor white reaches 4.5:1 against it. Two of the retired palette's
 * six were like that, and rooms store the colour hex, so they still turn up.
 *
 * So the count does not sit on the owner colour: it sits on a near-opaque plate
 * whose polarity matches the ink. That makes the contrast a property of the
 * plate rather than of whatever colour the player picked, and it holds for any
 * colour a saved game can produce.
 */
export function plateFor(color) {
  return inkFor(color) === "#0f1618" ? "rgba(255,253,245,.86)" : "rgba(13,20,22,.86)";
}

/** The plate's effective colour once composited, for contrast checking. */
export function plateOver(color) {
  const ink = inkFor(color);
  const over = ink === "#0f1618" ? [255, 253, 245] : [13, 20, 22];
  const clean = /^#[0-9a-f]{6}$/i.test(String(color)) ? String(color) : "#808080";
  const under = [1, 3, 5].map((at) => parseInt(clean.slice(at, at + 2), 16));
  const mixed = over.map((v, i) => Math.round((v * 0.86) + (under[i] * 0.14)));
  return "#" + mixed.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** A stable emblem for any colour, so old saved games get one too. */
export function emblemFor(color, styles) {
  const known = styles.find((style) => style.color?.toLowerCase() === String(color).toLowerCase());
  if (known?.emblem) return known.emblem;
  const names = Object.keys(EMBLEM_PATHS);
  const seed = String(color).toLowerCase().split("").reduce((sum, ch) => sum + CHANNEL.indexOf(ch) + 1, 0);
  return names[seed % names.length];
}
