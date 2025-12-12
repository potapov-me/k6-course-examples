#!/usr/bin/env node
// Урок 9: Скрипт сравнения с baseline
// Автоматическое определение регрессии производительности

import fs from "fs";

const [, , currentFile, baselineFile, budgetStr] = process.argv;

if (!currentFile || !baselineFile) {
  console.error("Usage: node compare-baseline.js <current.json> <baseline.json> [budget]");
  process.exit(1);
}

const current = JSON.parse(fs.readFileSync(currentFile, "utf8"));
const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
const budget = Number(budgetStr || 0.1); // 10% по умолчанию

console.log("📊 Comparing performance with baseline...\n");

const metrics = ["http_req_duration", "http_req_failed", "checks"];
let hasRegression = false;

for (const metric of metrics) {
  const curMetric = current.metrics[metric];
  const baseMetric = baseline.metrics[metric];

  if (!curMetric || !baseMetric) {
    console.log(`⚠️  Metric ${metric} not found in one of the files`);
    continue;
  }

  // Для duration смотрим p95
  if (metric === "http_req_duration") {
    const curP95 = curMetric.values["p(95)"];
    const baseP95 = baseMetric.values["p(95)"];
    const diff = ((curP95 - baseP95) / baseP95) * 100;

    console.log(`📈 ${metric} (p95):`);
    console.log(`   Baseline: ${baseP95.toFixed(0)}ms`);
    console.log(`   Current:  ${curP95.toFixed(0)}ms`);
    console.log(`   Diff:     ${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`);

    if (diff > budget * 100) {
      console.log(`   ❌ REGRESSION: Exceeds budget of ${(budget * 100).toFixed(0)}%\n`);
      hasRegression = true;
    } else if (diff < 0) {
      console.log(`   ✅ IMPROVEMENT\n`);
    } else {
      console.log(`   ✅ Within budget\n`);
    }
  }

  // Для error rate и checks смотрим rate
  if (metric === "http_req_failed" || metric === "checks") {
    const curRate = curMetric.values.rate;
    const baseRate = baseMetric.values.rate;
    const diff = curRate - baseRate;

    console.log(`📊 ${metric} (rate):`);
    console.log(`   Baseline: ${(baseRate * 100).toFixed(2)}%`);
    console.log(`   Current:  ${(curRate * 100).toFixed(2)}%`);
    console.log(`   Diff:     ${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(2)}%`);

    // Для http_req_failed рост — плохо
    if (metric === "http_req_failed" && diff > budget) {
      console.log(`   ❌ REGRESSION: Error rate increased\n`);
      hasRegression = true;
    }
    // Для checks падение — плохо
    else if (metric === "checks" && diff < -budget) {
      console.log(`   ❌ REGRESSION: Checks rate decreased\n`);
      hasRegression = true;
    } else {
      console.log(`   ✅ Within budget\n`);
    }
  }
}

if (hasRegression) {
  console.log("❌ Performance regression detected!");
  console.log("   Review the changes or adjust thresholds.\n");
  process.exit(1);
} else {
  console.log("✅ Performance is within acceptable bounds!");
  console.log("   Safe to proceed with deployment.\n");
  process.exit(0);
}
