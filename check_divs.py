import re

def check_divs(content, func_name):
    idx = content.find(f"async function {func_name}()")
    if idx == -1:
        print(f"{func_name} not found")
        return

    content_sub = content[idx:]
    start_idx = content_sub.find("ct.innerHTML = `")
    if start_idx == -1:
        start_idx = content_sub.find("ct.innerHTML=`")
        if start_idx == -1:
            print(f"ct.innerHTML not found in {func_name}")
            return
            
    end_idx = content_sub.find("`;", start_idx)
    html_str = content_sub[start_idx:end_idx]

    div_starts = len(re.findall(r'<div\b', html_str))
    div_ends = len(re.findall(r'</div>', html_str))

    print(f"--- {func_name} ---")
    print(f"div starts: {div_starts}")
    print(f"div ends: {div_ends}")
    print(f"Difference: {div_starts - div_ends}")

with open("app.js", "r") as f:
    content = f.read()
    
check_divs(content, "renderInsights")
check_divs(content, "renderDashboard")
check_divs(content, "renderStudy")
check_divs(content, "renderCommunity")
check_divs(content, "renderRanking")
check_divs(content, "renderSettings")
