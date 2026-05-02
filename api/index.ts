import app from "../server";

export default (req: any, res: any) => {
  console.log(`[Vercel] Request: ${req.method} ${req.url}`);
  return app(req, res);
};
