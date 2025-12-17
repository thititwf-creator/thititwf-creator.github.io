/* map/map.js */

const CSV_URLS = {
    due: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=0&single=true&output=csv",
    overdue: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1712737757&single=true&output=csv",
    disburse: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=815669108&single=true&output=csv"
};

let rawData = [];
let svgDoc;

/* โหลดแผนที่ */
fetch("map/thailandHigh.svg")
    .then(r => r.text())
    .then(svg => {
        document.getElementById("map").innerHTML = svg;

        const svgEl = document.querySelector("#map svg");

        // 🔑 ทำให้ SVG scale ได้จริง
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
        svgEl.setAttribute("viewBox", "0 0 800 1200");
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

        svgDoc = svgEl;

    });

/* โหลด CSV */
async function loadCSV(type) {
    const res = await fetch(CSV_URLS[type]);
    const text = await res.text();
    const rows = text.trim().split("\n").map(r => r.split(","));
    const headers = rows.shift();

    rawData = rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
    initFilters();
    updateView();
}

/* dropdown */
function initFilters() {
    const years = [...new Set(rawData.map(r => r["ปีงบ"]))];
    const months = [...new Set(rawData.map(r => r["เดือน"]))];

    yearSelect.innerHTML = years.map(y => `<option>${y}</option>`).join("");
    monthSelect.innerHTML = months.map(m => `<option>${m}</option>`).join("");
}

/* สี */
function colorScale(rank, isGreenHigh = true) {
    const greens = ["#d0f0c0", "#a8e6a1", "#6fd27a", "#32b45a", "#0a8f3c"];
    const reds = ["#f6c1c1", "#f19a9a", "#e55c5c", "#c93030", "#8f0a0a"];
    return isGreenHigh ? greens[rank] : reds[rank];
}

/* อัปเดตทั้งหมด */
function updateView() {
    const type = typeSelect.value;
    const year = yearSelect.value;
    const month = monthSelect.value;

    let rows = rawData.filter(r => r["ปีงบ"] === year && r["เดือน"] === month);

    const percentKey = Object.keys(rows[0]).find(h => h.includes("ร้อยละ"));
    rows.sort((a, b) => parseFloat(b[percentKey]) - parseFloat(a[percentKey]));

    const top5 = rows.slice(0, 5);
    const bottom5 = rows.slice(-5);

    // ตาราง
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";
    rows.forEach(r => {
        tbody.innerHTML += `
      <tr>
        <td>${r["จังหวัด"]}</td>
        <td>${Object.values(r)[3]}</td>
        <td>${Object.values(r)[4]}</td>
        <td>${r[percentKey]}</td>
      </tr>`;
    });

    // แผนที่
    svgDoc.querySelectorAll("path").forEach(p => {
        const pv = mapping_pv[p.id];
        const row = rows.find(r => r["จังหวัด"] === pv);
        if (!row) return p.style.fill = "#eee";

        let color = "#ccc";
        if (top5.includes(row)) color = (type === "overdue") ? colorScale(top5.indexOf(row), false) : colorScale(top5.indexOf(row), true);
        if (bottom5.includes(row)) color = (type === "overdue") ? colorScale(bottom5.indexOf(row), true) : colorScale(bottom5.indexOf(row), false);

        p.style.fill = color;

        // tooltip
        p.onmousemove = e => {
            tooltip.style.display = "block";
            tooltip.style.left = e.pageX + 10 + "px";
            tooltip.style.top = e.pageY + 10 + "px";
            tooltip.innerHTML = `
        <b>${pv}</b><br>
        ${percentKey}: ${row[percentKey]}%
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
