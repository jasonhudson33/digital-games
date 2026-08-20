import CoverYourAssetsClient from "../../components/cover-your-assets-client";
import "./cover-your-assets.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("cover-your-assets");

export default function CoverYourAssetsPage() {
  return <CoverYourAssetsClient />;
}
