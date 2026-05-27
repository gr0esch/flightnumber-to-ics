"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FlightFormProps {
  onSearch: (flightNumber: string, date: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function FlightForm({ onSearch, isLoading, error }: FlightFormProps) {
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (flightNumber.trim() && date) {
      onSearch(flightNumber.trim().toUpperCase(), date);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="flightNumber">Flight Number</Label>
        <Input
          id="flightNumber"
          placeholder="e.g. LX123, SQ26, BA12"
          value={flightNumber}
          onChange={(e) => setFlightNumber(e.target.value)}
          disabled={isLoading}
          className="uppercase"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Searching..." : "Search Flight"}
      </Button>
    </form>
  );
}
