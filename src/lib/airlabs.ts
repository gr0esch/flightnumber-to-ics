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

function localToUTC(localDateTime: string, timezone: string): string {
  const [datePart, timePart] = localDateTime.split("T");
  if (!datePart || !timePart) return localDateTime;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  const refUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const tzHourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    hour: "numeric",
  }).format(refUTC);

  const tzHour = parseInt(tzHourStr, 10);
  const offsetHours = tzHour - 12;

  const localAsUTC = Date.UTC(year, month - 1, day, hours, minutes);
  const correctUTC = new Date(localAsUTC - offsetHours * 60 * 60 * 1000);

  return correctUTC.toISOString().replace(/\.\d{3}Z$/, "").replace("T", " ");
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

  const depTimezone = flight.dep_timezone || schedule?.dep_timezone || null;
  const arrTimezone = flight.arr_timezone || schedule?.arr_timezone || null;

  const [finalDepTz, finalArrTz] = await Promise.all([
    depTimezone && depTimezone !== "UTC" ? Promise.resolve(depTimezone) : getAirportTimezone(depIata, apiKey),
    arrTimezone && arrTimezone !== "UTC" ? Promise.resolve(arrTimezone) : getAirportTimezone(arrIata, apiKey),
  ]);

  let depScheduledTime: string;
  let arrScheduledTime: string;
  let depDate: string;
  let arrDate: string;

  if (schedule && schedule.dep_time_utc && schedule.arr_time_utc) {
    const depUTC = schedule.dep_time_utc;
    const arrUTC = schedule.arr_time_utc;

    const depMatch = depUTC.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    const arrMatch = arrUTC.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);

    if (depMatch && arrMatch) {
      const depUTCDate = new Date(Date.UTC(
        parseInt(depMatch[1], 10), parseInt(depMatch[2], 10) - 1,
        parseInt(depMatch[3], 10), parseInt(depMatch[4], 10), parseInt(depMatch[5], 10)
      ));

      const arrUTCDate = new Date(Date.UTC(
        parseInt(arrMatch[1], 10), parseInt(arrMatch[2], 10) - 1,
        parseInt(arrMatch[3], 10), parseInt(arrMatch[4], 10), parseInt(arrMatch[5], 10)
      ));

      const depLocalStr = depUTCDate.toLocaleString("en-CA", { timeZone: finalDepTz || "UTC", hour12: false });
      const arrLocalStr = arrUTCDate.toLocaleString("en-CA", { timeZone: finalArrTz || "UTC", hour12: false });

      const depLocalMatch = depLocalStr.match(/(\d{4})-(\d{2})-(\d{2}),\s+(\d{2}):(\d{2})/);
      const arrLocalMatch = arrLocalStr.match(/(\d{4})-(\d{2})-(\d{2}),\s+(\d{2}):(\d{2})/);

      if (depLocalMatch && arrLocalMatch) {
        depDate = `${depLocalMatch[1]}-${depLocalMatch[2]}-${depLocalMatch[3]}`;
        arrDate = `${arrLocalMatch[1]}-${arrLocalMatch[2]}-${arrLocalMatch[3]}`;
        depScheduledTime = `${depLocalMatch[4]}:${depLocalMatch[5]}`;
        arrScheduledTime = `${arrLocalMatch[4]}:${arrLocalMatch[5]}`;
      } else {
        depScheduledTime = schedule.dep_time || flight.dep_time || "";
        arrScheduledTime = schedule.arr_time || flight.arr_time || "";
        depDate = schedule.dep_date || date;
        arrDate = computeArrivalDate(depDate, depScheduledTime, arrScheduledTime, schedule.duration || flight.duration);
      }
    } else {
      depScheduledTime = schedule.dep_time || flight.dep_time || "";
      arrScheduledTime = schedule.arr_time || flight.arr_time || "";
      depDate = schedule.dep_date || date;
      arrDate = computeArrivalDate(depDate, depScheduledTime, arrScheduledTime, schedule.duration || flight.duration);
    }
  } else {
    depScheduledTime = schedule?.dep_time || flight.dep_time || "";
    arrScheduledTime = schedule?.arr_time || flight.arr_time || "";
    depDate = schedule?.dep_date || date;
    arrDate = computeArrivalDate(depDate, depScheduledTime, arrScheduledTime, schedule?.duration || flight.duration);
  }

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
    },
    arrival: {
      airport: flight.arr_name || schedule?.arr_name || "",
      iata: arrIata,
      icao: flight.arr_icao || schedule?.arr_icao || "",
      scheduledTime: arrScheduledTime,
      timezone: finalArrTz || "UTC",
      localDateTime: buildLocalDateTime(arrDate, arrScheduledTime),
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
