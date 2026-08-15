/**
 * Prisma client singleton — mencegah multiple connection di Next.js dev mode
 * karena hot-reload membuat instance baru setiap kali.
 *
 * Referensi: https://www.prisma.io/docs/guides/nextjs
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
