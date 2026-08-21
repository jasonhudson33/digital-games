import DominionClient from "../../components/dominion-client";
import { gameMetadata } from "../../lib/metadata";
import "./dominion.css";

export const metadata = gameMetadata("dominion");

export default function DominionPage() {
  return <DominionClient />;
}
