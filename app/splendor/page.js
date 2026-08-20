import SplendorClient from "../../components/splendor-client";
import "./splendor.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("splendor");

export default function SplendorPage() {
  return <SplendorClient />;
}
