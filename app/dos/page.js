import DosClient from "../../components/dos-client";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("dos");

export default function DosPage() { return <DosClient />; }
