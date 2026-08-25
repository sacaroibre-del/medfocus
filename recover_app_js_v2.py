import json
import glob
import os

log_files = glob.glob('/Users/hosoyakousei/.gemini/antigravity/brain/*/.system_generated/logs/transcript.jsonl')
best_content = ""
best_lines = 0
best_file = ""

for log_file in log_files:
    print(f"Scanning log: {log_file}")
    if not os.path.exists(log_file):
        continue
    with open(log_file, 'r', errors='ignore') as f:
        for line in f:
            try:
                data = json.loads(line)
                if 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        args = tc.get('arguments', {})
                        if args.get('TargetFile', '').endswith('app.js'):
                            if tc['name'] in ['default_api:write_to_file', 'write_to_file']:
                                code = args.get('CodeContent', '')
                                if code.count('\n') > best_lines:
                                    best_lines = code.count('\n')
                                    best_content = code
                                    best_file = log_file
                                    print(f"Found write_to_file in {os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(log_file))))} with {best_lines} lines")
            except Exception as e:
                pass

print(f"Best found full rewrite: {best_lines} lines from {best_file}")
if best_lines > 4000:
    with open('recovered_app.js', 'w') as out:
        out.write(best_content)
    print("Saved to recovered_app.js")
else:
    print("Could not find any full rewrite > 4000 lines in subagent logs.")
