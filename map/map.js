/* map/map.js */

const CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=0&single=true&output=csv";

const tooltip = document.getElementById("tooltip");

/* =======================
   โหลด SVG แผนที่
======================= */
async function loadMap() {
    const res = await fetch("map/thailandHigh.svg");
    const svgText = await res.text();
    document.getElementById("mapContainer").innerHTML = svgText;

    const svg = document.querySelector("#mapContainer svg");

    svg.querySelectorAll("path").forEach(p => {
        const mapId = p.id; // เช่น TH-10
        const provinceTH = mapping_pv[mapId];

        if (!provinceTH) return;

        // เก็บชื่อจังหวัดภาษาไทย
        p.dataset.province = provinceTH;

        p.addEventListener("mouseenter", e => {
            p.style.stroke = "#000";
        });

        p.addEventListener("mouseleave", e => {
            p.style.stroke = "#999";
            tooltip.style.display = "none";
        });
    });
}

/* =======================
   โหลด CSV
======================= */
async function loadCSV(url) {
    const res = await fetch(url);
    const text = await res.text();

    const rows = text.trim().split("\n");
    const headers = rows.shift().split(",");

    return rows.map(r => {
        const obj = {};
        r.split(",").forEach((v, i) => {
            obj[headers[i]] = v;
        });
        return obj;
    });
}

/* =======================
   ระบายสี + ตาราง
======================= */
function render(data) {

    const percents = data.map(d => +d["ร้อยละของการชำระคืน"]);
    const max = Math.max(...percents);
    const min = Math.min(...percents);

    // ---------- MAP ----------
    document.querySelectorAll("svg path").forEach(p => {
        const province = p.dataset.province;
        if (!province) return;

        const row = data.find(d => d["จังหวัด"] === province);
        if (!row) return;

        const percent = +row["ร้อยละของการชำระคืน"];

        // ไล่สี แดง → เขียว
        const ratio = (percent - min) / (max - min || 1);
        const r = Math.round(255 * (1 - ratio));
        const g = Math.round(255 * ratio);
        p.style.fill = `rgb(${r},${g},0)`;

        p.onmousemove = e => {
            tooltip.style.display = "block";
            tooltip.style.left = e.pageX + 10 + "px";
            tooltip.style.top = e.pageY + 10 + "px";
            tooltip.innerHTML = `
                <b>${province}</b><br>
                ร้อยละ: ${percent}%
            `;
        };
    });

    // ---------- TABLE ----------
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    data.forEach(r => {
        tbody.innerHTML += `
        <tr>
            <td>${r["จังหวัด"]}</td>
            <td>${(+r["เงินต้นที่รับคืน"]).toLocaleString()}</td>
            <td>${r["ร้อยละของการชำระคืน"]}%</td>
        </tr>`;
    });
}

/* =======================
   INIT
======================= */
(async function init() {
    await loadMap();
    const data = await loadCSV(CSV_URL);
    render(data);
})();
