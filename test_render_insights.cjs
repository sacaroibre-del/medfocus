const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = `
<!DOCTYPE html>
<html>
<body>
  <div id="page-container"></div>
  <div id="toast-notif"></div>
</body>
</html>
`;

const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost" });
const window = dom.window;
global.window = window;
global.document = window.document;
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.navigator = { userAgent: 'node.js' };
global.Chart = class Chart { constructor() {} destroy() {} };
global.requestAnimationFrame = (cb) => cb();
global.setTimeout = (cb) => cb();
global.clearTimeout = () => {};

try {
  let code = fs.readFileSync('./app.js', 'utf8').replace(/import\.meta\.env/g, '({})');
  window.eval(code);
  
  window.session = { user: { id: 'dummy' } };
  window.allLogs = [
    { subject_name: 'test', duration_minutes: 60, started_at: new Date().toISOString(), focus_level: 3, study_purpose: 'cbt', location: '自宅' }
  ];
  window.allLocations = ['自宅'];
  window.insightFilters = {
    preset: 'all',
    dateFrom: '',
    dateTo: '',
    subjects: [],
    location: '',
    timeSlot: '',
    focusLevel: '',
    sessionLength: '',
    purpose: ''
  };
  
  console.log("Calling renderInsights()...");
  window.renderInsights();
  console.log("Success!");
} catch (e) {
  console.error("Caught error:", e.stack || e.message || e);
}
