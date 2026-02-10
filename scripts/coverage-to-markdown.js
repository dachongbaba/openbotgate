/**
 * Reads coverage/coverage-summary.json and writes COVERAGE.md in project root.
 * Run after: pnpm test:coverage (or jest --coverage)
 */
const fs = require('fs');
const path = require('path');

const summaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
const outPath = path.join(__dirname, '..', 'COVERAGE.md');

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const total = summary.total;
delete summary.total;

// Normalize file paths to src/... and group by top-level dir
const byDir = {};
for (const [absPath, data] of Object.entries(summary)) {
  const match = absPath.replace(/\\/g, '/').match(/[/]src[/](.+)$/);
  const relPath = match ? `src/${match[1]}` : absPath;
  const topDir = relPath.split('/')[1] || 'other';
  if (!byDir[topDir]) byDir[topDir] = [];
  byDir[topDir].push({ path: relPath, ...data });
}

// Sort dirs and files within each dir
const dirOrder = ['config', 'gateway', 'handler', 'runtime', 'utils'];
const sortedDirs = Object.keys(byDir).sort((a, b) => {
  const ia = dirOrder.indexOf(a);
  const ib = dirOrder.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
});

function pct(n) {
  if (n === undefined) return '-';
  return `${Number(n).toFixed(2)}%`;
}

const lines = [
  '# 测试覆盖率报告',
  '',
  '由 `pnpm test:coverage` 生成，本文件由 `scripts/coverage-to-markdown.js` 从 `coverage-summary.json` 生成。',
  '',
  '## 汇总',
  '',
  '| 指标 | 覆盖率 | 已覆盖 / 总数 |',
  '|------|--------|----------------|',
  `| 语句 (Statements) | ${pct(total.statements?.pct)} | ${total.statements?.covered ?? '-'} / ${total.statements?.total ?? '-'} |`,
  `| 分支 (Branches)   | ${pct(total.branches?.pct)} | ${total.branches?.covered ?? '-'} / ${total.branches?.total ?? '-'} |`,
  `| 函数 (Functions)  | ${pct(total.functions?.pct)} | ${total.functions?.covered ?? '-'} / ${total.functions?.total ?? '-'} |`,
  `| 行 (Lines)        | ${pct(total.lines?.pct)} | ${total.lines?.covered ?? '-'} / ${total.lines?.total ?? '-'} |`,
  '',
];

for (const dir of sortedDirs) {
  const files = byDir[dir].sort((a, b) => a.path.localeCompare(b.path));
  lines.push(`## ${dir}`);
  lines.push('');
  lines.push('| 文件 | 语句 | 分支 | 函数 | 行 |');
  lines.push('|------|------|------|------|-----|');
  for (const { path: filePath, statements, branches, functions, lines: linesData } of files) {
    const short = filePath.replace(/^src\//, '');
    lines.push(
      `| ${short} | ${pct(statements?.pct)} | ${pct(branches?.pct)} | ${pct(functions?.pct)} | ${pct(linesData?.pct)} |`
    );
  }
  lines.push('');
}

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Wrote', outPath);
