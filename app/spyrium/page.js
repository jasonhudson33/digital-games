import SpyriumClient from "../../components/spyrium-client";
import "./spyrium.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("spyrium");

export default function SpyriumPage() { return <SpyriumClient />; }
