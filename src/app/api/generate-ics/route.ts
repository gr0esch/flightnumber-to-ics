import { NextRequest, NextResponse } from "next/server";
import { generateICS, ICSFlightData } from "@/lib/ics-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const icsData: ICSFlightData = {
      flightNumber: body.flightNumber,
      airline: body.airline,
      departure: {
        airport: body.departure.airport,
        iata: body.departure.iata,
        time: body.departure.time,
        timezone: body.departure.timezone || "UTC",
        utc: body.departure.utc,
      },
      arrival: {
        airport: body.arrival.airport,
        iata: body.arrival.iata,
        time: body.arrival.time,
        timezone: body.arrival.timezone || "UTC",
        utc: body.arrival.utc,
      },
      aircraft: body.aircraft,
      status: body.status,
    };

    if (
      !icsData.flightNumber ||
      !icsData.departure.time ||
      !icsData.arrival.time
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const icsContent = generateICS(icsData);

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="flight-${icsData.flightNumber}.ics"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
