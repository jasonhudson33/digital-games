import CatanClient from "../../components/catan-client";
import "./catan.css";

export const metadata = {
  title: "Catan | Digital Games",
  description:
    "Settle a new island, gather resources, trade with the bank, and race to ten victory points.",
};

export default function CatanPage() {
  return <CatanClient />;
}
