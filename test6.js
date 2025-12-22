const API_URL = "https://script.google.com/macros/s/AKfycbwwxjRdiPSd7SOuZAOO5OmWi5NHCBMOf3d1923ik9QBY7iiZ0gJl6ppcQQUHGrxuLRTAg/exec";

let allData = [];
let nationalSummary = null;

// Format numbers
const formatNumber = v => isNaN(parseFloat(v)) ? "-" : parseFloat(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
const formatPercent = v => isNaN(parseFloat(v)) ? "-" : `${parseFloat(v).toFixed(2)}%`;

// List ทุกจังหวัด (ใส่เป็น array ของชื่อจังหวัด)
const provinces = ["กรุงเทพมหานคร","กระบี่","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา",
  "ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงใหม่","เชียงราย","ตรัง","ตราด","ตาก","นครนายก",
  "นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน",
  "บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พะเยา","พระนครศรีอยุธยา",
  "พังงา","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","พัทลุง","ภูเก็ต","มหาสารคาม",
  "มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง",
  "ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร",
  "สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย",
  "หนองบัวลำภู","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี","บึงกาฬ"];

$(document).ready(async function () {
    $("#province-title").text("ระดับประเทศ");

    await fetchAllProvinces();

    if (nationalSummary) {
        updateSummaryCards(nationalSummary);
        $("#update-date").text("ข้อมูล ณ วันที่ " + nationalSummary.updateDate);
    }
});

async function fetchAllProvinces() {
    let totalProjects = 0,
        approvedMoney = 0,
        debtStart = 0,
        debtNow = 0,
        overdue = 0,
        legal = 0,
        latestDate = null;

    for (const prov of provinces) {
        try {
            const res = await fetch(`${API_URL}?province=${encodeURIComponent(prov)}`);
            const json = await res.json();
            if (json.summary) {
                const s = json.summary;
                totalProjects += s.totalProjects || 0;
                approvedMoney += s.approvedMoney || 0;
                debtStart += s.debtStart || 0;
                debtNow += s.debtNow || 0;
                overdue += s.overdue || 0;
                legal += s.legal || 0;

                // update latest date
                const d = new Date(s.updateDate.split("/").reverse().join("-"));
                if (!latestDate || d > latestDate) latestDate = d;
            }

            if (json.data) allData = allData.concat(json.data);

        } catch (err) {
            console.error("โหลดข้อมูลจังหวัด " + prov + " ล้มเหลว:", err);
        }
    }

    nationalSummary = {
        province: "ระดับประเทศ",
        totalProjects,
        approvedMoney,
        debtStart,
        debtNow,
        overdue,
        percentOverdue: debtNow ? (overdue / debtNow * 100) : 0,
        legal,
        updateDate: latestDate ? latestDate.toLocaleDateString("th-TH") : "-"
    };
}

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
