This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Mobile app (Capacitor)

The iOS and Android apps are **not** a static export of this Next.js app. Killsub relies on Server Actions (`src/app/actions/`), auth middleware (`src/proxy.ts`), and server-rendered data fetching throughout the dashboard — none of which can run in `output: 'export'` mode. `next build` would simply fail if that mode were enabled, so the main `next.config.ts` is untouched and the web deployment on Vercel works exactly as before.

Instead, the native shells load the live site directly:

- `capacitor.config.ts` sets `server.url` to `https://killsub.vercel.app`. On launch, the native WebView navigates straight to that URL — it's the same app, same backend, same authentication as the website, just running inside a native wrapper.
- `capacitor-shell/` is a placeholder `webDir` with a single static `index.html`. It's required for `cap sync` to run but is never actually shown to users, since `server.url` takes over before it would render.
- Because of this, **all API calls made by the app go to the live Vercel deployment** — there is no local/bundled API. If you repoint `server.url` at a different environment (e.g. a preview deployment or localhost during development), that environment's API routes, auth, and database are what the mobile app will use.

### Building

```bash
npm run build:mobile   # next build (sanity check) + cap sync
npx cap open ios       # opens ios/App/App.xcworkspace in Xcode — requires Xcode
npx cap open android   # opens the android/ project in Android Studio — requires Android Studio / SDK
```

Actually compiling and running the native apps requires Xcode (iOS) or the Android SDK (Android) on your machine — neither is needed just to edit the web app or deploy it to Vercel.

### Push notifications

`src/hooks/usePushNotifications.ts` requests permission and registers the device for push on first launch, but only inside the native app (`Capacitor.isNativePlatform()` is false on the web, so this is a no-op there). Tokens are upserted into the `device_tokens` table (`user_id`, `token`, `platform`), keyed by `token` so re-registering the same device doesn't create duplicates.
