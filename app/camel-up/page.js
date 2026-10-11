import CamelUpClient from "../../components/camel-up-client";
import { gameMetadata } from "../../lib/metadata";
import "./camel-up.css";

export const metadata = gameMetadata("camel-up");

export default function CamelUpPage() {
  return <CamelUpClient />;
}
