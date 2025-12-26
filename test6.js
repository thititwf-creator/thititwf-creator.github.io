const API_URL = "https://script.google.com/macros/s/AKfycbwwxjRdiPSd7SOuZAOO5OmWi5NHCBMOf3d1923ik9QBY7iiZ0gJl6ppcQQUHGrxuLRTAg/exec";

let allData = [];
let filteredData = [];
let aggregatedSummary = null;

/* --------------------------- Format ---------------------------- */
const formatNumber = v => isNaN(parseFloat(v)) ? "-" : parseFloat(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
const formatPercent = v => isNaN(parseFloat(v)) ? "-" : `${parseFloat(v).toFixed(2)}%`;

/* --------------------------- Main Init ---------------------------- */
$(document).ready(async function () {
    $("#province-title").text("ระดับประเทศ");

    $("#btnResetFilter").on("click", resetFilter);
    $("#btnDownload").on("click", downloadData);

    await fetchAllProvinces();
});

/* ---------------------- Fetch All Provinces ----------------------- */
async function fetchAllProvinces() {
    try {
        const provinces = ["กระบี่","ชลบุรี","เชียงใหม่","เชียงราย","ตรัง",
            "ตราด","ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครสวรรค์","นราธิวาส",
            "น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา",
            "พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","พะเยา","ภูเก็ต","มหาสารคาม",
            "มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน",
            "เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี",
            "สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี",
            "อุตรดิตถ์","อุทัยธานี","อุบลราชธานี"];
        
        let summaryList = [];
        allData = [];

        for (const prov of provinces) {
            const res = await fetch(`${API_URL}?province=${encodeURIComponent(prov)}`);
            const json = await res.json();

            if (json.data && Array.isArray(json.data)) {
                allData.push(...json.data);
            }

            if (json.summary) {
                summaryList.push(json.summary);
            }
        }

        aggregateSummary(summaryList);
        updateSummaryCards(aggregatedSummary);

    } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message);
    }
}

/* ---------------------- Aggregate Summary ---------------------- */
function aggregateSummary(list) {
    const safe = v => Number.isFinite(Number(v)) ? Number(v) : 0;

    let summary = {
        totalProjects: 0,
        approvedMoney: 0,
        debtStart: 0,
        debtNow: 0,
        overdue: 0,
        percentOverdue: 0,
        legal: 0,
        updateDate: ""
    };

    let latestDate = null;

    list.forEach(s => {
        summary.totalProjects += safe(s.totalProjects);
        summary.approvedMoney += safe(s.approvedMoney);
        summary.debtStart += safe(s.debtStart);
        summary.debtNow += safe(s.debtNow);
        summary.overdue += safe(s.overdue);
        summary.legal += safe(s.legal);

        // หนี้ปกติ/หนี้เกิน/คดีแพ่ง/คำพิพากษา/คดีอาญา
        if (s.normalCount) summary.normalCount = (summary.normalCount || 0) + safe(s.normalCount);
        if (s.normalAmount) summary.normalAmount = (summary.normalAmount || 0) + safe(s.normalAmount);

        if (s.overdueCount) summary.overdueCount = (summary.overdueCount || 0) + safe(s.overdueCount);
        if (s.overdueAmount) summary.overdueAmount = (summary.overdueAmount || 0) + safe(s.overdueAmount);

        if (s.restructureCount) summary.restructureCount = (summary.restructureCount || 0) + safe(s.restructureCount);
        if (s.restructureSum) summary.restructureSum = (summary.restructureSum || 0) + safe(s.restructureSum);

        if (s.civilCount) summary.civilCount = (summary.civilCount || 0) + safe(s.civilCount);
        if (s.civilProsecutor) summary.civilProsecutor = (summary.civilProsecutor || 0) + safe(s.civilProsecutor);
        if (s.civilCourt) summary.civilCourt = (summary.civilCourt || 0) + safe(s.civilCourt);
        if (s.civilSum) summary.civilSum = (summary.civilSum || 0) + safe(s.civilSum);

        if (s.judgedCount) summary.judgedCount = (summary.judgedCount || 0) + safe(s.judgedCount);
        if (s.judgedSum) summary.judgedSum = (summary.judgedSum || 0) + safe(s.judgedSum);
        if (s.judged3) summary.judged3 = (summary.judged3 || 0) + safe(s.judged3);
        if (s.judged4) summary.judged4 = (summary.judged4 || 0) + safe(s.judged4);
        if (s.judged5) summary.judged5 = (summary.judged5 || 0) + safe(s.judged5);

        if (s.criminalCount) summary.criminalCount = (summary.criminalCount || 0) + safe(s.criminalCount);
        if (s.criminalSum) summary.criminalSum = (summary.criminalSum || 0) + safe(s.criminalSum);

        // ล่าสุด
        const d = s.updateDate ? new Date(s.updateDate.split("/").reverse().join("-")) : null;
        if (!latestDate || (d && d > latestDate)) latestDate = d;
    });

    summary.updateDate = latestDate ? latestDate.toLocaleDateString("th-TH") : "-";
    aggregatedSummary = summary;
}

/* ---------------------- Summary Cards ---------------------- */
function updateSummaryCards(s) {
    const safe = v => Number.isFinite(Number(v)) ? Number(v) : 0;

    $("#update-date").text(`ข้อมูล ณ วันที่ ${s.updateDate || "-"}`);

    const map = {
        "num-projects": safe(s.totalProjects),
        "approved-money": formatNumber(s.approvedMoney),
        "debt-start": formatNumber(s.debtStart),
        "debt-now": formatNumber(s.debtNow),
        "overdue": formatNumber(s.overdue),
        "percent-overdue": formatPercent(s.overdue / s.debtNow * 100),
        "legal": formatNumber(s.legal),

        "normal-count": s.normalCount || 0,
        "normal-amount": formatNumber(s.normalAmount || 0),

        "overdue-count": s.overdueCount || 0,
        "overdue-amount": formatNumber(s.overdueAmount || 0),

        "restructure-count": s.restructureCount || 0,
        "restructure-sum": formatNumber(s.restructureSum || 0),

        "civil-count": s.civilCount || 0,
        "civil-prosecutor": s.civilProsecutor || 0,
        "civil-court": s.civilCourt || 0,
        "civil-sum": formatNumber(s.civilSum || 0),

        "judged-count": s.judgedCount || 0,
        "judged-3": s.judged3 || 0,
        "judged-4": s.judged4 || 0,
        "judged-5": s.judged5 || 0,
        "judged-sum": formatNumber(s.judgedSum || 0),

        "criminal-count": s.criminalCount || 0,
        "criminal-sum": formatNumber(s.criminalSum || 0)
    };

    for (const id in map) {
        const el = document.getElementById(id);
        if (el) el.textContent = map[id];
    }
}

/* ---------------------- Reset Filter ---------------------- */
function resetFilter() {
    filteredData = [...allData];
    // table ยังไม่ render
}
