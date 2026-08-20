import LifeClient from "../../components/life-client";
import "./life.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("life");

export default function LifePage() {
  return <LifeClient />;
}
