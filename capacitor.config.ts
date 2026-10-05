import type { CapacitorConfig } from '@capacitor/cli';

// Killsub's Next.js app relies on Server Actions, auth middleware, and
// server-rendered data fetching — none of which survive a static export.
// So instead of bundling a static build, the native shell loads the live
// Vercel deployment directly over the network (server.url below). webDir
// still has to exist for `cap sync`, but its contents are never shown; see
// capacitor-shell/index.html for why.
const config: CapacitorConfig = {
  appId: 'com.killsub.app',
  appName: 'Killsub',
  webDir: 'capacitor-shell',
  server: {
    url: 'https://killsub.vercel.app',
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
