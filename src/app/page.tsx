"use client";

import { useState } from "react";
import { FlightForm } from "@/components/flight-form";
import { FlightResult } from "@/components/flight-result";
import { FlightInfo } from "@/lib/airlabs";

export default function Home() {
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleSearch = async (flightNumber: string, date: string) => {
    setIsLoading(true);
    setError(null);
    setFlightInfo(null);

    try {
      const response = await fetch("/api/flight-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flightNumber, date }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch flight information");
        return;
      }

      setFlightInfo(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadICS = async ({
    departureTime,
    arrivalTime,
  }: {
    departureTime: string;
    arrivalTime: string;
  }) => {
    if (!flightInfo) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch("/api/generate-ics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightNumber: flightInfo.flightNumber,
          airline: flightInfo.airline.name,
          departure: {
            airport: flightInfo.departure.airport,
            iata: flightInfo.departure.iata,
            time: departureTime,
          },
          arrival: {
            airport: flightInfo.arrival.airport,
            iata: flightInfo.arrival.iata,
            time: arrivalTime,
          },
          aircraft: flightInfo.aircraft?.icao,
          status: flightInfo.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setDownloadError(data.error || "Failed to generate ICS");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flight-${flightInfo.flightNumber}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Flight ICS Generator
          </h1>
          <p className="text-muted-foreground">
            Enter a flight number and date to generate a calendar event
          </p>
        </div>

        <FlightForm
          onSearch={handleSearch}
          isLoading={isLoading}
          error={error}
        />

        {flightInfo && (
          <FlightResult
            flightInfo={flightInfo}
            onDownloadICS={handleDownloadICS}
            isDownloading={isDownloading}
            downloadError={downloadError}
          />
        )}
      </div>
    </main>
  );
}
