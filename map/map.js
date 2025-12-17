const DATA_TYPES = {
  debt_due: {
    label: "หนี้ครบกำหนดชำระ",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=0&single=true&output=csv",
    colE: "เงินต้นที่คาดว่าจะได้รับ",
    colF: "เงินต้นที่รับคืน"
  },
  overdue: {
    label: "หนี้เกินกำหนดชำระ",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1712737757&single=true&output=csv",
    colE: "จำนวนเงินทั้งหมด",
    colF: "หนี้เกินกำหนดชำระ"
  },
  disburse: {
    label: "ผลเบิกจ่าย",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=815669108&single=true&output=csv",
    colE: "งบประมาณ",
    colF: "ผลเบิกจ่าย"
  }
};

let rawData = [];
let currentType = "debt_due";

// โหลด SVG
fetch("map/thailandHigh.svg")
  .then(r => r.text())
  .then(svg => document.getElementById("map-container").innerHTML = svg);

// โหลด CSV
async function loadCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  const rows = text.trim().split("\n").map(r => r.split(","));
  const header = rows.shift();

  return rows.map(r => ({
    ปีงบ: r[0],
    เดือน: r[1],
    จังหวัด: r[2].trim(),
    E: Number(r[3]),
    F: Number(r[4])
  }));
}

// สร้าง dropdown
function buildFilter(data) {
  fillSelect("yearSelect", [...new Set(data.map(d => d.ปีงบ))]);
  fillSelect("monthSelect", [...new Set(data.map(d => d.เดือน))]);
}

function fillSelect(id, arr) {
  const el = document.getElementById(id);
  el.innerHTML = `<option value="ทั้งหมด">ทั้งหมด</option>`;
  arr.sort().forEach(v => el.innerHTML += `<option>${v}</option>`);
}

// กรอง + แสดงตาราง
function applyFilter() {
  const y = yearSelect.value;
  const m = monthSelect.value;

  const filtered = rawData.filter(r =>
    (y === "ทั้งหมด" || r.ปีงบ == y) &&
    (m === "ทั้งหมด" || r.เดือน == m)
  );

  renderTable(filtered);
  updateMap(filtered);
}

function renderTable(data) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  data.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.จังหวัด}</td>
        <td>${r.E.toLocaleString()}</td>
        <td>${r.F.toLocaleString()}</td>
      </tr>
    `;
  });
}

// อัปเดตสีแผนที่ (ตัวอย่างง่าย)
function updateMap(data) {
  const sum = {};
  data.forEach(r => {
    if (!sum[r.จังหวัด]) sum[r.จังหวัด] = 0;
    sum[r.จังหวัด] += r.F;
  });

  document.querySelectorAll("svg path").forEach(p => {
    const name = mapping_pv[p.id];
    if (!name || !sum[name]) {
      p.style.fill = "#eee";
    } else {
      p.style.fill = "#64b5f6";
    }
  });
}

// เปลี่ยนประเภทข้อมูล
async function changeType(type) {
  currentType = type;
  const cfg = DATA_TYPES[type];

  document.getElementById("tableTitle").textContent = cfg.label;
  document.getElementById("colE").textContent = cfg.colE;
  document.getElementById("colF").textContent = cfg.colF;

  rawData = await loadCSV(cfg.url);
  buildFilter(rawData);
  applyFilter();
}

// init
const typeSelect = document.getElementById("typeSelect");
Object.entries(DATA_TYPES).forEach(([k, v]) => {
  typeSelect.innerHTML += `<option value="${k}">${v.label}</option>`;
});

typeSelect.onchange = e => changeType(e.target.value);
yearSelect.onchange = monthSelect.onchange = applyFilter;

changeType(currentType);
