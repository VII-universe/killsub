import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'www.google.com', pathname: '/s2/favicons' }],
  },
  // pdf-parse (pdfjs-dist) loads its worker as a relative .mjs file at runtime;
  // Next's default bundling doesn't carry that file along, so keep this package
  // un-bundled (plain `require` from node_modules) in the serverless output.
  serverExternalPackages: ['pdf-parse'],
  // The worker file above is loaded via a dynamic, non-statically-analyzable
  // path, so Vercel's file tracer (@vercel/nft) doesn't detect it's needed and
  // excludes it from the deployed function — include it explicitly.
  outputFileTracingIncludes: {
    '/api/import': ['./node_modules/pdfjs-dist/**/*'],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  // No authToken configured yet (user hasn't set up a Sentry project) — skip
  // source map upload entirely rather than warn on every build.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
