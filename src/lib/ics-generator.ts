import ical from "ical-generator";

export interface ICSFlightData {
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    iata: string;
    time: string;
    timezone: string;
  };
  arrival: {
    airport: string;
    iata: string;
    time: string;
    timezone: string;
  };
  aircraft?: string;
  status?: string;
}

function localToUTC(localDateTime: string, timezone: string): Date {
  const [datePart, timePart] = localDateTime.split("T");
  if (!datePart || !timePart) return new Date(localDateTime);

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
  return new Date(localAsUTC - offsetHours * 60 * 60 * 1000);
}

export function generateICS(data: ICSFlightData): string {
  const calendar = ical({
    name: "Flight ICS Generator",
    prodId: "-//Flight ICS Generator//EN",
  });

  const depTime = localToUTC(data.departure.time, data.departure.timezone);
  const arrTime = localToUTC(data.arrival.time, data.arrival.timezone);

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

  event.id(`flight-${data.flightNumber}-${data.departure.time}@flight-ics`);

  return calendar.toString();
}
