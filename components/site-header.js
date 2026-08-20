"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import CommandPalette from "./command-palette";
import { getGame } from "../lib/games";

/*
 * The header used to carry the whole catalogue: a 26-item flat dropdown that,
 * on a phone, was a scrolling column inside a scrolling page. A header's job is
 * to say where you are and let you get somewhere else — not to be the index.
 *
 * So: brand, the game you are currently in, and one way to find another.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Route changes should never leave the palette hanging open.
  useEffect(() => setPaletteOpen(false), [pathname]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const currentGame = getGame(pathname?.split("/").filter(Boolean)[0] ?? "");

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand">
            <span className="site-brand-mark" aria-hidden="true">DG</span>
            Digital Games
          </Link>

          {currentGame && (
            <span className="site-current">
              <span className="site-current-dot" aria-hidden="true" style={{ "--h": currentGame.hue }} />
              {currentGame.name}
            </span>
          )}

          <button
            type="button"
            className="site-find"
            onClick={() => setPaletteOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={paletteOpen}
          >
            <Search aria-hidden="true" />
            <span className="site-find-label">Find game</span>
            <kbd className="site-find-key">⌘K</kbd>
          </button>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </>
  );
}
