import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// SF Rounded isn't on the web; Nunito is the closest warm, rounded stand-in.
const rounded = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-rounded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "meditar",
  description: "Respira con la luz. Duerme mejor.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={rounded.variable}>
      <body>{children}</body>
    </html>
  );
}
