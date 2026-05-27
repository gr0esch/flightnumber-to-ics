const AIRLABS_BASE_URL = "https://airlabs.co/api/v9";

export interface FlightInfo {
  flightNumber: string;
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  departure: {
    airport: string;
    iata: string;
    icao: string;
    scheduledTime: string;
    timezone: string;
    localDateTime: string;
  };
  arrival: {
    airport: string;
    iata: string;
    icao: string;
    scheduledTime: string;
    timezone: string;
    localDateTime: string;
  };
  aircraft?: {
    iata: string;
    icao: string;
    regNumber: string;
  };
  status: string;
  duration?: number;
}

function extractTimeFromAPI(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;

  const match = timeStr.match(/(\d{2}):(\d{2})/);
  if (match) {
    return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
  }
  return null;
}

function getUTCOffsetForTimezone(timezone: string, date: Date): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === "hour");
    const utcHour = date.getUTCHours();
    let localHour = hourPart ? parseInt(hourPart.value, 10) : utcHour;

    if (localHour === 24) localHour = 0;

    let offset = localHour - utcHour;
    if (offset > 12) offset -= 24;
    if (offset < -12) offset += 24;

    return offset;
  } catch {
    return 0;
  }
}

function computeLocalDateTime(
  apiTimeStr: string,
  timezone: string,
  searchedDate: string
): string {
  const time = extractTimeFromAPI(apiTimeStr);
  if (!time) {
    return `${searchedDate}T00:00`;
  }

  const depDate = new Date(`${searchedDate}T00:00:00Z`);
  const offset = getUTCOffsetForTimezone(timezone, depDate);

  const localHours = time.hours;
  const localMinutes = time.minutes;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return `${searchedDate}T${pad(localHours)}:${pad(localMinutes)}`;
}

function computeArrivalLocalDateTime(
  apiTimeStr: string,
  timezone: string,
  searchedDate: string,
  durationMinutes?: number
): string {
  const time = extractTimeFromAPI(apiTimeStr);
  if (!time) {
    return `${searchedDate}T00:00`;
  }

  let arrivalDate = searchedDate;

  if (durationMinutes && durationMinutes > 600) {
    const dep = new Date(`${searchedDate}T00:00:00Z`);
    dep.setUTCDate(dep.getUTCDate() + 1);
    arrivalDate = dep.toISOString().split("T")[0];
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${arrivalDate}T${pad(time.hours)}:${pad(time.minutes)}`;
}

export async function getFlightInfo(
  flightNumber: string,
  date: string
): Promise<FlightInfo | null> {
  const apiKey = process.env.AIRLABS_API_KEY;
  if (!apiKey) {
    throw new Error("AIRLABS_API_KEY is not configured");
  }

  const url = `${AIRLABS_BASE_URL}/flight?flight_iata=${encodeURIComponent(flightNumber)}&api_key=${apiKey}`;

  const response = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`AirLabs API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "Flight not found");
  }

  const flights = data.response || data;
  const flightArray = Array.isArray(flights) ? flights : [flights];

  if (flightArray.length === 0 || !flightArray[0]) {
    return null;
  }

  const flight = flightArray[0];

  const depTimezone = flight.dep_timezone || "UTC";
  const arrTimezone = flight.arr_timezone || "UTC";

  const depLocalDateTime = computeLocalDateTime(
    flight.dep_time || flight.dep_scheduled || "",
    depTimezone,
    date
  );

  const arrLocalDateTime = computeArrivalLocalDateTime(
    flight.arr_time || flight.arr_scheduled || "",
    arrTimezone,
    date,
    flight.duration
  );

  return {
    flightNumber: flight.flight_iata || flightNumber,
    airline: {
      name: flight.airline_name || "",
      iata: flight.airline_iata || "",
      icao: flight.airline_icao || "",
    },
    departure: {
      airport: flight.dep_name || "",
      iata: flight.dep_iata || "",
      icao: flight.dep_icao || "",
      scheduledTime: flight.dep_time || flight.dep_scheduled || "",
      timezone: depTimezone,
      localDateTime: depLocalDateTime,
    },
    arrival: {
      airport: flight.arr_name || "",
      iata: flight.arr_iata || "",
      icao: flight.arr_icao || "",
      scheduledTime: flight.arr_time || flight.arr_scheduled || "",
      timezone: arrTimezone,
      localDateTime: arrLocalDateTime,
    },
    aircraft: flight.aircraft_icao
      ? {
          iata: flight.aircraft_iata || "",
          icao: flight.aircraft_icao,
          regNumber: flight.reg_number || "",
        }
      : undefined,
    status: flight.status || "scheduled",
    duration: flight.duration || undefined,
  };
}

export interface AirportInfo {
  name: string;
  iata: string;
  icao: string;
  city: string;
  country: string;
}

export async function getAirportInfo(iata: string): Promise<AirportInfo | null> {
  const apiKey = process.env.AIRLABS_API_KEY;
  if (!apiKey) {
    throw new Error("AIRLABS_API_KEY is not configured");
  }

  const url = `${AIRLABS_BASE_URL}/airports?iata_code=${encodeURIComponent(iata)}&api_key=${apiKey}`;

  const response = await fetch(url, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  if (!data.response || data.response.length === 0) {
    return null;
  }

  const airport = data.response[0];

  return {
    name: airport.name || "",
    iata: airport.iata_code || "",
    icao: airport.icao_code || "",
    city: airport.city || "",
    country: airport.country_code || "",
  };
}
