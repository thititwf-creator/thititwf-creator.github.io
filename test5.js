const API_URL = "https://script.google.com/macros/s/AKfycbwwxjRdiPSd7SOuZAOO5OmWi5NHCBMOf3d1923ik9QBY7iiZ0gJl6ppcQQUHGrxuLRTAg/exec";

let originalData = [];
let summary = {};

async function loadData() {
    try {
        const res = await fetch(API_URL);
        const json = await res.json();

        // เก็บสรุป
        summary = json.summary;

        // ตัดภาพรวมจังหวัดออก
        originalData = (json.data || []).filter(r => r["ลำดับ"] !== "ภาพรวมจังหวัด");

        // โหลด dropdown
        loadDistrictOptions(originalData);
        loadSubDistrictOptions(originalData);

        // render
        renderTable(originalData);
        updateSummaryFromFiltered(originalData);
        updateSummaryCards(summary);

    } catch (err) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล", err);
    }
}


let allData = [], filteredData = [], dataTable, originalSummary = null;

const formatNumber = v =>
    isNaN(parseFloat(v)) ? "-" :
        parseFloat(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

const formatPercent = v =>
    isNaN(parseFloat(v)) ? "-" :
        `${parseFloat(v).toFixed(2)}%`;


$(document).ready(async function () {
    const province = new URLSearchParams(window.location.search).get("province");
    $("#province-title").text(province || "-");

    $("#btnResetFilter").on("click", () => {
        $("#filter-section select").val("").trigger("change");
        filteredData = allData;
        renderTable(allData);
        updateSummaryFromFiltered(allData);
    });

    $("#btnDownload").on("click", downloadData);

    await fetchData(province);
});



async function fetchData(province) {
    try {
        const res = await fetch(`${API_URL}?province=${encodeURIComponent(province)}`);
        const json = await res.json();

        if (json.error) throw new Error(json.error);

        allData = json.data || [];
        originalSummary = json.summary;

        updateSummaryCards(json.summary);

        renderTable(allData);
        updateSummaryFromFiltered(allData);

        setupFilters(allData);

    } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message);
    }
}



// =====================================================
// Render DataTable
// =====================================================
function renderTable(data) {
    const table = $("#detailsTable");

    if ($.fn.DataTable.isDataTable("#detailsTable")) {
        table.DataTable().clear().destroy();
    }

    let indexCounter = 1;
    data = data.map(row => {
        if (row["ลำดับ"] === "ภาพรวมจังหวัด") {
            return { ...row, _index: "ภาพรวมจังหวัด" };
        }
        return { ...row, _index: indexCounter++ };
    });

    const headers = Object.keys(data[0] || {});
    const displayHeaders = headers.map(h => (h === "ลำดับ" ? "_index" : h));

    $("#detailsTable thead").html(
        `<tr>${displayHeaders.map(h => `<th>${h === "_index" ? "ลำดับ" : h}</th>`).join("")}</tr>`
    );

    const tbody = $("#detailsTable tbody").empty();
    data.forEach(row => {
        tbody.append(
            `<tr>${displayHeaders.map(h => `<td>${row[h] ?? "-"}</td>`).join("")}</tr>`
        );
    });

    jQuery.fn.dataTable.ext.type.order['custom-ladub-pre'] = function (d) {
        if (d === "ภาพรวมจังหวัด") return 999999;
        return parseInt(d, 10) || 0;
    };

    table.DataTable({
        scrollX: true,
        pageLength: 10,
        columnDefs: [
            {
                targets: 0,
                type: "custom-ladub"
            }
        ]
    });
}



// =====================================================
// Filters
// =====================================================
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

    function refreshDropdowns(filtered) {
        selects.each(function () {
            const key = $(this).data("key");
            const current = String($(this).val() || "");

            let options = [...new Set(filtered
                .map(r => r[key])
                .filter(v => v !== undefined && v !== null)
            )].map(v => String(v));

            $(this).html(
                `<option value="">-- ทั้งหมด --</option>` +
                options.map(v => `<option value="${v}">${v}</option>`).join("")
            );

            if (current && options.includes(current)) {
                $(this).val(current);
            }
        });
    }

    refreshDropdowns(data);

    function filterData() {
        let filtered = [...data];

        selects.each(function () {
            const key = $(this).data("key");
            const val = $(this).val();
            if (val) {
                filtered = filtered.filter(r => r[key] == val);
            }
        });

        filteredData = filtered;

        renderTable(filtered);
        updateSummaryFromFiltered(filtered);
        refreshDropdowns(filtered);
    }

    selects.on("change", filterData);
}



// =====================================================
// Summary Cards
// =====================================================
function updateSummaryCards(s) {
    s = s || {};

    const safeNum = v => {
        if (v === null || v === undefined || v === "") return 0;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const fmtNum = v => formatNumber ? formatNumber(v) : safeNum(v).toLocaleString();
    const fmtPct = v => formatPercent ? formatPercent(v) : `${safeNum(v)}%`;

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
    };

    // ดึงค่าจาก summary
    const totalProjects = safeNum(s.totalProjects);
    const approvedMoney = safeNum(s.approvedMoney);
    const debtStart = safeNum(s.debtStart);
    const debtNow = safeNum(s.debtNow);
    const overdue = safeNum(s.overdue);
    const percentOverdue = safeNum(s.percentOverdue);
    const legal = safeNum(s.legal);

    setText("num-projects", totalProjects.toLocaleString());
    setText("approved-money", fmtNum(approvedMoney));
    setText("debt-start", fmtNum(debtStart));
    setText("debt-now", fmtNum(debtNow));
    setText("overdue", fmtNum(overdue));
    setText("percent-overdue", fmtPct(percentOverdue));
    setText("legal", fmtNum(legal));
}



// =====================================================
// Summary from filtered data
// =====================================================
function updateSummaryFromFiltered(data) {

    data = data.filter(row => row["ลำดับ"] !== "ภาพรวมจังหวัด");

    let normalCount = 0, normalAmount = 0;
    let restructureCount = 0, restructureSum = 0;
    let civilCount = 0, civilSum = 0, civilCount1 = 0, civilSum1 = 0, civilCount2 = 0, civilSum2 = 0;

    let judgedCount = 0;
    let judged3Count = 0, judged3Sum = 0;
    let judged4Count = 0, judged4Sum = 0;
    let judged5Count = 0, judged5Sum = 0;
    let judgedSum = 0;

    let criminalCount = 0;
    let criminalSum = 0;


    data.forEach(row => {

        const g = parseFloat(row["ลูกหนี้คงเหลือ ณ ปัจจุบัน (ก)"]) || 0;
        const kh = parseFloat(row["หนี้ยังไม่ถึงกำหนดชำระ (ข)"]) || 0;
        const k = parseFloat(row["การไกล่เกลี่ยที่สามารถใช้บังคับคดีได้ (ค)"]) || 0;
        const ng = parseFloat(row["ลูกหนี้ที่ได้ดำเนินการตามกฎหมาย (ง)"]) || 0;
        const b = parseFloat(row["จำนวนหนี้ที่เกินกำหนดชำระ (B)"]) || 0;

        const ng1 = parseFloat(row["พนักงานอัยการรับเรื่อง(ง1)"]) || 0;
        const ng2 = parseFloat(row["ศาลประทับรับฟ้อง(ง2)"]) || 0;

        const ng3 = parseFloat(row["ศาลได้มีคำพิพากษาให้ลูกหนี้ชำระหนี้(ง3)"]) || 0;
        const ng4 = parseFloat(row["ศาลมีคำพิพากษาตามยอม(ง4)"]) || 0;
        const ng5 = parseFloat(row["ป.วิ แพ่ง มาตรา 20 ตรี(ง5)"]) || 0;

        const ng6 = parseFloat(row["ดำเนินคดีอาญา(ง6)"]) || 0;

        if (g > 0 && kh > 0 && k === 0 && ng === 0) {
            normalCount++;
            normalAmount += kh;
        }

        if (g > 0 && k > 0) {
            restructureCount++;
            restructureSum += k;
        }

        if (g > 0 && (ng1 > 0 || ng2 > 0)) {
            civilCount++;
            civilSum += (ng1 + ng2);

            if (ng1 > 0) {
                civilCount1++;
                civilSum1 += ng1;
            }
            if (ng2 > 0) {
                civilCount2++;
                civilSum2 += ng2;
            }
        }

        if (g > 0 && (ng3 > 0 || ng4 > 0 || ng5 > 0)) {
            judgedCount++;
            judgedSum += (ng3 + ng4 + ng5);

            if (ng3 > 0) { judged3Count++; judged3Sum += ng3; }
            if (ng4 > 0) { judged4Count++; judged4Sum += ng4; }
            if (ng5 > 0) { judged5Count++; judged5Sum += ng5; }
        }

        if (g > 0 && ng6 > 0) {
            criminalCount++;
            criminalSum += ng6;
        }
    });

    document.getElementById("normal-count").textContent = normalCount.toLocaleString();
    document.getElementById("normal-amount").textContent = normalAmount.toLocaleString();

    document.getElementById("restructure-count").textContent = restructureCount.toLocaleString();
    document.getElementById("restructure-sum").textContent = restructureSum.toLocaleString();

    document.getElementById("civil-count").textContent = civilCount.toLocaleString();
    document.getElementById("civil-prosecutor").textContent = `${civilCount1.toLocaleString()} / ${civilSum1.toLocaleString()}`;
    document.getElementById("civil-court").textContent = `${civilCount2.toLocaleString()} / ${civilSum2.toLocaleString()}`;
    document.getElementById("civil-sum").textContent = civilSum.toLocaleString();

    document.getElementById("judged-count").textContent = judgedCount.toLocaleString();
    document.getElementById("judged-3").textContent = `${judged3Count} / ${judged3Sum.toLocaleString()}`;
    document.getElementById("judged-4").textContent = `${judged4Count} / ${judged4Sum.toLocaleString()}`;
    document.getElementById("judged-5").textContent = `${judged5Count} / ${judged5Sum.toLocaleString()}`;
    document.getElementById("judged-sum").textContent = judgedSum.toLocaleString();

    document.getElementById("criminal-count").textContent = criminalCount.toLocaleString();
    document.getElementById("criminal-sum").textContent = criminalSum.toLocaleString();
}



// =====================================================
// Export Excel
// =====================================================
function downloadData() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, ws, "Province");
    XLSX.writeFile(wb, `${$("#province-title").text()}_KPI69.xlsx`);
}
