import WhatIfClient from "../../components/what-if-client";
import "./what-if.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("what-if");

export default function WhatIfPage() {
  return <WhatIfClient />;
}
