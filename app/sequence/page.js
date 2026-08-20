import SequenceClient from "../../components/sequence-client";
import "./sequence.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("sequence");

export default function SequencePage() {
  return <SequenceClient />;
}
