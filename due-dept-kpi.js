// --- START: ค่าที่ต้องแก้ไข ---
// วาง URL ที่คัดลอกมาจากขั้นตอนที่ 1 ที่นี่
const PIVOT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWpaZQQWx8Yob4W2SEOeKKiWQpOjN3--qiRHF35DW-lDaDWLS1FJOJGMpd-BT8TN36VBfX28Jhog9m/pub?gid=1047903333&single=true&output=csv';
const NOTE_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWpaZQQWx8Yob4W2SEOeKKiWQpOjN3--qiRHF35DW-lDaDWLS1FJOJGMpd-BT8TN36VBfX28Jhog9m/pub?gid=1184749988&single=true&output=csv';
// --- END: ค่าที่ต้องแก้ไข ---

let provincialData = [];
let currentSort = { key: 'province', order: 'asc' };

// เริ่มทำงานเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener("DOMContentLoaded", function() {
    // เชื่อม Event Listeners กับปุ่มและช่องค้นหา
    document.getElementById('searchInput').addEventListener('input', renderFilteredAndSortedCards);
    document.getElementById('sort-province').addEventListener('click', () => handleSort('province'));
    document.getElementById('sort-percentage').addEventListener('click', () => handleSort('percentage'));

    // เรียกฟังก์ชันหลักเพื่อเริ่มดึงและประมวลผลข้อมูล
    loadAndProcessData();
});

/**
 * ฟังก์ชันหลัก: ดึงข้อมูลจาก CSV ทั้งสองไฟล์พร้อมกัน
 */
async function loadAndProcessData() {
    try {
        // ใช้ Promise.all เพื่อดึงข้อมูลทั้งสองแหล่งพร้อมกัน จะเร็วกว่า
        const [pivotResponse, noteResponse] = await Promise.all([
            fetch(PIVOT_CSV_URL),
            fetch(NOTE_CSV_URL)
        ]);

        if (!pivotResponse.ok || !noteResponse.ok) {
            throw new Error('ไม่สามารถดึงข้อมูลจาก Google Sheet ได้');
        }

        const pivotText = await pivotResponse.text();
        const noteText = await noteResponse.text();

        // จำลองการทำงานของ getSummaryData() ในฝั่ง Client
        const summaryData = processDataFromCsv(pivotText, noteText);

        // เรียกฟังก์ชัน initializePage เพื่อแสดงผล (เหมือนโค้ดเดิม)
        initializePage(summaryData);

    } catch (error) {
        showError(error);
    }
}

/**
 * ฟังก์ชันใหม่: ประมวลผลข้อมูลดิบจาก CSV ให้เป็นโครงสร้างที่ต้องการ
 * นี่คือการแปลงตรรกะจาก Code.gs มาเป็น JavaScript
 * @param {string} pivotCsvText - ข้อมูลดิบจากชีต Pivot
 * @param {string} noteCsvText - ข้อมูลดิบจากชีตหมายเหตุ
 * @returns {object} ออบเจ็กต์ข้อมูลที่พร้อมใช้งาน
 */
function processDataFromCsv(pivotCsvText, noteCsvText) {
    // --- 1. ประมวลผลหมายเหตุ (จาก Sheet1) ---
    const noteRows = noteCsvText.split('\n');
    // สมมติว่า P2 คือแถวที่ 2 (index 1), คอลัมน์ P (index 15)
    // และ Q2 คือแถวที่ 2 (index 1), คอลัมน์ Q (index 16)
    const noteDataRow = noteRows[1].split(',');
    const noteLabel = noteDataRow[15]; // คอลัมน์ P
    const noteValue = noteDataRow[16]; // คอลัมน์ Q
    const note = (noteLabel && noteValue) ? `${noteLabel} ${noteValue}` : "";

    // --- 2. ประมวลผลข้อมูล Pivot ---
    const pivotRows = pivotCsvText.split('\n').slice(1); // ตัด Header ทิ้ง
    const grandTotal = { totalExpected: 0, totalReturned: 0 };
    const summaryData = [];

    for (const row of pivotRows) {
        const columns = row.split(',');
        const province = columns[0];
        
        // ข้ามแถวที่เป็น Grand Total ของ Pivot หรือแถวว่าง
        if (!province || province.toLowerCase().includes('grand total')) {
            continue;
        }

        const expected = parseFloat(columns[1]) || 0;
        const returned = parseFloat(columns[2]) || 0;

        grandTotal.totalExpected += expected;
        grandTotal.totalReturned += returned;

        summaryData.push({
            province: province,
            totalExpected: expected,
            totalReturned: returned
        });
    }

    // คืนค่าออบเจ็กต์ในรูปแบบเดียวกับที่ getSummaryData() เคยทำ
    return {
        success: true,
        data: summaryData,
        grandTotal: grandTotal,
        note: note
    };
}


// ----- โค้ดส่วนที่เหลือคือโค้ดเดิมจาก <script> ของคุณ (ไม่ต้องแก้ไข) -----

function initializePage(response) {
    if (!response.success) {
        showError({ message: response.error || "เกิดข้อผิดพลาดในการประมวลผลข้อมูล" });
        return;
    }
    
    if (response.note) {
        document.getElementById('noteDisplay').textContent = response.note;
    }

    const grandTotalData = {
        province: 'ภาพรวมทั้งประเทศ',
        ...response.grandTotal,
        percentage: calculatePercentageValue(response.grandTotal.totalReturned, response.grandTotal.totalExpected)
    };
    renderGrandTotalCard(grandTotalData);

    provincialData = response.data.map(item => ({
        ...item,
        percentage: calculatePercentageValue(item.totalReturned, item.totalExpected)
    }));
    
    renderFilteredAndSortedCards();
}

function handleSort(key) {
    if (currentSort.key === key) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = key;
        currentSort.order = key === 'percentage' ? 'desc' : 'asc';
    }
    updateSortButtons();
    renderFilteredAndSortedCards();
}

function updateSortButtons() {
    document.getElementById('sort-province').classList.toggle('active', currentSort.key === 'province');
    document.getElementById('sort-percentage').classList.toggle('active', currentSort.key === 'percentage');
}

function renderFilteredAndSortedCards() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    let dataToRender = provincialData.filter(row => 
        row.province.toLowerCase().includes(searchTerm)
    );

    dataToRender.sort((a, b) => {
        let valA = a[currentSort.key];
        let valB = b[currentSort.key];
        if (currentSort.order === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });

    renderProvincialCards(dataToRender);
}

function getStatusColor(percentage) {
    if (percentage > 80) return 'status-green';
    if (percentage >= 50) return 'status-yellow';
    return 'status-red';
}

function formatCurrency(num) {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
}

function renderGrandTotalCard(item) {
    const container = document.getElementById('grandTotalContainer');
    container.innerHTML = '';
    const statusClass = getStatusColor(item.percentage);
    const card = document.createElement('div');
    card.className = `card ${statusClass}`;
    
    card.innerHTML = `
        <div class="card-header">
            <span class="card-title">${item.province}</span>
            <span class="card-percentage ${statusClass}">${item.percentage.toFixed(2)}%</span>
        </div>
        <div class="card-body">
            <div class="data-row">
                <span class="label">เงินต้นรับคืนรวม</span>
                <span class="value">${formatCurrency(item.totalReturned)}</span>
            </div>
            <div class="data-row">
                <span class="label">เงินต้นที่คาดว่าจะได้รวม</span>
                <span class="value">${formatCurrency(item.totalExpected)}</span>
            </div>
        </div>
    `;
    container.appendChild(card);
}

function renderProvincialCards(data) {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="error-text">ไม่พบข้อมูลจังหวัดที่ตรงกัน</p>';
        return;
    }

    data.forEach(item => {
        const statusClass = getStatusColor(item.percentage);
        const card = document.createElement('div');
        card.className = `card ${statusClass}`;
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">${item.province}</span>
                <span class="card-percentage ${statusClass}">${item.percentage.toFixed(2)}%</span>
            </div>
            <div class="card-body">
                <div class="data-row">
                    <span class="label">เงินต้นรับคืน</span>
                    <span class="value">${formatCurrency(item.totalReturned)}</span>
                </div>
                <div class="data-row">
                    <span class="label">เงินต้นที่คาดว่าจะได้</span>
                    <span class="value">${formatCurrency(item.totalExpected)}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function calculatePercentageValue(returned, expected) {
    if (expected === 0 || !expected) return 0;
    return (parseFloat(returned) * 100) / parseFloat(expected);
}

function showError(error) {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = `<p class="error-text">เกิดข้อผิดพลาด: ${error.message}</p>`;
    console.error(error); // แสดง error ใน console เพื่อช่วยดีบัก
}
