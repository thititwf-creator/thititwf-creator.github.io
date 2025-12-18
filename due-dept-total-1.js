// ======================================================
// CONFIG
// ======================================================
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSriF3pc_Y5lQhZNYoD1jEa8mV7o0Nn0AmXsGhqMD5qXlEMVL86FFYE3o59VIZ6srMk4yeox0bupsGQ/pub?gid=0&single=true&output=csv";

// ======================================================
// GLOBAL
// ======================================================
let allData = [];
let currentData = [];
let currentSort = { key: "province", order: "asc" };

// ======================================================
// CONSTANT
// ======================================================
const FISCAL_MONTHS_ORDER = [
  "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  "มกราคม", "กุมภาพันธ์", "มีนาคม",
  "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน"
];

// ======================================================
// DOM
// ======================================================
const tableBody = document.getElementById("tableBody");
const searchInput = document.getElementById("searchInput");
const percentageCondition = document.getElementById("percentage-condition");
const percentageValue = document.getElementById("percentage-value");
const grandTotalContainer = document.getElementById("grandTotalContainer");

// ======================================================
// INIT
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
  searchInput.addEventListener("input", renderFilteredTable);
  percentageCondition.addEventListener("change", onPercentConditionChange);
  percentageValue.addEventListener("input", renderFilteredTable);

  document.getElementById("sort-province")
    .addEventListener("click", () => handleSort("province"));

  document.getElementById("sort-percentage")
    .addEventListener("click", () => handleSort("percentage"));

  loadCSV();
});

// ======================================================
// LOAD CSV
// ======================================================
async function loadCSV() {
  try {
    const res = await fetch(CSV_URL);
    const csv = await res.text();
    const rows = csv.split(/\r?\n/).slice(1);

    allData = rows.map(r => {
      const c = r.split(",").map(v => v.trim());
      if (c.length < 6) return null;

      const month = c[1];
      const year = parseInt(c[2]); // ปีปฏิทิน (พ.ศ.)

      const fiscalYear =
        ["ตุลาคม", "พฤศจิกายน", "ธันวาคม"].includes(month)
          ? year + 1
          : year;

      return {
        month,
        year,
        fiscalYear,
        province: c[3],
        expected: parseFloat(c[4]) || 0,
        returned: parseFloat(c[5]) || 0,
        percentage: parseFloat(c[6]) || 0
      };
    }).filter(Boolean);

    loadLatestFiscalMonth();

  } catch (e) {
    showError(e, "โหลดข้อมูลไม่สำเร็จ");
  }
}

// ======================================================
// FIND LATEST FISCAL YEAR + MONTH
// ======================================================
function loadLatestFiscalMonth() {
  if (!allData.length) return;

  // ปีงบล่าสุดจริง
  const latestFiscalYear = Math.max(...allData.map(d => d.fiscalYear));

  const fiscalData = allData.filter(d => d.fiscalYear === latestFiscalYear);

  // เดือนล่าสุดตามลำดับปีงบ
  const latestMonth = FISCAL_MONTHS_ORDER
    .slice()
    .reverse()
    .find(m => fiscalData.some(d => d.month === m));

  const monthData = fiscalData.filter(d => d.month === latestMonth);

  currentData = monthData.map(d => ({
    province: d.province,
    totalReturned: d.returned,
    totalExpected: d.expected,
    percentage: d.percentage
  }));

  renderGrandTotal(monthData, latestMonth, latestFiscalYear);
  renderFilteredTable();
}

// ======================================================
// RENDER TABLE
// ======================================================
function renderFilteredTable() {
  let data = [...currentData];

  if (searchInput.value) {
    data = data.filter(d =>
      d.province.toLowerCase().includes(searchInput.value.toLowerCase())
    );
  }

  const cond = percentageCondition.value;
  const val = parseFloat(percentageValue.value);
  if (cond !== "all" && !isNaN(val)) {
    data = data.filter(d =>
      cond === "gt" ? d.percentage > val :
      cond === "lt" ? d.percentage < val :
      Math.round(d.percentage) === Math.round(val)
    );
  }

  data.sort((a, b) => {
    const A = a[currentSort.key];
    const B = b[currentSort.key];
    return typeof A === "string"
      ? (currentSort.order === "asc"
          ? A.localeCompare(B, "th")
          : B.localeCompare(A, "th"))
      : (currentSort.order === "asc" ? A - B : B - A);
  });

  renderTable(data);
}

function renderTable(data) {
  tableBody.innerHTML = "";

  if (!data.length) {
    tableBody.innerHTML = rowMessage("ไม่พบข้อมูล");
    return;
  }

  data.forEach(d => {
    const status =
      d.percentage >= 80 ? ["ดี", "status-green"] :
      d.percentage >= 50 ? ["ปานกลาง", "status-yellow"] :
                           ["เฝ้าระวัง", "status-red"];

    tableBody.innerHTML += `
      <tr>
        <td class="province-link">${d.province}</td>
        <td>${formatCurrency(d.totalReturned)}</td>
        <td>${formatCurrency(d.totalExpected)}</td>
        <td>${d.percentage.toFixed(2)}%</td>
        <td class="${status[1]}">${status[0]}</td>
      </tr>
    `;
  });
}

// ======================================================
// GRAND TOTAL
// ======================================================
function renderGrandTotal(data, month, fiscalYear) {
  const total = data.reduce((a, b) => {
    a.r += b.returned;
    a.e += b.expected;
    return a;
  }, { r: 0, e: 0 });

  grandTotalContainer.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span>ภาพรวม ${month} (ปีงบ ${fiscalYear})</span>
        <span>${calcPercent(total.r, total.e).toFixed(2)}%</span>
      </div>
      <div class="data-row">
        <span>เงินต้นรับคืนรวม</span>
        <span>${formatCurrency(total.r)}</span>
      </div>
      <div class="data-row">
        <span>เงินต้นที่คาดว่าจะได้รับ</span>
        <span>${formatCurrency(total.e)}</span>
      </div>
    </div>
  `;
}

// ======================================================
// UTIL
// ======================================================
function handleSort(key) {
  currentSort.order =
    currentSort.key === key && currentSort.order === "asc" ? "desc" : "asc";
  currentSort.key = key;
  renderFilteredTable();
}

function onPercentConditionChange() {
  percentageValue.disabled = percentageCondition.value === "all";
  if (percentageValue.disabled) percentageValue.value = "";
  renderFilteredTable();
}

function calcPercent(r, e) {
  return e === 0 ? 0 : (r * 100) / e;
}

function formatCurrency(n) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(n || 0);
}

function rowMessage(msg) {
  return `<tr><td colspan="5" class="loading-text">${msg}</td></tr>`;
}

function showError(e, msg) {
  tableBody.innerHTML = rowMessage(`${msg}: ${e.message}`);
  console.error(e);
}
