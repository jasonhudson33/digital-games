import SecretHitlerClient from "../../components/secret-hitler-client";
import "./secret-hitler.css";

export const metadata = {
  title: "Secret Hitler | Digital Games",
  description: "A room-based hidden-role tabletop game for 5–10 humans and computer players.",
};

export default function SecretHitlerPage() {
  return <SecretHitlerClient />;
}
