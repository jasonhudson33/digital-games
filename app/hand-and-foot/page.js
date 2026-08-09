import HandAndFootClient from "../../components/hand-and-foot-client";
import "./hand-and-foot.css";

export const metadata = {
  title: "Hand and Foot | Digital Games",
  description: "Play four rounds of the partner card game Hand and Foot against computer players.",
};

export default function HandAndFootPage() {
  return <HandAndFootClient />;
}
