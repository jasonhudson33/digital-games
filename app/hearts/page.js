import HeartsClient from "../../components/hearts-client";
import "./hearts.css";

export const metadata = {
  title: "Hearts & Killer Hearts | Digital Games",
  description: "Play Classic Hearts or the no-guardrails Killer Hearts variant against three computer rivals.",
};

export default function HeartsPage() {
  return <HeartsClient />;
}
