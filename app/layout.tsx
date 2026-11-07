import type { Metadata, Viewport } from "next";
import { Caveat, Cormorant_Garamond, DM_Sans, Playfair_Display } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { BackgroundMusic } from "@/components/BackgroundMusic";
import { AppProvider } from "@/components/providers/AppProvider";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Our Little Universe",
  description: "Two people. One universe. Infinite memories.",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = { themeColor: "#211A36", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${playfair.variable} ${dmSans.variable} ${caveat.variable}`}>
      <body className="font-sans text-cloud antialiased">
        <AppProvider>
          <BackgroundMusic>{children}</BackgroundMusic>
        </AppProvider>
      </body>
    </html>
  );
}
