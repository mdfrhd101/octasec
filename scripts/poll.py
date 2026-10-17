import sys, os, urllib.parse, urllib.request

prompt = sys.argv[1]
out = sys.argv[2]
w = sys.argv[3] if len(sys.argv) > 3 else "1280"
h = sys.argv[4] if len(sys.argv) > 4 else "1280"
seed = sys.argv[5] if len(sys.argv) > 5 else "42"

base = "https://image.pollinations.ai/prompt/" + urllib.parse.quote(prompt)
url = base + "?width=%s&height=%s&nologo=true&model=flux&seed=%s" % (w, h, seed)
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    r = urllib.request.urlopen(req, timeout=240)
    data = r.read()
except Exception as e:
    print("ERROR", str(e)[:300]); sys.exit(1)
if len(data) < 2000:
    print("TOO_SMALL", len(data)); print(data[:200]); sys.exit(2)
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "wb").write(data)
print("SAVED", out, len(data), "bytes")
