import Script from "next/script";
import { Anton, Inter, Space_Grotesk } from "next/font/google";

import DialogFocusManager from "../components/dialog-focus";
import SiteHeader from "../components/site-header";
import "./tokens.css";
import "./globals.css";
import "./color-games.css";

/*
 * Fonts are declared once, here.
 *
 * Before this, seven families were referenced across the stylesheets and most
 * never loaded on the routes that used them: Impact (UNO/DOS display type)
 * does not exist on iOS or Android, Rockwell is Windows-only, and Inter was
 * declared in six places but linked on the /mafia route alone. Three more came
 * in through `@import url(...)` at the top of a route stylesheet — the slowest
 * available way to load a font, because the preload scanner cannot see it.
 *
 * next/font downloads these at build time and self-hosts them, so there is one
 * request to our own origin, no layout shift, and the same rendering on every
 * device.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
});

/* Poster type for the big in-game headings — the Impact replacement. */
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-anton",
});

export const metadata = {
  title: "Digital Games",
  description: "Launch party games from one shared landing page.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${inter.variable} ${spaceGrotesk.variable} ${anton.variable}`}
    >
      <body>
        {/* First tab stop on every route. Without it a keyboard or switch user
            walks the whole header before reaching the game. */}
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader />
        {/* One wrapper so the skip link has a reliable target on every route.
            Each page still renders its own <main>; no page CSS selects on
            body > *, so an extra block-level wrapper is layout-neutral. */}
        <div id="main" tabIndex={-1}>
          {children}
        </div>
        <DialogFocusManager />
        <Script src="/vendor.cardmeister.full.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
