import QwirkleClient from "../../components/qwirkle-client";
import "./qwirkle.css";

export const metadata = {
  title: "Qwirkle | Digital Games",
  description: "Match colors and shapes in a shared Qwirkle room with friends or computer players.",
};

export default function QwirklePage() {
  return <QwirkleClient />;
}
