import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { RegisterServiceWorker } from "@/components/register-sw";

export const metadata: Metadata = {
  title: "AiNetworks CRM",
  description: "CRM and project management",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0C2752" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
