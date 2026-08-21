import { gameCountWords } from "../lib/games";

/*
 * The core use case here is phones around a table, but there was no manifest,
 * so nobody could add the app to a home screen and the browser chrome clashed
 * with every game's theme.
 */
export default function manifest() {
  return {
    name: "Digital Games",
    short_name: "Digital Games",
    description: `${gameCountWords()} party games, playable in your browser.`,
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f1f2f5",
    theme_color: "#f1f2f5",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
