// --- START: ค่าที่ต้องแก้ไข ---
// ใช้ URL เดิมกับหน้า due-dept-rollback.html
const ROLLBACK_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSriF3pc_Y5lQhZNYoD1jEa8mV7o0Nn0AmXsGhqMD5qXlEMVL86FFYE3o59VIZ6srMk4yeox0bupsGQ/pub?gid=0&single=true&output=csv'; 
// --- END: ค่าที่ต้องแก้ไข ---

// --- ตัวแปร Global ---
let allData = [];
let myChart = null; // ตัวแปรสำหรับเก็บ instance ของ Chart
const yearSelect = document.getElementById('year-select');
const chartCanvas = document.getElementById('monthly-chart');
const messageDisplay = document.getElementById('message-display');

// --- ลำดับเดือนภาษาไทยสำหรับเรียงข้อมูลในกราฟ ---
const THAI_MONTHS_ORDER = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", loadInitialData);
yearSelect.addEventListener('change', onYearSelect);

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
                year: cols[2],
                // เราไม่ต้องการข้อมูลจังหวัด แต่ต้องอ่านค่าตัวเลข
                expected: parseFloat(cols[4]) || 0,
                returned: parseFloat(cols[5]) || 0,
            };
        }).filter(Boolean);

        populateYearFilter();

    } catch (error) {
        messageDisplay.textContent = `เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}`;
        console.error(error);
    }
}

/**
 * 2. สร้าง Dropdown สำหรับเลือกปี
 */
function populateYearFilter() {
    const years = [...new Set(allData.map(d => d.year))].sort((a, b) => b - a);
    yearSelect.innerHTML = '<option value="">-- เลือกปี --</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `ปี พ.ศ. ${year}`;
        yearSelect.appendChild(option);
    });
}

/**
 * 3. เมื่อผู้ใช้เลือกปี: ประมวลผลและสร้างกราฟ
 */
function onYearSelect() {
    const selectedYear = yearSelect.value;

    if (!selectedYear) {
        messageDisplay.style.display = 'block';
        if (myChart) myChart.destroy(); // ทำลายกราฟเก่าถ้ามี
        return;
    }

    messageDisplay.style.display = 'none';

    // กรองข้อมูลเฉพาะปีที่เลือก
    const yearlyData = allData.filter(d => d.year === selectedYear);

    // **[หัวใจหลัก]** รวมข้อมูล (Aggregate) ของแต่ละเดือน
    const monthlySummary = {};
    for (const item of yearlyData) {
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

    // เรียงลำดับเดือนให้ถูกต้อง
    THAI_MONTHS_ORDER.forEach(monthName => {
        if (monthlySummary[monthName]) {
            const monthInfo = monthlySummary[monthName];
            const percentage = calculatePercentageValue(monthInfo.totalReturned, monthInfo.totalExpected);
            
            chartData.labels.push(monthName);
            chartData.percentages.push(percentage);
        }
    });

    // สร้างหรืออัปเดตกราฟ
    createOrUpdateChart(chartData.labels, chartData.percentages, selectedYear);
}

/**
 * 4. ฟังก์ชันสำหรับสร้าง/อัปเดตกราฟด้วย Chart.js
 */
function createOrUpdateChart(labels, data, year) {
    // ทำลายกราฟเก่าทิ้งก่อนสร้างใหม่ เพื่อป้องกันการซ้อนทับ
    if (myChart) {
        myChart.destroy();
    }

    const ctx = chartCanvas.getContext('2d');
    myChart = new Chart(ctx, {
        type: 'bar', // ประเภทกราฟ: แท่ง
        data: {
            labels: labels, // ชื่อเดือนต่างๆ
            datasets: [{
                label: `ร้อยละการชำระคืน ปี ${year}`,
                data: data, // ข้อมูลเปอร์เซ็นต์
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
                    max: 100, // กำหนดให้แกน Y สูงสุดที่ 100%
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        callback: function(value) {
                            return value + '%'; // เพิ่มเครื่องหมาย % หลังตัวเลข
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.15)'
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // ซ่อนป้ายกำกับด้านบน (เพราะมีหัวข้ออยู่แล้ว)
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
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
