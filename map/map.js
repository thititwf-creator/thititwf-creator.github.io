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
    // Blue scale (เข้ม → อ่อน)
    const blues = [
        "#0a3d91", // เข้มสุด
        "#1f5fbf",
        "#4b84d9",
        "#8ab1f0",
        "#c7dcff"  // อ่อนสุด
    ];

    // Gray scale (อ่อน → เข้ม)
    const grays = [
        "#d9d9d9",
        "#bfbfbf",
        "#8c8c8c",
        "#595959",
        "#262626"
    ];

    return green ? blues[rank] : grays[rank];
}


/* อัปเดตทั้งหมด */
function updateView() {
    if (!rawData.length || !svgDoc) return;

    const type = typeSelect.value;
    const year = yearSelect.value;
    const month = monthSelect.value;

    const rows = rawData.filter(r => r["ปีงบ"] === year && r["เดือน"] === month);
    if (!rows.length) return;

    const percentKey = Object.keys(rows[0]).find(k => k.includes("ร้อยละ"));

    // ------------------------------
    //  จัดอันดับตามประเภท
    // ------------------------------
    if (type === "overdue") {
        rows.sort((a, b) => parseFloat(a[percentKey]) - parseFloat(b[percentKey]));
    } else {
        rows.sort((a, b) => parseFloat(b[percentKey]) - parseFloat(a[percentKey]));
    }

    const top5 = rows.slice(0, 5);
    const bottom5 = rows.slice(-5);

    // ------------------------------
    //  อัปเดตตาราง
    // ------------------------------
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

    // ------------------------------
    //  ลงสีบนแผนที่
    // ------------------------------
    svgDoc.querySelectorAll("path").forEach(p => {
        const pv = mapping_pv[p.id];
        const rowTop = top5.find(r => r["จังหวัด"] === pv);
        const rowBottom = bottom5.find(r => r["จังหวัด"] === pv);

        let color = "#eee";

        if (rowTop) {
            color = colorScale(top5.indexOf(rowTop), true);
        } else if (rowBottom) {
            color = colorScale(bottom5.indexOf(rowBottom), false);
        }

        p.style.fill = color;

        const row = rowTop || rowBottom;
        p.onmousemove = e => {
            if (!row) return;

            const rect = document.querySelector(".map-area").getBoundingClientRect();
            let rank = rowTop
                ? top5.indexOf(row) + 1
                : rows.length - 5 + bottom5.indexOf(row) + 1;

            tooltip.style.display = "block";
            tooltip.style.left = (e.clientX - rect.left + 12) + "px";
            tooltip.style.top = (e.clientY - rect.top + 12) + "px";

            tooltip.innerHTML = `
                <b>${rank}. ${pv}</b><br>
                ค่า 1: ${Number(Object.values(row)[3] || 0).toLocaleString()}<br>
                ค่า 2: ${Number(Object.values(row)[4] || 0).toLocaleString()}<br>
                ${percentKey}: ${Number(row[percentKey]).toFixed(2)}%
            `;
        };
        p.onmouseleave = () => tooltip.style.display = "none";
    });

    // ==========================================================
    // ⭐ ปักหมุดแบบเข็ม บน Top 5 (สีน้ำเงิน) + Bottom 5 (สีแดง)
    // ==========================================================

    // ลบหมุดเก่าก่อน
    svgDoc.querySelectorAll(".map-pin").forEach(el => el.remove());

    // ฟังก์ชันวางหมุดเข็ม + ตัวเลขบนหมุด
    function addPin(path, rank, type) {
        const bbox = path.getBBox();

        // ขนาดหมุดใหม่
        const pinSize = 52;     // เดิม 40
        const pinHalf = pinSize / 2;

        // ตำแหน่งใหม่นิดหน่อยให้สมดุล
        const pinX = bbox.x + bbox.width / 2 - pinHalf;
        const pinY = bbox.y + bbox.height / 2 - pinSize + 8; // ขยับลง 8px ให้หมุดดูพอดีขึ้น

        // pin SVG
        const pin = document.createElementNS("http://www.w3.org/2000/svg", "image");
        pin.setAttribute("href", type === "top" ? "map/pin-green.svg" : "map/pin-red.svg");
        pin.setAttribute("width", pinSize);
        pin.setAttribute("height", pinSize);
        pin.setAttribute("x", pinX);
        pin.setAttribute("y", pinY);
        pin.setAttribute("class", "map-pin");

        svgDoc.appendChild(pin);

        // -------- ตัวเลขบนหมุด (ใหญ่ขึ้น) --------
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", bbox.x + bbox.width / 2);
        label.setAttribute("y", pinY + pinSize / 2 + 4); // ขยับเลขลงให้กลางหัวหมุด
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("font-size", "20");           // เดิม 16
        label.setAttribute("font-weight", "bold");
        label.setAttribute("fill", "#fff");
        label.setAttribute("class", "map-pin");
        label.textContent = rank;

        svgDoc.appendChild(label);
    }


    // ปักหมุด Top 5 → pin-blue.svg
    top5.forEach((r, i) => {
        const pv = r["จังหวัด"];
        const pathId = Object.keys(mapping_pv).find(k => mapping_pv[k] === pv);
        const path = svgDoc.querySelector(`path#${pathId}`);
        if (path) addPin(path, i + 1, "top");
    });

    // ปักหมุด Bottom 5 → pin-red.svg
    bottom5.forEach((r, i) => {
        const pv = r["จังหวัด"];
        const rank = rows.length - 5 + i + 1;
        const pathId = Object.keys(mapping_pv).find(k => mapping_pv[k] === pv);
        const path = svgDoc.querySelector(`path#${pathId}`);
        if (path) addPin(path, rank, "bottom");
    });
}

/* events */
typeSelect.onchange = () => loadCSV(typeSelect.value);
yearSelect.onchange = updateView;
monthSelect.onchange = updateView;

/* init */
loadCSV("due");
