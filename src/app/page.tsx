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
    departureUTC,
    arrivalUTC,
  }: {
    departureTime: string;
    arrivalTime: string;
    departureUTC?: string;
    arrivalUTC?: string;
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
            timezone: flightInfo.departure.timezone,
            utc: departureUTC,
          },
          arrival: {
            airport: flightInfo.arrival.airport,
            iata: flightInfo.arrival.iata,
            time: arrivalTime,
            timezone: flightInfo.arrival.timezone,
            utc: arrivalUTC,
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
    <main className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-muted/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-warm/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 py-16 md:py-24">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border-subtle text-xs font-medium text-muted-foreground mb-6 font-mono-alt tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            FLIGHT ICS GENERATOR
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-3">
            Flight to Calendar
          </h1>
          <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
            Enter a flight number and date to generate a downloadable calendar event
          </p>
        </header>

        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6 md:p-8 shadow-sm">
          <FlightForm
            onSearch={handleSearch}
            isLoading={isLoading}
            error={error}
          />
        </div>

        {flightInfo && (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <FlightResult
              flightInfo={flightInfo}
              onDownloadICS={handleDownloadICS}
              isDownloading={isDownloading}
              downloadError={downloadError}
            />
          </div>
        )}

        <footer className="mt-16 text-center space-y-2">
          <p className="text-xs text-muted-foreground font-mono-alt">
            Powered by AirLabs API
          </p>
          <p className="text-xs text-muted-foreground font-mono-alt">
            © 2026
            <span className="mx-2">·</span>
            Built by{" "}
            <a
              href="https://www.groes.ch/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline hover:text-foreground transition-colors"
            >
              Samuel Groesch
            </a>
            <span className="mx-2">·</span>
            <a
              href="https://samuelgroesch.de/impressum/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline hover:text-foreground transition-colors"
            >
              Imprint
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
