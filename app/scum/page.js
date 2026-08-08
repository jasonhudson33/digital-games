import ScumClient from "../../components/scum-client";
import { headers } from "next/headers";
import "./scum.css";

export async function generateMetadata() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/scum-og-v2.png`;
  const title = "Scum | Digital Games";
  const description = "Climb from 2 to Joker, shed every card, and rule any-size table in a fast game of Scum.";

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1672, height: 941, alt: "Scum — Lose your cards. Rule the table." }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function ScumPage() {
  return <ScumClient />;
}
