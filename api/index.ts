import app from "../server.js";

export default (req: any, res: any) => {
  try {
    // Vercel logs this to their console
    console.log(`[Vercel Handler] Invoke: ${req.method} ${req.url}`);
    
    // In some Vercel versions, you might need to handle the case where app is not a function
    if (typeof app === 'function') {
      return app(req, res);
    } else if ((app as any).default && typeof (app as any).default === 'function') {
      return (app as any).default(req, res);
    } else {
      console.error("[Vercel Handler] app is not a function:", typeof app);
      res.status(500).json({ error: "Express app not correctly imported" });
    }
  } catch (err: any) {
    console.error(`[Vercel Handler] CRITICAL ERROR:`, err);
    res.status(500).json({ 
      error: "Serverless function execution crashed", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
