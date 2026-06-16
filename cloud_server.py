from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import mimetypes
import os
import urllib.error
import urllib.request

ROOT = Path(__file__).parent / "public"
PORT = int(os.environ.get("PORT", "8080"))


def strip_data_url(data_url):
    if not isinstance(data_url, str) or ";base64," not in data_url:
        return None
    header, data = data_url.split(";base64,", 1)
    mime_type = header.replace("data:", "") or "image/jpeg"
    return {"mimeType": mime_type, "data": data}


def fallback(payload):
    name = payload.get("manualName") or "Item from photo"
    condition = payload.get("condition") or "Good"
    return {
        "needsKey": True,
        "itemName": name,
        "category": "General",
        "confidence": "Google AI is not connected on the cloud server yet",
        "conditionNotes": "Set GOOGLE_API_KEY on the cloud host.",
        "priceLow": 0,
        "priceHigh": 0,
        "recommendedPrice": 0,
        "title": f"{name} - {condition.lower()} condition",
        "description": (
            f"{name} in {condition.lower()} condition.\n\n"
            "Add details, defects, measurements, and included parts here.\n\n"
            "Pickup preferred. Message with questions."
        ),
        "searchTerms": [name],
        "safetyNotes": "Photo analysis is off until GOOGLE_API_KEY is set."
    }


def analyze(payload):
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return fallback(payload)

    images = [strip_data_url(image) for image in payload.get("images", [])[:4]]
    images = [image for image in images if image]
    prompt = f"""
You are creating one local resale listing for Facebook Marketplace and Craigslist.
Look at the item photos and identify the product. Estimate a realistic used resale price.
Use condition, notes, included accessories, visible defects, and seller area.
Do not invent exact model numbers unless visible or stated.
Return only JSON with these keys:
itemName, category, confidence, conditionNotes, priceLow, priceHigh, recommendedPrice, title, description, searchTerms, safetyNotes.

Seller area: {payload.get("location") or "98271"}
Condition: {payload.get("condition") or "not provided"}
Seller notes: {payload.get("notes") or "not provided"}
Manual item name: {payload.get("manualName") or "not provided"}
"""
    parts = [{"text": prompt}]
    for image in images:
        parts.append({"inlineData": image})

    body = json.dumps({
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"responseMimeType": "application/json"}
    }).encode("utf-8")

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + api_key
    request = urllib.request.Request(url, data=body, headers={"content-type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        message = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Google AI error: {error.code} {message}")

    text = "".join(part.get("text", "") for part in data["candidates"][0]["content"]["parts"])
    return json.loads(text)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path != "/api/analyze":
            self.send_error(404)
            return
        length = int(self.headers.get("content-length", "0"))
        if length > 28 * 1024 * 1024:
            self.send_json(413, {"error": "Photos are too large. Use fewer photos."})
            return
        payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        try:
            self.send_json(200, analyze(payload))
        except Exception as error:
            self.send_json(500, {"error": str(error)})

    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        if self.path.endswith(".webmanifest"):
            self.send_header("content-type", "application/manifest+json")
        super().end_headers()


if __name__ == "__main__":
    mimetypes.add_type("application/manifest+json", ".webmanifest")
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Cloud app running at http://0.0.0.0:{PORT}")
    server.serve_forever()
