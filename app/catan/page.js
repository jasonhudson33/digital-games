import CatanClient from "../../components/catan-client";
import "./catan.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("catan");

export default function CatanPage() {
  return <CatanClient />;
}
