/** @type {import('next').NextConfig} */
const backendOrigin =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8080";

const backendApiRoutes = [
  "auth",
  "bookings",
  "crew",
  "credits",
  "market",
  "notifications",
  "swap-requests",
  "users",
];

const nextConfig = {
  allowedDevOrigins: ["172.30.1.32", "172.30.1.33", "192.168.0.101", "192.168.0.132"],
  async rewrites() {
    return backendApiRoutes.map((route) => ({
      source: `/api/${route}/:path*`,
      destination: `${backendOrigin}/api/${route}/:path*`,
    }));
  },
};

export default nextConfig;

