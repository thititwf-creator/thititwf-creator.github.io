// =======================
// CONFIG
// =======================
const API_URL =
  'https://script.google.com/macros/s/AKfycbyQwOGNo1MSLAcQhrm8zCcTwl4gA5ssJJCwcnNYgWSUngenSAT0gZEOVILJ33mpupno/exec';

// =======================
// ELEMENTS
// =======================
const titleEl = document.getElementById('title');
const summaryEl = document.getElementById('summary');
const searchBox = document.getElementById('searchBox');
const table = document.getElementById('resultTable');
const tbody = table.querySelector('tbody');

// =======================
// STATE
// =======================
let allData = [];
let viewData = [];
let provinceName = '';
let token = '';

// =======================
// UTIL
// =======================
const fmtNum = n =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 })
    .format(Number(n) || 0);

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('th-TH') : '';

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// =======================
// CLEAN URL (ซ่อน token)
// =======================
function removeQueryString() {
  const cleanURL =
    window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanURL);
}

// =======================
// LOAD DATA
// =======================
async function loadData() {
  provinceName = getParam('province');
  token = getParam('token');

  // ❌ กันเข้าโดยตรง
  if (!provinceName) {
    titleEl.textContent = 'ไม่พบข้อมูลจังหวัด';
    summaryEl.textContent =
      'กรุณาเข้าใช้งานผ่านระบบ Login';
    return;
  }

  titleEl.textContent = `จังหวัด ${provinceName}`;
  summaryEl.textContent = 'กำลังโหลดข้อมูล...';

  try {
    const url =
      `${API_URL}?province=${encodeURIComponent(provinceName)}` +
      (token ? `&token=${encodeURIComponent(token)}` : '');

    const res = await fetch(url);
    const json = await res.json();

    if (json.error) {
      summaryEl.textContent = 'ไม่มีสิทธิ์เข้าถึงข้อมูล';
      console.error(json.error);
      return;
    }

    allData = json.data || [];
    viewData = allData;

    summaryEl.textContent =
      `พบข้อมูลทั้งหมด ${allData.length} รายการ`;

    renderTable(viewData);

    // 🔥 ลบ province / token ออกจาก URL
    removeQueryString();

  } catch (err) {
    summaryEl.textContent =
      'เกิดข้อผิดพลาดในการโหลดข้อมูล';
    console.error(err);
  }
}

// =======================
// SEARCH
// =======================
searchBox.addEventListener('input', () => {
  const q = searchBox.value.trim().toLowerCase();

  viewData = !q
    ? allData
    : allData.filter(row =>
        Object.values(row)
          .join(' ')
          .toLowerCase()
          .includes(q)
      );

  summaryEl.textContent =
    `แสดงผล ${viewData.length} / ${allData.length} รายการ`;

  renderTable(viewData);
});

// =======================
// RENDER TABLE
// =======================
function renderTable(data) {
  tbody.innerHTML = '';

  if (!data.length) {
    table.style.display = 'none';
    return;
  }

  data.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${r['อำเภอ'] || ''}</td>
      <td>${r['ตำบล'] || ''}</td>
      <td>${r['เลขที่สัญญา'] || ''}</td>
      <td>${r['ชื่อโครงการ'] || ''}</td>
      <td>${r['ชื่อผู้เสนอ'] || ''}</td>
      <td>${fmtDate(r['กำหนดชำระ'])}</td>
      <td class="text-right">
        ${fmtNum(r['เงินต้นที่คาดว่าจะได้'])}
      </td>
      <td class="text-right">
        ${fmtNum(r['เงินต้นรับคืน'])}
      </td>
      <td>${r['สถานะการมีข้อมูลใน ค-ง'] || ''}</td>
    `;
    tbody.appendChild(tr);
  });

  table.style.display = 'table';
}

// =======================
// INIT
// =======================
loadData();
