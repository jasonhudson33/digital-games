import MafiaClient from "../../components/mafia-client";
import "./mafia.css";

export const metadata = {
  title: "Mafia",
  description: "Create a room, assign hidden roles, and play through shared night and day phases.",
};

export default function MafiaPage() {
  return <MafiaClient />;
}
