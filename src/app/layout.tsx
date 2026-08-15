import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
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
      <body>
        {/*
         * SessionProvider diperlukan agar hook useSession dan signIn/signOut
         * dari next-auth/react berfungsi di Client Components.
         * Server Components menggunakan auth() dari @/lib/auth/config langsung.
         */}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
