"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlightInfo } from "@/lib/airlabs";

interface FlightResultProps {
  flightInfo: FlightInfo;
  onDownloadICS: (data: {
    departureTime: string;
    arrivalTime: string;
    departureUTC?: string;
    arrivalUTC?: string;
  }) => void;
  isDownloading: boolean;
  downloadError: string | null;
}

export function FlightResult({
  flightInfo,
  onDownloadICS,
  isDownloading,
  downloadError,
}: FlightResultProps) {
  const initialDepartureTime = flightInfo.departure.localDateTime || "";
  const initialArrivalTime = flightInfo.arrival.localDateTime || "";
  const [departureTime, setDepartureTime] = useState(initialDepartureTime);
  const [arrivalTime, setArrivalTime] = useState(initialArrivalTime);

  const handleDownload = () => {
    const departureUnedited = departureTime === initialDepartureTime;
    const arrivalUnedited = arrivalTime === initialArrivalTime;
    onDownloadICS({
      departureTime,
      arrivalTime,
      departureUTC: departureUnedited ? flightInfo.departure.utcDateTime : undefined,
      arrivalUTC: arrivalUnedited ? flightInfo.arrival.utcDateTime : undefined,
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateTime: string) => {
    const [, time] = dateTime.split("T");
    return time || "";
  };

  const formatDate = (dateTime: string) => {
    const [date] = dateTime.split("T");
    return date || "";
  };

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden shadow-sm">
      <div className="bg-brand/5 border-b border-border-subtle px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8.5l-8.2-1.8c-.4-.1-.8.1-.9.5l-.9 3c-.1.4.1.8.5.9l5.5 1.5-3.2 3.2c-1 1-1.5 2-1 3 1 .5 3 0 4.5-1.5l3.5-3.5 8.2 1.8c.4.1.8-.1.9-.5l.9-3c.1-.4-.1-.8-.5-.9z" />
              </svg>
            </div>
            <div>
              <p className="font-display font-semibold text-foreground text-lg">
                {flightInfo.departure.iata}
                <span className="text-muted-foreground mx-2 font-normal">→</span>
                {flightInfo.arrival.iata}
              </p>
              <p className="text-sm text-muted-foreground">
                {flightInfo.airline.name} · {flightInfo.flightNumber}
              </p>
            </div>
          </div>
          <div className="text-right">
            {flightInfo.duration && (
              <p className="text-sm font-mono-alt text-muted-foreground">
                {formatDuration(flightInfo.duration)}
              </p>
            )}
            {flightInfo.aircraft?.icao && (
              <p className="text-xs font-mono-alt text-muted-foreground">
                {flightInfo.aircraft.icao}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand" />
              <Label className="text-sm font-display font-medium text-foreground tracking-wide">
                Departure
              </Label>
            </div>
            <Input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="h-10 font-mono-alt bg-input/50 border-border-subtle focus-visible:ring-brand/30 transition-all"
            />
            <div className="space-y-0.5">
              <p className="text-sm text-foreground font-medium">
                {flightInfo.departure.airport}
              </p>
              <p className="text-xs text-muted-foreground font-mono-alt">
                {formatDate(departureTime)} · {formatTime(departureTime)} ({flightInfo.departure.timezone})
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-warm" />
              <Label className="text-sm font-display font-medium text-foreground tracking-wide">
                Arrival
              </Label>
            </div>
            <Input
              type="datetime-local"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="h-10 font-mono-alt bg-input/50 border-border-subtle focus-visible:ring-brand/30 transition-all"
            />
            <div className="space-y-0.5">
              <p className="text-sm text-foreground font-medium">
                {flightInfo.arrival.airport}
              </p>
              <p className="text-xs text-muted-foreground font-mono-alt">
                {formatDate(arrivalTime)} · {formatTime(arrivalTime)} ({flightInfo.arrival.timezone})
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border-subtle">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            {flightInfo.status}
          </span>
          {flightInfo.aircraft?.regNumber && (
            <span className="font-mono-alt">
              Reg: {flightInfo.aircraft.regNumber}
            </span>
          )}
        </div>

        {downloadError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive font-medium">{downloadError}</p>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full h-11 rounded-lg bg-brand text-brand-foreground font-display font-medium tracking-wide text-sm transition-all hover:bg-brand/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] inline-flex items-center justify-center gap-2"
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download ICS
            </>
          )}
        </button>
      </div>
    </div>
  );
}
