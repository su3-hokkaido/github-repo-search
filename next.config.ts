import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Allow next/image to load GitHub owner avatars.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  // Baseline security headers applied to every response.
  // NOTE: The Content-Security-Policy below is a conservative starter and is
  // commented out because a too-strict CSP can break the Next.js dev server
  // (which uses inline scripts / eval). Enable and tune it for production before
  // shipping, ideally starting in Content-Security-Policy-Report-Only mode.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // {
          //   key: "Content-Security-Policy",
          //   value: [
          //     "default-src 'self'",
          //     "img-src 'self' https://avatars.githubusercontent.com data:",
          //     "style-src 'self' 'unsafe-inline'",
          //     "script-src 'self'",
          //     "connect-src 'self'",
          //     "frame-ancestors 'none'",
          //   ].join("; "),
          // },
        ],
      },
    ];
  },
};

// next-intl plugin wires up ./i18n/request.ts for Server Components.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);

// OpenNext: make Cloudflare bindings (KV, etc.) available during `next dev`.
// Safe to keep here; it is a no-op outside the Cloudflare dev flow.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
void initOpenNextCloudflareForDev();
