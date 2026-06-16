import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function sendJson(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function stripDataUrl(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/u.exec(dataUrl || "");
  return match ? { mimeType: match[1], data: match[2] } : null;
}

async function analyzeWithGemini(payload) {
  const apiKey = payload.googleApiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      mock: true,
      itemName: payload.manualName || "Used household item",
      category: "General",
      confidence: "Needs review",
      conditionNotes: payload.condition || "Review photos and add visible wear details.",
      priceLow: 20,
      priceHigh: 45,
      recommendedPrice: 30,
      title: `${payload.manualName || "Quality used item"} - ${payload.condition || "good condition"}`,
      description:
        "Clean, used item ready for a new home. Please review the photos for details. Pickup preferred; message with questions or to arrange a time.",
      searchTerms: [payload.manualName || "used item", "local resale", "Facebook Marketplace"],
      safetyNotes: "AI is not connected because GOOGLE_API_KEY is not set. Edit the draft before posting."
    };
  }

  const images = (payload.images || []).map(stripDataUrl).filter(Boolean).slice(0, 6);
  const prompt = `
You are helping create one local resale listing for Facebook Marketplace and Craigslist.
Identify the item from the photos and user notes. Estimate a realistic local used resale price.
Use the location, condition, included accessories, and defects. Be honest and avoid unsupported claims.
Return only JSON with these keys:
itemName, category, confidence, conditionNotes, priceLow, priceHigh, recommendedPrice, title, description, searchTerms, safetyNotes.

Seller location/area: ${payload.location || "not provided"}
Condition selected: ${payload.condition || "not provided"}
Known details: ${payload.notes || "not provided"}
Manual item name if any: ${payload.manualName || "not provided"}
`;

  const parts = [
    { text: prompt },
    ...images.map((image) => ({ inlineData: image }))
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "{}";
  return JSON.parse(text);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const body = await parseBody(req);
      const result = await analyzeWithGemini(body);
      sendJson(res, 200, result);
      return;
    }

    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const resolved = path.normalize(path.join(__dirname, "public", requestedPath));
    const publicDir = path.join(__dirname, "public");
    if (!resolved.startsWith(publicDir)) {
      sendJson(res, 403, { error: "Forbidden" });
      return;
    }

    const file = await fs.readFile(resolved);
    const extension = path.extname(resolved).toLowerCase();
    res.writeHead(200, { "content-type": mimeTypes[extension] || "application/octet-stream" });
    res.end(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, () => {
  console.log(`Market Listing Assistant running at http://localhost:${port}`);
});
