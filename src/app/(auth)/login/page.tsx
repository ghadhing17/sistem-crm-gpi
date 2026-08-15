"use client";

/**
 * Halaman Login — CRM Graha Padma
 *
 * Form email + password dengan validasi client-side minimal.
 * Auth sesungguhnya diproses oleh Auth.js Credentials provider di server.
 * Tidak ada OAuth, tidak ada self-register — sistem internal only (PRD 10.2).
 */

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// Pesan error yang ditampilkan per kode error dari Auth.js
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email atau password salah. Silakan coba lagi.",
  SessionRequired: "Sesi habis. Silakan login kembali.",
  Default: "Terjadi kesalahan. Silakan coba lagi.",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    errorParam ? (ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.Default) : null
  );
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    // Validasi minimal — tidak expose info ke server jika input jelas kosong
    if (!email.trim() || !password) {
      setErrorMsg("Email dan password wajib diisi.");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false, // tangani redirect manual agar bisa tampil error
      });

      if (!result || result.error) {
        const code = result?.error ?? "Default";
        setErrorMsg(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.Default);
        return;
      }

      // Login berhasil — redirect ke callbackUrl atau dashboard
      router.push(callbackUrl);
      router.refresh(); // refresh session di layout
    });
  }

  return (
    <div className="w-full max-w-md px-4">
      {/* Card login */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Logo & Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#009182] mb-4">
            {/* Ikon rumah sederhana sebagai logo placeholder */}
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            CRM Graha Padma
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Masuk dengan akun yang diberikan oleh administrator
          </p>
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div
            role="alert"
            className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2"
          >
            <svg
              className="w-4 h-4 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@grahapadma.id"
              disabled={isPending}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isPending}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#009182] hover:bg-[#007a6e] active:bg-[#006b61] text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#009182] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Lupa password? Hubungi administrator sistem.
        </p>
      </div>

      {/* Versi app */}
      <p className="mt-4 text-center text-xs text-gray-400">
        CRM Graha Padma &mdash; Internal Only
      </p>
    </div>
  );
}
