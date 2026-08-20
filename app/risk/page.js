import RiskClient from "../../components/risk-client";
import "./risk.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("risk");

export default function RiskPage() {
  return <RiskClient />;
}
