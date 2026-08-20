import Link from "next/link";

export const metadata = { title: "Not found | Digital Games" };

export default function NotFound() {
  return (
    <main className="status-page">
      <p className="status-eyebrow">404</p>
      <h1>No game here.</h1>
      <p className="status-copy">
        That link doesn&rsquo;t point at anything we deal. If someone sent you a room code, try
        opening the game first and joining with the code.
      </p>
      <div className="status-actions">
        <Link href="/" className="button">
          Back to all games
        </Link>
      </div>
    </main>
  );
}
