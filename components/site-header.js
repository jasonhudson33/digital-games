"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const games = [
  { name: "All Games", href: "/" },
  { name: "7-Up", href: "/seven-up" },
  { name: "Mafia", href: "/mafia" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (pathname?.startsWith("/mafia")) {
    return null;
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand">
          Digital Games
        </Link>
        <button
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
            <Link key={game.href} href={game.href} className="site-nav-link">
              {game.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
