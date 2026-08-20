import TicketToRideClient from "../../components/ticket-to-ride-client";
import "./ticket-to-ride.css";
import { gameMetadata } from "../../lib/metadata";

export const metadata = gameMetadata("ticket-to-ride");

export default function TicketToRidePage() {
  return <TicketToRideClient />;
}
