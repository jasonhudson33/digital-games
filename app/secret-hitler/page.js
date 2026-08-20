import SecretHitlerClient from "../../components/secret-hitler-client";
import "./secret-hitler.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("secret-hitler");

export default function SecretHitlerPage() {
  return <SecretHitlerClient />;
}
