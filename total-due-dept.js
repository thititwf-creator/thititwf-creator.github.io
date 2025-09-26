// --- START: ค่าที่ต้องแก้ไข ---
// ใช้ URL เดิมกับหน้า due-dept-rollback.html
const ROLLBACK_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSriF3pc_Y5lQhZNYoD1jEa8mV7o0Nn0AmXsGhqMD5qXlEMVL86FFYE3o59VIZ6srMk4yeox0bupsGQ/pub?gid=0&single=true&output=csv';
// --- END: ค่าที่ต้องแก้ไข ---

// --- ตัวแปร Global ---
let allData = [];
let myChart = null; // ตัวแปรสำหรับเก็บ instance ของ Chart
const yearSelect = document.getElementById('year-select' );
const chartCanvas = document.getElementById('monthly-chart');
const messageDisplay = document.getElementById('message-display');

// --- [แก้ไข] ลำดับเดือนตามปีงบประมาณ ---
const FISCAL_MONTHS_ORDER = [
    "ตุลาคม", "พฤศจิกายน", "ธันวาคม", "มกราคม", "กุมภาพันธ์", "มีนาคม",
    "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน"
];

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", loadInitialData);
yearSelect.addEventListener('change', onFiscalYearSelect);

/**
 * 1. โหลดข้อมูลเริ่มต้นจาก CSV
 */
async function loadInitialData() {
    try {
        const response = await fetch(ROLLBACK_CSV_URL);
        if (!response.ok) throw new Error('Network response was not ok');

        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).slice(1);

        allData = rows.map(row => {
            const cols = row.split(',').map(s => s.trim());
            if (cols.length < 6 || !cols[3]) return null;

            return {
                month: cols[1],
                year: parseInt(cols[2]), // แปลงเป็นตัวเลขเพื่อให้คำนวณง่ายขึ้น
                expected: parseFloat(cols[4]) || 0,
                returned: parseFloat(cols[5]) || 0,
            };
        }).filter(Boolean);

        populateFiscalYearFilter(); // [แก้ไข] เรียกใช้ฟังก์ชันสำหรับปีงบประมาณ

    } catch (error) {
        messageDisplay.textContent = `เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}`;
        console.error(error);
    }
}

/**
 * 2. [แก้ไข] สร้าง Dropdown สำหรับเลือก "ปีงบประมาณ"
 */
function populateFiscalYearFilter() {
    // หาปี พ.ศ. ทั้งหมดที่มีในข้อมูล
    const calendarYears = [...new Set(allData.map(d => d.year))];
    const fiscalYears = new Set();

    // แปลงปี พ.ศ. เป็นปีงบประมาณ
    // เช่น ข้อมูลเดือน ม.ค. 2567 -> อยู่ในปีงบ 2567
    // ข้อมูลเดือน ต.ค. 2567 -> อยู่ในปีงบ 2568
    allData.forEach(d => {
        const monthIndex = FISCAL_MONTHS_ORDER.indexOf(d.month);
        // ถ้าเป็นเดือน ต.ค., พ.ย., ธ.ค. (index 0-2) ให้บวกปี พ.ศ. ไป 1
        const fiscalYear = (monthIndex >= 0 && monthIndex <= 2) ? d.year + 1 : d.year;
        fiscalYears.add(fiscalYear);
    });

    const sortedFiscalYears = [...fiscalYears].sort((a, b) => b - a);

    yearSelect.innerHTML = '<option value="">-- เลือกปีงบประมาณ --</option>';
    sortedFiscalYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `ปีงบประมาณ ${year}`;
        yearSelect.appendChild(option);
    });
}


/**
 * 3. [แก้ไข] เมื่อผู้ใช้เลือกปีงบประมาณ: ประมวลผลและสร้างกราฟ
 */
function onFiscalYearSelect() {
    const selectedFiscalYear = parseInt(yearSelect.value);

    if (!selectedFiscalYear) {
        messageDisplay.textContent = 'กรุณาเลือกปีงบประมาณเพื่อแสดงกราฟ';
        messageDisplay.style.display = 'block';
        if (myChart) myChart.destroy();
        return;
    }

    messageDisplay.style.display = 'none';

    // [หัวใจหลัก] กรองข้อมูลตามปีงบประมาณที่เลือก
    // ปีงบ 2568 คือ ต.ค.-ธ.ค. 2567 และ ม.ค.-ก.ย. 2568
    const fiscalYearData = allData.filter(d => {
        const monthIndex = FISCAL_MONTHS_ORDER.indexOf(d.month);
        // ตรวจสอบเดือน ต.ค., พ.ย., ธ.ค. ของปีก่อนหน้า
        if (monthIndex >= 0 && monthIndex <= 2) {
            return d.year === selectedFiscalYear - 1;
        }
        // ตรวจสอบเดือน ม.ค. - ก.ย. ของปีเดียวกัน
        if (monthIndex > 2) {
            return d.year === selectedFiscalYear;
        }
        return false;
    });

    // รวมข้อมูล (Aggregate) ของแต่ละเดือน
    const monthlySummary = {};
    for (const item of fiscalYearData) {
        if (!monthlySummary[item.month]) {
            monthlySummary[item.month] = {
                totalExpected: 0,
                totalReturned: 0,
            };
        }
        monthlySummary[item.month].totalExpected += item.expected;
        monthlySummary[item.month].totalReturned += item.returned;
    }

    // เตรียมข้อมูลสำหรับกราฟ
    const chartData = {
        labels: [],
        percentages: []
    };

    // เรียงลำดับเดือนให้ถูกต้องตามปีงบประมาณ
    FISCAL_MONTHS_ORDER.forEach(monthName => {
        // เพิ่มเดือนเข้าไปในแกน X เสมอ เพื่อให้มี 12 เดือนครบ
        chartData.labels.push(monthName);

        if (monthlySummary[monthName]) {
            const monthInfo = monthlySummary[monthName];
            const percentage = calculatePercentageValue(monthInfo.totalReturned, monthInfo.totalExpected);
            chartData.percentages.push(percentage);
        } else {
            // ถ้าเดือนนั้นไม่มีข้อมูล ให้ใส่ค่าเป็น 0
            chartData.percentages.push(0);
        }
    });

    // สร้างหรืออัปเดตกราฟ
    createOrUpdateChart(chartData.labels, chartData.percentages, selectedFiscalYear);
}


/**
 * 4. ฟังก์ชันสำหรับสร้าง/อัปเดตกราฟด้วย Chart.js
 */
function createOrUpdateChart(labels, data, fiscalYear) {
    if (myChart) {
        myChart.destroy();
    }

    const ctx = chartCanvas.getContext('2d');
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `ร้อยละการชำระคืน ปีงบประมาณ ${fiscalYear}`, // [แก้ไข] ปรับข้อความ
                data: data,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(255, 255, 255, 1)',
                borderWidth: 1,
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        callback: value => value + '%'
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.15)' }
                },
                x: {
                    ticks: { color: 'rgba(255, 255, 255, 0.8)' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2) + '%';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

/**
 * ฟังก์ชันคำนวณเปอร์เซ็นต์ (เหมือนเดิม)
 */
function calculatePercentageValue(returned, expected) {
    if (expected === 0) return 0;
    return (returned * 100) / expected;
}
