import * as mockData from './data/mockData.js';
import { initializeData } from './utils/persistence.js';

// Styles
import './styles/index.css';
import './styles/dashboard.css';
import './styles/study.css';
import './styles/community.css';
import './styles/ranking.css';
import './styles/settings.css';

import { renderSidebar } from './components/sidebar.js';
import { registerRoute, initRouter } from './utils/router.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderStudy } from './pages/study.js';
import { renderCommunity } from './pages/community.js';
import { renderRanking } from './pages/ranking.js';
import { renderSettings } from './pages/settings.js';
import { destroyAllCharts } from './components/charts.js';

// Initialize Persistence
initializeData(mockData);

// Register routes
registerRoute('/', () => {
  destroyAllCharts();
  renderSidebar();
  renderDashboard();
});

registerRoute('/study', () => {
  destroyAllCharts();
  renderSidebar();
  renderStudy();
});

registerRoute('/community', () => {
  destroyAllCharts();
  renderSidebar();
  renderCommunity();
});

registerRoute('/ranking', () => {
  destroyAllCharts();
  renderSidebar();
  renderRanking();
});

registerRoute('/settings', () => {
  destroyAllCharts();
  renderSidebar();
  renderSettings();
});

// Initialize
initRouter();
