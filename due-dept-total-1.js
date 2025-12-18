// ======================================================
// CONFIG
// ======================================================
const ROLLBACK_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSriF3pc_Y5lQhZNYoD1jEa8mV7o0Nn0AmXsGhqMD5qXlEMVL86FFYE3o59VIZ6srMk4yeox0bupsGQ/pub?gid=0&single=true&output=csv';

// ======================================================
// GLOBAL STATE
// ======================================================
let allData = [];
let provincialData = [];
let currentSort = { key: 'province', order: 'asc' };

// ======================================================
// DOM
// ======================================================
const searchInput = document.getElementById('searchInput');
const tableBody = document.getElementById('tableBody');
const grandTotalContainer = document.getElementById('grandTotalContainer');
const percentageCondition = document.getElementById('percentage-condition');
const percentageValue = document.getElementById('percentage-value');

// ======================================================
// CONSTANTS
// ======================================================
const FISCAL_MONTHS_ORDER = [
  "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  "มกราคม", "กุมภาพันธ์", "มีนาคม",
  "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน"
];

// ======================================================
// INIT
// ======================================================
document.addEventListener("DOMContentLoaded", () => {

  searchInput.addEventListener('input', renderFilteredAndSortedTable);

  document.getElementById('sort-province')
    .addEventListener('click', () => handleSort('province'));

  document.getElementById('sort-percentage')
    .addEventListener('click', () => handleSort('percentage'));

  percentageCondition.addEventListener('change', handlePercentageFilterChange);
  percentageValue.addEventListener('input', renderFilteredAndSortedTable);

  document.querySelectorAll("th[data-key]").forEach(th => {
    th.addEventListener("click", () => handleSort(th.dataset.key));
  });

  loadInitialData();
});

// ======================================================
// LOAD DATA
// ======================================================
async function loadInitialData() {
  try {
    const res = await fetch(ROLLBACK_CSV_URL);
    const csvText = await res.text();
    const rows = csvText.split(/\r?\n/).slice(1);

    allData = rows.map(r => {
      const c = r.split(',').map(s => s.trim());
      if (c.length < 6 || !c[3]) return null;
      return {
        month: c[1],
        year: parseInt(c[2]),
        province: c[3],
        expected: parseFloat(c[4]) || 0,
        returned: parseFloat(c[5]) || 0
      };
    }).filter(Boolean);

    loadLatestFiscalData();

  } catch (e) {
    showError(e, 'โหลดข้อมูลไม่สำเร็จ');
  }
}

// ======================================================
// AUTO LATEST MONTH
// ======================================================
function loadLatestFiscalData() {
  if (!allData.length) return;

  const maxYear = Math.max(...allData.map(d => d.year));
  const dataInMaxYear = allData.filter(d => d.year === maxYear);

  const latestMonth = [...FISCAL_MONTHS_ORDER]
    .reverse()
    .find(m => dataInMaxYear.some(d => d.month === m));

  if (!latestMonth) return;

  const idx = FISCAL_MONTHS_ORDER.indexOf(latestMonth);
  const fiscalYear = idx <= 2 ? maxYear + 1 : maxYear;

  renderByMonthAndYear(latestMonth, fiscalYear);
}

// ======================================================
// MAIN RENDER
// ======================================================
function renderByMonthAndYear(month, fiscalYear) {

  const idx = FISCAL_MONTHS_ORDER.indexOf(month);
  const calendarYear = idx <= 2 ? fiscalYear - 1 : fiscalYear;

  const raw = allData.filter(
    d => d.year === calendarYear && d.month === month
  );

  provincialData = raw.map(d => ({
    province: d.province,
    totalReturned: d.returned,
    totalExpected: d.expected,
    percentage: calcPercent(d.returned, d.expected)
  }));

  renderGrandTotal(raw, month, fiscalYear);
  renderFilteredAndSortedTable();
}

// ======================================================
// TABLE
// ======================================================
function renderFilteredAndSortedTable() {
  let data = [...provincialData];

  if (searchInput.value) {
    data = data.filter(d =>
      d.province.toLowerCase().includes(searchInput.value.toLowerCase())
    );
  }

  const cond = percentageCondition.value;
  const val = parseFloat(percentageValue.value);
  if (cond !== 'all' && !isNaN(val)) {
    data = data.filter(d =>
      cond === 'gt' ? d.percentage > val :
      cond === 'lt' ? d.percentage < val :
      Math.round(d.percentage) === Math.round(val)
    );
  }

  data.sort((a, b) => {
    const A = a[currentSort.key];
    const B = b[currentSort.key];
    return typeof A === 'string'
      ? (currentSort.order === 'asc'
        ? A.localeCompare(B, 'th')
        : B.localeCompare(A, 'th'))
      : (currentSort.order === 'asc' ? A - B : B - A);
  });

  renderTable(data);
}

function renderTable(data) {
  tableBody.innerHTML = '';

  if (!data.length) {
    tableBody.innerHTML = rowMessage('ไม่พบข้อมูล');
    return;
  }

  data.forEach(d => {
    const status =
      d.percentage >= 80 ? ['เสี่ยงสูง', 'status-red'] :
      d.percentage >= 50 ? ['เฝ้าระวัง', 'status-yellow'] :
                           ['ปกติ', 'status-green'];

    tableBody.innerHTML += `
      <tr>
        <td class="province-link" onclick="goProvince('${d.province}')">${d.province}</td>
        <td>${formatCurrency(d.totalReturned)}</td>
        <td>${formatCurrency(d.totalExpected)}</td>
        <td>${d.percentage.toFixed(2)}%</td>
        <td class="${status[1]}">${status[0]}</td>
      </tr>`;
  });
}

// ======================================================
// GRAND TOTAL (แบบเรียบ ไม่มี card logic เก่า)
// ======================================================
function renderGrandTotal(raw, month, year) {
  const total = raw.reduce((a, b) => {
    a.r += b.returned;
    a.e += b.expected;
    return a;
  }, { r: 0, e: 0 });

  grandTotalContainer.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span>ภาพรวม ${month} (ปีงบ ${year})</span>
        <span>${calcPercent(total.r, total.e).toFixed(2)}%</span>
      </div>
      <div class="data-row">
        <span>รับคืนรวม</span><span>${formatCurrency(total.r)}</span>
      </div>
      <div class="data-row">
        <span>คาดว่าจะได้</span><span>${formatCurrency(total.e)}</span>
      </div>
    </div>`;
}

// ======================================================
// UTIL
// ======================================================
function handleSort(key) {
  currentSort.order =
    currentSort.key === key && currentSort.order === 'asc'
      ? 'desc' : 'asc';
  currentSort.key = key;
  renderFilteredAndSortedTable();
}

function handlePercentageFilterChange() {
  percentageValue.disabled = percentageCondition.value === 'all';
  if (percentageValue.disabled) percentageValue.value = '';
  renderFilteredAndSortedTable();
}

function calcPercent(r, e) {
  return e === 0 ? 0 : (r * 100) / e;
}

function formatCurrency(n) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(n || 0);
}

function rowMessage(msg) {
  return `<tr><td colspan="5" class="loading-text">${msg}</td></tr>`;
}

function goProvince(p) {
  location.href = `province.html?province=${encodeURIComponent(p)}`;
}

function showError(e, msg) {
  tableBody.innerHTML = rowMessage(`${msg}: ${e.message}`);
  console.error(e);
}

// ======================================================
// EXPORT
// ======================================================
function exportToExcel() {
  let csv = 'จังหวัด,รับคืน,คาดว่าจะได้,ร้อยละ\n';
  provincialData.forEach(d => {
    csv += `"${d.province}",${d.totalReturned},${d.totalExpected},${d.percentage.toFixed(2)}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'CDD_WomenFund.csv';
  a.click();
}
