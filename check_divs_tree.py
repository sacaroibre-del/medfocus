import re

with open("app.js", "r") as f:
    content = f.read()

idx = content.find("async function renderInsights()")
content_sub = content[idx:]
start_idx = content_sub.find("ct.innerHTML = `")
end_idx = content_sub.find("`;", start_idx)
html_str = content_sub[start_idx:end_idx]

tokens = re.finditer(r'<(/?div)([^>]*)>', html_str)
depth = 0
for match in tokens:
    tag = match.group(1)
    attrs = match.group(2)
    if tag == "div":
        print("  " * depth + "<div" + attrs[:30] + "...>")
        depth += 1
    elif tag == "/div":
        depth -= 1
        print("  " * depth + "</div>")

print(f"Final depth: {depth}")
