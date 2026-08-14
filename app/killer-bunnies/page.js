import KillerBunniesClient from "../../components/killer-bunnies-client";
import "./killer-bunnies.css";

export const metadata = {
  title: "Killer Bunnies | Digital Games",
  description: "Build a room, recruit humans or bunny bots, and hunt for the Magic Carrot.",
};

export default function KillerBunniesPage() {
  return <KillerBunniesClient />;
}
