import ical from "ical-generator";

export interface ICSFlightData {
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    iata: string;
    time: string;
    timezone: string;
    utcTime: string;
  };
  arrival: {
    airport: string;
    iata: string;
    time: string;
    timezone: string;
    utcTime: string;
  };
  aircraft?: string;
  status?: string;
}

function utcStringToDate(utcTimeStr: string): Date {
  const match = utcTimeStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return new Date(Date.UTC(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10)
    ));
  }
  return new Date(utcTimeStr);
}

export function generateICS(data: ICSFlightData): string {
  const calendar = ical({
    name: "Flight ICS Generator",
    prodId: "-//Flight ICS Generator//EN",
  });

  const depTime = utcStringToDate(data.departure.utcTime);
  const arrTime = utcStringToDate(data.arrival.utcTime);

  const description = [
    `Flight: ${data.flightNumber}`,
    `Airline: ${data.airline}`,
    `Route: ${data.departure.iata} → ${data.arrival.iata}`,
    ``,
    `Departure:`,
    `  Airport: ${data.departure.airport} (${data.departure.iata})`,
    `  Local Time: ${depTime.toLocaleString()} (${data.departure.timezone})`,
    ``,
    `Arrival:`,
    `  Airport: ${data.arrival.airport} (${data.arrival.iata})`,
    `  Local Time: ${arrTime.toLocaleString()} (${data.arrival.timezone})`,
    ``,
    data.aircraft ? `Aircraft: ${data.aircraft}` : "",
    data.status ? `Status: ${data.status}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const event = calendar.createEvent({
    start: depTime,
    end: arrTime,
    summary: `Flight ${data.flightNumber}: ${data.departure.iata} → ${data.arrival.iata}`,
    description,
    location: `${data.departure.airport} (${data.departure.iata})`,
  });

  event.id(`flight-${data.flightNumber}-${data.departure.utcTime}@flight-ics`);

  return calendar.toString();
}
