import NoThanksClient from "../../components/no-thanks-client";
import "./no-thanks.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("no-thanks");

export default function NoThanksPage() {
  return <NoThanksClient />;
}
