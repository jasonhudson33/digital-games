"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const games = [
  { name: "All Games", href: "/" },
  { name: "BANG!", href: "/bang" },
  { name: "7-Up", href: "/seven-up" },
  { name: "Catan", href: "/catan" },
  { name: "Cover Your Assets", href: "/cover-your-assets" },
  { name: "DOS", href: "/dos" },
  { name: "Flip 7", href: "/flip-7" },
  { name: "Hand & Foot", href: "/hand-and-foot" },
  { name: "Hearts", href: "/hearts" },
  { name: "Killer Bunnies", href: "/killer-bunnies" },
  { name: "Update KB Cards", href: "/killer-bunnies/cards" },
  { name: "Life", href: "/life" },
  { name: "Mafia", href: "/mafia" },
  { name: "Monopoly", href: "/monopoly" },
  { name: "No Thanks!", href: "/no-thanks" },
  { name: "Pinochle", href: "/pinochle" },
  { name: "Qwirkle", href: "/qwirkle" },
  { name: "Risk", href: "/risk" },
  { name: "Scum", href: "/scum" },
  { name: "Secret Hitler", href: "/secret-hitler" },
  { name: "Sequence", href: "/sequence" },
  { name: "Skull King", href: "/skull-king" },
  { name: "Splendor", href: "/splendor" },
  { name: "Spyrium", href: "/spyrium" },
  { name: "Ticket to Ride", href: "/ticket-to-ride" },
  { name: "UNO", href: "/uno" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function closeOnOutsideClick(event) {
      if (!menuContainerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="site-header-inner" ref={menuContainerRef}>
        <Link href="/" className="site-brand">
          Digital Games
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          className="site-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          id="site-nav"
          className={`site-nav ${menuOpen ? "open" : ""}`}
          aria-label="Game navigation"
        >
          {games.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="site-nav-link"
              aria-current={pathname === game.href ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {game.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
