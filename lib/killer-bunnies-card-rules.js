const RULE_SOURCE_SLUGS = Object.freeze({
  blue: "blue-bunny-bits",
  yellow: "blue-bunny-bits",
  red: "red-bunny-bits",
  violet: "violet-bunny-bits",
  orange: "orange-bunny-bits",
  green: "green-bunny-bits",
  "twilight-white": "twilight-white-bunny-bits",
  "stainless-steel": "stainless-steel-bunny-bits",
  "perfectly-pink": "perfectly-pink-bunny-bits",
  "wacky-khaki": "wacky-khaki-bunny-bits",
  "ominous-onyx": "ominous-onyx-bunny-bits",
  chocolate: "chocolate-bunny-bits",
  "conquest-blue": "conquest-blue-starter-bunny-bits",
  "conquest-yellow": "conquest-blue-starter-bunny-bits",
  "conquest-red": "conquest-red-bunny-bits",
  "conquest-violet": "conquest-violet-bunny-bits",
  fantastic: "fantastic-bunny-bits",
  "caramel-swirl": "caramel-swirl-bunny-bits",
  "creature-feature": "creature-feature-bunny-bits",
  "pumpkin-spice": "pumpkin-spice-bunny-bits",
  "la-di-da-london": "la-di-da-london-bunny-bits",
  "cake-batter": "cake-batter-bunny-bits",
  "radioactive-robots": "radioactive-robots-bunny-bits",
  "almond-crisp": "almond-crisp-bunny-bits",
});

const BLUE_YELLOW_RULES = new Map([
  [49, rule("Abduct any bunny from the Bunny Circle. Return the previously abducted bunny when another Area 51 card abducts a new target.", true)],
  [50, rule("Abduct any bunny from the Bunny Circle. Return the previously abducted bunny when another Area 51 card abducts a new target.", true)],
  [51, rule("Choose a player. Their next Weapon must target one of their own bunnies; the effect remains until they launch one.", false)],
  [52, rule("Choose a player to lose their next turn.", true)],
  [53, rule("Choose any one bunny carrying Clover cards and remove all of its Clovers. Roll the Green d12: an odd result lets you place each removed Clover under any bunny or discard it; an even result discards every removed Clover.", false, "automatic")],
  [54, rule("Launch a roaming attack that moves clockwise once per round. Each target must roll higher than 9 on the Violet d12 to survive.", true)],
  [55, rule("Choose any bunny or discard this card. Every player rolls a d12 and the highest roller takes the bunny. If the card player is below the high roll, they may replace their result with one optional reroll. Tied high rollers keep rerolling until the tie breaks.", true)],
  [56, rule("Choose a player and discard all of their saved Water Units and Water Vouchers.", false)],
  [57, rule("Place this wild bunny in your Bunny Circle. Its ordinary color and kind may change whenever needed, except to Red, Pink, Specialty, or Celebrity.", false, "automatic")],
  [58, rule("Attach the Halo to a bunny. It protects that bunny from weapons, hunger, Terrible Misfortune, and abduction, but not exchanges or gambling.", false)],
  [59, rule("Open Kaballa’s Market at the printed high-price setting.", false, "automatic")],
  [60, rule("Close Kaballa’s Market. No market purchases are allowed until another market card reopens it.", false, "automatic")],
  [61, cloverRule(1)], [62, cloverRule(2)], [63, cloverRule(3)],
  [64, rule("Choose a player and discard all of their saved Cabbage Units and Cabbage Vouchers.", false)],
  [65, rule("Declare any combined stake of Cabbage Units, Water Units, Carrots, Dolla, bunnies, or supported expansion items. You must enter, every player who can cover the complete stake must enter, and each participant chooses the specific Carrots or bunnies they risk. Everyone rolls any d12; you may replace your first roll once, tied leaders keep rolling, and the highest roller wins the entire pot.", false, "automatic")],
  [66, casinoRule()], [67, casinoRule()],
  [68, rule("Take two Cabbage Cards from Kaballa’s Market.", false, "automatic", ["Kaballa’s Market must be open."])],
  [69, rule("Take two Water Cards from Kaballa’s Market.", false, "automatic", ["Kaballa’s Market must be open."])],
  [70, rule("Choose a player and discard every Weapon in their five-card hand; programmed RUN cards are unaffected.", false)],
  [71, rule("For this turn, buy items from Kaballa’s Market for half price, rounding fractional Dolla up.", false, "automatic", ["Kaballa’s Market must be open."])],
  [72, pruneRule()], [73, pruneRule()],
  [74, bakeryRule()], [75, bakeryRule()],
  [76, fountainRule()], [77, fountainRule()],
  [78, suppliesRule()], [79, suppliesRule()],
  [80, rule("Cancel one eligible weapon, roaming attack, defection, barrier group, abduction, or other listed threat before it resolves.", false)],
  [81, rule("Use one of your Weapon cards a second time before it is discarded; the second attack may choose a different target.", false)],
  [82, rule("Clear all pending Feed the Bunny cards and the listed persistent sickness effects, or exchange this card for The White Stuff once per game.", false)],
  [127, rule("Assign a bunny a 10-Cabbage and 10-Water feeding obligation due at the end of its owner’s next turn.", true, "automatic")],
  [131, rule("Attack a target bunny at level 10 and each adjacent bunny at level 9; affected owners roll the Black d12.", true)],
  [132, rule("Attack the target at level 11, adjacent bunnies at level 10, and continue outward with decreasing levels around the Bunny Circle.", true)],
  [133, rule("Destroy the target bunny immediately and attack every bunny within three spaces.", true)],
  [134, rule("Abduct any bunny from the Bunny Circle. Return the previously abducted bunny when another abduction takes a new target.", true, "automatic")],
  [135, rule("Auction any bunny in the Bunny Circle. You bid first, then bidding continues in play order. The highest bidder pays the discard bank and takes the bunny with its attached cards.", true, "automatic")],
  [136, rule("Roll the Orange d12 or Clear d20 and steal the Carrot with the matching number from its owner or the market.", false, "automatic")],
  [137, rule("Take Dolla from the discard bank equal to the Dolla you currently have saved.", false, "automatic")],
  [138, rule("Place this wild bunny in your Bunny Circle. Its ordinary color and kind may change whenever needed, except to Red, Pink, Specialty, or Celebrity.", false, "automatic")],
  [139, rule("Open Kaballa’s Market at the printed low-price setting.", false, "automatic")],
  [140, rule("Close Kaballa’s Market. No market purchases are allowed until another market card reopens it.", false, "automatic")],
  [141, cloverRule(4)],
  [142, rule("If you have no saved units of a supply, take half of that supply from the opponent holding the most; resolve Cabbage and Water independently.", false, "automatic", ["You must have zero units of each supply you want to take."])],
  [143, rule("Every player with an eligible bunny rolls a d12. The lowest roller discards the bunny they entered; the card owner receives one optional reroll.", true, "automatic")],
  [144, rule("Choose a player. They must pay 2 Dolla per Carrot they keep and return every unpaid Carrot to the market.", false, "automatic")],
  [145, rule("Cancel Roaches or counter Maggots before your Cabbage is lost.", false, "automatic", ["This card must already be saved.", "The threat must affect the card owner."])],
  [146, rule("Take one Cabbage Card and one Water Card from Kaballa’s Market.", false, "automatic", ["Kaballa’s Market must be open."])],
  [147, rule("While saved, double the level and range of every Weapon Level 1-9 you launch; discard this card when you have no living bunny.", true, "automatic", ["You need a living bunny to save or retain this card."])],
  [148, rule("Cancel Flame Thrower or counter Drought before your Water is lost.", false, "automatic", ["This card must already be saved.", "The threat must affect the card owner."])],
  [149, rule("Exchange a Weapon from your hand with a Weapon in an opponent’s hand or Rooney’s used-weapon inventory.", false, "automatic", ["You must have a Weapon in your five-card hand."])],
  [150, rule("Rotate every player’s TOP RUN card one seat counter-clockwise.", false)],
  [151, rule("Attach the suit to a bunny to protect it from the listed biological and chemical attacks.", false)],
  [152, rule("Redirect a Weapon that has just been launched to any other legal bunny target.", false, "automatic")],
]);

const RED_RULES = new Map([
  [166, rule("Place this Red bunny in your Bunny Circle. It may satisfy up to 3 Cabbage and 3 Water of its own feeding each turn without saved supplies.", false, "automatic")],
  [167, rule("Place this Red bunny in your Bunny Circle. While it lives, you receive up to 3 Dolla of spending power at open stores each turn.", false, "automatic")],
  [168, rule("Place this Red bunny in your Bunny Circle. It has a built-in Clover Triple that lowers incoming Weapon Levels by 3.", false, "manual")],
  [169, rule("Place this Red bunny in your Bunny Circle. A directly targeted Weapon that fails against it bounces to a bunny owned by the attacker.", false, "automatic")],
  [170, rule("Place this Red bunny in your Bunny Circle. Its owner may reroll one die-based action during play.", false, "automatic")],
  [175, rule("Choose an opponent. Every bunny they currently control must pay the printed feeding cost by the end of that opponent’s next turn.", true, "automatic")],
  [176, rule("Every opponent with a bunny chooses one bunny to pay the printed feeding cost by the end of their next turn. The player of this card does not feed a bunny.", true, "automatic")],
  [181, rule("Launch a clockwise roaming missile. Each visited bunny’s owner rolls the Red d12; a prime result detonates a level-9 attack on the target and level-8 attacks on adjacent bunnies.", true, "automatic")],
  [182, rule("Attack the target at level 11, bunnies two spaces away at level 9, and bunnies four spaces away at level 7; wraparound may hit a bunny twice.", true)],
  [183, rule("Steal The Minilith, or make its holder roll seven colored d12s and surrender a Carrot or bunny for each even result; seven evens punish every player.", false, "automatic")],
  [184, rule("Choose a player and discard all of their saved Dolla and Dolla Vouchers.", false, "automatic")],
  [185, barrierRule()], [186, barrierRule()],
  [187, rule("Choose an opponent with at least two Carrots and exchange two Carrots you select from them for one Carrot you select from yourself.", false, "automatic", ["You need a Carrot.", "The chosen opponent needs at least two Carrots."])],
  [188, rule("Target a Congenial Bunny and immediately kill the two bunnies adjacent to it; the Congenial target survives.", true, "automatic", ["A Congenial Bunny must be available to target."])],
  [189, rule("Hide all Carrots, roll for a Carrot number, and name its owner to steal it; a wrong guess returns one of your Carrots to the market.", false, "automatic", ["You must own at least one Carrot."])],
  [190, rule("Eliminate one regular Barrier from the Bunny Circle.", true, "automatic", ["A removable Barrier must be in play."])],
  [191, rule("Place this Holographic Red bunny in your Bunny Circle. It needs no food, cannot satisfy the living-bunny win condition, and is vulnerable only to its listed attacks.", false, "automatic")],
  [192, cloverRule(5)],
  [193, rule("Start a rotating d12 contest in which failed rolls donate a bunny or Carrot to a kitty; the first 12 wins the kitty, with a final chance for the initiator.", true, "automatic")],
  [194, rule("Choose a player to roll the colored d12s. Kill every bunny matching the lowest color rolled; a Black low roll threatens every vulnerable bunny.", true, "automatic")],
  [195, rule("Pay an opponent 5 Dolla to take one eligible Red bunny, Red Pawn, or Fire Zodiac card from them.", false, "automatic", ["You need 5 Dolla.", "An opponent must own an eligible Red item."])],
  [196, rule("Close Rooney’s Weapons Emporium until another store card reopens it.", false, "automatic")],
  [197, rule("Place a bounty and a Dolla donation on a bunny. Players may add to it; whoever kills that bunny collects the pooled Dolla.", true, "automatic")],
  [198, rule("Take one Cabbage Card and one Water Card from Kaballa’s Market.", false, "automatic", ["Kaballa’s Market must be open."])],
  [199, rule("Take two Defense Cards from Rooney’s Weapons Emporium.", false, "automatic", ["Rooney’s Weapons Emporium must be open."])],
  [200, rule("Attack the aliens holding abducted bunnies and roll the Yellow d12; the printed result may fail, destroy the aliens and captives, or also crash wreckage onto the owner’s Bunny Circle.", false, "automatic", ["At least one bunny must currently be abducted."])],
  [201, rule("For this turn, buy items from Rooney’s Weapons Emporium for half price, rounding fractional Dolla up.", false, "automatic", ["Rooney’s Weapons Emporium must be open."])],
  [202, rule("Make every opponent reveal bunnies in their five-card hand, then optionally trade one card from your hand for one revealed bunny.", false, "automatic")],
  [203, rule("Protect a bunny from a Weapon by moving it out of play for three rounds; it returns at the start of its owner’s third turn.", true, "automatic", ["A bunny must currently be threatened by a Weapon."])],
  [204, rule("Cancel any Terrible, Very Terrible, or Extremely Terrible Misfortune as it is drawn.", false, "automatic", ["A Terrible Misfortune must be resolving."])],
  [207, rule("A first-time player takes one saved Special or Very Special from each adjacent player; otherwise pass this card to the next first-time player or use it yourself if none exist.", false, "automatic")],
  [236, rule("Attack the target bunny at level 10 and both adjacent bunnies at level 9; each affected owner resolves a Black d12 defense roll.", true)],
  [237, rule("Attack the target and every bunny within four spaces at level 12; Clover modifiers may lower the level for individual bunnies.", true)],
]);

const SOURCE_GAP_RULES = new Map([
  [231, rule("Every opponent with a bunny chooses one bunny to feed 3 Cabbage and 3 Water by the end of their next turn or loses that bunny. The player of this card does not feed a bunny.", true, "automatic")],
  [505, rule("Every opponent with a bunny chooses one bunny to feed 2 Cabbage and 2 Water by the end of their next turn or loses that bunny. The player of this card does not feed a bunny.", true, "automatic")],
  [359, rule("Take two Defense Cards from an open Rooney’s Weapons Emporium.", false, "automatic", ["Rooney’s Weapons Emporium must be open."])],
  [419, rule("Take one Cabbage Card, one Water Card, one Defense Card, and one Pawn from their open shops when available.", false, "automatic")],
  [640, rule("Take every remaining Cabbage Card from Kaballa’s Market if it is open.", false, "automatic", ["Kaballa’s Market must be open."])],
  [660, rule("Take every remaining Water Card from Kaballa’s Market if it is open.", false, "automatic", ["Kaballa’s Market must be open."])],
  [1023, rule("Take two Defense Cards from an open Rooney’s Weapons Emporium.", false, "automatic", ["Rooney’s Weapons Emporium must be open."])],
  [1414, rule("Take two Defense Cards from an open Rooney’s Weapons Emporium.", false, "automatic", ["Rooney’s Weapons Emporium must be open."])],
  [403, rule("Choose an opponent’s bunny and collect Dolla donations from players. The donated total becomes the Weapon Level for the target’s Black d12 defense roll.", true, "manual")],
  [468, rule("Stake any amount of Dolla and roll the Green, Black, and Red d12s. A uniquely highest Green triples the stake; a Black or Red high loses it.", false, "manual", ["You must stake at least one saved Dolla."])],
  [728, rule("Cancel a listed theft or movement effect, or keep your bunnies in place during Shockwave.", false, "guided", ["The named effect must currently be resolving."])],
  [729, rule("Roll the colored d12s; if you are wearing the most clothing matching the highest die color, choose a Carrot from the market.", false, "manual", ["Kaballa’s Market must be open."])],
  [849, fountainRule()],
  [959, rule("Roll the colored d12s up to three times, saving dice between rolls. A 1-0-5-0 combination lets you reposition any Red or half-Red bunny.", false, "manual")],
  [1084, rule("Challenge an opponent to a staring contest for a Carrot you choose from that opponent; the last player to blink takes it.", true, "manual", ["The chosen opponent must own a Carrot."])],
  [1085, rule("Compare physical US currency serial numbers. The highest holder steals one saved Special or Very Special and the city-letter-matching Carrot.", true, "manual", ["Participating players need a physical US bill."])],
  [1087, rule("Choose an opponent, who must use cards from their hand to kill one of their own bunnies now or lose their remaining hand and vulnerable bunnies.", true, "manual")],
  [1088, rule("Opponents text the card title to the card player. The last received message loses the next turn; nonparticipants after one minute also lose it.", false, "manual", ["Players need an agreed messaging method."])],
  [1089, rule("Change one die result of 4, 5, or 6 into an 8.", false, "guided", ["An eligible die result must have just been rolled."])],
  [1090, rule("While this card is saved, replace any zero-value small card you receive with a new available card from that supply.", false, "manual", ["This card must already be saved.", "A replacement supply card must be available."])],
  [1091, rule("After the first bunny is killed during a turn, make its owner return all Carrots to Kaballa’s Market.", true, "guided", ["Play during the same turn as the first bunny death."])],
  [1092, rule("Move a bunny to any Bunny Circle position before an indirect range attack or roaming attack reaches it; directly targeted bunnies cannot move.", false, "guided", ["The bunny must face an indirect or upcoming roaming attack."])],
  [1118, rule("Roll the Brown d12 and take that many flavor-backed cards from the Draw Pile; pause replacement draws until your total falls below seven.", false, "manual")],
  [1124, rule("Hold a table vote to discard a nominated bunny; discard it only if a majority agrees.", true, "manual")],
  [1125, rule("Guess each opponent’s birth month and take one market Carrot for every correct guess.", false, "manual")],
  [1130, rule("Run a speed challenge to sort five-card hands by CIN. The fastest opponent may replace unwanted hand cards, then the card player may take from those discards.", false, "manual")],
  [1132, rule("Add the current Gold, Silver, and Copper exchange rates and spend that temporary amount of Dolla at an open store.", false, "manual", ["At least one store must be open.", "Morden’s Metals Exchange rates must be available."])],
  [1133, rule("Give a roaming buffalo to a player. Each round they pay 5 combined food units or return a Carrot, then it moves counter-clockwise.", true, "manual")],
  [1134, riverFoodRule()], [1135, riverFoodRule()],
  [1138, rule("While saved, treat Cabbage, Water, Radish, and Milk units as interchangeable when paying food costs; printed unit values do not change.", false, "manual", ["This card must already be saved."])],
  [1140, rule("After an opponent loses a bunny, make them roll the Brown die; an even result makes them discard another bunny of their choice.", true, "guided", ["Play during the same turn as that opponent’s bunny death."])],
  [1141, rule("After a curse word is heard, start the effect. The next player to curse discards one saved card from every listed category they possess.", false, "manual")],
  [1142, rule("If you are left-handed and play is counter-clockwise, take five market Carrots; alternatively cancel Baseball Blues or Narcoleptic Dog immediately.", false, "manual")],
  [1143, rule("An eligible female player immediately takes the next turn, skipping intervening turns; afterward play continues in the same direction.", false, "manual", ["Play between turns."])],
  [1146, rule("Move every Bunny Modifier to the next bunny counter-clockwise in the Bunny Circle.", false, "automatic")],
  [1173, rule("Roll the printed dice. If the Brown result matches either Zodiac value, spend that much temporary Dolla at an open store; matching both doubles it.", false, "manual", ["At least one store must be open."])],
  [1174, rule("Attack every opponent’s saved Chinese Zodiac cards. Each card survives only if its printed-year calculation plus the Brown die exceeds 12.", true, "manual")],
  [1230, rule("Make every opponent discard each card in their five-card hand whose CIN is odd, then immediately draw replacements.", true, "manual")],
  [1231, rule("Choose three Carrots from the market if you have not used an Aggressive card against an opponent this game.", false, "guided", ["You must not have used an Aggressive card against an opponent."])],
]);

const DIGITAL_RULE_OVERRIDES = new Map([
  [240, rule("Digital rule variant: choose one of your bunnies and one opponent. Take two bunnies you choose from that opponent and give them your selected bunny; if that opponent owns only one bunny, exchange one for one instead.", true, "automatic")],
]);

export function getKillerBunniesCardRules(card) {
  const sourceSlug = RULE_SOURCE_SLUGS[card.deckId] || "resources";
  const publisherRule = BLUE_YELLOW_RULES.get(card.number) || RED_RULES.get(card.number);
  const crossCheckedRule = SOURCE_GAP_RULES.get(card.number);
  const digitalOverride = DIGITAL_RULE_OVERRIDES.get(card.number);
  const wiki = KILLER_BUNNIES_WIKI_RULES[card.catalogNumber || String(card.number).padStart(4, "0")];
  const wikiPrintedType = normalizeWikiType(wiki?.type);
  const effectiveType = ["SPECIAL", "VERY SPECIAL"].includes(card.type) ? card.type : (wikiPrintedType || card.type);
  const effectiveCard = { ...card, type: effectiveType };
  const setupRule = /\(Starter Card\)$/i.test(card.name)
    ? {
        ...rule(`Place ${card.name.replace(/\s*\(Starter Card\)$/i, "")} face up during setup. It displays that shop or exchange's starting state and current prices; it is not drawn or played.`, false, "not-played"),
        timing: "Place this setup card face up before the first turn; it never enters a RUN slot.",
      }
    : null;
  const communityRule = shouldUseCommunityRule(card, wiki)
    ? rule(wiki.excerpt, wiki.aggressive, "manual")
    : null;
  const base = digitalOverride || publisherRule || crossCheckedRule || setupRule || communityRule || inferCardRule(effectiveCard);
  const requirements = [base.timing || timingRequirement(effectiveCard), ...(base.extraRequirements || [])];
  if (base.requiresBunny) requirements.push("You must have a living bunny in your Bunny Circle.");
  if (effectiveCard.kind === "modifier") requirements.push("Choose any living bunny in any player's Bunny Circle. If no bunny is available, discard this modifier.");

  return Object.freeze({
    ability: base.ability,
    requirements: Object.freeze([...new Set(requirements)]),
    requiresBunny: base.requiresBunny,
    resolutionStatus: base.resolutionStatus,
    abilitySource: digitalOverride ? "digital-override" : publisherRule ? "publisher" : crossCheckedRule ? "cross-checked" : communityRule && !setupRule ? "community" : "family-rule",
    digitalRuleVariant: Boolean(digitalOverride),
    printedType: wikiPrintedType,
    rulesSourceUrl: `https://killerbunnies.com/pages/${sourceSlug}`,
    rulesSourceLabel: `${card.deckName} Bunny Bits`,
    communitySourceUrl: wiki?.sourceUrl || "",
    communitySourceLabel: wiki ? `${wiki.sourceTitle} · Killer Bunnies Wiki` : "",
  });
}

function shouldUseCommunityRule(card, wiki) {
  if (!wiki?.excerpt) return false;
  return ["action", "market", "modifier", "misfortune"].includes(card.kind)
    || (card.kind === "bunny" && /specialty|super|celebrity|ranked|robot|cathexis|law enforcement|free agent|holographic/i.test(card.name));
}

function normalizeWikiType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (normalized === "run") return "RUN";
  if (normalized === "special") return "SPECIAL";
  if (normalized === "very special") return "VERY SPECIAL";
  if (normalized === "play immediately") return "PLAY IMMEDIATELY";
  if (["kaballa dolla", "bunny byte", "bunny bytes"].includes(normalized)) return "CURRENCY";
  return null;
}

function inferCardRule(card) {
  const namedRule = inferNamedFamilyRule(card);
  if (namedRule) return namedRule;
  if (card.kind === "carrot") return rule("This is a collectible market Carrot. It is not played as an action; owning the matching hidden Magic Carrot can win the game.", false, "not-played");
  if (card.kind === "money") return rule(`Bank this currency automatically when drawn; it adds ${card.value || 0} Dolla to your spending total.`, false, "automatic");
  if (card.kind === "bunny") {
    const hasPrintedPower = /specialty|super|celebrity|ranked|robot|cathexis|law enforcement/i.test(card.name);
    return rule(hasPrintedPower
      ? "Place this bunny in your Bunny Circle. Its named printed passive or triggered ability then remains active while the bunny is in play."
      : "Place this bunny in your Bunny Circle; it becomes a living bunny for card requirements and end-game eligibility.", false, hasPrintedPower ? "manual" : "automatic");
  }
  if (card.kind === "chooseCarrot") return rule(`Choose ${card.carrotCount || 1} face-up Carrot${(card.carrotCount || 1) === 1 ? "" : "s"} from the market, even if Kaballa’s Market is closed.`, false, "guided");
  if (card.kind === "feed") {
    const cost = Object.entries(card.costs || {}).map(([resource, amount]) => `${amount} ${capitalize(resource)}`).join(" and ");
    return rule(`Assign an opponent’s bunny a feeding obligation${cost ? ` of ${cost}` : " determined by the printed roll"}; it dies if unpaid at the end of that player’s next turn.`, true, card.randomCost || card.costs?.radish || card.costs?.milk ? "manual" : "automatic");
  }
  if (card.kind === "weapon") {
    const level = card.weaponLevel || card.power;
    return rule(`Attack an opponent’s bunny with the printed ${level ? `Weapon Level ${level}` : "weapon condition"}; resolve its die roll, range, and persistence exactly as printed.`, true, Number.isFinite(card.power) && card.power <= 9 ? "automatic" : "manual");
  }
  if (card.kind === "misfortune") return rule("Resolve immediately when drawn: eliminate one vulnerable bunny belonging to the player who drew this card. If that player has no bunny, discard it without effect.", false, "guided");
  if (card.kind === "modifier") return rule("Attach this Bunny Modifier to any bunny in any player's Bunny Circle. It cannot move after attachment, more modifiers may be attached to the same bunny, and it is discarded with that bunny.", false, "manual");
  if (card.kind === "market") return rule(`Apply the printed ${card.name} store rule, price change, coupon, or open/closed state to the named shop.`, false, "manual");
  return rule(`Resolve the choices, targets, rolls, and state changes printed on ${card.name}; the table guides the turn timing while players confirm this card-specific result.`, false, "manual");
}

function inferNamedFamilyRule(card) {
  const name = card.name;
  if (/^area 51$/i.test(name)) return rule("Abduct any bunny from the Bunny Circle and return the previously abducted bunny when a new abduction occurs.", true, "manual");
  if (/large prune danish/i.test(name)) return pruneRule();
  if (/^(?:double )?free agent$/i.test(name)) return rule("Place this wild bunny in your Bunny Circle and choose or change its eligible color and kind as the rules permit.", false, "manual");
  if (/^barrier$/i.test(name)) return barrierRule();
  if (/^free cabbage(?: and (?:free )?water)?$/i.test(name)) {
    const both = /water/i.test(name);
    return rule(`Take ${both ? "one Cabbage Card and one Water Card" : "the printed number of Cabbage Cards"} from Kaballa’s Market.`, false, "automatic", ["Kaballa’s Market must be open."]);
  }
  if (/^free water$/i.test(name)) return rule("Take the printed number of Water Cards from Kaballa’s Market.", false, "automatic", ["Kaballa’s Market must be open."]);
  if (/^lucky (?:clover|horseshoe).+bunny modifier/i.test(name)) return rule("Attach this luck modifier to any bunny. Subtract its printed value from the die-roll level of every Weapon used against that bunny; multiple luck modifiers stack.", false, "manual");
  if (/bunny modifier \((?:enlisted|officer) rank/i.test(name) || /(?:chief|admiral).+bunny modifier/i.test(name)) return rule("Attach this Rank to a bunny. Compare all matching ranks to determine the highest-ranked bunny and its extra-play privilege.", false, "manual");
  if (ZODIAC_SIGNS.includes(name)) return {
    ...rule("Save this Zodiac card face-up when drawn and immediately draw again. It can create extra plays and may grant end-game Winning Zodiac privileges.", false, "automatic"),
    timing: "This card banks automatically when drawn; it is not programmed through RUN slots.",
  };
  if (CHINESE_ZODIAC_SIGNS.includes(name)) return {
    ...rule("Save this Chinese Zodiac card face-up when drawn and immediately draw again. Consecutive signs can grant an extra play and the winning sign scores at game end.", false, "automatic"),
    timing: "This card banks automatically when drawn; it is not programmed through RUN slots.",
  };
  if (/^mysterious place #/i.test(name)) return {
    ...rule("Save this Mysterious Place face-up when drawn and immediately draw again. It participates in Yellow Ball control and the end-game Winning Place check.", false, "automatic"),
    timing: "This card banks automatically when drawn; it is not programmed through RUN slots.",
  };
  if (/^carrot [K-P]\b/i.test(name)) return rule("Collect this Conquest Carrot as an end-game objective; it is not resolved as a RUN action.", false, "not-played");
  if (/weapon:\s*(?:guy|gal)/i.test(name)) return rule("Attack a bunny matching the printed Guy/Gal condition and resolve the card’s conditional Weapon result.", true, "manual");
  return null;
}

function timingRequirement(card) {
  if (card.type === "PLAY IMMEDIATELY") return "Resolve this card immediately when drawn; never keep it in your hand or place it in a RUN slot.";
  if (card.kind === "carrot") return "This card is collected from the market, not played from a RUN slot.";
  if (card.kind === "money") return "This card banks automatically when drawn.";
  if (card.kind === "misfortune") return "This PLAY IMMEDIATELY card resolves as soon as it is drawn.";
  if (card.type === "VERY SPECIAL") return "Play after running and saving it, or use it at its printed timing during any player’s turn.";
  if (card.type === "SPECIAL") return "Play it through TOP RUN, from hand instead of TOP RUN, or after saving it on your own turn.";
  return "Program it through BOTTOM RUN and TOP RUN before resolving it.";
}

function rule(ability, requiresBunny = false, resolutionStatus = "guided", extraRequirements = []) {
  return { ability, requiresBunny, resolutionStatus, extraRequirements };
}

const ZODIAC_SIGNS = Object.freeze(["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]);
const CHINESE_ZODIAC_SIGNS = Object.freeze(["Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig", "Rat", "Ox", "Tiger", "Rabbit", "Dragon"]);

function cloverRule(amount) {
  return rule(`Attach this Clover to a bunny and reduce each Weapon Level attacking that bunny by ${amount}. Multiple Clovers may stack.`, false, "manual");
}

function barrierRule() {
  return rule("Place a Barrier between adjacent players. It blocks adjacent Weapon spillover and reverses Roaming Red RUN cards that reach it.", false, "automatic");
}

function casinoRule() {
  return rule("Choose any bunny and roll the five colored d12s. Distinct rolls award a Carrot and Dolla, a pair requires immediate feeding, and three matching dice kill the target.", true);
}

function pruneRule() {
  return rule("Completely satisfy every pending Cabbage and Water feeding obligation on one bunny without spending supplies.", false, "automatic");
}

function bakeryRule() {
  return rule("Choose any bunny and roll the designated d12, then apply the printed reward or immediate feeding/death consequence to that bunny.", true);
}

function fountainRule() {
  return rule("Choose a number from 1-12 and roll five colored d12s; revive one discarded bunny for each die matching that number.", false);
}

function suppliesRule() {
  return rule("Roll five colored d12s and gain the supply associated with the lowest die; tied low dice award multiple supplies when available.", false);
}

function riverFoodRule() {
  return rule("Roll the printed die and recover that many total Water and Milk units from the discard supplies in any combination.", false, "guided");
}

function capitalize(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "";
}
import { KILLER_BUNNIES_WIKI_RULES } from "./killer-bunnies-card-wiki-rules.generated.js";
