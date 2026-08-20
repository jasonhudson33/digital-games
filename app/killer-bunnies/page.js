import KillerBunniesClient from "../../components/killer-bunnies-client";
import "./killer-bunnies.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("killer-bunnies");

export default function KillerBunniesPage() {
  return <KillerBunniesClient />;
}
