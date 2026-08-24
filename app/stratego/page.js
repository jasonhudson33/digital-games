import StrategoClient from "../../components/stratego-client";
import "./stratego.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("stratego");

export default function StrategoPage() {
  return <StrategoClient />;
}
