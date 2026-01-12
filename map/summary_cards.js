/* ==============================
   CONFIG CSV URL
================================ */
const SUMMARY_CSV_URLS = {
  due: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=0&single=true&output=csv",
  overdue: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1712737757&single=true&output=csv",
  disburse: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=815669108&single=true&output=csv"
};

/* ==============================
   COLUMN INDEX (A–F)
================================ */
const COL = {
  FY: 0,        // ปีงบ
  MONTH: 1,     // เดือน
  PROVINCE: 2,  // จังหวัด
  TARGET: 3,    // เป้า
  ACTUAL: 4,    // ค่าที่ได้
  PERCENT: 5    // ร้อยละ (ไม่ใช้)
};

/* ==============================
   CSV PARSER (ARRAY)
================================ */
function parseCSV(text) {
  return text
    .trim()
    .split("\n")
    .slice(1)           // ข้าม header
    .map(line => line.split(","));
}

/* ==============================
   CALCULATE RATE
================================ */
async function calculateSummaryRate(url) {
  const res = await fetch(url);
  const csvText = await res.text();
  const data = parseCSV(csvText);

  // ปีงบล่าสุด
  const latestFY = Math.max(
    ...data.map(r => Number(r[COL.FY]))
  );

  // เดือนล่าสุดของปีงบล่าสุด
  const latestMonth = Math.max(
    ...data
      .filter(r => Number(r[COL.FY]) === latestFY)
      .map(r => Number(r[COL.MONTH]))
  );

  // ข้อมูลล่าสุด (ทุกจังหวัด)
  const filtered = data.filter(r =>
    Number(r[COL.FY]) === latestFY &&
    Number(r[COL.MONTH]) === latestMonth
  );

  // รวมค่า
  const totalTarget = filtered.reduce(
    (sum, r) => sum + (Number(r[COL.TARGET]) || 0), 0
  );

  const totalActual = filtered.reduce(
    (sum, r) => sum + (Number(r[COL.ACTUAL]) || 0), 0
  );

  return totalTarget
    ? (totalActual * 100) / totalTarget
    : 0;
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
