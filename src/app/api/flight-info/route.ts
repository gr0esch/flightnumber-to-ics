import { NextRequest, NextResponse } from "next/server";
import { getFlightInfo } from "@/lib/airlabs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flightNumber, date } = body;

    if (!flightNumber || !date) {
      return NextResponse.json(
        { error: "flightNumber and date are required" },
        { status: 400 }
      );
    }

    const flightInfo = await getFlightInfo(flightNumber, date);

    if (!flightInfo) {
      return NextResponse.json(
        { error: "Flight not found. Please check the flight number." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: flightInfo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("not configured") ? 500 : 502 }
    );
  }
}
