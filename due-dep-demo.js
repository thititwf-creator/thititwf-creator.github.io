// 🔴 ใส่ URL Web App ของคุณตรงนี้
const API_BASE =
  'https://script.google.com/macros/s/AKfycbyBHgSQRzhlbBX1qcwNQtZP8v5hcYHMBGg5HQy7tR1rQwRYNWUO9GzWPms9J1aqa6Fu/exec';
const provinceSel = document.getElementById('province');
const districtSel = document.getElementById('district');
const subdistrictSel = document.getElementById('subdistrict');
const searchBtn = document.getElementById('searchBtn');
const table = document.getElementById('resultTable');
const tbody = table.querySelector('tbody');
const summary = document.getElementById('summary');

// =======================
// UTIL
// =======================
function uniq(arr){ return [...new Set(arr)] }

function fmtNum(n){
  return new Intl.NumberFormat('th-TH',{minimumFractionDigits:2})
    .format(n || 0)
}

function fmtDate(d){
  if(!d) return ''
  return new Intl.DateTimeFormat('th-TH',{
    day:'numeric',month:'long',year:'numeric'
  }).format(new Date(d))
}

// =======================
// LOAD INITIAL (จังหวัด)
// =======================
async function loadProvinces(){
  summary.textContent = 'กำลังโหลดจังหวัด...'
  const res = await fetch(API_URL)
  const json = await res.json()

  const provinces = uniq(json.data.map(r => r['จังหวัด'])).sort()
  provinces.forEach(p=>{
    const o = document.createElement('option')
    o.value = p
    o.textContent = p
    provinceSel.appendChild(o)
  })

  summary.textContent = ''
}

// =======================
// CHANGE PROVINCE
// =======================
provinceSel.addEventListener('change', async () => {
  districtSel.innerHTML = '<option value="">-- เลือกอำเภอ --</option>'
  subdistrictSel.innerHTML = '<option value="">-- เลือกตำบล --</option>'
  districtSel.disabled = true
  subdistrictSel.disabled = true

  if(!provinceSel.value) return

  const res = await fetch(`${API_URL}?province=${provinceSel.value}`)
  const json = await res.json()

  const districts = uniq(json.data.map(r => r['อำเภอ'])).sort()
  districts.forEach(d=>{
    const o = document.createElement('option')
    o.value = d
    o.textContent = d
    districtSel.appendChild(o)
  })

  districtSel.disabled = false
})

// =======================
// CHANGE DISTRICT
// =======================
districtSel.addEventListener('change', async () => {
  subdistrictSel.innerHTML = '<option value="">-- เลือกตำบล --</option>'
  subdistrictSel.disabled = true

  if(!districtSel.value) return

  const url = `${API_URL}?province=${provinceSel.value}&district=${districtSel.value}`
  const res = await fetch(url)
  const json = await res.json()

  const subs = uniq(json.data.map(r => r['ตำบล'])).sort()
  subs.forEach(s=>{
    const o = document.createElement('option')
    o.value = s
    o.textContent = s
    subdistrictSel.appendChild(o)
  })

  subdistrictSel.disabled = false
})

// =======================
// SEARCH
// =======================
searchBtn.addEventListener('click', async () => {
  if(!provinceSel.value){
    alert('กรุณาเลือกจังหวัด')
    return
  }

  const qs = new URLSearchParams({
    province: provinceSel.value,
    district: districtSel.value,
    subdistrict: subdistrictSel.value
  })

  summary.textContent = 'กำลังค้นหาข้อมูล...'
  table.style.display = 'none'
  tbody.innerHTML = ''

  const res = await fetch(`${API_URL}?${qs.toString()}`)
  const json = await res.json()

  if(json.count === 0){
    summary.textContent = 'ไม่พบข้อมูล'
    return
  }

  json.data.forEach((r,i)=>{
    const tr = document.createElement('tr')
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
    `
    tbody.appendChild(tr)
  })

  summary.textContent = `พบข้อมูล ${json.count} รายการ`
  table.style.display = 'table'
})

// =======================
// INIT
// =======================
loadProvinces()