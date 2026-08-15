/**
 * Auth.js v5 route handler — CRM Graha Padma
 * Menangani semua request ke /api/auth/* (signin, signout, session, dll)
 */

import { handlers } from "@/lib/auth/config";

export const { GET, POST } = handlers;
