import { getGame, minutesLabel, playersLabel } from "./games";

const SITE_NAME = "Digital Games";

/**
 * Absolute base for OpenGraph URLs.
 *
 * app/scum/page.js used to rebuild this per request out of x-forwarded-host and
 * x-forwarded-proto. metadataBase does the same job once, and lets every route
 * declare its OG image as a plain relative path.
 */
export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`);
  return new URL("http://localhost:3000");
}

/**
 * Metadata for a game route, derived from the catalogue.
 *
 * A room link pasted into a group chat is how most games here actually start,
 * so every route should preview as something more than a bare URL.
 */
/** @param {string} slug */
export function gameMetadata(slug) {
  const game = getGame(slug);
  if (!game) return { title: SITE_NAME };

  const title = `${game.name} | ${SITE_NAME}`;
  const description = game.blurb;
  const subtitle = `${playersLabel(game)} · ${minutesLabel(game)}`;

  const images = game.ogImage
    ? [{ url: game.ogImage.url, width: game.ogImage.width, height: game.ogImage.height, alt: `${game.name} — ${subtitle}` }]
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/${game.slug}` },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: `/${game.slug}`,
      title,
      description: `${description} ${subtitle}.`,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      ...(images ? { images: images.map((image) => image.url) } : {}),
    },
  };
}
