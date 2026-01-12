/* ==============================
   CONFIG CSV URL
================================ */
const SUMMARY_CSV_URLS = {
  due: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=0&single=true&output=csv",
  overdue: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1712737757&single=true&output=csv",
  disburse: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=815669108&single=true&output=csv"
};

/* ==============================
   CSV PARSER
================================ */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
    return obj;
  });
}

/* ==============================
   CALCULATE RATE
================================ */
async function calculateSummaryRate(url) {
  const res = await fetch(url);
  const csvText = await res.text();
  const data = parseCSV(csvText);

  const FY = "ปีงบ";
  const MONTH = "เดือน";
  const TARGET = "เป้า";
  const ACTUAL = "ค่าที่ได้";

  const latestFY = Math.max(...data.map(d => +d[FY]));
  const latestMonth = Math.max(
    ...data.filter(d => +d[FY] === latestFY).map(d => +d[MONTH])
  );

  const filtered = data.filter(d =>
    +d[FY] === latestFY &&
    +d[MONTH] === latestMonth
  );

  const totalTarget = filtered.reduce((s, d) => s + (+d[TARGET] || 0), 0);
  const totalActual = filtered.reduce((s, d) => s + (+d[ACTUAL] || 0), 0);

  return totalTarget ? (totalActual * 100 / totalTarget) : 0;
}

/* ==============================
   LOAD TO CARD
================================ */
async function loadSummaryCards() {
  const disburse = await calculateSummaryRate(SUMMARY_CSV_URLS.disburse);
  const due = await calculateSummaryRate(SUMMARY_CSV_URLS.due);
  const overdue = await calculateSummaryRate(SUMMARY_CSV_URLS.overdue);

  document.getElementById("disburseRate").textContent = disburse.toFixed(2) + "%";
  document.getElementById("dueRate").textContent = due.toFixed(2) + "%";
  document.getElementById("overdueRate").textContent = overdue.toFixed(2) + "%";
}

/* ==============================
   SAFE LOAD
================================ */
document.addEventListener("DOMContentLoaded", loadSummaryCards);
