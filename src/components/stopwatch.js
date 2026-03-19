// ============================================================
// Stopwatch Component
// ============================================================

let timerInterval = null;
let elapsedSeconds = 0;
let isRunning = false;

export function getStopwatchState() {
  return { elapsedSeconds, isRunning };
}

export function startStopwatch(onTick) {
  if (isRunning) return;
  isRunning = true;
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    if (onTick) onTick(elapsedSeconds);
  }, 1000);
}

export function pauseStopwatch() {
  isRunning = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

export function resetStopwatch() {
  pauseStopwatch();
  elapsedSeconds = 0;
}

export function formatStopwatchTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}<span class="seconds">:${pad(s)}</span>`;
  }
  return `${pad(m)}<span class="seconds">:${pad(s)}</span>`;
}
