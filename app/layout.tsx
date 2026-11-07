import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Kerala Lottery Hub — results, ticket checker & analytics",
  description: "Independent Kerala State Lottery result viewer, ticket checker and number analytics. Not affiliated with the Government of Kerala.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#0f766e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><Providers><Shell>{children}</Shell></Providers></body>
    </html>
  );
}
