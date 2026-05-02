import app from "../server";

export default (req: any, res: any) => {
  try {
    console.log(`[Vercel] Request: ${req.method} ${req.url}`);
    return app(req, res);
  } catch (err: any) {
    console.error(`[Vercel] CRITICAL ERROR in entry point:`, err);
    res.status(500).json({ error: "Serverless function execution crashed", message: err.message });
  }
};
