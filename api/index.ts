import app from "../server";

export default async (req: any, res: any) => {
  try {
    // Vercel logs this to their console
    console.log(`[Vercel Handler] Invoke: ${req.method} ${req.url}`);
    
    // Normalize app object (handles ESM default export variations)
    const expressApp = (app as any).default || app;

    if (typeof expressApp === 'function') {
      return expressApp(req, res);
    } else {
      console.error("[Vercel Handler] app is not a function:", typeof expressApp);
      res.status(500).json({ 
        error: "Server configuration error", 
        details: "Express app not correctly imported" 
      });
    }
  } catch (err: any) {
    console.error(`[Vercel Handler] CRITICAL ERROR:`, err);
    res.status(500).json({ 
      error: "Server execution failed", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
