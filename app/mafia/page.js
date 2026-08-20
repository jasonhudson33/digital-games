import MafiaClient from "../../components/mafia-client";
import "./mafia.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("mafia");

export default function MafiaPage() {
  return <MafiaClient />;
}
