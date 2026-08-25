import json
import base64
import os

with open("app_vercel.js", "r") as f:
    data = json.load(f)
    content = base64.b64decode(data['data']).decode('utf-8')
    with open("app.js", "w") as out:
        out.write(content)

with open("styles_vercel.css", "r") as f:
    data = json.load(f)
    content = base64.b64decode(data['data']).decode('utf-8')
    with open("styles.css", "w") as out:
        out.write(content)

print("Decoded successfully!")
