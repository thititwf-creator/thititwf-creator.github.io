// --- ค่าคงที่และ URL ของ Google Sheet (ที่เผยแพร่เป็น CSV) ---
const DATA_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWpaZQQWx8Yob4W2SEOeKKiWQpOjN3--qiRHF35DW-lDaDWLS1FJOJGMpd-BT8TN36VBfX28Jhog9m/pub?gid=1184749988&single=true&output=csv";
const USER_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlJk96U5j7X2xFIdJjebn5jISoEC6XKF8IcZz20dQf8SmE46NpKshDRN3if3Wb54MNAn5ZJj2YLwDd/pub?gid=0&single=true&output=csv";

// --- การตั้งค่าสำหรับบันทึก Log ผ่าน Google Form ---
const LOG_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/SOME_LONG_ID/formResponse";
const LOG_FORM_USER_ENTRY_ID = "entry.123456789";

// --- Element Variables ---
const loginPage = document.getElementById('login-page' );
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

let allContractsData = [];
let groupedContractsData = [];
let filteredContractsData = [];

// --- Functions ---

async function fetchCsvData(url) {
    try {
        const response = await fetch(url, { cache: 'no-store' });
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

async function logUserActivity(userName) {
    if (LOG_FORM_ACTION_URL.includes("SOME_LONG_ID") || LOG_FORM_USER_ENTRY_ID.includes("entry.123456789")) {
        console.warn("Log function is not configured. Please set LOG_FORM_ACTION_URL and LOG_FORM_USER_ENTRY_ID.");
        return;
    }
    const formData = new FormData();
    formData.append(LOG_FORM_USER_ENTRY_ID, userName);
    try {
        await fetch(LOG_FORM_ACTION_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors'
        });
        console.log("Log submitted for user:", userName);
    } catch (error) {
        console.error("Error submitting log:", error);
    }
}

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
    if (user && user.name) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userName', user.name);
        await logUserActivity(user.name);
        showMainApp(user.name);
    } else {
        errorMessageDiv.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        errorMessageDiv.style.display = 'block';
        loginButton.disabled = false;
        loginText.style.display = 'inline-block';
        loginSpinner.style.display = 'none';
    }
}

function handleLogout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userName');
    showLoginPage();
}

function showMainApp(userName) {
    document.body.classList.remove('login-body');
    loginPage.style.display = 'none';
    mainApp.style.display = 'block';
    userNameDisplay.textContent = userName;
    initializeMainApp();
}

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

// *** จุดแก้ไข ***
async function initializeMainApp() {
    loadingSpinner.style.display = 'block';
    allContractsData = await fetchCsvData(DATA_CSV_URL);
    loadingSpinner.style.display = 'none';
    if (allContractsData.length > 0) {
        const notes = {
            note1: allContractsData[0].note1 || '',
            note2: allContractsData[0].note2 || ''
        };
        displayNotes(notes);
        // แก้ไขการอ้างอิงชื่อคอลัมน์ที่นี่
        const provinces = [...new Set(allContractsData.map(row => row.province).filter(p => p))].sort();
        populateProvinces(provinces);
    } else {
        showError({ message: "ไม่พบข้อมูลสัญญาในระบบ" });
    }
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
    return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC'
    }).format(date);
}

function handleSearch() {
    const startDateString = startDateInput.value;
    const endDateString = endDateInput.value;

    if (!provinceSelect.value || !startDateString || !endDateString) {
        showError({ message: "กรุณาเลือกจังหวัดและกรอกช่วงวันที่ให้ครบถ้วน" });
        return;
    }

    const parseDMY = (dateString) => {
        if (!dateString) return null;
        const parts = dateString.split('/');
        if (parts.length !== 3) return null;
        const year = parseInt(parts[2], 10);
        const finalYear = year > 2500 ? year - 543 : year;
        return new Date(finalYear, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    };

    const start = parseDMY(startDateString);
    const end = parseDMY(endDateString);

    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
        showError({ message: "รูปแบบวันที่ไม่ถูกต้อง กรุณาใช้ DD/MM/YYYY" });
        return;
    }
    
    end.setHours(23, 59, 59, 999);

    resultsTable.style.display = 'none';
    summaryBox.style.display = 'none';
    errorAlert.style.display = 'none';
    searchAndExportContainer.style.display = 'none';
    searchInTableInput.value = '';
    loadingSpinner.style.display = 'block';

    const filteredRawData = allContractsData.filter(row => {
        const rowProvince = row.province;
        const dueDateValue = row.dueDate; 
        if (!rowProvince || !dueDateValue) return false;
        
        const dueDate = parseDMY(dueDateValue);

        if (!dueDate || isNaN(dueDate.getTime())) return false;
        
        const isProvinceMatch = (provinceSelect.value === "ทุกจังหวัด" || rowProvince === provinceSelect.value);
        const isDateMatch = (dueDate >= start && dueDate <= end);
        return isProvinceMatch && isDateMatch;
    });

    const groupedByContract = filteredRawData.reduce((acc, row) => {
        const contractId = row.contract;
        const dueDate = parseDMY(row.dueDate);

        if (!dueDate) return acc;

        if (!acc[contractId]) {
            acc[contractId] = {
                province: row.province,
                amphoe: row.amphoe,
                tambon: row.tambon,
                contract: contractId,
                year: row.year,
                projectName: row.projectName,
                proposerName: row.proposerName,
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
        acc[contractId].totalExpected += parseFloat(row.totalExpected || 0);
        acc[contractId].totalReturned += parseFloat(row.totalReturned || 0);
        return acc;
    }, {});

    groupedContractsData = Object.values(groupedByContract).map(item => {
        item.firstDueDate = item.firstDueDate.toISOString().split('T')[0];
        return item;
    });

    loadingSpinner.style.display = 'none';
    filterAndRenderTable();
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
            String(item.tambon || ''), String(item.contract || ''), String(item.year || ''),
            String(item.projectName || ''), String(item.proposerName || ''),
            String(item.count || '0'), formatDate(item.firstDueDate),
            String(item.totalExpected || '0.00'), String(item.totalReturned || '0.00')
        ]);
    });
    const csv = Papa.unparse(dataForExport);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const fileName = `ข้อมูลสัญญา_${new Date().toISOString().slice(0,10)}.csv`;
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const userName = sessionStorage.getItem('userName');

    if (isLoggedIn && userName) {
        showMainApp(userName);
    } else {
        showLoginPage();
    }

    $('#start-date, #end-date').datepicker({
        format: 'dd/mm/yyyy',
        autoclose: true,
        todayHighlight: true,
        orientation: 'bottom'
    });

    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    searchButton.addEventListener('click', handleSearch);
    searchInTableInput.addEventListener('input', filterAndRenderTable);
    exportButton.addEventListener('click', exportTableToExcel);

    passwordInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleLogin();
        }
    });
});
