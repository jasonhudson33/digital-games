import QwirkleClient from "../../components/qwirkle-client";
import "./qwirkle.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("qwirkle");

export default function QwirklePage() {
  return <QwirkleClient />;
}
