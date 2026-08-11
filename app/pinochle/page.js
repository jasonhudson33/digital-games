import PinochleClient from "../../components/pinochle-client";
import "./pinochle.css";

export const metadata = {
  title: "Pinochle | Digital Games",
  description: "Play room-based auction Pinochle with two to six players.",
};

export default function PinochlePage() {
  return <PinochleClient />;
}
