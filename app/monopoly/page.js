import MonopolyClient from "../../monopoly/src/main";
import "../../monopoly/src/styles.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("monopoly");

export default function MonopolyPage() {
  return <MonopolyClient />;
}
