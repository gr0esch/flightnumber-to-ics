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
    utcDateTime: string;
  };
  arrival: {
    airport: string;
    iata: string;
    icao: string;
    scheduledTime: string;
    timezone: string;
    localDateTime: string;
    utcDateTime: string;
  };
  aircraft?: {
    iata: string;
    icao: string;
    regNumber: string;
  };
  status: string;
  duration?: number;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function buildLocalDateTime(dateStr: string, timeStr: string): string {
  const time = extractTimeFromAPI(timeStr);
  if (!time) return `${dateStr}T00:00`;
  return `${dateStr}T${pad(time.hours)}:${pad(time.minutes)}`;
}

function extractTimeFromAPI(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{2}):(\d{2})/);
  if (match) {
    return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
  }
  return null;
}

function computeArrivalDate(depDate: string, depTimeStr: string, arrTimeStr: string, durationMinutes?: number): string {
  if (durationMinutes && durationMinutes > 600) {
    const d = new Date(`${depDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split("T")[0];
  }

  const depTime = extractTimeFromAPI(depTimeStr);
  const arrTime = extractTimeFromAPI(arrTimeStr);
  if (depTime && arrTime) {
    const depMinutes = depTime.hours * 60 + depTime.minutes;
    const arrMinutes = arrTime.hours * 60 + arrTime.minutes;
    if (arrMinutes < depMinutes) {
      const d = new Date(`${depDate}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().split("T")[0];
    }
  }

  return depDate;
}

function parseUTCDateTime(utcStr: string): string | null {
  if (!utcStr) return null;
  const match = utcStr.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }
  return null;
}

async function getAirportTimezone(iata: string, apiKey: string): Promise<string | null> {
  try {
    const url = `${AIRLABS_BASE_URL}/airports?iata_code=${encodeURIComponent(iata)}&api_key=${apiKey}`;
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;

    const data = await response.json();
    if (data.response && data.response.length > 0) {
      return data.response[0].timezone || null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function getFlightInfo(
  flightNumber: string,
  date: string
): Promise<FlightInfo | null> {
  const apiKey = process.env.AIRLABS_API_KEY;
  if (!apiKey) {
    throw new Error("AIRLABS_API_KEY is not configured");
  }

  const [flightRes, scheduleRes] = await Promise.all([
    fetch(
      `${AIRLABS_BASE_URL}/flight?flight_iata=${encodeURIComponent(flightNumber)}&api_key=${apiKey}`,
      { next: { revalidate: 60 } }
    ),
    fetch(
      `${AIRLABS_BASE_URL}/schedules?flight_iata=${encodeURIComponent(flightNumber)}&date=${date}&api_key=${apiKey}`,
      { next: { revalidate: 3600 } }
    ),
  ]);

  if (!flightRes.ok) {
    throw new Error(`AirLabs API error: ${flightRes.statusText}`);
  }

  const flightData = await flightRes.json();
  if (flightData.error) {
    throw new Error(flightData.error.message || "Flight not found");
  }

  const flightArray = Array.isArray(flightData.response) ? flightData.response : [flightData.response];
  const flight = flightArray[0];
  if (!flight) return null;

  let schedule: any = null;
  if (scheduleRes.ok) {
    const scheduleData = await scheduleRes.json();
    if (!scheduleData.error && scheduleData.response) {
      const scheduleArray = Array.isArray(scheduleData.response) ? scheduleData.response : [scheduleData.response];
      schedule = scheduleArray.find(
        (s: any) => s.dep_iata === flight.dep_iata && s.arr_iata === flight.arr_iata
      ) || scheduleArray[0];
    }
  }

  const depIata = flight.dep_iata || schedule?.dep_iata || "";
  const arrIata = flight.arr_iata || schedule?.arr_iata || "";

  const depScheduledTime = schedule
    ? schedule.dep_time || schedule.dep_scheduled || flight.dep_time || flight.dep_scheduled || ""
    : flight.dep_time || flight.dep_scheduled || "";
  const arrScheduledTime = schedule
    ? schedule.arr_time || schedule.arr_scheduled || flight.arr_time || flight.arr_scheduled || ""
    : flight.arr_time || flight.arr_scheduled || "";

  const depDate = schedule ? schedule.dep_date || date : date;
  const arrDate = computeArrivalDate(depDate, depScheduledTime, arrScheduledTime, schedule?.duration || flight.duration);

  const depTimezone = flight.dep_timezone || schedule?.dep_timezone || null;
  const arrTimezone = flight.arr_timezone || schedule?.arr_timezone || null;

  const [finalDepTz, finalArrTz] = await Promise.all([
    depTimezone && depTimezone !== "UTC" ? Promise.resolve(depTimezone) : getAirportTimezone(depIata, apiKey),
    arrTimezone && arrTimezone !== "UTC" ? Promise.resolve(arrTimezone) : getAirportTimezone(arrIata, apiKey),
  ]);

  const depUTC = parseUTCDateTime(flight.dep_time_utc) || `${depDate}T${extractTimeFromAPI(depScheduledTime)?.hours.toString().padStart(2, "0")}:${extractTimeFromAPI(depScheduledTime)?.minutes.toString().padStart(2, "0")}`;
  const arrUTC = parseUTCDateTime(flight.arr_time_utc) || `${arrDate}T${extractTimeFromAPI(arrScheduledTime)?.hours.toString().padStart(2, "0")}:${extractTimeFromAPI(arrScheduledTime)?.minutes.toString().padStart(2, "0")}`;

  return {
    flightNumber: flight.flight_iata || flightNumber,
    airline: {
      name: flight.airline_name || "",
      iata: flight.airline_iata || "",
      icao: flight.airline_icao || "",
    },
    departure: {
      airport: flight.dep_name || schedule?.dep_name || "",
      iata: depIata,
      icao: flight.dep_icao || schedule?.dep_icao || "",
      scheduledTime: depScheduledTime,
      timezone: finalDepTz || "UTC",
      localDateTime: buildLocalDateTime(depDate, depScheduledTime),
      utcDateTime: depUTC,
    },
    arrival: {
      airport: flight.arr_name || schedule?.arr_name || "",
      iata: arrIata,
      icao: flight.arr_icao || schedule?.arr_icao || "",
      scheduledTime: arrScheduledTime,
      timezone: finalArrTz || "UTC",
      localDateTime: buildLocalDateTime(arrDate, arrScheduledTime),
      utcDateTime: arrUTC,
    },
    aircraft: flight.aircraft_icao
      ? {
          iata: flight.aircraft_iata || "",
          icao: flight.aircraft_icao,
          regNumber: flight.reg_number || "",
        }
      : undefined,
    status: flight.status || "scheduled",
    duration: schedule?.duration || flight.duration || undefined,
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
