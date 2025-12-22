const API_URL = "https://script.google.com/macros/s/AKfycbwwxjRdiPSd7SOuZAOO5OmWi5NHCBMOf3d1923ik9QBY7iiZ0gJl6ppcQQUHGrxuLRTAg/exec";

const provinces = [
  "กรุงเทพมหานคร","กระบี่","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา",
  "ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงใหม่","เชียงราย","ตรัง","ตราด","ตาก","นครนายก",
  "นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน",
  "บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พะเยา","พระนครศรีอยุธยา",
  "พังงา","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","พัทลุง","ภูเก็ต","มหาสารคาม",
  "มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง",
  "ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร",
  "สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย",
  "หนองบัวลำภู","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี","บึงกาฬ"
];

let allData = [];
let filteredData = [];
let nationalSummary = null;

const formatNumber = v => isNaN(parseFloat(v)) ? "-" : parseFloat(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
const formatPercent = v => isNaN(parseFloat(v)) ? "-" : `${parseFloat(v).toFixed(2)}%`;

$(document).ready(async function () {
    $("#province-title").text("ระดับประเทศ");

    $("#btnResetFilter").on("click", resetFilter);
    $("#btnDownload").on("click", downloadData);

    await fetchAllProvinces();
});

async function fetchAllProvinces() {
    try {
        const allResults = [];
        let summaryTotals = {
            totalProjects: 0,
            approvedMoney: 0,
            debtStart: 0,
            debtNow: 0,
            overdue: 0,
            legal: 0,
            updateDate: "01/01/2500" // เริ่มด้วยวันที่เล็กสุด
        };

        for (const province of provinces) {
            const res = await fetch(`${API_URL}?province=${encodeURIComponent(province)}`);
            const json = await res.json();

            if (json.error) continue;

            const data = (json.data || []).filter(r => r["ลำดับ"] !== "ภาพรวมจังหวัด");
            allResults.push(...data);

            const s = json.summary;
            summaryTotals.totalProjects += s.totalProjects || 0;
            summaryTotals.approvedMoney += s.approvedMoney || 0;
            summaryTotals.debtStart += s.debtStart || 0;
            summaryTotals.debtNow += s.debtNow || 0;
            summaryTotals.overdue += s.overdue || 0;
            summaryTotals.legal += s.legal || 0;

            // updateDate ล่าสุด
            if (compareDate(s.updateDate, summaryTotals.updateDate) > 0) {
                summaryTotals.updateDate = s.updateDate;
            }
        }

        // คำนวณ percentOverdue
        summaryTotals.percentOverdue = summaryTotals.debtNow ? (summaryTotals.overdue / summaryTotals.debtNow * 100) : 0;

        allData = allResults;
        filteredData = [...allData];
        nationalSummary = summaryTotals;

        $("#update-date").text(`ข้อมูล ณ วันที่ ${nationalSummary.updateDate}`);
        updateSummaryCards(nationalSummary);
        setupFilters(allData);
        renderTable(allData);
        updateSummaryFromFiltered(allData);

    } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message);
    }
}

// เปรียบเทียบวันแบบ dd/mm/yyyy
function compareDate(d1, d2) {
    if (!d1) return -1;
    if (!d2) return 1;
    const [dd1, mm1, yy1] = d1.split("/").map(Number);
    const [dd2, mm2, yy2] = d2.split("/").map(Number);
    const date1 = new Date(yy1, mm1-1, dd1);
    const date2 = new Date(yy2, mm2-1, dd2);
    return date1 - date2;
}

/* ---------------------- Render Table ---------------------- */
function renderTable(data) {
    const table = $("#detailsTable");

    if ($.fn.DataTable.isDataTable("#detailsTable")) {
        table.DataTable().clear().destroy();
    }

    let idx = 1;
    data = data.map(row => ({ ...row, _index: idx++ }));

    const headers = Object.keys(data[0] || {});
    const displayHeaders = headers.map(h => (h === "_index" ? "ลำดับ" : h));

    $("#detailsTable thead").html(
        `<tr>${displayHeaders.map(h => `<th>${h}</th>`).join("")}</tr>`
    );

    const tbody = $("#detailsTable tbody").empty();
    data.forEach(row => {
        tbody.append(
            `<tr>${headers.map(h => `<td>${row[h] ?? "-"}</td>`).join("")}</tr>`
        );
    });

    table.DataTable({
        scrollX: true,
        pageLength: 10
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
        "num-projects": safe(s.totalProjects),
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
    // ใช้ logic เดิมเหมือน provincial.js
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

        if (g > 0 && kh === 0 && k === 0 && ng1 === 0 && ng2 === 0 && ng3 === 0 && ng4 === 0 && ng5 === 0 && ng6 === 0) {
            overdueCount++;
            overdueAmount += g;
        }
        if (kh > 0) {
            normalCount++;
            normalAmount += kh;
        }
        if (k > 0) {
            restructureCount++;
            restructureSum += k;
        }
        if (ng1 > 0 || ng2 > 0) {
            civilCount++;
            civilSum += (ng1 + ng2);
            if (ng1 > 0) { civil1C++; civil1S += ng1; }
            if (ng2 > 0) { civil2C++; civil2S += ng2; }
        }
        if (ng3 > 0 || ng4 > 0 || ng5 > 0) {
            judged.count++;
            judged.sum += (ng3 + ng4 + ng5);
            if (ng3 > 0) { judged.g3C++; judged.g3S += ng3; }
            if (ng4 > 0) { judged.g4C++; judged.g4S += ng4; }
            if (ng5 > 0) { judged.g5C++; judged.g5S += ng5; }
        }
        if (ng6 > 0) {
            criminalCount++;
            criminalSum += ng6;
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
    XLSX.utils.book_append_sheet(wb, ws, "National");
    XLSX.writeFile(wb, `CDD_Women_Fund_National.xlsx`);
}
