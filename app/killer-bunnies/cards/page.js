import KillerBunniesCardCatalog from "../../../components/killer-bunnies-card-catalog";
import "../killer-bunnies.css";
import "./cards.css";

export const metadata = {
  title: "Killer Bunnies Card Catalog | Digital Games",
  description: "Audit 1,485 uniquely numbered Killer Bunnies cards and review the current generated digital behavior for every card.",
};

export default function KillerBunniesCardsPage() {
  return <KillerBunniesCardCatalog />;
}
