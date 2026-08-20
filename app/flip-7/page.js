import Flip7Client from "../../components/flip-7-client";
import "./flip-7.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("flip-7");

export default function Flip7Page() {
  return <Flip7Client />;
}
