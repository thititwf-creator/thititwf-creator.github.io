// 🔴 ใส่ URL Web App ของคุณตรงนี้
const API_URL =
  'https://script.google.com/macros/s/AKfycbyBHgSQRzhlbBX1qcwNQtZP8v5hcYHMBGg5HQy7tR1rQwRYNWUO9GzWPms9J1aqa6Fu/exec';
const provinceSel = document.getElementById('province');
const districtSel = document.getElementById('district');
const subdistrictSel = document.getElementById('subdistrict');
const searchBtn = document.getElementById('searchBtn');
const table = document.getElementById('resultTable');
const tbody = table.querySelector('tbody');
const summary = document.getElementById('summary');

// util
const uniq = arr => [...new Set(arr)];
const fmtNum = n => new Intl.NumberFormat('th-TH',{minimumFractionDigits:2}).format(n||0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('th-TH') : '';

// cache ข้อมูลจังหวัด (ลด API)
let provinceData = [];

// =======================
// เลือกจังหวัด → fetch ครั้งแรก
// =======================
provinceSel.addEventListener('change', async () => {
  districtSel.innerHTML = '<option value="">-- เลือกอำเภอ --</option>';
  subdistrictSel.innerHTML = '<option value="">-- เลือกตำบล --</option>';
  districtSel.disabled = true;
  subdistrictSel.disabled = true;
  searchBtn.disabled = true;
  table.style.display = 'none';

  if (!provinceSel.value) return;

  summary.textContent = 'กำลังโหลดข้อมูลจังหวัด...';

  const res = await fetch(`${API_URL}?province=${provinceSel.value}`);
  const json = await res.json();

  provinceData = json.data || [];

  if (provinceData.length === 0) {
    summary.textContent = 'ไม่พบข้อมูลจังหวัดนี้';
    return;
  }

  const districts = uniq(provinceData.map(r => r['อำเภอ'])).sort();
  districts.forEach(d => {
    const o = document.createElement('option');
    o.value = d;
    o.textContent = d;
    districtSel.appendChild(o);
  });

  districtSel.disabled = false;
  searchBtn.disabled = false;
  summary.textContent = `พบข้อมูล ${provinceData.length} รายการ`;
});

// =======================
// เลือกอำเภอ → ใช้ cache
// =======================
districtSel.addEventListener('change', () => {
  subdistrictSel.innerHTML = '<option value="">-- เลือกตำบล --</option>';
  subdistrictSel.disabled = true;

  if (!districtSel.value) return;

  const subs = uniq(
    provinceData
      .filter(r => r['อำเภอ'] === districtSel.value)
      .map(r => r['ตำบล'])
  ).sort();

  subs.forEach(s => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s;
    subdistrictSel.appendChild(o);
  });

  subdistrictSel.disabled = false;
});

// =======================
// SEARCH (ไม่โหลดใหม่ถ้าไม่จำเป็น)
// =======================
searchBtn.addEventListener('click', async () => {
  let rows = provinceData;

  if (districtSel.value) {
    rows = rows.filter(r => r['อำเภอ'] === districtSel.value);
  }
  if (subdistrictSel.value) {
    rows = rows.filter(r => r['ตำบล'] === subdistrictSel.value);
  }

  if (rows.length === 0) {
    summary.textContent = 'ไม่พบข้อมูล';
    return;
  }

  tbody.innerHTML = '';
  rows.forEach((r,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center">${i+1}</td>
      <td>${r['จังหวัด']}</td>
      <td>${r['อำเภอ']}</td>
      <td>${r['ตำบล']}</td>
      <td>${r['เลขที่สัญญา']}</td>
      <td>${r['ชื่อโครงการ']}</td>
      <td>${fmtDate(r['กำหนดชำระ'])}</td>
      <td class="text-right">${fmtNum(r['เงินต้นที่คาดว่าจะได้'])}</td>
      <td class="text-right">${fmtNum(r['เงินต้นรับคืน'])}</td>
      <td>${r['สถานะการมีข้อมูลใน ค-ง']}</td>
    `;
    tbody.appendChild(tr);
  });

  summary.textContent = `แสดงผล ${rows.length} รายการ`;
  table.style.display = 'table';
});
