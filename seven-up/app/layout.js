import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "7-up",
  description: "Play 7-up with local players, computer players, or shared online rooms.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="/vendor.cardmeister.full.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
