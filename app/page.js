import GameHub from "../components/game-hub";
import { gameCountWords } from "../lib/games";

export const metadata = {
  title: "Digital Games",
  description:
    `${gameCountWords()} party games, playable in your browser. Filter by how many of you there are and how long you have.`,
};

export default function Page() {
  return <GameHub />;
}
