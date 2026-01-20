// 🔴 ใส่ URL Web App ของคุณตรงนี้
const API_BASE =
  'https://script.google.com/macros/s/AKfycbyBHgSQRzhlbBX1qcwNQtZP8v5hcYHMBGg5HQy7tR1rQwRYNWUO9GzWPms9J1aqa6Fu/exec';

const provinceInput = document.getElementById('province');
const districtInput = document.getElementById('district');
const subdistrictInput = document.getElementById('subdistrict');
const searchBtn = document.getElementById('searchBtn');
const table = document.getElementById('resultTable');
const tbody = table.querySelector('tbody');
const summary = document.getElementById('summary');

// สร้าง URL ตามพารามิเตอร์ที่มีจริง
function buildApiUrl(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v.trim() !== '') qs.append(k, v.trim());
  });
  return `${API_BASE}?${qs.toString()}`;
}

// format
function fmtNumber(n) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2
  }).format(n || 0);
}

function fmtDate(d) {
  if (!d) return '';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(d));
}

// render table
function renderTable(result) {
  tbody.innerHTML = '';

  if (result.status !== 'ok' || result.count === 0) {
    summary.textContent = 'ไม่พบข้อมูล';
    table.style.display = 'none';
    return;
  }

  result.data.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center">${i + 1}</td>
      <td>${row['จังหวัด']}</td>
      <td>${row['อำเภอ']}</td>
      <td>${row['ตำบล']}</td>
      <td>${row['เลขที่สัญญา']}</td>
      <td>${row['ชื่อโครงการ']}</td>
      <td>${fmtDate(row['กำหนดชำระ'])}</td>
      <td class="text-right">${fmtNumber(row['เงินต้นที่คาดว่าจะได้'])}</td>
      <td class="text-right">${fmtNumber(row['เงินต้นรับคืน'])}</td>
      <td>${row['สถานะการมีข้อมูลใน ค-ง']}</td>
    `;
    tbody.appendChild(tr);
  });

  summary.textContent = `พบข้อมูลทั้งหมด ${result.count} รายการ`;
  table.style.display = 'table';
}

// event
searchBtn.addEventListener('click', async () => {
  if (!provinceInput.value.trim()) {
    alert('กรุณาระบุจังหวัด');
    return;
  }

  const url = buildApiUrl({
    province: provinceInput.value,
    district: districtInput.value,
    subdistrict: subdistrictInput.value
  });

  try {
    summary.textContent = 'กำลังโหลดข้อมูล...';
    table.style.display = 'none';

    const res = await fetch(url);
    const data = await res.json();
    renderTable(data);

  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ API');
    console.error(err);
  }
});
