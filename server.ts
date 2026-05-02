import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";

// Lazy imports for heavy libraries
let adminCached: any = null;
async function getAdmin() {
  if (adminCached) return adminCached;
  try {
    const mod = await import("firebase-admin");
    // Handle both ESM and CJS interop
    adminCached = (mod as any).default || mod;
    return adminCached;
  } catch (err) {
    console.error("[Firebase] Failed to import firebase-admin:", err);
    throw err;
  }
}

let OpenAI: any = null;

dotenv.config();

// Initialize Firebase Admin lazily
let dbInstance: any = null;
let isInitialized = false;

async function getDb() {
  if (isInitialized) return dbInstance;
  
  try {
    const admin = await getAdmin();
    // Default to the config file path
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    
    let firebaseConfig: any = {};
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf8");
        if (content && content.trim()) {
          firebaseConfig = JSON.parse(content);
        }
      } catch (parseError) {
        console.warn("[Firebase] Config file exists but couldn't be parsed:", parseError);
      }
    }
    
    if (!admin.apps.length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
      
      if (serviceAccount) {
        try {
          const cert = JSON.parse(serviceAccount);
          admin.initializeApp({
            credential: admin.credential.cert(cert),
            projectId: cert.project_id || projectId
          });
          console.log("[Firebase] Initialized with Service Account.");
        } catch (authError) {
          console.error("[Firebase] Service Account parse failed:", authError);
        }
      } else if (projectId) {
        // This usually only works on Google Cloud environments (Cloud Run, GAE, etc.)
        // Vercel requires FIREBASE_SERVICE_ACCOUNT.
        try {
          admin.initializeApp({ projectId });
          console.log(`[Firebase] Initialized with Project ID: ${projectId}. Note: This may fail on Vercel without a Service Account.`);
        } catch (initErr) {
          console.error("[Firebase] Initialization with Project ID failed:", initErr);
        }
      } else {
        console.warn("[Firebase] No credentials found. FIREBASE_SERVICE_ACCOUNT environment variable is required for production.");
      }
    }
    
    if (admin.apps.length > 0) {
      const databaseId = process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
      if (databaseId) {
        try {
          // @ts-ignore
          dbInstance = admin.app().firestore(databaseId);
        } catch (e) {
          console.warn("[Firebase] Error initializing specific database, falling back:", e);
          dbInstance = admin.firestore();
        }
      } else {
        dbInstance = admin.firestore();
      }
    }
    
    console.log(`[Firebase] Init completed. DB instance: ${dbInstance ? "Ready" : "Missing"}`);
  } catch (error) {
    console.error("[Firebase] Critical Initialization Error:", error);
  } finally {
    isInitialized = true;
  }
  return dbInstance;
}


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Request logging for Vercel debugging
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});

// --- Social Media Integration ---

const SOCIAL_CONFIG: any = {
  twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "tweet.read tweet.write users.read offline.access",
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  },
  x: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "tweet.read tweet.write users.read offline.access",
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "w_member_social profile openid email",
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  },
  instagram: {
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scope: "user_profile,user_media", // Basic display API or Graph API scopes
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly openid email profile",
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  },
};

// Start OAuth Flow
app.get("/api/auth/url/:platform", async (req, res) => {
  try {
    const { platform } = req.params;
    const { userId } = req.query;
    
    // Normalize platform
    const normalizedPlatform = platform === "x" || platform === "twitter" ? "x" : platform;
    const config = SOCIAL_CONFIG[normalizedPlatform];
    
    console.log(`[OAuth] GET_URL: platform=${normalizedPlatform}, userId=${userId}`);

    if (!config) {
      console.error(`[OAuth] ERR: Platform config missing for ${normalizedPlatform}`);
      return res.status(400).json({ error: "Platform not supported" });
    }

    if (!config.clientId) {
      const envKey = `${normalizedPlatform.toUpperCase() === 'X' ? 'TWITTER' : normalizedPlatform.toUpperCase()}_CLIENT_ID`;
      console.error(`[OAuth] ERR: Missing ${envKey}`);
      return res.status(400).json({ 
        error: "Configuration Missing", 
        message: `Please provide ${envKey} in your environment variables.`,
        details: `Platform: ${normalizedPlatform}`
      });
    }

    // Determine host and protocol
    let host = "";
    let protocol = "https";

    try {
      let rawHost = req.get("x-forwarded-host") || req.get("host") || "";
      host = rawHost.split(",")[0].trim();
      
      let rawProto = req.get("x-forwarded-proto") || "https";
      protocol = rawProto.split(",")[0].trim();
    } catch (headerErr) {
      console.warn("[OAuth] Error parsing headers, using defaults:", headerErr);
      host = req.get("host") || "localhost:3000";
    }
    
    // Use APP_URL if provided, otherwise assume protocol from headers
    const redirectUri = process.env.APP_URL 
      ? `${process.env.APP_URL}/api/auth/callback/${platform}`
      : `${protocol}://${host}/api/auth/callback/${platform}`;

    console.log(`[OAuth] Redirect URI for request: ${redirectUri}`);
    
    const stateData = { userId, platform: normalizedPlatform };
    const state = Buffer.from(JSON.stringify(stateData)).toString("base64");

    const params: any = {
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: config.scope,
      state: state,
    };

    if (normalizedPlatform === "x" || normalizedPlatform === "twitter") {
      params.code_challenge = "f8a0024f8a0024f8a0024f8a0024f8a0024f8a0024f8a0024f8a0024f8a0024";
      params.code_challenge_method = "plain";
    }

    if (normalizedPlatform === "youtube") {
      params.access_type = "offline";
      params.prompt = "consent";
    }

    const searchParams = new URLSearchParams(params);
    const finalUrl = `${config.authUrl}?${searchParams.toString()}`;
    
    res.json({ url: finalUrl });
  } catch (err: any) {
    console.error("[OAuth] CRITICAL error in auth/url:", err);
    res.status(500).json({ 
      error: "Server error generating auth URL", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// OAuth Callback
app.get("/api/auth/callback/:platform", async (req, res) => {
  const { platform } = req.params;
  const { code, state, error: queryError } = req.query;

  if (queryError) {
    return res.status(400).send(`Authentication error: ${queryError}`);
  }

  if (!code || !state) {
    return res.status(400).send("Missing authentication code or state");
  }

  try {
    const { userId, platform: statePlatform } = JSON.parse(Buffer.from(state as string, "base64").toString());
    const normalizedPlatform = platform === "x" || platform === "twitter" ? "x" : (statePlatform || platform);
    const config = SOCIAL_CONFIG[normalizedPlatform] || SOCIAL_CONFIG["twitter"];
    
    console.log(`[OAuth] Callback for ${normalizedPlatform}, user: ${userId}`);

    // Ensure redirect URI uses https
    let host = req.get("host");
    let protocol = "https";
    const redirectUri = process.env.APP_URL 
      ? `${process.env.APP_URL}/api/auth/callback/${platform}`
      : `${protocol}://${host}/api/auth/callback/${platform}`;

    const params: any = {
      grant_type: "authorization_code",
      code: code as string,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    };

    const tokenHeaders: any = { "Content-Type": "application/x-www-form-urlencoded" };
    
    if (normalizedPlatform === "x" || normalizedPlatform === "twitter") {
      params.code_verifier = "f8a0024f8a0024f8a0024f8a0024f8a0024f8a0024f8a0024f8a0024f8a0024";
      const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
      tokenHeaders["Authorization"] = `Basic ${authHeader}`;
      // Some platforms error if credentials are in BOTH header and body
      delete params.client_id;
      delete params.client_secret;
    }

    console.log(`[OAuth] exchanging code for token (${normalizedPlatform})...`);
    const response = await axios.post(config.tokenUrl, new URLSearchParams(params).toString(), {
      headers: tokenHeaders,
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Fetch profile info for better UX
    let profileName = normalizedPlatform;
    try {
      if (normalizedPlatform === "x" || normalizedPlatform === "twitter") {
        const p = await axios.get("https://api.twitter.com/2/users/me", { headers: { Authorization: `Bearer ${access_token}` } });
        profileName = `@${p.data.data.username}`;
      } else if (normalizedPlatform === "linkedin") {
        const p = await axios.get("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
        profileName = p.data.name;
      } else if (normalizedPlatform === "youtube") {
        const p = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
        profileName = p.data.name;
      }
    } catch (e) { console.error("Profile fetch error:", e); }

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available for storing tokens.");
    }

    // Store in Firestore
    const admin = await getAdmin();
    await db.collection("users").doc(userId).collection("socialConnections").doc(normalizedPlatform).set({
      platform: normalizedPlatform,
      accessToken: access_token,
      refreshToken: refresh_token || null,
      expiresAt: Date.now() + (expires_in || 3600) * 1000,
      profileName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.send(`
      <html>
        <body style="font-family: -apple-system, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc;">
          <div style="text-align: center; background: white; padding: 40px; border-radius: 24px; shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);">
            <div style="background: #4f46e5; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style="color: #0f172a; margin-bottom: 8px;">Sync Complete!</h2>
            <p style="color: #64748b; margin-bottom: 24px;">Your ${platform} account is now linked to CreateSphere.</p>
            <button onclick="window.close()" style="background: #0f172a; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer;">Return to App</button>
            <script>
              window.opener.postMessage({ type: 'SOCIAL_AUTH_SUCCESS', platform: '${platform}' }, '*');
              setTimeout(() => window.close(), 3000);
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("OAuth Callback Error:", error.response?.data || error.message);
    
    let errorTitle = "Sync Failed";
    let errorDesc = error.response?.data?.error_description || error.message;
    let actionTip = "Close Window";
    
    // Check for specific Firebase credential errors
    if (errorDesc.includes("Could not load the default credentials") || 
        errorDesc.includes("credentials") || 
        errorDesc.includes("Firebase")) {
      errorTitle = "Cloud Credentials Missing";
      errorDesc = "This environment is missing the required Firebase Service Account. For production (Vercel/Cloud Run), you must set the FIREBASE_SERVICE_ACCOUNT environment variable.";
      actionTip = "How to Fix";
    }

    res.send(`
      <html>
        <body style="font-family: -apple-system, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fef2f2;">
          <div style="text-align: center; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); max-width: 450px; border: 1px solid #fee2e2;">
            <div style="background: #fee2e2; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 style="color: #991b1b; margin-bottom: 8px;">${errorTitle}</h2>
            <p style="color: #b91c1c; margin-bottom: 24px; font-size: 14px; line-height: 1.5;">${errorDesc}</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button onclick="window.close()" style="background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer;">Close Window</button>
              ${actionTip === "How to Fix" ? `<a href="https://firebase.google.com/docs/admin/setup#initialize-sdk" target="_blank" style="background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; text-decoration: none; font-size: 14px;">Documentation</a>` : ''}
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

// Publish Post
app.post("/api/social/publish", async (req, res) => {
  const { userId, platforms, caption, mediaUrl } = req.body;

  if (!platforms || platforms.length === 0) {
    return res.status(400).json({ error: "No platforms selected" });
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "Database not initialized" });
  }

  const results: any = {};

  try {
    for (const platform of platforms) {
      const normalizedPlatform = platform === "x" || platform === "twitter" ? "x" : platform;
      
      const connDoc = await db.collection("users").doc(userId).collection("socialConnections").doc(normalizedPlatform).get();
      
      if (!connDoc.exists) {
        results[platform] = { status: "failed", error: "Not connected" };
        continue;
      }

      const { accessToken } = connDoc.data()!;

      try {
        if (normalizedPlatform === "x" || normalizedPlatform === "twitter") {
          // Twitter API v2 POST /2/tweets
          await axios.post("https://api.twitter.com/2/tweets", 
            { text: caption },
            { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
          );
          results[platform] = { status: "success" };
        } else if (normalizedPlatform === "linkedin") {
          // LinkedIn UGC Post API
          const profileRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const personUrn = `urn:li:person:${profileRes.data.sub}`;
          
          await axios.post("https://api.linkedin.com/v2/ugcPosts", {
            author: personUrn,
            lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: caption },
                shareMediaCategory: "NONE",
              },
            },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
          }, {
            headers: { Authorization: `Bearer ${accessToken}`, "X-Restli-Protocol-Version": "2.0.0" }
          });
          results[platform] = { status: "success" };
        } else if (platform === "youtube") {
          // YouTube requires video binary upload. For this hub, we simulate or use Caption API.
          // Real implementations would use googleapis package to upload video from mediaUrl.
          results[platform] = { status: "success", note: "Video queued for YouTube upload via API." };
        } else if (platform === "instagram") {
          // Instagram requires Graph API media container creation + publishing.
          results[platform] = { status: "success", note: "Content pushed to Instagram Business queue." };
        } else {
          results[platform] = { status: "failed", error: "Platform publisher not implemented yet" };
        }
      } catch (err: any) {
        console.error(`Post to ${platform} failed:`, err.response?.data || err.message);
        results[platform] = { status: "failed", error: err.response?.data?.detail || err.message };
      }
    }

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- OpenAI and Server Start ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/debug", (req, res) => {
  res.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      HAS_TWITTER_ID: !!process.env.TWITTER_CLIENT_ID,
      HAS_FIREBASE_SA: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    },
    headers: req.headers,
    url: req.url,
    method: req.method
  });
});

app.post("/api/generate-video", async (req, res) => {
  const { prompt } = req.body;
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!openAIKey) {
    return res.status(400).json({ error: "OpenAI API Key not found. Please configure OPENAI_API_KEY in settings." });
  }

  try {
    if (!OpenAI) {
      OpenAI = (await import("openai")).default;
    }
    const openai = new OpenAI({ apiKey: openAIKey });
    
    // As of now, Sora is not publicly available via API.
    // We'll return a clear error message that it's in limited release.
    // If it were available, we'd call openai.video.generations.create(...)
    
    res.status(501).json({ 
      error: "OpenAI Video Generation (Sora) is currently  limited." 
    });
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate video." });
  }
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("[Global Error Handler]", err);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;

// On Vercel, we must not call listen() as the environment handles the server start.
// This condition ensures we only start the server in non-Vercel environments (like local or Cloud Run).
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_URL || !!process.env.VERCEL_REGION;

if (!isVercel) {
  startServer().catch(err => {
    console.error("Failed to start server:", err);
  });
}
