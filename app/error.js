"use client";

import Link from "next/link";
import { useEffect } from "react";

/*
 * There was no error boundary anywhere in app/, so an exception in a game
 * client dropped the player onto the Next.js default error screen mid-game,
 * with no way back to the hub and no hint that their room still exists.
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[digital-games] route error", error);
  }, [error]);

  return (
    <main className="status-page">
      <p className="status-eyebrow">Something broke</p>
      <h1>That hand didn&rsquo;t deal.</h1>
      <p className="status-copy">
        The page hit an error and stopped. Your room is still on the server — trying again usually
        picks it back up where it was.
      </p>
      <div className="status-actions">
        <button type="button" className="button" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="button is-secondary">
          Back to all games
        </Link>
      </div>
      {error?.digest && <p className="status-digest">Reference: {error.digest}</p>}
    </main>
  );
}
