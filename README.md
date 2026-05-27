# Flight ICS Generator

A simple webapp that lets users input a flight number and date, fetches flight information via AirLabs API, and generates a downloadable ICS calendar file.

## Features

- Search flights by flight number (e.g., LX123, SQ26, BA12)
- View flight details: route, airline, aircraft, scheduled times
- Edit departure/arrival times before generating ICS
- Download ICS file for calendar integration

## Prerequisites

- Node.js 18+
- AirLabs API key (free signup at [airlabs.co](https://airlabs.co/signup))

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API key

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your AirLabs API key:

```
AIRLABS_API_KEY=your_api_key_here
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker Deployment

### Build and run with docker-compose

```bash
# Create .env file with your API key
echo "AIRLABS_API_KEY=your_key_here" > .env

# Build and start
docker compose up -d --build
```

The app will be available at [http://localhost:80](http://localhost:80).

### Stop

```bash
docker compose down
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + shadcn/ui + Tailwind CSS
- **API**: AirLabs (1,000 req/month free)
- **ICS Generation**: ical-generator
- **Deployment**: Docker + nginx reverse proxy

## API

### `POST /api/flight-info`

Search for flight information.

**Request**:
```json
{
  "flightNumber": "LX123",
  "date": "2024-03-15"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "flightNumber": "LX123",
    "airline": { "name": "Swiss", "iata": "LX", "icao": "SWR" },
    "departure": { "airport": "Zurich Airport", "iata": "ZRH", "scheduledTime": "..." },
    "arrival": { "airport": "Hong Kong Intl", "iata": "HKG", "scheduledTime": "..." },
    "status": "scheduled"
  }
}
```

### `POST /api/generate-ics`

Generate and download ICS file.

**Request**:
```json
{
  "flightNumber": "LX123",
  "airline": "Swiss International Air Lines",
  "departure": { "airport": "Zurich Airport", "iata": "ZRH", "time": "2024-03-15T13:30:00" },
  "arrival": { "airport": "Hong Kong Intl", "iata": "HKG", "time": "2024-03-16T06:45:00" }
}
```

**Response**: ICS file download
