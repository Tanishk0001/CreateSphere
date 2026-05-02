import appModule from "../server";

// Vercel handles Express applications directly if they are exported as the default.
// We resolve the app instance (handling ESM default if necessary) and export it.
const app = (appModule as any).default || appModule;

export default app;
