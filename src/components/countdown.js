// ============================================================
// Countdown Component
// ============================================================
import { daysUntil } from '../utils/helpers.js';

export function renderCountdownCard(exam) {
  const days = daysUntil(exam.date);
  const examDate = new Date(exam.date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return `
    <div class="countdown-card" style="--countdown-color: ${exam.color}">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${exam.color}"></div>
      <div class="countdown-name">${exam.name}</div>
      <div class="countdown-date">${examDate}</div>
      <div class="countdown-days">
        <span class="countdown-number" style="color:${exam.color}">${days}</span>
        <span class="countdown-label">日</span>
      </div>
    </div>
  `;
}
