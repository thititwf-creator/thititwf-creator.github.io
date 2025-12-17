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
    .then(svg => {
        const container = document.getElementById("map-container");
        container.innerHTML = svg;

        const svgEl = container.querySelector("svg");

        // แก้ให้ responsive และไม่โดนตัด
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
        svgEl.setAttribute("viewBox", "0 0 1000 1800"); // thailandHigh ใช้ประมาณนี้
        svgEl.style.width = "100%";
        svgEl.style.height = "100%";
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
    });


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

function renderTable(summary) {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    Object.entries(summary).forEach(([pv, v]) => {
        tbody.innerHTML += `
            <tr>
                <td>${pv}</td>
                <td>${v.E.toLocaleString()}</td>
                <td>${v.F.toLocaleString()}</td>
                <td>${v.percent.toFixed(2)}%</td>
            </tr>
        `;
    });
}


function updateMap(data) {

    const summary = {};

    // รวมข้อมูลรายจังหวัด
    data.forEach(r => {
        if (!summary[r.จังหวัด]) {
            summary[r.จังหวัด] = { E: 0, F: 0 };
        }
        summary[r.จังหวัด].E += r.E;
        summary[r.จังหวัด].F += r.F;
    });

    // คำนวณเปอร์เซ็นต์
    Object.values(summary).forEach(p => {
        p.percent = p.E > 0 ? (p.F / p.E) * 100 : 0;
    });

    // เรียงจังหวัดตามเปอร์เซ็นต์
    const sorted = Object.entries(summary)
        .sort((a, b) => a[1].percent - b[1].percent);

    let top5 = [];
    let bottom5 = [];

    if (currentType === "overdue") {
        // ต่ำ = ดี
        top5 = sorted.slice(0, 5);
        bottom5 = sorted.slice(-5);
    } else {
        // สูง = ดี
        top5 = sorted.slice(-5);
        bottom5 = sorted.slice(0, 5);
    }

    const greens = ["#1b5e20", "#2e7d32", "#43a047", "#66bb6a", "#a5d6a7"];
    const reds   = ["#b71c1c", "#c62828", "#e53935", "#ef5350", "#ffcdd2"];

    const colorMap = {};

    top5.forEach(([pv], i) => colorMap[pv] = greens[i]);
    bottom5.forEach(([pv], i) => colorMap[pv] = reds[i]);

    const tooltip = document.getElementById("tooltip");

    document.querySelectorAll("svg path").forEach(p => {
        const pvName = mapping_pv[p.id];
        const info = summary[pvName];

        if (!info) {
            p.style.fill = "#eee";
            return;
        }

        p.style.fill = colorMap[pvName] || "#ddd";

        p.onmouseenter = e => {
            p.dataset.oldFill = p.style.fill;
            p.style.fill = "#ffb74d";

            tooltip.style.display = "block";
            tooltip.innerHTML = `
                <strong>${pvName}</strong><br>
                ค่า E: ${info.E.toLocaleString()}<br>
                ค่า F: ${info.F.toLocaleString()}<br>
                ร้อยละ: ${info.percent.toFixed(2)}%
            `;
        };

        p.onmousemove = e => {
            tooltip.style.left = e.clientX + 12 + "px";
            tooltip.style.top = e.clientY + 12 + "px";
        };

        p.onmouseleave = () => {
            p.style.fill = p.dataset.oldFill;
            tooltip.style.display = "none";
        };
    });

    renderTable(summary);
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
