import { Coins, Droplets, Grape, House, Landmark, Leaf, ScrollText, Sparkles, Sun, Sunset, ThermometerSnowflake, Users, Warehouse, Wine } from "lucide-react";

import { BUILDINGS } from "../../lib/viticulture.js";

export const CARD_ART = {
  vine: "/viticulture/vine-card-art.webp",
  order: "/viticulture/order-card-art.webp",
  summer: "/viticulture/summer-card-art.webp",
  winter: "/viticulture/winter-card-art.webp",
};

export const SEASONS = {
  spring: { label: "Spring", icon: Sunset, note: "Choose when your day begins" },
  summer: { label: "Summer", icon: Sun, note: "Plant, build, and host visitors" },
  autumn: { label: "Autumn", icon: Leaf, note: "Each estate welcomes a visitor" },
  winter: { label: "Winter", icon: ThermometerSnowflake, note: "Harvest, make wine, and fill orders" },
};

/** The four kinds of card a player holds, in the order the hand shows them. */
export const KINDS = [
  { id: "vines", art: "vine", label: "Vine", season: "summer", actionId: "plant" },
  { id: "orders", art: "order", label: "Order", season: "winter", actionId: "fill-order" },
  { id: "summer", art: "summer", label: "Summer visitor", season: "summer", actionId: "play-summer" },
  { id: "winter", art: "winter", label: "Winter visitor", season: "winter", actionId: "play-winter" },
];

/** Actions that need a choice before the worker goes down; the rest are one tap. */
export const NEEDS_CHOICE = new Set(["build", "plant", "sell-grape", "play-summer", "harvest", "make-wine", "fill-order", "play-winter"]);

export const typeLabel = (type) => type[0].toUpperCase() + type.slice(1);
export const gradeText = (card) => [card.red ? `${card.red} red` : "", card.white ? `${card.white} white` : ""].filter(Boolean).join(" · ");
export const orderNeeds = (card) => card.requirements.map((item) => `${item.type} ${item.min}+`).join(" · ");

/** One line that says what a card is for, whatever its kind. */
export function cardSummary(card, kindId) {
  if (kindId === "vines") return `${gradeText(card)}${card.requirement ? ` · needs ${BUILDINGS[card.requirement].name}` : ""}`;
  if (kindId === "orders") return `${orderNeeds(card)} · ${card.vp} VP / +${card.income}`;
  return card.text;
}

/** Every card a player holds, flattened, each tagged with its kind. */
export function handCards(player) {
  return KINDS.flatMap((kind) => (player.cards?.[kind.id] ?? []).map((card) => ({ kind, card })));
}

export function actionIcon(id) {
  if (["draw-vine", "plant", "harvest"].includes(id)) return Leaf;
  if (id === "tour") return Coins;
  if (id === "build" || id === "train-worker") return Landmark;
  if (id === "sell-grape") return Grape;
  if (id.includes("visitor")) return Users;
  if (id === "draw-order") return ScrollText;
  if (id === "make-wine" || id === "fill-order") return Wine;
  return Sparkles;
}

export function GamePiece({ type, color = "#805246", label }) {
  return <span className={`viti-piece piece-${type}`} style={{ "--piece": color }} role={label ? "img" : undefined} aria-label={label}><i /><b>{type === "grande" ? "G" : ""}</b></span>;
}

export function StructurePiece({ buildingId }) {
  const Icon = buildingId === "irrigation" ? Droplets : buildingId === "tastingRoom" ? Wine : buildingId.includes("cellar") ? Warehouse : buildingId === "cottage" ? House : buildingId === "windmill" ? Sparkles : buildingId === "trellis" ? Landmark : Grape;
  return <span className={`viti-structure-piece structure-${buildingId}`} title={BUILDINGS[buildingId].name}><Icon /></span>;
}

export const totalWorkers = (player) => player.regularWorkers + 1;
export const readyWorkers = (player) => player.regularAvailable + Number(player.grandeAvailable);
export const fieldTotal = (field) => field.vines.reduce((sum, vine) => sum + vine.red + vine.white, 0);
