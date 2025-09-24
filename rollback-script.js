// --- START: ค่าที่ต้องแก้ไข ---
// วาง URL ของชีตข้อมูลย้อนหลัง (A-G) ที่เผยแพร่เป็น CSV ที่นี่
const ROLLBACK_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSriF3pc_Y5lQhZNYoD1jEa8mV7o0Nn0AmXsGhqMD5qXlEMVL86FFYE3o59VIZ6srMk4yeox0bupsGQ/pub?gid=0&single=true&output=csv'; 
// --- END: ค่าที่ต้องแก้ไข ---

// ตัวแปรสำหรับเก็บข้อมูลทั้งหมดและสถานะปัจจุบัน
let allData = [];
let provincialData = [];
let currentSort = { key: 'province', order: 'asc' };

// Element จากหน้าเว็บ
const yearSelect = document.getElementById('year-select');
const monthSelect = document.getElementById('month-select');
const searchInput = document.getElementById('searchInput');
const cardsContainer = document.getElementById('cardsContainer');
const grandTotalContainer = document.getElementById('grandTotalContainer');

// เริ่มทำงานเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener("DOMContentLoaded", function() {
    // เชื่อม Event Listeners
    yearSelect.addEventListener('change', onYearSelect);
    monthSelect.addEventListener('change', onMonthSelect);
    searchInput.addEventListener('input', renderFilteredAndSortedCards);
    document.getElementById('sort-province').addEventListener('click', () => handleSort('province'));
    document.getElementById('sort-percentage').addEventListener('click', () => handleSort('percentage'));

    // เริ่มกระบวนการดึงข้อมูล
    loadInitialData();
});

/**
 * ดึงข้อมูล CSV ทั้งหมดมาเก็บไว้และสร้าง Dropdown ปี
 */
async function loadInitialData() {
    try {
        const response = await fetch(ROLLBACK_CSV_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const csvText = await response.text();
        const rows = csvText.split('\n').slice(1); // ตัด Header

        allData = rows.map(row => {
            const cols = row.split(',');
            return {
                order: cols[0],
                month: cols[1],
                year: cols[2],
                province: cols[3],
                expected: parseFloat(cols[4]) || 0,
                returned: parseFloat(cols[5]) || 0,
                percentage: parseFloat(cols[6]) || 0
            };
        }).filter(d => d.year && d.month && d.province); // กรองข้อมูลที่ไม่สมบูรณ์ออก

        populateYearFilter();

    } catch (error) {
        showError(error, 'เกิดข้อผิดพลาดในการโหลดข้อมูลเริ่มต้น');
    }
}

/**
 * สร้างตัวเลือก "ปี" ใน Dropdown จากข้อมูลทั้งหมด
 */
function populateYearFilter() {
    const years = [...new Set(allData.map(d => d.year))].sort((a, b) => b - a); // เรียงปีล่าสุดก่อน
    yearSelect.innerHTML = '<option value="">-- เลือกปี --</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}

/**
 * เมื่อผู้ใช้เลือก "ปี" ให้สร้าง Dropdown "เดือน" ที่เกี่ยวข้อง
 */
function onYearSelect() {
    const selectedYear = yearSelect.value;
    cardsContainer.innerHTML = '<p class="loading-text">กรุณาเลือกเดือนเพื่อแสดงข้อมูล</p>';
    grandTotalContainer.innerHTML = '';

    if (!selectedYear) {
        monthSelect.innerHTML = '<option value="">-- เลือกเดือน --</option>';
        monthSelect.disabled = true;
        return;
    }

    const months = [...new Set(allData.filter(d => d.year === selectedYear).map(d => d.month))];
    monthSelect.innerHTML = '<option value="">-- เลือกเดือน --</option>';
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    monthSelect.disabled = false;
}

/**
 * เมื่อผู้ใช้เลือก "เดือน" ให้ทำการกรองและแสดงผลข้อมูล
 */
function onMonthSelect() {
    const selectedYear = yearSelect.value;
    const selectedMonth = monthSelect.value;

    if (!selectedYear || !selectedMonth) {
        cardsContainer.innerHTML = '<p class="loading-text">กรุณาเลือกปีและเดือนเพื่อแสดงข้อมูล</p>';
        grandTotalContainer.innerHTML = '';
        return;
    }

    // กรองข้อมูลตามปีและเดือนที่เลือก
    const filteredData = allData.filter(d => d.year === selectedYear && d.month === selectedMonth);
    
    // คำนวณ Grand Total จากข้อมูลที่กรองแล้ว
    const grandTotal = filteredData.reduce((acc, cur) => {
        acc.totalExpected += cur.expected;
        acc.totalReturned += cur.returned;
        return acc;
    }, { totalExpected: 0, totalReturned: 0 });

    const grandTotalData = {
        province: `ภาพรวม ${selectedMonth} ${selectedYear}`,
        ...grandTotal,
        percentage: calculatePercentageValue(grandTotal.totalReturned, grandTotal.totalExpected)
    };
    renderGrandTotalCard(grandTotalData);

    // เก็บข้อมูลรายจังหวัดเพื่อใช้ค้นหาและจัดเรียง
    provincialData = filteredData.map(item => ({
        ...item,
        totalExpected: item.expected, // เปลี่ยนชื่อ key ให้ตรงกับฟังก์ชัน render
        totalReturned: item.returned, // เปลี่ยนชื่อ key ให้ตรงกับฟังก์ชัน render
        percentage: calculatePercentageValue(item.returned, item.expected) // คำนวณ % ใหม่เพื่อความแม่นยำ
    }));

    renderFilteredAndSortedCards();
}


// ----- ส่วนที่เหลือเป็นฟังก์ชันแสดงผล ซึ่งคัดลอกมาจาก script.js เดิมได้เลย -----
// (มีการปรับแก้เล็กน้อยเพื่อให้เข้ากันได้)

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
    const searchTerm = searchInput.value.toLowerCase();
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
    grandTotalContainer.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'card'; // ใช้คลาส card ทั่วไป
    
    const percentage = item.percentage || 0;
    const statusClass = getStatusColor(percentage);

    card.innerHTML = `
        <div class="card-header">
            <span class="card-title">${item.province}</span>
            <span class="card-percentage ${statusClass}">${percentage.toFixed(2)}%</span>
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
    grandTotalContainer.appendChild(card);
    // ทำให้การ์ดนี้มีสไตล์เหมือนภาพรวมประเทศ
    grandTotalContainer.querySelector('.card').style.backgroundColor = 'var(--grand-total-bg)';
    grandTotalContainer.querySelector('.card').style.color = 'var(--text-light)';
}

function renderProvincialCards(data) {
    cardsContainer.innerHTML = '';

    if (!data || data.length === 0) {
        if (yearSelect.value && monthSelect.value) {
            cardsContainer.innerHTML = '<p class="error-text">ไม่พบข้อมูลจังหวัดในเดือนที่เลือก</p>';
        } else {
            cardsContainer.innerHTML = '<p class="loading-text">กรุณาเลือกปีและเดือนเพื่อแสดงข้อมูล</p>';
        }
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
        cardsContainer.appendChild(card);
    });
}

function calculatePercentageValue(returned, expected) {
    if (expected === 0 || !expected) return 0;
    return (parseFloat(returned) * 100) / parseFloat(expected);
}

function showError(error, message = 'เกิดข้อผิดพลาด') {
    cardsContainer.innerHTML = `<p class="error-text">${message}: ${error.message}</p>`;
    console.error(error);
}
