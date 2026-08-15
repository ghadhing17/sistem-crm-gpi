import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "CRM Graha Padma",
    template: "%s | CRM Graha Padma",
  },
  description: "Sistem CRM Internal Marketing Graha Padma",
  robots: {
    index: false, // Sistem internal — tidak diindeks search engine
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
