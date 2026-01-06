const API_URL = "https://script.google.com/macros/s/AKfycbwwxjRdiPSd7SOuZAOO5OmWi5NHCBMOf3d1923ik9QBY7iiZ0gJl6ppcQQUHGrxuLRTAg/exec";

let allData = [];
let filteredData = [];
let originalSummary = null;

/* --------------------------- Format ---------------------------- */
const formatNumber = v => isNaN(parseFloat(v)) ? "-" : parseFloat(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
const formatPercent = v => isNaN(parseFloat(v)) ? "-" : `${parseFloat(v).toFixed(2)}%`;

/* --------------------------- Main Init ---------------------------- */
$(document).ready(async function () {
    const province = new URLSearchParams(window.location.search).get("province");
    $("#province-title").text(province || "-");

    $("#btnResetFilter").on("click", resetFilter);
    $("#btnDownload").on("click", downloadData);

    await fetchData(province);
});

/* ---------------------- Fetch API ----------------------- */
async function fetchData(province) {
    try {
        const res = await fetch(`${API_URL}?province=${encodeURIComponent(province)}`);
        const json = await res.json();

        if (json.error) throw new Error(json.error);

        allData = (json.data || []).filter(r => r["ลำดับ"] !== "ภาพรวมจังหวัด");
        originalSummary = json.summary;

        updateSummaryCards(json.summary);
        setupFilters(allData);
        renderTable(allData);
        updateSummaryFromFiltered(allData);

    } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message);
    }
}

/* ---------------------- Render Table ---------------------- */
function renderTable(data) {
    const table = $("#detailsTable");

    if ($.fn.DataTable.isDataTable("#detailsTable")) {
        table.DataTable().clear().destroy();
    }

    // เพิ่ม index ลำดับ
    let idx = 1;
    data = data.map(row => ({ ...row, _index: idx++ }));

    // Header
    const headers = Object.keys(data[0] || {});
    const displayHeaders = headers.map(h => (h === "_index" ? "ลำดับ" : h));

    $("#detailsTable thead").html(
        `<tr>${displayHeaders.map(h => `<th>${h}</th>`).join("")}</tr>`
    );

    // Body
    const tbody = $("#detailsTable tbody").empty();
    data.forEach(row => {
        tbody.append(
            `<tr>${headers.map(h => `<td>${row[h] ?? "-"}</td>`).join("")}</tr>`
        );
    });

    // Custom ordering
    jQuery.fn.dataTable.ext.type.order["custom-ladub-pre"] = d => parseInt(d) || 0;
    jQuery.fn.dataTable.ext.type.order["custom-ladub-asc"] = d => parseInt(d) || 0;
    jQuery.fn.dataTable.ext.type.order["custom-ladub-desc"] = d => parseInt(d) || 0;

    table.DataTable({
        scrollX: true,
        pageLength: 10,
        columnDefs: [
            { targets: 0, type: "custom-ladub" } // ลำดับ
        ]
    });
}

/* ---------------------- Filters ---------------------- */
function setupFilters(data) {
    const keys = ["อำเภอ/เขต", "ตำบล", "ปีงบประมาณ", "สถานะโครงการ"];
    const container = $("#filter-section").empty();

    keys.forEach(k => {
        container.append(`
            <div class="filter-item">
                <label>${k}</label>
                <select data-key="${k}">
                    <option value="">-- ทั้งหมด --</option>
                </select>
            </div>
        `);
    });

    const selects = $("#filter-section select");

    function fillDropdowns(dataset) {
        selects.each(function () {
            const key = $(this).data("key");
            const current = $(this).val();

            const options = [...new Set(dataset.map(r => r[key]).filter(v => v))];

            $(this).html(`
                <option value="">-- ทั้งหมด --</option>
                ${options.map(v => `<option value="${v}">${v}</option>`).join("")}
            `);

            if (current && options.includes(current)) {
                $(this).val(current);
            }
        });
    }

    fillDropdowns(data);

    selects.on("change", function () {
        let filtered = [...data];
        selects.each(function () {
            const key = $(this).data("key");
            const val = $(this).val();

            if (val) filtered = filtered.filter(r => r[key] == val);
        });

        filteredData = filtered;
        renderTable(filtered);
        updateSummaryFromFiltered(filtered);
        fillDropdowns(filtered);
    });
}

/* ---------------------- Reset Filter ---------------------- */
function resetFilter() {
    $("#filter-section select").val("");
    filteredData = [...allData];
    renderTable(allData);
    updateSummaryFromFiltered(allData);
}

/* ---------------------- Summary Cards ---------------------- */
function updateSummaryCards(s) {
    const safe = v => Number.isFinite(Number(v)) ? Number(v) : 0;

    const map = {
        "num-projects": safe(s.totalProjects || s.numProjects),
        "approved-money": formatNumber(s.approvedMoney),
        "debt-start": formatNumber(s.debtStart),
        "debt-now": formatNumber(s.debtNow),
        "overdue": formatNumber(s.overdue),
        "percent-overdue": formatPercent(s.percentOverdue),
        "legal": formatNumber(s.legal)
    };

    for (const id in map) {
        const el = document.getElementById(id);
        if (el) el.textContent = map[id];
    }
}

/* ---------------------- Summary (Filtered) ---------------------- */
function updateSummaryFromFiltered(data) {
    let overdueCount = 0, overdueAmount = 0;
    let normalCount = 0, normalAmount = 0;

    let restructureCount = 0, restructureSum = 0;

    let civilCount = 0, civilSum = 0, civil1C = 0, civil1S = 0, civil2C = 0, civil2S = 0;

    let judged = { count: 0, sum: 0, g3C: 0, g3S: 0, g4C: 0, g4S: 0, g5C: 0, g5S: 0 };
    let criminalCount = 0, criminalSum = 0;

    data.forEach(r => {
        const g = parseFloat(r["ลูกหนี้คงเหลือ ณ ปัจจุบัน (ก)"]) || 0;
        const kh = parseFloat(r["หนี้ยังไม่ถึงกำหนดชำระ (ข)"]) || 0;
        const k = parseFloat(r["การไกล่เกลี่ยที่สามารถใช้บังคับคดีได้ (ค)"]) || 0;

        const ng1 = parseFloat(r["พนักงานอัยการรับเรื่อง(ง1)"]) || 0;
        const ng2 = parseFloat(r["ศาลประทับรับฟ้อง(ง2)"]) || 0;
        const ng3 = parseFloat(r["ศาลได้มีคำพิพากษาให้ลูกหนี้ชำระหนี้(ง3)"]) || 0;
        const ng4 = parseFloat(r["ศาลมีคำพิพากษาตามยอม(ง4)"]) || 0;
        const ng5 = parseFloat(r["ป.วิ แพ่ง มาตรา 20 ตรี(ง5)"]) || 0;
        const ng6 = parseFloat(r["ดำเนินคดีอาญา(ง6)"]) || 0;

        /* --- หนี้เกินกำหนดชำระ --- */
        if (g > 0 && kh === 0 && k === 0 && ng1 === 0 && ng2 === 0 && ng3 === 0 && ng4 === 0 && ng5 === 0 && ng6 === 0) {
            overdueCount++;
            overdueAmount += g;
        }

        /* --- หนี้ปกติ --- */
        if (kh > 0) {
            normalCount++;
            normalAmount += kh;
        }

        /* --- ปรับโครงสร้าง (ค) --- */
        if (k !== "" && !isNaN(k) && Number(k) !== 0) {
            restructureCount++;
            restructureSum += Number(k);
        }

        /* --- ระหว่างดำเนินคดีแพ่ง --- */
        if (
            (ng1 !== "" && !isNaN(ng1) && Number(ng1) !== 0) ||
            (ng2 !== "" && !isNaN(ng2) && Number(ng2) !== 0)
        ) {
            civilCount++;
            civilSum += (Number(ng1) || 0) + (Number(ng2) || 0);

            if (ng1 !== "" && !isNaN(ng1) && Number(ng1) !== 0) {
                civil1C++;
                civil1S += Number(ng1);
            }
            if (ng2 !== "" && !isNaN(ng2) && Number(ng2) !== 0) {
                civil2C++;
                civil2S += Number(ng2);
            }
        }

        /* --- คำพิพากษาแล้ว (ง3,ง4,ง5) --- */
        if (
            (ng3 !== "" && !isNaN(ng3) && Number(ng3) !== 0) ||
            (ng4 !== "" && !isNaN(ng4) && Number(ng4) !== 0) ||
            (ng5 !== "" && !isNaN(ng5) && Number(ng5) !== 0)
        ) {
            judged.count++;
            judged.sum += (Number(ng3) || 0) + (Number(ng4) || 0) + (Number(ng5) || 0);

            if (ng3 !== "" && !isNaN(ng3) && Number(ng3) !== 0) {
                judged.g3C++;
                judged.g3S += Number(ng3);
            }
            if (ng4 !== "" && !isNaN(ng4) && Number(ng4) !== 0) {
                judged.g4C++;
                judged.g4S += Number(ng4);
            }
            if (ng5 !== "" && !isNaN(ng5) && Number(ng5) !== 0) {
                judged.g5C++;
                judged.g5S += Number(ng5);
            }
        }

        /* --- คดีอาญา --- */
        if (ng6 !== "" && !isNaN(ng6) && Number(ng6) !== 0) {
            criminalCount++;
            criminalSum += Number(ng6);
        }

    });

    const set = (id, v) => document.getElementById(id).textContent = v;

    set("overdue-count", overdueCount.toLocaleString());
    set("overdue-amount", overdueAmount.toLocaleString());

    set("normal-count", normalCount.toLocaleString());
    set("normal-amount", normalAmount.toLocaleString());

    set("restructure-count", restructureCount.toLocaleString());
    set("restructure-sum", restructureSum.toLocaleString());

    set("civil-count", civilCount.toLocaleString());
    set("civil-prosecutor", `${civil1C} / ${civil1S.toLocaleString()}`);
    set("civil-court", `${civil2C} / ${civil2S.toLocaleString()}`);
    set("civil-sum", civilSum.toLocaleString());

    set("judged-count", judged.count.toLocaleString());
    set("judged-3", `${judged.g3C} / ${judged.g3S.toLocaleString()}`);
    set("judged-4", `${judged.g4C} / ${judged.g4S.toLocaleString()}`);
    set("judged-5", `${judged.g5C} / ${judged.g5S.toLocaleString()}`);
    set("judged-sum", judged.sum.toLocaleString());

    set("criminal-count", criminalCount.toLocaleString());
    set("criminal-sum", criminalSum.toLocaleString());
}

/* ---------------------- Export Excel ---------------------- */
function downloadData() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, ws, "Province");
    XLSX.writeFile(wb, `${$("#province-title").text()}_KPI69.xlsx`);
}
