import { redirect } from "next/navigation";

/**
 * Root page — redirect ke /dashboard.
 * Middleware akan intercept dan redirect ke /login jika belum auth.
 */
export default function RootPage() {
  redirect("/dashboard");
}
