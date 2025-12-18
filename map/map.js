/* map/map.js */
const CSV_URLS = {
    due: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=0&single=true&output=csv",
    overdue: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1712737757&single=true&output=csv",
    disburse: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=815669108&single=true&output=csv"
};

let rawData = [];
let svgDoc;

// 🔑 DOM elements (สำคัญมาก)
const typeSelect = document.getElementById("typeSelect");
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const tooltip = document.getElementById("mapTooltip");

/* โหลดแผนที่ */
fetch("map/thailandHigh.svg")
    .then(r => r.text())
    .then(svg => {
        document.getElementById("map").innerHTML = svg;

        const svgEl = document.querySelector("#map svg");
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");

        if (!svgEl.getAttribute("viewBox")) {
            svgEl.setAttribute("viewBox", "0 0 900 1400");
        }

        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svgDoc = svgEl;
    });


/* โหลด CSV */
async function loadCSV(type) {
    const res = await fetch(CSV_URLS[type]);
    const text = await res.text();

    const rows = text.trim().split("\n").map(r => r.split(","));
    const headers = rows.shift();

    rawData = rows.map(r =>
        Object.fromEntries(headers.map((h, i) => [h.trim(), r[i]]))
    );

    initFilters();
    updateView();
}

/* dropdown */
function initFilters() {
    const years = [...new Set(rawData.map(r => r["ปีงบ"]))];
    const months = [...new Set(rawData.map(r => r["เดือน"]))];

    yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
    monthSelect.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join("");
}

/* สี */
function colorScale(rank, green) {
    const greens = ["#0a8f3c", // เข้มสุด (มาก)
        "#32b45a",
        "#6fd27a",
        "#a8e6a1",
        "#d0f0c0"]; // อ่อนสุด (น้อย)
    const reds = ["#f6c1c1", "#f19a9a", "#e55c5c", "#c93030", "#8f0a0a"];
    return green ? greens[rank] : reds[rank];
}

/* อัปเดตทั้งหมด */
function updateView() {
    if (!rawData.length) return;

    const type = typeSelect.value;
    const year = yearSelect.value;
    const month = monthSelect.value;

    const rows = rawData.filter(r => r["ปีงบ"] === year && r["เดือน"] === month);
    if (!rows.length) return;

    const percentKey = Object.keys(rows[0]).find(k => k.includes("ร้อยละ"));

    // เรียงจากมาก→น้อย
    rows.sort((a, b) => parseFloat(b[percentKey]) - parseFloat(a[percentKey]));

    // Top 5 / Bottom 5
    const top5 = rows.slice(0, 5);
    const bottom5 = rows.slice(-5);

    // ตาราง
    const tbody = document.querySelector("#mapTable tbody");
    tbody.innerHTML = "";

    // Top 5
    top5.forEach((r, i) => {
        tbody.innerHTML += `
  <tr>
    <td>${i + 1}. ${r["จังหวัด"]}</td>
    <td>${Number(Object.values(r)[3] || 0).toLocaleString()}</td>
    <td>${Number(Object.values(r)[4] || 0).toLocaleString()}</td>
    <td>${Number(r[percentKey]).toFixed(2)}</td>
  </tr>`;
    });

    // Bottom 5
    bottom5.forEach((r, i) => {
        tbody.innerHTML += `
  <tr>
    <td>${rows.length - 5 + i + 1}. ${r["จังหวัด"]}</td>
    <td>${Number(Object.values(r)[3] || 0).toLocaleString()}</td>
    <td>${Number(Object.values(r)[4] || 0).toLocaleString()}</td>
    <td>${Number(r[percentKey]).toFixed(2)}</td>
  </tr>`;
    });

    // แผนที่
    svgDoc.querySelectorAll("path").forEach(p => {
        const pv = mapping_pv[p.id];
        if (!pv) return;

        let rowTop = top5.find(r => r["จังหวัด"] === pv);
        let rowBottom = bottom5.find(r => r["จังหวัด"] === pv);

        let color = "#eee"; // ค่า default

        if (rowTop) {
            color = (type === "overdue") ? colorScale(top5.indexOf(rowTop), false) : colorScale(top5.indexOf(rowTop), true);
        } else if (rowBottom) {
            color = (type === "overdue") ? colorScale(bottom5.indexOf(rowBottom), true) : colorScale(bottom5.indexOf(rowBottom), false);
        }

        p.style.fill = color;

        // Tooltip สำหรับ Top/Bottom 5 เท่านั้น
        const row = rowTop || rowBottom;
        p.onmousemove = e => {
            if (!row) return;
            const rect = document.querySelector(".map-area").getBoundingClientRect();

            let rank = rowTop ? top5.indexOf(row) + 1 : rows.length - 5 + bottom5.indexOf(row) + 1;

            tooltip.style.display = "block";
            tooltip.style.left = (e.clientX - rect.left + 15) + "px";
            tooltip.style.top = (e.clientY - rect.top + 15) + "px";

            tooltip.innerHTML = `
      <b>${rank}. ${pv}</b><br>
      ค่า 1: ${Number(Object.values(row)[3] || 0).toLocaleString()}<br>
      ค่า 2: ${Number(Object.values(row)[4] || 0).toLocaleString()}<br>
      ${percentKey}: ${Number(row[percentKey]).toFixed(2)}%
    `;
        };
        p.onmouseleave = () => tooltip.style.display = "none";
    });

}

/* events */
typeSelect.onchange = () => loadCSV(typeSelect.value);
yearSelect.onchange = updateView;
monthSelect.onchange = updateView;

/* init */
loadCSV("due");
