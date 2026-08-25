import os
import json
import urllib.request

# Load env variables manually from .env.local
env_path = "/Users/hosoyakousei/.gemini/antigravity/scratch/medfocus/.env.local"
supabase_url = None
supabase_key = None

if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k == 'VITE_SUPABASE_URL':
                    supabase_url = v
                elif k == 'VITE_SUPABASE_ANON_KEY':
                    supabase_key = v

if not supabase_url or not supabase_key:
    print("Error: Supabase URL or Key not found in .env.local")
    exit(1)

# Query sleep_logs from Supabase REST API
url = f"{supabase_url}/rest/v1/sleep_logs?select=*&order=date.desc"
req = urllib.request.Request(url)
req.add_header("apikey", supabase_key)
req.add_header("Authorization", f"Bearer {supabase_key}")

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print("=== Sleep Logs from DB ===")
        print(json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print("Error querying database:", e)
