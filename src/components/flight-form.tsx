"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="flightNumber" className="text-sm font-medium text-foreground font-display tracking-wide">
            Flight Number
          </Label>
          <Input
            id="flightNumber"
            placeholder="LX123"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            disabled={isLoading}
            className="h-11 font-mono-alt text-base tracking-wider uppercase bg-input/50 border-border-subtle focus-visible:ring-brand/30 transition-all"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date" className="text-sm font-medium text-foreground font-display tracking-wide">
            Date
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isLoading}
            className="h-11 bg-input/50 border-border-subtle focus-visible:ring-brand/30 transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !flightNumber.trim()}
        className="w-full h-11 rounded-lg bg-brand text-brand-foreground font-display font-medium tracking-wide text-sm transition-all hover:bg-brand/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Searching...
          </span>
        ) : (
          "Search Flight"
        )}
      </button>
    </form>
  );
}
