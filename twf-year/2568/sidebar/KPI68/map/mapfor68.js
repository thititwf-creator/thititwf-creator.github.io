/* map/map.js */
/* ===============================
   AUTO BASE PATH (รองรับทุกหน้า)
================================= */
function getAssetBase() {
    const script = document.currentScript || [...document.scripts].pop();
    return script.src.substring(0, script.src.lastIndexOf("/") + 1);
}

const ASSET_BASE = getAssetBase();

const CSV_URLS = {
    due: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1213897949&single=true&output=csv",
    overdue: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1506220620&single=true&output=csv",
    disburse: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1526520191&single=true&output=csv"
};

let rawData = [];
let svgDoc;

// 🔑 DOM elements (สำคัญมาก)
const typeSelect = document.getElementById("typeSelect");
// const yearSelect = document.getElementById("yearSelect");
// const monthSelect = document.getElementById("monthSelect");
const tooltip = document.getElementById("mapTooltip");

/* โหลดแผนที่ */
fetch(ASSET_BASE + "thailandHigh.svg")
    .then(r => r.text())
    .then(svg => {
        document.getElementById("map").innerHTML = svg;

        const svgEl = document.querySelector("#map svg");

        // คืนค่าแบบเก่า — ไม่ต้อง wrap <g>
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");

        if (!svgEl.getAttribute("viewBox")) {
            svgEl.setAttribute("viewBox", "0 0 900 1400");
        }

        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

        // ⭐ WRAP CONTENT
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        while (svgEl.firstChild) {
            g.appendChild(svgEl.firstChild);
        }
        svgEl.appendChild(g);

        svgDoc = g; // ⚠️ เปลี่ยนจาก svg → g

        loadCSV(DEFAULT_TYPE);

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
    // const years = [...new Set(rawData.map(r => r["ปีงบ"]))];
    // const months = [...new Set(rawData.map(r => r["เดือน"]))];

    // yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
    // monthSelect.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join("");
}

/* สี */
function colorScale(rank, green) {
    // Blue scale (เข้ม → อ่อน)
    const blues = [
        "#0a3d91", // เข้มมาก
        "#134aa6",
        "#1f5fbf",
        "#3572cf",
        "#4b84d9",
        "#6a9be6",
        "#8ab1f0",
        "#a9c8f7",
        "#c7dcff",
        "#e3efff"  // อ่อนมาก
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
    // const year = yearSelect.value;
    // const month = monthSelect.value;

    // const rows = rawData.filter(r => r["ปีงบ"] === year && r["เดือน"] === month);
    // const rows = rawData.filter(r => r["ปีงบ"] === year );

    const latestRow = rawData
        .slice()
        .sort((a, b) => {
            if (a["ปีงบ"] !== b["ปีงบ"]) {
                return Number(b["ปีงบ"]) - Number(a["ปีงบ"]);
            }
            return Number(b["เดือน"]) - Number(a["เดือน"]);
        })[0];

    const latestYear = latestRow["ปีงบ"];
    const latestMonth = latestRow["เดือน"];

    // 🔥 ใช้ข้อมูลล่าสุดเท่านั้น
    const rows = rawData.filter(
        r => r["ปีงบ"] === latestYear && r["เดือน"] === latestMonth
    );

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

    const top10 = rows.slice(0, 10);

    // ------------------------------
    //  อัปเดตตาราง (เวอร์ชันใหม่ แยกหัวข้อ Top5/Bottom5)
    // ------------------------------
    const tbody = document.querySelector("#mapTable tbody");
    tbody.innerHTML = `
<tr class="section-header">
    <td colspan="4">▶ 10 อันดับแรก</td>
</tr>
`;

    top10.forEach((r, i) => {
        tbody.innerHTML += `
    <tr>
        <td>${i + 1}. ${r["จังหวัด"]}</td>
        <td>${Number(Object.values(r)[3] || 0).toLocaleString()}</td>
        <td>${Number(Object.values(r)[4] || 0).toLocaleString()}</td>
        <td>${Number(r[percentKey]).toFixed(2)}</td>
    </tr>`;
    });


    // ------------------------------
    //  ลงสีบนแผนที่ + tooltip
    // ------------------------------
    svgDoc.querySelectorAll("path").forEach(p => {
        const pv = mapping_pv[p.id];

        const rowTop = top10.find(r => r["จังหวัด"] === pv);


        // ⭐ NEW: ข้อมูลของจังหวัด (รองรับทุกจังหวัด)
        const row = rows.find(r => r["จังหวัด"] === pv);
        let color = "#eee";

        if (rowTop) {
            // ติด Top 10
            color = colorScale(top10.indexOf(rowTop), true);
            p.classList.remove("map-default");
        } else {
            // ไม่ติด Top 10
            color = "#e98ae7";
            p.classList.add("map-default");
        }


        p.style.fill = color;
        p.style.pointerEvents = "visibleFill";

        // ------------------------
        // ⭐ แสดง tooltip ทุกจังหวัด
        // ------------------------
        p.onmousemove = e => {
            if (!row) return; // ป้องกันกรณีจังหวัดไม่อยู่ใน CSV (ไม่น่าจะเกิด)

            const rect = document.querySelector(".map-area").getBoundingClientRect();

            // อันดับ (ถ้าไม่ติดอันดับ จะไม่ขึ้นตัวเลข)
            let rankText = "";
            if (rowTop) rankText = `${top10.indexOf(rowTop) + 1}. `;


            tooltip.style.display = "block";
            tooltip.style.left = (e.clientX - rect.left + 12) + "px";
            tooltip.style.top = (e.clientY - rect.top + 12) + "px";

            tooltip.innerHTML = `
            <b>${rankText}${pv}</b><br>
            ค่าเป้าหมาย : ${Number(Object.values(row)[3] || 0).toLocaleString()}<br>
            ค่าผลลัพธ์ : ${Number(Object.values(row)[4] || 0).toLocaleString()}<br>
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
    function addPin(path, rank, type, rowData) {
        const bbox = path.getBBox();

        const pinSize = 52;
        const pinHalf = pinSize / 2;

        const pinX = bbox.x + bbox.width / 2 - pinHalf;
        const pinY = bbox.y + bbox.height / 2 - pinSize + 8;

        // --- Pin image ---
        const pin = document.createElementNS("http://www.w3.org/2000/svg", "image");
        pin.setAttribute("href", ASSET_BASE + (type === "top"
            ? "pin-green.svg"
            : "pin-red.svg"
        )
        );
        pin.setAttribute("width", pinSize);
        pin.setAttribute("height", pinSize);
        pin.setAttribute("x", pinX);
        pin.setAttribute("y", pinY);
        pin.setAttribute("class", "map-pin");
        pin.style.pointerEvents = "none"; // ❗ ไม่ให้รับ hover ใด ๆ
        svgDoc.appendChild(pin);

        // --- Pin label (number) ---
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", bbox.x + bbox.width / 2);
        label.setAttribute("y", pinY + pinSize / 2 + 4);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("font-size", "20");
        label.setAttribute("font-weight", "bold");
        label.setAttribute("stroke", "#ffffff");
        label.setAttribute("stroke-width", "2");
        label.setAttribute("class", "map-pin");
        label.style.pointerEvents = "none"; // ❗ ไม่ให้รับ hover
        label.textContent = rank;
        svgDoc.appendChild(label);

        // ❌ ไม่มี hitbox แล้ว
    }

    // ปักหมุด Top 10 → pin-green.svg
    top10.forEach((r, i) => {
        const pv = r["จังหวัด"];
        const pathId = Object.keys(mapping_pv).find(k => mapping_pv[k] === pv);
        const path = svgDoc.querySelector(`path#${pathId}`);
        if (path) addPin(path, i + 1, "top");
    });

}

/* init */
const DEFAULT_TYPE =
    window.MAP_DEFAULT_TYPE ||
    document.getElementById("typeSelect")?.value ||
    "due";

loadCSV(DEFAULT_TYPE);
/* events */
typeSelect.onchange = () => loadCSV(typeSelect.value);
// yearSelect.onchange = updateView;
// monthSelect.onchange = updateView;



/* ============================================================
   ⭐ ระบบ Zoom & Pan (Drag) สำหรับ SVG Map
   ============================================================ */

let scale = 1;
let translateX = 0;
let translateY = 0;

let isDragging = false;
let dragStart = { x: 0, y: 0 };

/* ฟังก์ชันอัปเดต Transform */
function applyTransform() {
    if (svgDoc) {

        svgDoc.setAttribute(
            "transform",
            `translate(${translateX}, ${translateY}) scale(${scale})`
        );
        // svgDoc.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        // svgDoc.style.transformOrigin = "0 0";

    }
}

/* -------------------------------
   ปุ่ม Zoom In / Zoom Out
--------------------------------- */
document.getElementById("zoomIn").onclick = () => {
    scale = Math.min(scale + 0.1, 4);
    applyTransform();
};

document.getElementById("zoomOut").onclick = () => {
    scale = Math.max(scale - 0.1, 0.5);
    applyTransform();
};

/* -------------------------------
   Zoom ด้วยล้อเมาส์
--------------------------------- */
document.getElementById("map").addEventListener("wheel", function (e) {
    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.min(Math.max(scale + delta, 0.5), 4);

    applyTransform();
});

/* -------------------------------
   Drag / Pan (กดเมาส์ลาก)
--------------------------------- */
document.getElementById("map").addEventListener("mousedown", function (e) {
    isDragging = true;
    dragStart.x = e.clientX - translateX;
    dragStart.y = e.clientY - translateY;
});

document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;

    translateX = e.clientX - dragStart.x;
    translateY = e.clientY - dragStart.y;

    applyTransform();
});

document.addEventListener("mouseup", function () {
    isDragging = false;
});
// -----------------------------------------------------
// Global mousemove: ถ้าอยู่นอก hitbox หรือ path ให้ล้าง tooltip
// -----------------------------------------------------
document.querySelector(".map-area").addEventListener("mousemove", (e) => {
    // เช็ค target ถ้าไม่ใช่ path และไม่ใช่ hitbox → reset
    if (!(e.target.tagName === "path" || e.target.classList.contains("map-pin"))) {
        tooltip.style.display = "none";
    }
});
