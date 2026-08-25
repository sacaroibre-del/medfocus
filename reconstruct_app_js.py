import json
import glob
import os
import subprocess

# Reset app.js to 83d3779 first to get the base
print("Resetting app.js to base commit 83d3779...")
subprocess.run(["git", "checkout", "83d3779", "--", "app.js", "styles.css"])

with open("app.js", "r") as f:
    app_js = f.read()

with open("styles.css", "r") as f:
    styles_css = f.read()

# We will collect all replacements from the logs of the two subagents
# Subagent 1: 47edb870-050a-4953-bfed-44cb22596806
# Subagent 2: 40770c99-ac28-4092-a630-0e09f54ce135
subagent_logs = [
    '/Users/hosoyakousei/.gemini/antigravity/brain/47edb870-050a-4953-bfed-44cb22596806/.system_generated/logs/transcript.jsonl',
    '/Users/hosoyakousei/.gemini/antigravity/brain/40770c99-ac28-4092-a630-0e09f54ce135/.system_generated/logs/transcript.jsonl'
]

# We need to sort steps by timestamp
all_steps = []

for log_path in subagent_logs:
    if not os.path.exists(log_path):
        print(f"Log not found: {log_path}")
        continue
    with open(log_path, 'r', errors='ignore') as f:
        for line in f:
            try:
                data = json.loads(line)
                created_at = data.get('created_at', '')
                if 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        all_steps.append((created_at, tc))
            except Exception as e:
                pass

# Sort by created_at time
all_steps.sort(key=lambda x: x[0])

print(f"Found {len(all_steps)} tool calls in subagent logs.")

for timestamp, tc in all_steps:
    name = tc.get('name', '')
    args = tc.get('arguments') or tc.get('args', {})
    
    # We only care about app.js and styles.css edits
    target_file = args.get('TargetFile', '')
    if isinstance(target_file, str):
        target_file = target_file.strip('"').strip("'")
        
    if not target_file:
        continue
        
    is_app_js = target_file.endswith('app.js')
    is_styles_css = target_file.endswith('styles.css')
    
    if not (is_app_js or is_styles_css):
        continue
        
    current_content = app_js if is_app_js else styles_css
    
    if name in ['default_api:replace_file_content', 'replace_file_content']:
        target = args.get('TargetContent', '')
        replacement = args.get('ReplacementContent', '')
        if target in current_content:
            current_content = current_content.replace(target, replacement, 1)
            print(f"[{timestamp}] Replaced block in {os.path.basename(target_file)}")
        else:
            print(f"[{timestamp}] WARNING: Target content not found in {os.path.basename(target_file)}")
            
    elif name in ['default_api:multi_replace_file_content', 'multi_replace_file_content']:
        chunks = args.get('ReplacementChunks', [])
        # Sometimes ReplacementChunks is a JSON string
        if isinstance(chunks, str):
            # Try to unescape strings that are doubly quoted
            chunks = chunks.strip('"').strip("'")
            # Unescape backslash escapes
            chunks = chunks.encode('utf-8').decode('unicode_escape')
            try:
                chunks = json.loads(chunks)
            except Exception as e:
                print(f"[{timestamp}] ERROR parsing chunks: {e}")
                pass
        
        if not isinstance(chunks, list):
            print(f"[{timestamp}] WARNING: chunks is not a list: {type(chunks)}")
            continue

        for chunk in chunks:
            if isinstance(chunk, str):
                try:
                    chunk = json.loads(chunk)
                except:
                    pass
            if not isinstance(chunk, dict):
                continue
            target = chunk.get('TargetContent', '')
            replacement = chunk.get('ReplacementContent', '')
            if target in current_content:
                current_content = current_content.replace(target, replacement, 1)
                print(f"[{timestamp}] Replaced chunk in {os.path.basename(target_file)}")
            else:
                print(f"[{timestamp}] WARNING: Chunk target not found in {os.path.basename(target_file)}")

    if is_app_js:
        app_js = current_content
    else:
        styles_css = current_content

# Write reconstructed files
with open("app.js", "w") as f:
    f.write(app_js)

with open("styles.css", "w") as f:
    f.write(styles_css)

print("Reconstruction complete. Please check app.js and styles.css.")
