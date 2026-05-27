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
  };
  arrival: {
    airport: string;
    iata: string;
    icao: string;
    scheduledTime: string;
    timezone: string;
  };
  aircraft?: {
    iata: string;
    icao: string;
    regNumber: string;
  };
  status: string;
  duration?: number;
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

  if (!data.response || data.response.length === 0) {
    return null;
  }

  const flight = data.response[0];

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
      timezone: flight.dep_timezone || "",
    },
    arrival: {
      airport: flight.arr_name || "",
      iata: flight.arr_iata || "",
      icao: flight.arr_icao || "",
      scheduledTime: flight.arr_time || flight.arr_scheduled || "",
      timezone: flight.arr_timezone || "",
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
