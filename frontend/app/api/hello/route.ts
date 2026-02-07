import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Hello World from Timeline Detective Board API!",
    timestamp: new Date().toISOString(),
    status: "success",
  });
}
