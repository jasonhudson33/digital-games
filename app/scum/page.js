import ScumClient from "../../components/scum-client";
import "./scum.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("scum");

export default function ScumPage() {
  return <ScumClient />;
}
