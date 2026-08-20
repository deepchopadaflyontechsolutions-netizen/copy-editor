import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js dev server blocks cross-origin requests to /_next/* assets by
  // default (see AGENTS.md — this is new in this Next.js version). Without
  // this, opening the app via a LAN IP instead of localhost gets its JS/CSS
  // chunks 403'd, so React never hydrates and the page is stuck on the
  // server-rendered (mobile) fallback. Wildcards cover common home/office
  // LAN subnets so this keeps working across DHCP IP changes.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
