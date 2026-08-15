import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers — sesuai rekomendasi PRD Bab 10.5
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Content-Security-Policy akan dikonfigurasi lebih lanjut saat
          // fitur dibangun (menghindari false-positive di fase awal)
        ],
      },
    ];
  },

  // Logging request di development
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default nextConfig;
