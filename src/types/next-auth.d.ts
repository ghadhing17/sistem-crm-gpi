/**
 * Next-Auth v5 type augmentation — CRM Graha Padma
 *
 * Memperluas tipe Session dan JWT bawaan Auth.js
 * agar TypeScript mengenali field kustom: id, role, mustChangePassword.
 *
 * File ini HARUS diimport atau diinclude via tsconfig agar augmentasi aktif.
 * Cukup dengan menaruhnya di src/ dan tsconfig.json include "src/**".
 */

import type { DefaultSession, DefaultJWT } from "next-auth";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    mustChangePassword: boolean;
  }
}
