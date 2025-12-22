const BASE_API = "https://script.google.com/macros/s/AKfycbwwxjRdiPSd7SOuZAOO5OmWi5NHCBMOf3d1923ik9QBY7iiZ0gJl6ppcQQUHGrxuLRTAg/exec";

/* รายชื่อจังหวัด 77 จังหวัด */
const provinces = [
  "กระบี่","กรุงเทพมหานคร","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น",
  "จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย",
  "เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา",
  "นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์",
  "ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา",
  "พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่",
  "ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด",
  "ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","ศรีสะเกษ","สกลนคร",
  "สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี",
  "สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย",
  "หนองบัวลำภู","อ่างทอง","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี",
  "อำนาจเจริญ"
];

let allSummary = {
    totalProjects: 0,
    approvedMoney: 0,
    debtStart: 0,
    debtNow: 0,
    overdue: 0,
    legal: 0
};

let allRows = [];

/* ------------------------------- โหลดข้อมูลทุกจังหวัด ------------------------------- */
async function loadAllProvinces() {
    for (const pv of provinces) {
        try {
            const url = `${BASE_API}?province=${encodeURIComponent(pv)}`;
            const res = await fetch(url);
            const json = await res.json();

            if (!json.data) continue;

            // รวม Summary
            const s = json.summary;
            allSummary.totalProjects += s.totalProjects || 0;
            allSummary.approvedMoney += s.approvedMoney || 0;
            allSummary.debtStart += s.debtStart || 0;
            allSummary.debtNow += s.debtNow || 0;
            allSummary.overdue += s.overdue || 0;
            allSummary.legal += s.legal || 0;

            // เพิ่มเขต จังหวัด
            json.data.forEach(r => {
                allRows.push({
                    จังหวัด: pv,
                    ...r
                });
            });

            console.log(`โหลดจังหวัด ${pv} สำเร็จ`);

        } catch (err) {
            console.error(`โหลดข้อมูลจังหวัด ${pv} ล้มเหลว`, err);
        }
    }

    updateSummaryDisplay();
    renderTable();
}

/* ------------------------------- แสดง Summary ------------------------------- */
function updateSummaryDisplay() {
    const fmt = n => Number(n).toLocaleString("th-TH", { minimumFractionDigits: 2 });

    document.getElementById("sum-totalProjects").textContent = allSummary.totalProjects.toLocaleString();
    document.getElementById("sum-approvedMoney").textContent = fmt(allSummary.approvedMoney);
    document.getElementById("sum-debtStart").textContent = fmt(allSummary.debtStart);
    document.getElementById("sum-debtNow").textContent = fmt(allSummary.debtNow);
    document.getElementById("sum-overdue").textContent = fmt(allSummary.overdue);
    document.getElementById("sum-legal").textContent = fmt(allSummary.legal);
}

/* ------------------------------- Render DataTable ------------------------------- */
function renderTable() {
    const table = $("#tableAll");

    if ($.fn.DataTable.isDataTable("#tableAll")) {
        table.DataTable().clear().destroy();
    }

    const headers = Object.keys(allRows[0] || {});

    $("#tableAll thead").html(
        "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>"
    );

    const tbody = $("#tableAll tbody").empty();

    allRows.forEach(row => {
        tbody.append(
            "<tr>" + headers.map(h => `<td>${row[h] ?? "-"}</td>`).join("") + "</tr>"
        );
    });

    table.DataTable({
        scrollX: true,
        pageLength: 10
    });
}

/* ------------------------------- เริ่มต้นโหลด ------------------------------- */
$(document).ready(() => {
    loadAllProvinces();
});
