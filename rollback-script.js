// --- START: ค่าที่ต้องแก้ไข ---
const ROLLBACK_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSriF3pc_Y5lQhZNYoD1jEa8mV7o0Nn0AmXsGhqMD5qXlEMVL86FFYE3o59VIZ6srMk4yeox0bupsGQ/pub?gid=0&single=true&output=csv'; 
// --- END: ค่าที่ต้องแก้ไข ---

let allData = [];
let provincialData = [];
let currentSort = { key: 'province', order: 'asc' };

const yearSelect = document.getElementById('year-select');
const monthSelect = document.getElementById('month-select');
const searchInput = document.getElementById('searchInput');
const cardsContainer = document.getElementById('cardsContainer');
const grandTotalContainer = document.getElementById('grandTotalContainer');

document.addEventListener("DOMContentLoaded", function() {
    yearSelect.addEventListener('change', onYearSelect);
    monthSelect.addEventListener('change', onMonthSelect);
    searchInput.addEventListener('input', renderFilteredAndSortedCards);
    document.getElementById('sort-province').addEventListener('click', () => handleSort('province'));
    document.getElementById('sort-percentage').addEventListener('click', () => handleSort('percentage'));
    loadInitialData();
});

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
                province: cols[3],
                expected: cols[4],
                returned: cols[5],
            };
        }).filter(Boolean);

        populateYearFilter();

    } catch (error) {
        showError(error, 'เกิดข้อผิดพลาดในการโหลดข้อมูลเริ่มต้น');
    }
}

function populateYearFilter() {
    const years = [...new Set(allData.map(d => d.year))].sort((a, b) => b - a);
    yearSelect.innerHTML = '<option value="">-- เลือกปี --</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}

function onYearSelect() {
    const selectedYear = yearSelect.value;
    cardsContainer.innerHTML = '<p class="loading-text">กรุณาเลือกเดือนเพื่อแสดงข้อมูล</p>';
    grandTotalContainer.innerHTML = '';

    if (!selectedYear) {
        monthSelect.innerHTML = '<option value="">-- เลือกเดือน --</option>';
        monthSelect.disabled = true;
        return;
    }

    const monthsInYear = allData.filter(d => d.year === selectedYear);
    const uniqueMonths = [...new Set(monthsInYear.map(d => d.month))];
    
    monthSelect.innerHTML = '<option value="">-- เลือกเดือน --</option>';
    uniqueMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    monthSelect.disabled = false;
}

// *** ฟังก์ชัน onMonthSelect ที่แก้ไขใหม่ทั้งหมดตามตรรกะล่าสุด ***
function onMonthSelect() {
    const selectedYear = yearSelect.value;
    const selectedMonth = monthSelect.value;

    if (!selectedYear || !selectedMonth) {
        cardsContainer.innerHTML = '<p class="loading-text">กรุณาเลือกปีและเดือนเพื่อแสดงข้อมูล</p>';
        grandTotalContainer.innerHTML = '';
        return;
    }

    // 1. กรองข้อมูลดิบตามปีและเดือนที่เลือก
    const rawFilteredData = allData.filter(d => d.year === selectedYear && d.month === selectedMonth);

    // 2. **คำนวณ Grand Total** (สำหรับแสดงในภาพรวม)
    //    ส่วนนี้จะทำการ "รวมยอด" ของทุกแถวที่กรองมาได้
    const grandTotal = rawFilteredData.reduce((acc, item) => {
        acc.totalExpected += parseFloat(item.expected) || 0;
        acc.totalReturned += parseFloat(item.returned) || 0;
        return acc;
    }, { totalExpected: 0, totalReturned: 0 });

    const grandTotalData = {
        province: `ภาพรวม ${selectedMonth} ${selectedYear}`,
        totalExpected: grandTotal.totalExpected,
        totalReturned: grandTotal.totalReturned,
        percentage: calculatePercentageValue(grandTotal.totalReturned, grandTotal.totalExpected)
    };
    renderGrandTotalCard(grandTotalData);

    // 3. **เตรียมข้อมูลรายจังหวัด** (สำหรับแสดงในการ์ด)
    //    ส่วนนี้จะ "ไม่รวมยอด" แต่จะแปลงข้อมูลแต่ละแถวให้อยู่ในรูปแบบที่พร้อมใช้งาน
    //    และคำนวณเปอร์เซ็นต์ของแต่ละแถวแยกกัน
    provincialData = rawFilteredData.map((item, index) => {
        const returned = parseFloat(item.returned) || 0;
        const expected = parseFloat(item.expected) || 0;
        
        return {
            // เพิ่ม uniqueId เพื่อให้การเรียงลำดับเสถียร
            uniqueId: `${item.province}-${index}`, 
            province: item.province,
            totalReturned: returned,
            totalExpected: expected,
            percentage: calculatePercentageValue(returned, expected)
        };
    });

    // 4. แสดงผลการ์ดทั้งหมด
    renderFilteredAndSortedCards();
}


// ----- ส่วนที่เหลือเป็นฟังก์ชันแสดงผล (ไม่ต้องแก้ไข) -----

function handleSort(key) {
    if (currentSort.key === key) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = key;
        // ปรับค่าเริ่มต้นของการเรียง
        if (key === 'percentage') {
            currentSort.order = 'desc';
        } else { // province
            currentSort.order = 'asc';
        }
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
        
        // จัดการการเรียงตัวอักษรและตัวเลข
        if (typeof valA === 'string') {
            return currentSort.order === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
        } else {
            return currentSort.order === 'asc' ? valA - valB : valB - valA;
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
    if (typeof num !== 'number' || isNaN(num)) {
        num = 0;
    }
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
}

function renderGrandTotalCard(item) {
    grandTotalContainer.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'card';
    
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
    const numReturned = parseFloat(returned) || 0;
    const numExpected = parseFloat(expected) || 0;
    if (numExpected === 0) return 0;
    return (numReturned * 100) / numExpected;
}

function showError(error, message = 'เกิดข้อผิดพลาด') {
    cardsContainer.innerHTML = `<p class="error-text">${message}: ${error.message}</p>`;
    console.error(error);
}
