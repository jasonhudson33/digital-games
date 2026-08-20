/*
 * Route-level skeleton. Games load a fair amount of client code, and on a phone
 * connection the gap between tapping a tile and seeing anything was blank page.
 * Shaped like the hub grid because that is the most common destination.
 */
export default function Loading() {
  return (
    <div className="hub-shell" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading…</span>
      <div className="skeleton-hero">
        <span className="skeleton skeleton-line is-short" />
        <span className="skeleton skeleton-line is-title" />
        <span className="skeleton skeleton-line" />
      </div>
      <div className="game-grid" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="skeleton skeleton-tile" />
        ))}
      </div>
    </div>
  );
}
