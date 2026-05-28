import json
import re

log_file = '/Users/hosoyakousei/.gemini/antigravity/brain/c4f81670-6901-4a2a-9a77-22299df24d29/.system_generated/logs/transcript.jsonl'
best_content = ""
best_lines = 0

with open(log_file, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            # Find write_to_file or replace_file_content actions
            if 'tool_calls' in data:
                for tc in data['tool_calls']:
                    args = tc.get('arguments', {})
                    if args.get('TargetFile', '').endswith('app.js'):
                        if tc['name'] == 'default_api:write_to_file':
                            code = args.get('CodeContent', '')
                            if code.count('\n') > best_lines:
                                best_lines = code.count('\n')
                                best_content = code
                                print(f"Found write_to_file with {best_lines} lines")
                        elif tc['name'] == 'default_api:replace_file_content':
                            pass # We could apply diffs, but it's hard. Let's look for large writes first.
            
            # Or look at tool outputs (like view_file or git diffs)
            if data.get('type') == 'TOOL_RESPONSE' and 'app.js' in data.get('content', ''):
                content = data['content']
                # Try to see if it's a full file view
                if 'Showing lines 1 to 5' in content or 'Total Lines: 50' in content:
                    pass
        except Exception as e:
            pass

print(f"Best found full rewrite: {best_lines} lines")
if best_lines > 4000:
    with open('recovered_app.js', 'w') as out:
        out.write(best_content)
    print("Saved to recovered_app.js")
