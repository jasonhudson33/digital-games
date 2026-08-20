import UnoClient from "../../components/uno-client";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("uno");

export default function UnoPage() { return <UnoClient />; }
