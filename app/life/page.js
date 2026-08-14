import LifeClient from "../../components/life-client";
import "./life.css";

export const metadata = {
  title: "Life | Digital Games",
  description: "Spin through a room-based game of Life with friends and computer players.",
};

export default function LifePage() {
  return <LifeClient />;
}
