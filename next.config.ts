import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's dev server only allows `localhost` by default; without this,
  // loading the app from this machine's LAN address (e.g. 192.168.1.23:3000)
  // silently breaks HMR and client-side route data fetching in dev mode.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["192.168.1.23", "*.local"],
};

export default nextConfig;
