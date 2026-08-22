import FiveCrownsClient from "../../components/five-crowns-client";
import "./five-crowns.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("five-crowns");
export default function FiveCrownsPage() { return <FiveCrownsClient />; }
