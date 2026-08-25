import re

app_path = '/Users/hosoyakousei/.gemini/antigravity/scratch/medfocus/app.js'

with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. getLogicalDate
content = re.sub(r'getHours\(\)<5', 'getHours()<3', content)

# 2. getMinutesFromBase5AM -> getMinutesFromBase3AM
content = content.replace('getMinutesFromBase5AM', 'getMinutesFromBase3AM')

# 3. offset = total - 300 -> offset = total - 180
content = re.sub(r'let offset = total - 300;', 'let offset = total - 180;', content)

# 4. getTimeSlotForHour
content = re.sub(r"if \(h >= 5 && h < 11\) return 'morning';", "if (h >= 3 && h < 11) return 'morning';", content)

# 5. Display names
content = content.replace('朝 (5-11)', '朝 (3-11)')
content = content.replace('深夜 (23-5)', '深夜 (23-3)')

# 6. setHours(5,0,0,0) -> setHours(3,0,0,0)
content = content.replace('setHours(5,0,0,0)', 'setHours(3,0,0,0)')

# 7. setHours(28,59,59,999) -> setHours(26,59,59,999)
content = content.replace('setHours(28,59,59,999)', 'setHours(26,59,59,999)')

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated app.js successfully.")
