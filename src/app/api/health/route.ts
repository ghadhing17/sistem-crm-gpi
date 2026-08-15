import { NextResponse } from "next/server";

/**
 * Health check endpoint — digunakan Docker Compose healthcheck
 * dan monitoring (Uptime Kuma, dll.)
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "crm-graha-padma",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
