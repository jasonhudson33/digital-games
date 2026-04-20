"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const games = [
  { name: "All Games", href: "/" },
  { name: "7-Up", href: "/seven-up" },
  { name: "Mafia", href: "/mafia" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  if (pathname?.startsWith("/mafia")) {
    return null;
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand">
          Digital Games
        </Link>
        <nav className="site-nav" aria-label="Game navigation">
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
