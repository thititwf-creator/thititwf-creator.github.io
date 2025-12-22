// --------------------------------------
// CONFIG – ตั้งค่า API ที่คุณเคยใช้อยู่
// ใส่เฉพาะ base URL ไม่ต้องใส่ ?province=
// เช่น  const BASE_API = "https://xxx.com/data";
// --------------------------------------
const BASE_API = "https://script.google.com/macros/s/AKfycbwwxjRdiPSd7SOuZAOO5OmWi5NHCBMOf3d1923ik9QBY7iiZ0gJl6ppcQQUHGrxuLRTAg/exec";


// รายชื่อจังหวัดทั้งหมด 77 จังหวัด
const provinces = [
    "กระบี่","กรุงเทพมหานคร","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี",
    "ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด",
    "ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์",
    "นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์",
    "ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก",
    "เพชรบุรี","เพชรบูรณ์","แพร่","ภูเก็ต","มหาสารคาม","มุกดาหาร","ยะลา","ยโสธร","ร้อยเอ็ด",
    "ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","ศรีสะเกษ","สกลนคร","สงขลา",
    "สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี",
    "สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง",
    "อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี"
];

let rawData = [];
let table = null;


// โหลดข้อมูลทุกจังหวัด (เรียก API 77 ครั้ง)
async function loadAllData() {
    try {
        const fetches = provinces.map(pv =>
            fetch(`${BASE_API}?province=${encodeURIComponent(pv)}`).then(r => r.json())
        );

        const results = await Promise.all(fetches);

        // รวมข้อมูลของทุกจังหวัดเข้าด้วยกัน
        rawData = results.flat();

        populateYearMonth();
        renderSummaryAndTable();

    } catch (err) {
        console.error("โหลดข้อมูลล้มเหลว:", err);
    }
}



// เติม dropdown ปี + เดือน
function populateYearMonth() {
    const yearSel = document.getElementById("yearFilter");
    const monthSel = document.getElementById("monthFilter");

    const years = [...new Set(rawData.map(r => r["ปีงบ"]))];
    const months = [...new Set(rawData.map(r => r["เดือน"]))];

    yearSel.innerHTML = `<option value="">ทั้งหมด</option>` +
        years.map(y => `<option value="${y}">${y}</option>`).join("");

    monthSel.innerHTML = `<option value="">ทั้งหมด</option>` +
        months.map(m => `<option value="${m}">${m}</option>`).join("");

    yearSel.onchange = renderSummaryAndTable;
    monthSel.onchange = renderSummaryAndTable;
}



// สรุปผลรวมทั้งประเทศ + รายจังหวัด
function renderSummaryAndTable() {

    const year = document.getElementById("yearFilter").value;
    const month = document.getElementById("monthFilter").value;

    let data = rawData.filter(r =>
        (year === "" || r["ปีงบ"] === year) &&
        (month === "" || r["เดือน"] === month)
    );

    const provinceMap = {};

    data.forEach(r => {

        const pv = r["จังหวัด"];

        if (!provinceMap[pv]) {
            provinceMap[pv] = { normal: 0, overdue: 0, legal: 0 };
        }

        const g = Number(r["ก"]) || 0;
        const kh = Number(r["ข"]) || 0;
        const k = Number(r["ค"]) || 0;
        const ng1 = Number(r["ง1"]) || 0;
        const ng2 = Number(r["ง2"]) || 0;
        const ng3 = Number(r["ง3"]) || 0;
        const ng4 = Number(r["ง4"]) || 0;
        const ng5 = Number(r["ง5"]) || 0;
        const ng6 = Number(r["ง6"]) || 0;

        // ----------------------------
        // เงื่อนไขการจัดประเภทหนี้
        // ----------------------------

        // อยู่ระหว่างการบังคับคดี
        if (ng1 > 0 || ng2 > 0 || ng3 > 0 || ng4 > 0 || ng5 > 0 || ng6 > 0) {
            provinceMap[pv].legal += ng1 + ng2 + ng3 + ng4 + ng5 + ng6;
            return;
        }

        // หนี้เกินกำหนดชำระ
        if (g > 0 && kh === 0 && k === 0 &&
            ng1 === 0 && ng2 === 0 && ng3 === 0 && ng4 === 0 && ng5 === 0 && ng6 === 0) {
            provinceMap[pv].overdue += g;
            return;
        }

        // หนี้ปกติ
        if (kh > 0) {
            provinceMap[pv].normal += kh;
            return;
        }
    });

    // รวมทั้งประเทศ
    let sumNormal = 0, sumOverdue = 0, sumLegal = 0;

    Object.values(provinceMap).forEach(p => {
        sumNormal += p.normal;
        sumOverdue += p.overdue;
        sumLegal += p.legal;
    });

    document.getElementById("sumNormal").innerText = format(sumNormal);
    document.getElementById("sumOverdue").innerText = format(sumOverdue);
    document.getElementById("sumLegal").innerText = format(sumLegal);

    buildTable(provinceMap);
}



// สร้างตารางจังหวัด
function buildTable(map) {

    const rows = Object.keys(map).map(pv => ({
        province: pv,
        normal: map[pv].normal,
        overdue: map[pv].overdue,
        legal: map[pv].legal
    }));

    if (table) {
        table.clear().destroy();
    }

    table = $("#provinceTable").DataTable({
        data: rows,
        columns: [
            { data: "province" },
            { data: "normal", render: format },
            { data: "overdue", render: format },
            { data: "legal", render: format }
        ],
        dom: "Bfrtip",
        buttons: [
            {
                extend: "excelHtml5",
                title: "ข้อมูลทุกจังหวัด"
            }
        ],
        order: [[0, "asc"]]
    });
}


// format ตัวเลข
function format(v) {
    return Number(v).toLocaleString("th-TH");
}


// เริ่มทำงาน
loadAllData();
