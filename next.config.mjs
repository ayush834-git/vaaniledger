import withPWAInit from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
    outputFileTracingIncludes: {
      "/api/report/monthly": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

export default withPWA(nextConfig);