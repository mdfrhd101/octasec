import sys, json, base64, os, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
key = open(os.path.join(ROOT, ".gemini_key"), encoding="utf-8").read().strip()

prompt = sys.argv[1]
out = sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "gemini-2.5-flash-image"

url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % model
body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "x-goog-api-key": key})

try:
    r = urllib.request.urlopen(req, timeout=180)
    data = json.loads(r.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    msg = ""
    try:
        msg = e.read().decode("utf-8")
    except Exception:
        pass
    # redact key if it ever appears
    msg = msg.replace(key, "<KEY>")
    print("HTTP_ERROR", e.code)
    print(msg[:700])
    sys.exit(1)
except Exception as e:
    print("ERROR", str(e).replace(key, "<KEY>"))
    sys.exit(1)

parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
img = None
for p in parts:
    d = p.get("inlineData") or p.get("inline_data")
    if d and d.get("data"):
        img = d["data"]
        break
if not img:
    print("NO_IMAGE")
    print(json.dumps(data)[:700])
    sys.exit(2)

os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "wb").write(base64.b64decode(img))
print("SAVED", out, os.path.getsize(out), "bytes")
