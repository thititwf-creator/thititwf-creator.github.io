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
// DOM ELEMENTS
// ======================================================
const yearSelect = document.getElementById('year-select');
const monthSelect = document.getElementById('month-select');
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
//   yearSelect.addEventListener('change', onFiscalYearSelect);
//   monthSelect.addEventListener('change', onMonthSelect);
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
// DATA LOAD
// ======================================================
async function loadInitialData() {
  try {
    const res = await fetch(ROLLBACK_CSV_URL);
    const csvText = await res.text();
    const rows = csvText.split(/\r?\n/).slice(1);

    allData = rows.map(row => {
      const c = row.split(',').map(s => s.trim());
      if (c.length < 6 || !c[3]) return null;
      return {
        month: c[1],
        year: parseInt(c[2]),
        province: c[3],
        expected: parseFloat(c[4]) || 0,
        returned: parseFloat(c[5]) || 0
      };
    }).filter(Boolean);

    // populateFiscalYearFilter();
    loadLatestFiscalData();

  } catch (e) {
    showError(e, 'โหลดข้อมูลไม่สำเร็จ');
  }
}

// ======================================================
// FILTERS
// ======================================================
function populateFiscalYearFilter() {
  const years = new Set();
  allData.forEach(d => {
    const idx = FISCAL_MONTHS_ORDER.indexOf(d.month);
    years.add(idx <= 2 ? d.year + 1 : d.year);
  });

  yearSelect.innerHTML = '<option value="">-- เลือกปีงบประมาณ --</option>';
  [...years].sort((a, b) => b - a).forEach(y => {
    yearSelect.innerHTML += `<option value="${y}">ปีงบประมาณ ${y}</option>`;
  });
}

function onFiscalYearSelect() {
  resetFilters();
  monthSelect.disabled = true;
  tableBody.innerHTML = rowMessage('กรุณาเลือกเดือน');

  if (!yearSelect.value) return;

  const fy = parseInt(yearSelect.value);
  const months = allData.filter(d => {
    const i = FISCAL_MONTHS_ORDER.indexOf(d.month);
    return i <= 2 ? d.year === fy - 1 : d.year === fy;
  }).map(d => d.month);

  monthSelect.innerHTML = '<option value="">-- เลือกเดือน --</option>';
  FISCAL_MONTHS_ORDER.filter(m => months.includes(m))
    .forEach(m => monthSelect.innerHTML += `<option value="${m}">${m}</option>`);
  monthSelect.disabled = false;
}

function onMonthSelect() {
  resetFilters();
  if (!yearSelect.value || !monthSelect.value) {
    tableBody.innerHTML = rowMessage('กรุณาเลือกปีและเดือน');
    return;
  }

  const fy = parseInt(yearSelect.value);
  const month = monthSelect.value;
  const idx = FISCAL_MONTHS_ORDER.indexOf(month);
  const calYear = idx <= 2 ? fy - 1 : fy;

  const raw = allData.filter(d => d.year === calYear && d.month === month);

  provincialData = raw.map(d => ({
    province: d.province,
    totalReturned: d.returned,
    totalExpected: d.expected,
    percentage: calcPercent(d.returned, d.expected)
  }));

  renderGrandTotal(raw, month, fy);
  renderFilteredAndSortedTable();
}

// ======================================================
// RENDER TABLE
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
// UTIL
// ======================================================
function handleSort(key) {
  currentSort.order =
    currentSort.key === key && currentSort.order === 'asc' ? 'desc' : 'asc';
  currentSort.key = key;
  renderFilteredAndSortedTable();
}

function handlePercentageFilterChange() {
  percentageValue.disabled = percentageCondition.value === 'all';
  if (percentageValue.disabled) percentageValue.value = '';
  renderFilteredAndSortedTable();
}

function resetFilters() {
  searchInput.value = '';
  percentageCondition.value = 'all';
  percentageValue.value = '';
  percentageValue.disabled = true;
}

function calcPercent(r, e) {
  return e === 0 ? 0 : (r * 100) / e;
}

function formatCurrency(n) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency: 'THB'
  }).format(n || 0);
}

function rowMessage(msg) {
  return `<tr><td colspan="5" class="loading-text">${msg}</td></tr>`;
}

// ======================================================
// GRAND TOTAL
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
        <span class="card-title">ภาพรวม ${month} (ปีงบ ${year})</span>
        <span class="card-percentage">${calcPercent(total.r, total.e).toFixed(2)}%</span>
      </div>
      <div class="card-body">
        <div class="data-row"><span>รับคืนรวม</span><span>${formatCurrency(total.r)}</span></div>
        <div class="data-row"><span>คาดว่าจะได้</span><span>${formatCurrency(total.e)}</span></div>
      </div>
    </div>`;
}

// ======================================================
// EXPORT / NAV
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

function goProvince(p) {
  location.href = `province.html?province=${encodeURIComponent(p)}`;
}

function showError(e, msg) {
  tableBody.innerHTML = rowMessage(`${msg}: ${e.message}`);
  console.error(e);
}

function renderDataByYearAndMonth(selectedFiscalYear, selectedMonth) {

    const monthIndex = FISCAL_MONTHS_ORDER.indexOf(selectedMonth);
    const calendarYear =
        (monthIndex >= 0 && monthIndex <= 2)
            ? selectedFiscalYear - 1
            : selectedFiscalYear;

    const rawFilteredData = allData.filter(
        d => d.year === calendarYear && d.month === selectedMonth
    );

    const grandTotal = rawFilteredData.reduce((acc, item) => {
        acc.totalExpected += parseFloat(item.expected) || 0;
        acc.totalReturned += parseFloat(item.returned) || 0;
        return acc;
    }, { totalExpected: 0, totalReturned: 0 });

    renderGrandTotalCard({
        province: `ภาพรวมเดือน ${selectedMonth} (ปีงบประมาณ ${selectedFiscalYear})`,
        totalExpected: grandTotal.totalExpected,
        totalReturned: grandTotal.totalReturned,
        percentage: calculatePercentageValue(
            grandTotal.totalReturned,
            grandTotal.totalExpected
        )
    });

    provincialData = rawFilteredData.map((item, index) => {
        const returned = parseFloat(item.returned) || 0;
        const expected = parseFloat(item.expected) || 0;

        return {
            uniqueId: `${item.province}-${index}`,
            province: item.province,
            totalReturned: returned,
            totalExpected: expected,
            percentage: calculatePercentageValue(returned, expected)
        };
    });

    renderFilteredAndSortedCards();
}


function loadLatestFiscalData() {
    if (!allData || allData.length === 0) return;

    // หา year มากที่สุดก่อน
    const maxYear = Math.max(...allData.map(d => d.year));

    // ข้อมูลเฉพาะปีล่าสุด
    const dataInMaxYear = allData.filter(d => d.year === maxYear);

    // หาเดือนล่าสุดตามลำดับปีงบประมาณ
    const latestMonth = FISCAL_MONTHS_ORDER
        .slice()
        .reverse()
        .find(m => dataInMaxYear.some(d => d.month === m));

    if (!latestMonth) return;

    // คำนวณปีงบประมาณ
    const monthIndex = FISCAL_MONTHS_ORDER.indexOf(latestMonth);
    const fiscalYear = (monthIndex >= 0 && monthIndex <= 2)
        ? maxYear + 1
        : maxYear;

    // ใช้ logic เดิม
    renderDataByYearAndMonth(fiscalYear, latestMonth);
}
