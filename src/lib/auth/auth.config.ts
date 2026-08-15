/**
 * auth.config.ts — Konfigurasi Auth.js yang aman untuk Edge Runtime
 *
 * File ini TIDAK boleh mengimport module native Node.js (argon2, prisma, dll).
 * Dipakai oleh middleware.ts yang berjalan di Edge Runtime.
 *
 * Berisi: pages, session config, callbacks JWT & session.
 * TIDAK berisi: Credentials provider (perlu Argon2 = Node.js only).
 */

import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 jam
  },

  // Provider kosong di sini — Credentials provider ditambahkan di auth.ts
  providers: [],

  callbacks: {
    /**
     * Dipakai middleware untuk cek apakah user sudah auth.
     * authorized() dipanggil sebelum setiap request yang match matcher.
     */
    authorized({ auth }) {
      return !!auth?.user;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: UserRole }).role;
        token.mustChangePassword = (
          user as { mustChangePassword: boolean }
        ).mustChangePassword;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },

  trustHost: true,
};
