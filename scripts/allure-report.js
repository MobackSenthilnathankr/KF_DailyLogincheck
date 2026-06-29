const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const envConfig = require('../config/env.config');

const reportPrefix = process.env.ALLURE_REPORT_PREFIX || 'daily_login_check';
const reportTitle = process.env.ALLURE_REPORT_TITLE || 'Login check';
const projectRoot = path.join(__dirname, '..');
const resultsDir = path.join(projectRoot, 'allure-results');
const reportDir = path.join(projectRoot, 'allure-report');
const tempReportDir = path.join(reportDir, '.tmp-generate');
const latestReportPath = path.join(reportDir, `${reportPrefix}_latest.html`);
const latestReportMetaPath = path.join(reportDir, 'latest.txt');
const allureBin = path.join(
  projectRoot,
  'node_modules',
  'allure-commandline',
  'dist',
  'bin',
  process.platform === 'win32' ? 'allure.bat' : 'allure',
);

function formatReportDate(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');

  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${date.getFullYear()}`;
}

function formatDisplayTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');

  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');

  return `${formatReportDate(date)}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function getEnvironmentSortKey(result) {
  const orderLabel = result.labels?.find((label) => label.name === 'environmentOrder');
  if (orderLabel?.value) {
    return Number(orderLabel.value);
  }

  const subSuite = result.labels?.find((label) => label.name === 'subSuite')?.value || '';
  const suiteMatch = subSuite.match(/(\d+)\s*-\s*\S+/);
  if (suiteMatch) {
    return Number(suiteMatch[1]);
  }

  const envLabel = result.labels?.find((label) => label.name === 'environment')?.value;
  if (envLabel) {
    const envIndex = envConfig.getSmokeEnvironments().findIndex((target) => target.label === envLabel);
    if (envIndex >= 0) {
      return envIndex + 1;
    }
  }

  const legacyNameMatch = result.name?.match(/\[([A-Z_]+)\]/);
  if (legacyNameMatch) {
    const envIndex = envConfig.getSmokeEnvironments().findIndex(
      (target) => target.label === legacyNameMatch[1],
    );
    if (envIndex >= 0) {
      return envIndex + 1;
    }
  }

  return Number.MAX_SAFE_INTEGER;
}

function sortAllureResultsByEnvironment() {
  if (!fs.existsSync(resultsDir)) {
    return;
  }

  const resultFiles = fs.readdirSync(resultsDir).filter((file) => file.endsWith('-result.json'));
  if (!resultFiles.length) {
    return;
  }

  const results = resultFiles.map((file) => ({
    file,
    data: JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8')),
  }));

  results.sort((left, right) => {
    const environmentDiff = getEnvironmentSortKey(left.data) - getEnvironmentSortKey(right.data);
    if (environmentDiff !== 0) {
      return environmentDiff;
    }

    return (left.data.start || 0) - (right.data.start || 0);
  });

  const baseStart = Math.min(...results.map((entry) => entry.data.start || Date.now()));
  results.forEach((entry, index) => {
    const duration = Math.max((entry.data.stop || 0) - (entry.data.start || 0), 1);
    entry.data.start = baseStart + index * 1000;
    entry.data.stop = entry.data.start + duration;
    fs.writeFileSync(path.join(resultsDir, entry.file), JSON.stringify(entry.data));
  });
}

function sortAllureContainersByEnvironment() {
  if (!fs.existsSync(resultsDir)) {
    return;
  }

  const containerFiles = fs.readdirSync(resultsDir).filter((file) => file.endsWith('-container.json'));
  containerFiles.forEach((file) => {
    const containerPath = path.join(resultsDir, file);
    const container = JSON.parse(fs.readFileSync(containerPath, 'utf8'));
    if (!Array.isArray(container.children) || container.children.length < 2) {
      return;
    }

    const childMeta = container.children.map((childId) => {
      const childPath = path.join(resultsDir, `${childId}-result.json`);
      if (fs.existsSync(childPath)) {
        return {
          id: childId,
          sortKey: getEnvironmentSortKey(JSON.parse(fs.readFileSync(childPath, 'utf8'))),
        };
      }

      const childContainerPath = path.join(resultsDir, `${childId}-container.json`);
      if (fs.existsSync(childContainerPath)) {
        const childContainer = JSON.parse(fs.readFileSync(childContainerPath, 'utf8'));
        const suiteMatch = childContainer.name?.match(/^(\d+)\s*-\s*/);
        return {
          id: childId,
          sortKey: suiteMatch ? Number(suiteMatch[1]) : Number.MAX_SAFE_INTEGER,
        };
      }

      return { id: childId, sortKey: Number.MAX_SAFE_INTEGER };
    });

    container.children = childMeta
      .sort((left, right) => left.sortKey - right.sortKey)
      .map((entry) => entry.id);
    fs.writeFileSync(containerPath, JSON.stringify(container));
  });
}

function prepareAllureResults() {
  sortAllureResultsByEnvironment();
  sortAllureContainersByEnvironment();
}

function getTimestampedReportFileName(date = new Date()) {
  return `${reportPrefix}_${formatTimestamp(date)}.html`;
}

function cleanResults() {
  if (fs.existsSync(resultsDir)) {
    fs.rmSync(resultsDir, { recursive: true, force: true });
  }
}

function hasResults() {
  return fs.existsSync(resultsDir) && fs.readdirSync(resultsDir).length > 0;
}

function runAllure(args) {
  if (!fs.existsSync(allureBin)) {
    console.error(`Allure CLI not found at: ${allureBin}`);
    console.error('Run: npm install allure-commandline --save-dev');
    return 1;
  }

  const result = spawnSync(allureBin, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}

function setReportTitle(htmlPath, titleSuffix = '') {
  if (!fs.existsSync(htmlPath)) {
    return;
  }

  const title = titleSuffix ? `${reportTitle} - ${titleSuffix}` : reportTitle;
  const html = fs.readFileSync(htmlPath, 'utf8').replace(
    '<title>Allure Report</title>',
    `<title>${title}</title>`,
  );
  fs.writeFileSync(htmlPath, html);
}

function getLatestReportPath() {
  if (fs.existsSync(latestReportPath)) {
    return latestReportPath;
  }

  if (!fs.existsSync(reportDir)) {
    return null;
  }

  const reports = fs.readdirSync(reportDir)
    .filter((file) => file.startsWith(`${reportPrefix}_`) && file.endsWith('.html') && !file.endsWith('_latest.html'))
    .sort()
    .reverse();

  if (!reports.length) {
    return null;
  }

  return path.join(reportDir, reports[0]);
}

function generateReport() {
  if (!hasResults()) {
    console.warn('No Allure results found in allure-results. Skipping report generation.');
    return 0;
  }

  prepareAllureResults();

  if (fs.existsSync(tempReportDir)) {
    fs.rmSync(tempReportDir, { recursive: true, force: true });
  }

  const tempOutput = path.relative(projectRoot, tempReportDir).replace(/\\/g, '/');
  const status = runAllure([
    'generate',
    'allure-results',
    '--clean',
    '--single-file',
    '-o',
    tempOutput,
  ]);

  const generatedIndex = path.join(tempReportDir, 'index.html');
  if (status !== 0 || !fs.existsSync(generatedIndex)) {
    return status;
  }

  fs.mkdirSync(reportDir, { recursive: true });

  const timestamp = formatDisplayTimestamp();
  const timestampedFileName = getTimestampedReportFileName();
  const timestampedPath = path.join(reportDir, timestampedFileName);

  fs.copyFileSync(generatedIndex, timestampedPath);
  fs.copyFileSync(generatedIndex, latestReportPath);
  fs.rmSync(tempReportDir, { recursive: true, force: true });

  setReportTitle(timestampedPath, timestamp);
  setReportTitle(latestReportPath, timestamp);
  fs.writeFileSync(latestReportMetaPath, timestampedFileName, 'utf8');

  console.log(`Allure report saved: ${timestampedPath}`);
  console.log(`Latest copy: ${latestReportPath}`);
  console.log('Open the latest file directly from File Explorer (double-click).');

  return 0;
}

function shareReport() {
  return generateReport();
}

function serveReport() {
  if (!hasResults()) {
    console.warn('No Allure results found in allure-results. Run tests first.');
    return 1;
  }

  prepareAllureResults();
  return runAllure(['serve', 'allure-results']);
}

function openReportInBrowser(filePath) {
  const absolutePath = path.resolve(filePath);

  if (process.platform === 'win32') {
    spawnSync('cmd', ['/c', 'start', '', absolutePath], {
      stdio: 'ignore',
      shell: false,
      windowsHide: true,
    });
    return 0;
  }

  if (process.platform === 'darwin') {
    return spawnSync('open', [absolutePath], { stdio: 'ignore' }).status ?? 1;
  }

  return spawnSync('xdg-open', [absolutePath], { stdio: 'ignore' }).status ?? 1;
}

function openReport() {
  let reportPath = getLatestReportPath();

  if (!reportPath) {
    const status = generateReport();
    reportPath = getLatestReportPath();
    if (status !== 0 || !reportPath) {
      console.error('No generated report found. Run "npm test" or "npm run allure:generate" first.');
      return 1;
    }
  }

  console.log(`Opening: ${reportPath}`);
  return openReportInBrowser(reportPath);
}

const commandSets = {
  clean: cleanResults,
  generate: generateReport,
  share: shareReport,
  serve: serveReport,
  open: openReport,
};

if (require.main === module) {
  const mode = process.argv[2] || 'share';
  const command = commandSets[mode];

  if (!command) {
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
  }

  const status = typeof command === 'function' ? command() : 0;
  process.exit(status);
}

module.exports = {
  cleanResults,
  generateReport,
  shareReport,
  serveReport,
  hasResults,
  getLatestReportPath,
  getTimestampedReportFileName,
  prepareAllureResults,
};
