import type { Metadata, Viewport } from "next";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import { NavTracker } from "@/components/NavTracker";

export const metadata: Metadata = {
  title: "FML: Fantasy Marble League",
  description: "Standings, trades and results for our Marble League fantasy league.",
};
export const viewport: Viewport = { themeColor: "#eef3f6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavTracker />
        {children}
      </body>
    </html>
  );
}
