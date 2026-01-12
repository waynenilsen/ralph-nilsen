import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/server/db";

export async function GET() {
  const dbHealthy = await checkDatabaseHealth();

  const status = dbHealthy ? "healthy" : "unhealthy";
  const statusCode = dbHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? "connected" : "disconnected",
      },
    },
    { status: statusCode }
  );
}
