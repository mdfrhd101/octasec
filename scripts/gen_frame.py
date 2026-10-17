import sys, json, base64, os, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
key = open(os.path.join(ROOT, ".gemini_key"), encoding="utf-8").read().strip()

def generate_frame(prompt, out_path, ref_path=None, model="gemini-2.5-flash-image"):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    parts = []
    if ref_path and os.path.exists(ref_path):
        with open(ref_path, "rb") as f:
            ref_b64 = base64.b64encode(f.read()).decode("utf-8")
        parts.append({"inline_data": {"mime_type": "image/jpeg", "data": ref_b64}})
    parts.append({"text": prompt})
    
    body = {
        "contents": [{"parts": parts}]
    }
    
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        r = urllib.request.urlopen(req, timeout=120)
        res = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"HTTPError {e.code}: {err_msg[:300]}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

    candidates = res.get("candidates") or []
    if not candidates:
        print("No candidates:", res)
        return False
        
    res_parts = candidates[0].get("content", {}).get("parts", [])
    for p in res_parts:
        d = p.get("inlineData") or p.get("inline_data")
        if d and d.get("data"):
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(d["data"]))
            print(f"Saved: {out_path} ({os.path.getsize(out_path)} bytes)")
            return True
            
    print("No image part returned. Text was:", [p.get("text") for p in res_parts if "text" in p])
    return False

if __name__ == "__main__":
    prompt = sys.argv[1]
    out = sys.argv[2]
    ref = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "none" else None
    model = sys.argv[4] if len(sys.argv) > 4 else "gemini-2.5-flash-image"
    success = generate_frame(prompt, out, ref, model)
    sys.exit(0 if success else 1)
