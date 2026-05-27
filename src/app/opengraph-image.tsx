import { ImageResponse } from "next/og";

export const alt = "Flight to Calendar — Generate ICS Calendar Events from Flight Numbers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #1f3a5f 0%, #2f4f7c 55%, #3a5e94 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f8fafc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8.5l-8.2-1.8c-.4-.1-.8.1-.9.5l-.9 3c-.1.4.1.8.5.9l5.5 1.5-3.2 3.2c-1 1-1.5 2-1 3 1 .5 3 0 4.5-1.5l3.5-3.5 8.2 1.8c.4.1.8-.1.9-.5l.9-3c.1-.4-.1-.8-.5-.9z" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 22,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(248,250,252,0.75)",
            }}
          >
            Flight ICS Generator
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Flight to Calendar
          </div>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.35,
              color: "rgba(248,250,252,0.82)",
              maxWidth: 920,
            }}
          >
            Turn any flight number into a downloadable .ics event with accurate
            timezones in seconds.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "rgba(248,250,252,0.65)",
            fontFamily: "monospace",
          }}
        >
          <span>flightnumber → .ics</span>
          <span>groes.ch</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
