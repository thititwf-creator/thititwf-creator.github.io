// ==========================
//  CONFIG API
// ==========================
const API_URL = "https://script.google.com/macros/s/AKfycbzUB4DQ1C4M5ds8VhrEhiSrBpTr6TIBMSrxTr4f3E8WWtV9WaMoqpaVisk5ykZ9FL6A/exec";

// ==========================
//  LOAD PROVINCE LIST
// ==========================
async function loadProvinces() {
    try {
        const res = await fetch(API_URL + "?action=get_provinces");
        const data = await res.json();

        const select = document.getElementById("provinceSelect");
        data.provinces.forEach(pv => {
            const option = document.createElement("option");
            option.value = pv;
            option.textContent = pv;
            select.appendChild(option);
        });

    } catch (err) {
        console.error("โหลดจังหวัดล้มเหลว:", err);
    }
}

// ==========================
//   FORMAT MONEY
// ==========================
function fmt(n) {
    return Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ==========================
//  LOAD TABLE FOR PROVINCE
// ==========================
async function loadDataByProvince(province) {
    if (!province) return;

    try {
        const res = await fetch(`${API_URL}?action=get_data_by_province&province=${province}`);
        const json = await res.json();
        const rows = json.data || [];

        updateSummaryCards(rows);
        renderTable(rows);

    } catch (err) {
        console.error("โหลดข้อมูลจังหวัดล้มเหลว:", err);
    }
}

// ==========================
//   UPDATE SUMMARY CARDS
// ==========================
function updateSummaryCards(rows) {

    const sum = (arr, key) => arr.reduce((a, c) => a + Number(c[key] || 0), 0);
    const count = (arr, key, val) => arr.filter(r => r[key] === val).length;

    const sumAmount = (arr, key, val) =>
        arr.filter(r => r[key] === val).reduce((a, c) => a + Number(c.amount || 0), 0);

    // Total
    document.getElementById("total-count").innerText = rows.length.toLocaleString("th-TH");
    document.getElementById("total-sum").innerText = fmt(sum(rows, "amount"));

    // Dead
    document.getElementById("dead-count").innerText = count(rows, "label", "ตาย");
    document.getElementById("dead-sum").innerText = fmt(sumAmount(rows, "label", "ตาย"));

    // Old
    document.getElementById("old-count").innerText = count(rows, "label", "พิการทุพพลภาพ");
    document.getElementById("old-sum").innerText = fmt(sumAmount(rows, "label", "พิการทุพพลภาพ"));

    // Sick
    document.getElementById("sick-count").innerText = count(rows, "label", "ป่วยเรื้อรังภาระพึ่งพิง");
    document.getElementById("sick-sum").innerText = fmt(sumAmount(rows, "label", "ป่วยเรื้อรังภาระพึ่งพิง"));

    // Special
    document.getElementById("special-count").innerText = count(rows, "label", "พิการและป่วยเรื้อรัง");
    document.getElementById("special-sum").innerText = fmt(sumAmount(rows, "label", "พิการและป่วยเรื้อรัง"));

    // Criminal
    document.getElementById("criminal-count").innerText = count(rows, "label", "ทุจริต/ติดคดีความ");
    document.getElementById("criminal-sum").innerText = fmt(sumAmount(rows, "label", "ทุจริต/ติดคดีความ"));
}

// ==========================
//      RENDER TABLE
// ==========================
let table;

function renderTable(rows) {

    if (table) {
        table.clear().destroy();
    }

    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";

    rows.forEach((r, i) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${r.label || "-"} / ${fmt(r.amount)}</td>
        `;

        tbody.appendChild(tr);
    });

    table = new DataTable("#dataTable", {
        scrollX: true,
        paging: true,
        searching: true,
        ordering: true,
        pageLength: 20,
        order: [[0, "asc"]]
    });
}

// ==========================
//   EXPORT CSV (CLIENT)
// ==========================
document.getElementById("export-data").addEventListener("click", () => {
    table.button('.buttons-csv').trigger();
});

// ==========================
//   EVENT : CHANGE PROVINCE
// ==========================
document.getElementById("provinceSelect").addEventListener("change", function () {
    loadDataByProvince(this.value);
});

// ==========================
//   INIT
// ==========================
loadProvinces();
