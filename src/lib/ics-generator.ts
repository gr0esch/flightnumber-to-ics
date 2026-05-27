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

function localTimeToDate(localTimeStr: string, timezone: string): Date {
  const [datePart, timePart] = localTimeStr.split("T");
  if (!datePart || !timePart) {
    return new Date(localTimeStr);
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });

  const utcFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour12: false,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });

  const tzParts = formatter.formatToParts(utcDate);
  const utcParts = utcFormatter.formatToParts(utcDate);

  const tzHour = parseInt(tzParts.find((p) => p.type === "hour")?.value || "0", 10);
  const utcHour = parseInt(utcParts.find((p) => p.type === "hour")?.value || "0", 10);

  let offsetHours = tzHour - utcHour;
  if (offsetHours > 12) offsetHours -= 24;
  if (offsetHours < -12) offsetHours += 24;

  const correctUTC = new Date(utcDate.getTime() - offsetHours * 60 * 60 * 1000);

  return correctUTC;
}

export function generateICS(data: ICSFlightData): string {
  const calendar = ical({
    name: "Flight ICS Generator",
    prodId: "-//Flight ICS Generator//EN",
  });

  const depTime = localTimeToDate(data.departure.time, data.departure.timezone);
  const arrTime = localTimeToDate(data.arrival.time, data.arrival.timezone);

  const description = [
    `Flight: ${data.flightNumber}`,
    `Airline: ${data.airline}`,
    `Route: ${data.departure.iata} → ${data.arrival.iata}`,
    ``,
    `Departure:`,
    `  Airport: ${data.departure.airport} (${data.departure.iata})`,
    `  Time: ${depTime.toLocaleString()} (${data.departure.timezone})`,
    ``,
    `Arrival:`,
    `  Airport: ${data.arrival.airport} (${data.arrival.iata})`,
    `  Time: ${arrTime.toLocaleString()} (${data.arrival.timezone})`,
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
