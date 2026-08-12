import TicketToRideClient from "../../components/ticket-to-ride-client";
import "./ticket-to-ride.css";

export const metadata = {
  title: "Ticket to Ride | Digital Games",
  description: "Build colorful rail routes across North America in a shared room.",
};

export default function TicketToRidePage() {
  return <TicketToRideClient />;
}
