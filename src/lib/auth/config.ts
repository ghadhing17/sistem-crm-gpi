/**
 * auth.ts — Konfigurasi Auth.js lengkap untuk Node.js runtime
 *
 * Extend authConfig (Edge-safe) dengan Credentials provider yang
 * membutuhkan Argon2 (native Node.js module).
 *
 * Dipakai oleh: API routes, Server Components, Server Actions.
 * JANGAN diimport dari middleware.ts (Edge Runtime).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { prisma } from "@/lib/db/prisma";
import { authConfig } from "./auth.config";
import type { UserRole } from "@/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials?.password ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            nama: true,
            email: true,
            password: true,
            role: true,
            statusAktif: true,
            mustChangePassword: true,
          },
        });

        if (!user || !user.statusAktif) return null;

        const passwordValid = await verify(user.password, password);
        if (!passwordValid) return null;

        // Update lastLoginAt async — tidak boleh gagalkan login
        prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch(() => {});

        return {
          id: user.id,
          name: user.nama,
          email: user.email,
          role: user.role as UserRole,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
