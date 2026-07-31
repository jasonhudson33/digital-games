import MonopolyClient from "../../monopoly/src/main";
import "../../monopoly/src/styles.css";

export const metadata = {
  title: "Monopoly Online | Digital Games",
  description: "Play Monopoly online with shared rooms, dice, trading, mortgages, houses, hotels, and auctions.",
};

export default function MonopolyPage() {
  return <MonopolyClient />;
}
