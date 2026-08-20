import HandAndFootClient from "../../components/hand-and-foot-client";
import "./hand-and-foot.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("hand-and-foot");

export default function HandAndFootPage() {
  return <HandAndFootClient />;
}
