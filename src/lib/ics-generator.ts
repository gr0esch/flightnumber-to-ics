import ical from "ical-generator";

export interface ICSFlightData {
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    iata: string;
    time: string;
  };
  arrival: {
    airport: string;
    iata: string;
    time: string;
  };
  aircraft?: string;
  status?: string;
}

export function generateICS(data: ICSFlightData): string {
  const calendar = ical({
    name: "Flight ICS Generator",
    prodId: "-//Flight ICS Generator//EN",
  });

  const depTime = new Date(data.departure.time);
  const arrTime = new Date(data.arrival.time);

  const description = [
    `Flight: ${data.flightNumber}`,
    `Airline: ${data.airline}`,
    `Route: ${data.departure.iata} → ${data.arrival.iata}`,
    ``,
    `Departure:`,
    `  Airport: ${data.departure.airport} (${data.departure.iata})`,
    `  Time: ${depTime.toLocaleString()}`,
    ``,
    `Arrival:`,
    `  Airport: ${data.arrival.airport} (${data.arrival.iata})`,
    `  Time: ${arrTime.toLocaleString()}`,
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
