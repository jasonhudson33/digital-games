import BangClient from "../../components/bang-client";
import "./bang.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("bang");

export default function BangPage() {
  return <BangClient />;
}
