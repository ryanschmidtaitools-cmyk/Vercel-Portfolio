// Vercel serverless function — /api/track-resume.js
// Logs resume PDF downloads to Supabase.

const SUPABASE_URL   = "https://ggmkmymtilpkezkpihxt.supabase.co";
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY || "";

const SUPABASE_HEADERS = SUPABASE_KEY ? {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
} : null;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).setHeader("Access-Control-Allow-Origin", "*").end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const sessionToken = String(req.body.sessionToken || req.body.session_token || "").slice(0, 128) || null;
    const referrer = String(req.headers["referer"] || req.headers["referrer"] || "").slice(0, 512) || null;
    const pageUrl = String(req.body.pageUrl || req.body.page_url || "").slice(0, 512) || null;
    const userAgent = String(req.headers["user-agent"] || "").slice(0, 256) || null;

    if (SUPABASE_HEADERS) {
      await fetch(`${SUPABASE_URL}/rest/v1/resume_downloads`, {
        method: "POST",
        headers: SUPABASE_HEADERS,
        body: JSON.stringify({
          session_token: sessionToken,
          referrer,
          page_url: pageUrl,
          user_agent: userAgent
        })
      });
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true });
  }
}
