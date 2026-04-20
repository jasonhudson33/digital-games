import Script from "next/script";
import SiteHeader from "../components/site-header";
import "./globals.css";

export const metadata = {
  title: "Digital Games",
  description: "Launch party games from one shared landing page.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <Script src="/vendor.cardmeister.full.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
