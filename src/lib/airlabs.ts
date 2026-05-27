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
    utcDateTime?: string;
  };
  arrival: {
    airport: string;
    iata: string;
    icao: string;
    scheduledTime: string;
    timezone: string;
    localDateTime: string;
    utcDateTime?: string;
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

function parseUTCTime(utcStr: string): { hours: number; minutes: number } | null {
  if (!utcStr) return null;
  const match = utcStr.match(/(\d{2}):(\d{2})/);
  if (match) {
    return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
  }
  return null;
}

function computeUTCDateTime(dateStr: string, localTimeStr: string, utcTimeStr: string): string {
  const local = extractTimeFromAPI(localTimeStr);
  const utc = parseUTCTime(utcTimeStr);
  if (!local || !utc) {
    return `${dateStr}T00:00:00Z`;
  }

  const offsetMinutes = (local.hours * 60 + local.minutes) - (utc.hours * 60 + utc.minutes);

  const localAsUTC = Date.UTC(
    parseInt(dateStr.split("-")[0], 10),
    parseInt(dateStr.split("-")[1], 10) - 1,
    parseInt(dateStr.split("-")[2], 10),
    local.hours,
    local.minutes
  );

  const correctUTC = new Date(localAsUTC - offsetMinutes * 60 * 1000);

  const y = correctUTC.getUTCFullYear();
  const m = pad(correctUTC.getUTCMonth() + 1);
  const d = pad(correctUTC.getUTCDate());
  const h = pad(correctUTC.getUTCHours());
  const min = pad(correctUTC.getUTCMinutes());

  return `${y}-${m}-${d}T${h}:${min}:00Z`;
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

interface ScheduleResult {
  depTime: string;
  arrTime: string;
  depDate: string;
  arrDate: string;
  depUTC: string;
  arrUTC: string;
  duration?: number;
}

async function fetchSchedule(
  flightNumber: string,
  date: string,
  depIata: string,
  arrIata: string,
  apiKey: string
): Promise<ScheduleResult | null> {
  try {
    const res = await fetch(
      `${AIRLABS_BASE_URL}/schedules?flight_iata=${encodeURIComponent(flightNumber)}&date=${date}&api_key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (data.error || !data.response || data.response.length === 0) return null;

    const scheduleArray = Array.isArray(data.response) ? data.response : [data.response];
    const schedule = scheduleArray.find(
      (s: any) => s.dep_iata === depIata && s.arr_iata === arrIata
    ) || scheduleArray[0];

    if (!schedule || !schedule.dep_time_utc || !schedule.arr_time_utc) return null;

    const depUTCMatch = schedule.dep_time_utc.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    const arrUTCMatch = schedule.arr_time_utc.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);

    if (!depUTCMatch || !arrUTCMatch) return null;

    const depUTCDate = new Date(Date.UTC(
      parseInt(depUTCMatch[1], 10), parseInt(depUTCMatch[2], 10) - 1,
      parseInt(depUTCMatch[3], 10), parseInt(depUTCMatch[4], 10), parseInt(depUTCMatch[5], 10)
    ));

    const arrUTCDate = new Date(Date.UTC(
      parseInt(arrUTCMatch[1], 10), parseInt(arrUTCMatch[2], 10) - 1,
      parseInt(arrUTCMatch[3], 10), parseInt(arrUTCMatch[4], 10), parseInt(arrUTCMatch[5], 10)
    ));

    const depTime = schedule.dep_time || `${depUTCMatch[4]}:${depUTCMatch[5]}`;
    const arrTime = schedule.arr_time || `${arrUTCMatch[4]}:${arrUTCMatch[5]}`;

    const depDate = schedule.dep_date || date;
    const arrDate = computeArrivalDate(depDate, depTime, arrTime, schedule.duration);

    return {
      depTime,
      arrTime,
      depDate,
      arrDate,
      depUTC: depUTCDate.toISOString(),
      arrUTC: arrUTCDate.toISOString(),
      duration: schedule.duration,
    };
  } catch {
    return null;
  }
}

interface RouteResult {
  depTime: string;
  arrTime: string;
  depUTC: string;
  arrUTC: string;
  duration?: number;
}

async function fetchRoute(
  flightNumber: string,
  apiKey: string
): Promise<RouteResult | null> {
  try {
    const res = await fetch(
      `${AIRLABS_BASE_URL}/routes?flight_iata=${encodeURIComponent(flightNumber)}&api_key=${apiKey}`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (data.error || !data.response || data.response.length === 0) return null;

    const routeArray = Array.isArray(data.response) ? data.response : [data.response];
    const route = routeArray[0];

    if (!route || !route.dep_time_utc || !route.arr_time_utc) return null;

    return {
      depTime: route.dep_time || "",
      arrTime: route.arr_time || "",
      depUTC: route.dep_time_utc || "",
      arrUTC: route.arr_time_utc || "",
      duration: route.duration,
    };
  } catch {
    return null;
  }
}

export async function getFlightInfo(
  flightNumber: string,
  date: string
): Promise<FlightInfo | null> {
  const apiKey = process.env.AIRLABS_API_KEY;
  if (!apiKey) {
    throw new Error("AIRLABS_API_KEY is not configured");
  }

  const flightRes = await fetch(
    `${AIRLABS_BASE_URL}/flight?flight_iata=${encodeURIComponent(flightNumber)}&api_key=${apiKey}`,
    { next: { revalidate: 60 } }
  );

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

  const depIata = flight.dep_iata || "";
  const arrIata = flight.arr_iata || "";

  const [schedule, route] = await Promise.all([
    fetchSchedule(flightNumber, date, depIata, arrIata, apiKey),
    fetchRoute(flightNumber, apiKey),
  ]);

  let depScheduledTime: string;
  let arrScheduledTime: string;
  let depDate: string;
  let arrDate: string;
  let depUTC: string;
  let arrUTC: string;
  let duration: number | undefined;

  if (schedule) {
    depScheduledTime = schedule.depTime;
    arrScheduledTime = schedule.arrTime;
    depDate = schedule.depDate;
    arrDate = schedule.arrDate;
    depUTC = schedule.depUTC;
    arrUTC = schedule.arrUTC;
    duration = schedule.duration;
  } else if (route) {
    depScheduledTime = route.depTime;
    arrScheduledTime = route.arrTime;
    depDate = date;
    arrDate = computeArrivalDate(date, route.depTime, route.arrTime, route.duration);
    depUTC = computeUTCDateTime(depDate, route.depTime, route.depUTC);
    arrUTC = computeUTCDateTime(arrDate, route.arrTime, route.arrUTC);
    duration = route.duration;
  } else {
    depScheduledTime = flight.dep_time || "";
    arrScheduledTime = flight.arr_time || "";
    depDate = date;
    arrDate = computeArrivalDate(date, depScheduledTime, arrScheduledTime, flight.duration);
    depUTC = "";
    arrUTC = "";
    duration = flight.duration;
  }

  const depTimezone = flight.dep_timezone || null;
  const arrTimezone = flight.arr_timezone || null;

  const [finalDepTz, finalArrTz] = await Promise.all([
    depTimezone && depTimezone !== "UTC" ? Promise.resolve(depTimezone) : getAirportTimezone(depIata, apiKey),
    arrTimezone && arrTimezone !== "UTC" ? Promise.resolve(arrTimezone) : getAirportTimezone(arrIata, apiKey),
  ]);

  return {
    flightNumber: flight.flight_iata || flightNumber,
    airline: {
      name: flight.airline_name || "",
      iata: flight.airline_iata || "",
      icao: flight.airline_icao || "",
    },
    departure: {
      airport: flight.dep_name || "",
      iata: depIata,
      icao: flight.dep_icao || "",
      scheduledTime: depScheduledTime,
      timezone: finalDepTz || "UTC",
      localDateTime: buildLocalDateTime(depDate, depScheduledTime),
      utcDateTime: depUTC || undefined,
    },
    arrival: {
      airport: flight.arr_name || "",
      iata: arrIata,
      icao: flight.arr_icao || "",
      scheduledTime: arrScheduledTime,
      timezone: finalArrTz || "UTC",
      localDateTime: buildLocalDateTime(arrDate, arrScheduledTime),
      utcDateTime: arrUTC || undefined,
    },
    aircraft: flight.aircraft_icao
      ? {
          iata: flight.aircraft_iata || "",
          icao: flight.aircraft_icao,
          regNumber: flight.reg_number || "",
        }
      : undefined,
    status: flight.status || "scheduled",
    duration,
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
