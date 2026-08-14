import SequenceClient from "../../components/sequence-client";
import "./sequence.css";

export const metadata = {
  title: "Sequence | Digital Games",
  description: "Build rows of five in a shared Sequence room with friends or computer players.",
};

export default function SequencePage() {
  return <SequenceClient />;
}
