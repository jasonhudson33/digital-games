import BangClient from "../../components/bang-client";
import "./bang.css";

export const metadata = {
  title: "BANG! | Digital Games",
  description: "Play the western hidden-role card game in a private room with friends or computer players.",
};

export default function BangPage() {
  return <BangClient />;
}
