// ============================================================
// Chart.js Wrapper Components
// ============================================================
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const chartDefaults = {
  color: '#94a3b8',
  borderColor: 'rgba(148, 163, 184, 0.12)',
  font: { family: "'Inter', 'Noto Sans JP', sans-serif" },
};

Chart.defaults.color = chartDefaults.color;
Chart.defaults.borderColor = chartDefaults.borderColor;
Chart.defaults.font.family = chartDefaults.font.family;

const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

export function createRadarChart(canvasId, labels, data, colors) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: '進捗率',
        data,
        backgroundColor: 'rgba(78, 205, 196, 0.15)',
        borderColor: '#4ECDC4',
        borderWidth: 2,
        pointBackgroundColor: '#4ECDC4',
        pointBorderColor: '#0a0e1a',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20, display: false },
          grid: { color: 'rgba(148, 163, 184, 0.08)' },
          angleLines: { color: 'rgba(148, 163, 184, 0.08)' },
          pointLabels: { font: { size: 11, weight: '500' }, color: '#94a3b8' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a2332',
          titleColor: '#f0f4f8',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(78, 205, 196, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: { label: (ctx) => `${ctx.raw}%` },
        },
      },
      animation: { duration: 1000, easing: 'easeOutQuart' },
    },
  });
}

export function createBarChart(canvasId, labels, data, label = '勉強時間(分)') {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return '#4ECDC4';
          const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(78, 205, 196, 0.4)');
          gradient.addColorStop(1, 'rgba(69, 183, 209, 0.8)');
          return gradient;
        },
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 40,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.06)' }, ticks: { font: { size: 11 } } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a2332',
          titleColor: '#f0f4f8',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(78, 205, 196, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
        },
      },
      animation: { duration: 800, easing: 'easeOutQuart' },
    },
  });
}

export function createDoughnutChart(canvasId, labels, data, colors) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#1a2332',
        borderWidth: 3,
        hoverBorderColor: '#243044',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
        tooltip: {
          backgroundColor: '#1a2332',
          titleColor: '#f0f4f8',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(78, 205, 196, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}%` },
        },
      },
      animation: { animateRotate: true, duration: 1000, easing: 'easeOutQuart' },
    },
  });
}

export function destroyAllCharts() {
  Object.keys(chartInstances).forEach(destroyChart);
}
