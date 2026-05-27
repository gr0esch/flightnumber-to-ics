"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlightInfo } from "@/lib/airlabs";

interface FlightResultProps {
  flightInfo: FlightInfo;
  onDownloadICS: (data: {
    departureTime: string;
    arrivalTime: string;
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
  const [departureTime, setDepartureTime] = useState(
    flightInfo.departure.localDateTime || ""
  );
  const [arrivalTime, setArrivalTime] = useState(
    flightInfo.arrival.localDateTime || ""
  );

  const handleDownload = () => {
    onDownloadICS({
      departureTime,
      arrivalTime,
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">✈</span>
          {flightInfo.departure.iata} → {flightInfo.arrival.iata}
        </CardTitle>
        <CardDescription>
          {flightInfo.airline.name} - {flightInfo.flightNumber}
          {flightInfo.aircraft?.icao && ` • ${flightInfo.aircraft.icao}`}
          {flightInfo.duration && ` • ${formatDuration(flightInfo.duration)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Departure Time (editable)</Label>
            <Input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {flightInfo.departure.airport} ({flightInfo.departure.iata})
              <br />
              <span className="text-xs">Local time ({flightInfo.departure.timezone})</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label>Arrival Time (editable)</Label>
            <Input
              type="datetime-local"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {flightInfo.arrival.airport} ({flightInfo.arrival.iata})
              <br />
              <span className="text-xs">Local time ({flightInfo.arrival.timezone})</span>
            </p>
          </div>
        </div>

        <Separator />

        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>Status:</strong> {flightInfo.status}
          </p>
          {flightInfo.aircraft?.regNumber && (
            <p>
              <strong>Registration:</strong> {flightInfo.aircraft.regNumber}
            </p>
          )}
        </div>

        {downloadError && (
          <Alert variant="destructive">
            <AlertDescription>{downloadError}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleDownload} className="w-full" disabled={isDownloading}>
          {isDownloading ? "Generating..." : "Download ICS"}
        </Button>
      </CardContent>
    </Card>
  );
}
