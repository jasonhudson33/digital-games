import HeartsClient from "../../components/hearts-client";
import "./hearts.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("hearts");

export default function HeartsPage() {
  return <HeartsClient />;
}
