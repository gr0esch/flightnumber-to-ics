const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

export const siteUrl = fromEnv || "http://localhost:3000";
