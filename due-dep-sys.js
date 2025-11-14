// --- ค่าคงที่และ URL ของ Google Sheet (ที่เผยแพร่เป็น CSV ) ---
const SHEET_ID = "1xk8u4AWnjs00f3R-J9KAK7oo09nFGxu7z-kn4uUwpBI";
const SHEET_NAME = "Sheet1";
const USER_SHEET_ID = "1vNIKbtV2S7Si9aHUrg3NPJcyjNDENcRuufSp_rgFW9o";
const USER_SHEET_NAME = "Sheet1";

// สร้าง URL สำหรับดึง CSV
const DATA_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;
const USER_CSV_URL = `https://docs.google.com/spreadsheets/d/${USER_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${USER_SHEET_NAME}`;

// --- Element Variables ---
const loginPage = document.getElementById('login-page');
const mainApp = document.getElementById('main-app');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const loginText = document.getElementById('login-text');
const loginSpinner = document.getElementById('login-spinner');
const errorMessageDiv = document.getElementById('error-message');
const logoutButton = document.getElementById('logout-button');
const userNameDisplay = document.getElementById('user-name-display');

const provinceSelect = document.getElementById('province-select');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const searchButton = document.getElementById('search-button');
const resultsTable = document.getElementById('results-table');
const resultsBody = document.getElementById('results-body');
const loadingSpinner = document.getElementById('loading-spinner');
const errorAlert = document.getElementById('error-alert');
const summaryBox = document.getElementById('summary-box');
const summaryContracts = document.getElementById('summary-contracts');
const summaryExpected = document.getElementById('summary-expected');
const summaryReturned = document.getElementById('summary-returned');
const summaryPercentage = document.getElementById('summary-percentage');
const searchAndExportContainer = document.getElementById('search-and-export-container');
const searchInTableInput = document.getElementById('search-in-table');
const exportButton = document.getElementById('export-button');
const noteContainer = document.getElementById('note-container');
const noteText = document.getElementById('note-text');

let allContractsData = []; // ข้อมูลดิบทั้งหมดที่ดึงมา
let groupedContractsData = []; // ข้อมูลที่ผ่านการจัดกลุ่มแล้ว
let filteredContractsData = []; // ข้อมูลที่แสดงในตาราง (หลังจากการค้นหาในตาราง)

// --- Functions ---

// ฟังก์ชันสำหรับดึงและ Parse ข้อมูล CSV
async function fetchCsvData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const csvText = await response.text();
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (error) => reject(error),
            });
        });
    } catch (error) {
        console.error("Error fetching CSV data:", error);
        showError({ message: `ไม่สามารถโหลดข้อมูลได้: ${error.message}` });
        return [];
    }
}

// ฟังก์ชันจัดการการ Login
async function handleLogin() {
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!username || !password) {
        errorMessageDiv.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
        errorMessageDiv.style.display = 'block';
        return;
    }

    loginButton.disabled = true;
    loginText.style.display = 'none';
    loginSpinner.style.display = 'inline-block';
    errorMessageDiv.style.display = 'none';

    const users = await fetchCsvData(USER_CSV_URL);
    const user = users.find(u => u.username === username && String(u.password) === String(password));

    if (user) {
        // Login สำเร็จ
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userName', user.name);
        showMainApp(user.name);
    } else {
        // Login ไม่สำเร็จ
        errorMessageDiv.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        errorMessageDiv.style.display = 'block';
        loginButton.disabled = false;
        loginText.style.display = 'inline-block';
        loginSpinner.style.display = 'none';
    }
}

// ฟังก์ชันจัดการการ Logout
function handleLogout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userName');
    showLoginPage();
}

// ฟังก์ชันแสดงหน้าหลัก
function showMainApp(userName) {
    document.body.classList.remove('login-body');
    loginPage.style.display = 'none';
    mainApp.style.display = 'block';
    userNameDisplay.textContent = userName;
    initializeMainApp();
}

// ฟังก์ชันแสดงหน้า Login
function showLoginPage() {
    document.body.classList.add('login-body');
    mainApp.style.display = 'none';
    loginPage.style.display = 'block';
    loginButton.disabled = false;
    loginText.style.display = 'inline-block';
    loginSpinner.style.display = 'none';
    usernameInput.value = '';
    passwordInput.value = '';
}

// ฟังก์ชันเริ่มต้นการทำงานของหน้าหลัก
async function initializeMainApp() {
    // โหลดข้อมูลสัญญาและจังหวัด
    loadingSpinner.style.display = 'block';
    allContractsData = await fetchCsvData(DATA_CSV_URL);
    loadingSpinner.style.display = 'none';

    if (allContractsData.length > 0) {
        // ดึงข้อมูล Note จากแถวแรก
        const notes = {
            note1: allContractsData[0]['หมายเหตุ1'] || '',
            note2: allContractsData[0]['หมายเหตุ2'] || ''
        };
        displayNotes(notes);

        // ดึงรายชื่อจังหวัดที่ไม่ซ้ำกัน
        const provinces = [...new Set(allContractsData.map(row => row['จังหวัด']).filter(p => p))].sort();
        populateProvinces(provinces);
    } else {
        showError({ message: "ไม่พบข้อมูลสัญญาในระบบ" });
    }
}

function convertBeToAd(beDate) {
    if (!beDate || beDate.split('/').length !== 3) return null;
    const parts = beDate.split('/');
    const day = parts[0];
    const month = parts[1];
    const beYear = parseInt(parts[2], 10);
    if (isNaN(beYear)) return null;
    const adYear = beYear - 543;
    return `${adYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function displayNotes(notes) {
    if (notes && (notes.note1 || notes.note2)) {
        noteText.textContent = `${notes.note1} ${notes.note2}`.trim();
        noteContainer.style.display = 'inline-block';
    }
}

function populateProvinces(provinces) {
    provinceSelect.innerHTML = '<option value="ทุกจังหวัด">-- ทุกจังหวัด --</option>';
    provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province;
        option.textContent = province;
        provinceSelect.appendChild(option);
    });
}

function formatCurrency(number) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC'
    }).format(date);
}

function handleSearch() {
    const startDateBe = startDateInput.value;
    const endDateBe = endDateInput.value;
    const startDateAd = convertBeToAd(startDateBe);
    const endDateAd = convertBeToAd(endDateBe);

    if (!provinceSelect.value || !startDateAd || !endDateAd) {
        showError({ message: "กรุณาเลือกจังหวัดและกรอกช่วงวันที่ให้ครบถ้วนในรูปแบบ วว/ดด/ปปปป" });
        return;
    }

    resultsTable.style.display = 'none';
    summaryBox.style.display = 'none';
    errorAlert.style.display = 'none';
    searchAndExportContainer.style.display = 'none';
    searchInTableInput.value = '';
    loadingSpinner.style.display = 'block';

    const start = new Date(startDateAd);
    const end = new Date(endDateAd);
    end.setHours(23, 59, 59, 999);

    const filteredRawData = allContractsData.filter(row => {
        const rowProvince = row['จังหวัด'];
        const dueDateValue = row['วันที่ครบกำหนดชำระ'];
        if (!rowProvince || !dueDateValue) return false;

        // แปลง dd/mm/yyyy เป็น Date object
        const dateParts = dueDateValue.split('/');
        if (dateParts.length !== 3) return false;
        const dueDate = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);

        if (isNaN(dueDate.getTime())) return false;
        const isProvinceMatch = (provinceSelect.value === "ทุกจังหวัด" || rowProvince === provinceSelect.value);
        const isDateMatch = (dueDate >= start && dueDate <= end);
        return isProvinceMatch && isDateMatch;
    });

    const groupedByContract = filteredRawData.reduce((acc, row) => {
        const contractId = row['เลขที่สัญญา'];
        const dateParts = row['วันที่ครบกำหนดชำระ'].split('/');
        const dueDate = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);

        if (!acc[contractId]) {
            acc[contractId] = {
                province: row['จังหวัด'],
                amphoe: row['อำเภอ'],
                tambon: row['ตำบล'],
                contract: contractId,
                year: row['ปีงบประมาณ'],
                projectName: row['ชื่อโครงการ'],
                proposerName: row['ชื่อผู้เสนอ'],
                firstDueDate: dueDate,
                count: 0,
                totalExpected: 0,
                totalReturned: 0,
            };
        }

        if (dueDate < acc[contractId].firstDueDate) {
            acc[contractId].firstDueDate = dueDate;
        }

        acc[contractId].count += 1;
        acc[contractId].totalExpected += parseFloat(row['เงินต้นที่คาดว่าจะได้รับ'] || 0);
        acc[contractId].totalReturned += parseFloat(row['เงินต้นรับคืน'] || 0);
        return acc;
    }, {});

    groupedContractsData = Object.values(groupedByContract).map(item => {
        item.firstDueDate = item.firstDueDate.toISOString().split('T')[0];
        return item;
    });

    loadingSpinner.style.display = 'none';
    filterAndRenderTable(); // เริ่มต้นด้วยการแสดงข้อมูลทั้งหมดที่กรองมา
}

function filterAndRenderTable() {
    const searchText = searchInTableInput.value.trim().toLowerCase();
    if (searchText === '') {
        filteredContractsData = groupedContractsData;
    } else {
        filteredContractsData = groupedContractsData.filter(item => {
            const searchableText = [
                item.province, item.amphoe, item.tambon, item.contract,
                item.year, item.projectName, item.proposerName, formatDate(item.firstDueDate)
            ].join(' ').toLowerCase();
            return searchableText.includes(searchText);
        });
    }
    renderTable(filteredContractsData);
}

function renderTable(dataToRender) {
    resultsBody.innerHTML = '';
    if (dataToRender.length > 0) {
        let grandTotalExpected = 0;
        let grandTotalReturned = 0;
        dataToRender.forEach((item, index) => {
            grandTotalExpected += item.totalExpected;
            grandTotalReturned += item.totalReturned;
            const row = resultsBody.insertRow();
            row.innerHTML = `
                <th scope="row">${index + 1}</th>
                <td>${item.province || ''}</td>
                <td>${item.amphoe || ''}</td>
                <td>${item.tambon || ''}</td>
                <td>${item.contract}</td>
                <td>${item.year}</td>
                <td>${item.projectName}</td>
                <td>${item.proposerName}</td>
                <td style="text-align: right;">${item.count}</td>
                <td>${formatDate(item.firstDueDate)}</td>
                <td style="text-align: right;">${formatCurrency(item.totalExpected)}</td>
                <td style="text-align: right;">${formatCurrency(item.totalReturned)}</td>
            `;
        });
        const percentage = grandTotalExpected > 0 ? (grandTotalReturned * 100) / grandTotalExpected : 0;
        summaryContracts.textContent = dataToRender.length;
        summaryExpected.textContent = formatCurrency(grandTotalExpected);
        summaryReturned.textContent = formatCurrency(grandTotalReturned);
        summaryPercentage.textContent = `${formatCurrency(percentage)} %`;
        summaryBox.style.display = 'flex';
        searchAndExportContainer.style.display = 'flex';
        resultsTable.style.display = 'table';
    } else {
        summaryBox.style.display = 'none';
        searchAndExportContainer.style.display = groupedContractsData.length > 0 ? 'flex' : 'none';
        const row = resultsBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 12;
        cell.className = 'text-center text-muted p-3';
        cell.textContent = groupedContractsData.length === 0 ? 'ไม่พบข้อมูลสัญญาตามเงื่อนไขที่กำหนด' : 'ไม่พบข้อมูลที่ตรงกับคำค้นหาในตาราง';
        resultsTable.style.display = 'table';
    }
}

function showError(error) {
    loadingSpinner.style.display = 'none';
    resultsTable.style.display = 'none';
    summaryBox.style.display = 'none';
    searchAndExportContainer.style.display = 'none';
    errorAlert.textContent = `เกิดข้อผิดพลาด: ${error.message}`;
    errorAlert.style.display = 'block';
}

function exportTableToExcel() {
    const dataForExport = [['ลำดับ', 'จังหวัด', 'อำเภอ', 'ตำบล', 'เลขที่สัญญา', 'ปีงบประมาณ', 'ชื่อโครงการ', 'ชื่อผู้เสนอ', 'จำนวนงวด', 'กำหนดชำระ', 'เงินต้นที่คาดว่าจะได้', 'เงินต้นรับคืน']];
    filteredContractsData.forEach((item, index) => {
        dataForExport.push([
            String(index + 1), String(item.province || ''), String(item.amphoe || ''),
            // (ต่อจากโค้ดเดิม)
            String(item.tambon || ''), String(item.contract || ''), String(item.year || ''),
            String(item.projectName || ''), String(item.proposerName || ''),
            String(item.count || '0'), formatDate(item.firstDueDate),
            String(item.totalExpected || '0.00'), String(item.totalReturned || '0.00')
        ]);
    });

    // ใช้ PapaParse เพื่อสร้าง CSV string
    const csv = Papa.unparse(dataForExport);

    // สร้าง Blob จาก CSV string
    // เพิ่ม BOM (Byte Order Mark) เพื่อให้ Excel เปิดไฟล์ภาษาไทยได้ถูกต้อง
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) { // ตรวจสอบว่าเบราว์เซอร์รองรับ attribute 'download' หรือไม่
        const url = URL.createObjectURL(blob);
        const fileName = `ข้อมูลสัญญา_${new Date().toISOString().slice(0, 10)}.csv`;
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    // ตรวจสอบสถานะการ Login จาก Session Storage
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const userName = sessionStorage.getItem('userName');

    if (isLoggedIn && userName) {
        showMainApp(userName);
    } else {
        showLoginPage();
    }

    // ตั้งค่า Date Picker
    $('.form-control[type="text"]').datepicker({
        format: 'dd/mm/yyyy',
        language: 'th',
        autoclose: true,
        todayHighlight: true,
        orientation: 'bottom'
    });

    // กำหนด Event Listener สำหรับปุ่มต่างๆ
    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    searchButton.addEventListener('click', handleSearch);
    searchInTableInput.addEventListener('input', filterAndRenderTable);
    exportButton.addEventListener('click', exportTableToExcel);

    // เพิ่มการดักจับการกด Enter ในช่อง password เพื่อ Login
    passwordInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // ป้องกันการ submit form แบบปกติ
            handleLogin();
        }
    });
});
