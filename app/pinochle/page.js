import PinochleClient from "../../components/pinochle-client";
import "./pinochle.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("pinochle");

export default function PinochlePage() {
  return <PinochleClient />;
}
