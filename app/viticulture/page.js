import ViticultureClient from "../../components/viticulture-client";
import { gameMetadata } from "../../lib/metadata";
import "./viticulture.css";

export const metadata = gameMetadata("viticulture");

export default function ViticulturePage() {
  return <ViticultureClient />;
}

