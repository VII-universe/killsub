import type { NextConfig } from "next";

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

export default nextConfig;
