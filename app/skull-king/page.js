import SkullKingClient from "../../components/skull-king-client";
import "./skull-king.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("skull-king");

export default function SkullKingPage() {
  return <SkullKingClient />;
}
