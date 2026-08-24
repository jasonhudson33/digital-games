import Phase10Client from "../../components/phase-10-client";
import { gameMetadata } from "../../lib/metadata";
import "./phase-10.css";

export const metadata = gameMetadata("phase-10");

export default function Phase10Page() { return <Phase10Client />; }
