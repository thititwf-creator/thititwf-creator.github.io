// --- 1. การตั้งค่า API Endpoint ---
// **สำคัญ:** กรุณาแทนที่ YOUR_GAS_WEB_APP_URL_HERE ด้วย URL ของ Google Apps Script Web App ที่คุณ Deploy แล้ว
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzQGpWU-Fc3ee__fZYNhmqJ-8UE-OZsga853a4O7cBsS9neyZJVHglBTsZ-ztNu6aZ9gw/exec"; 

// --- 2. ฟังก์ชันช่วยเหลือสำหรับการเรียก API ---
async function fetchApi(action, payload = {}) {
    if (GAS_API_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
        alert("กรุณาตั้งค่า GAS_API_URL ในไฟล์ due-dep-sys.js ก่อนใช้งาน");
        return { success: false, message: "API URL ไม่ถูกต้อง" };
    }

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // สำคัญสำหรับ GAS
            },
            body: JSON.stringify({ action, ...payload }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("API Fetch Error:", error);
        return { success: false, message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error.message}` };
    }
}

// --- 3. การจัดการ Session/UI ---
const SESSION_KEY = 'dueDepSysUser';

function saveSession(userName) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ isLoggedIn: true, userName: userName }));
}

function getSession() {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : { isLoggedIn: false, userName: null };
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

function updateUI(isLoggedIn, userName = null) {
    const loginView = document.getElementById('login-view');
    const mainAppView = document.getElementById('main-app-view');
    const body = document.body;

    if (isLoggedIn) {
        loginView.style.display = 'none';
        mainAppView.style.display = 'block';
        body.classList.remove('login-bg');
        body.style.background = 'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)';
        document.getElementById('user-name-display').textContent = userName;
    } else {
        loginView.style.display = 'block';
        mainAppView.style.display = 'none';
        body.classList.add('login-bg');
        body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// --- 4. ฟังก์ชันจัดการการล็อกอิน ---
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('login-button');
    const loginText = document.getElementById('login-text');
    const loginSpinner = document.getElementById('login-spinner');
    const errorMessageDiv = document.getElementById('error-message');

    if (!username || !password) {
        errorMessageDiv.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วน';
        errorMessageDiv.style.display = 'block';
        return;
    }

    // แสดง Spinner
    loginButton.disabled = true;
    loginText.style.display = 'none';
    loginSpinner.style.display = 'inline-block';
    errorMessageDiv.style.display = 'none';

    const result = await fetchApi('login', { username, password });

    // ซ่อน Spinner
    loginButton.disabled = false;
    loginText.style.display = 'inline';
    loginSpinner.style.display = 'none';

    if (result.success) {
        saveSession(result.userName);
        updateUI(true, result.userName);
        // โหลดข้อมูลเริ่มต้นสำหรับหน้าหลัก
        loadInitialData();
    } else {
        errorMessageDiv.textContent = result.message;
        errorMessageDiv.style.display = 'block';
    }
}

// --- 5. ฟังก์ชันจัดการการออกจากระบบ ---
function handleLogout() {
    clearSession();
    updateUI(false);
    // ไม่จำเป็นต้องเรียก API 'logout' เพราะการจัดการ session อยู่ที่ client แล้ว
    // แต่ถ้าต้องการให้ GAS บันทึก Log การ Logout ก็สามารถเพิ่มได้
    // fetchApi('logout'); 
}

// --- 6. ฟังก์ชันโหลดข้อมูลเริ่มต้น (จังหวัดและ Note) ---
async function loadInitialData() {
    // โหลดจังหวัด
    const provinceSelect = document.getElementById('province-select');
    provinceSelect.innerHTML = '<option selected>กำลังโหลดรายชื่อจังหวัด...</option>';
    const provinceResult = await fetchApi('getProvinces');

    if (provinceResult.success) {
        provinceSelect.innerHTML = '<option value="ทุกจังหวัด">ทุกจังหวัด</option>';
        provinceResult.provinces.forEach(province => {
            const option = document.createElement('option');
            option.value = province;
            option.textContent = province;
            provinceSelect.appendChild(option);
        });
    } else {
        provinceSelect.innerHTML = `<option selected>${provinceResult.message}</option>`;
    }

    // โหลด Note
    const noteContainer = document.getElementById('note-container');
    const noteText = document.getElementById('note-text');
    const noteResult = await fetchApi('getNoteData');

    if (noteResult.success && noteResult.notes.note1) {
        noteText.textContent = noteResult.notes.note1;
        noteContainer.style.display = 'inline-block';
    } else {
        noteContainer.style.display = 'none';
    }
}

// --- 7. ฟังก์ชันจัดการการค้นหาข้อมูล ---
async function handleSearch() {
    const province = document.getElementById('province-select').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const searchButton = document.getElementById('search-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorAlert = document.getElementById('error-alert');
    const resultsTableBody = document.querySelector('#results-table tbody');
    const summaryBox = document.getElementById('summary-box');
    const searchExportContainer = document.getElementById('search-and-export-container');

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!startDate || !endDate || province === 'กำลังโหลดรายชื่อจังหวัด...') {
        errorAlert.textContent = 'กรุณาเลือกจังหวัดและระบุช่วงวันที่ให้ครบถ้วน';
        errorAlert.style.display = 'block';
        return;
    }

    // แสดง Loading
    errorAlert.style.display = 'none';
    summaryBox.style.display = 'none';
    searchExportContainer.style.display = 'none';
    document.getElementById('results-table').style.display = 'none';
    resultsTableBody.innerHTML = '';
    searchButton.disabled = true;
    loadingSpinner.style.display = 'block';

    const params = {
        province: province,
        startDate: startDate,
        endDate: endDate
    };

    const result = await fetchApi('getFilteredContracts', params);

    // ซ่อน Loading
    searchButton.disabled = false;
    loadingSpinner.style.display = 'none';

    if (result.success) {
        displayResults(result.data);
    } else {
        errorAlert.textContent = result.message;
        errorAlert.style.display = 'block';
    }
}

// --- 8. ฟังก์ชันแสดงผลลัพธ์และสรุป ---
function displayResults(data) {
    const resultsTable = document.getElementById('results-table');
    const resultsTableBody = document.querySelector('#results-table tbody');
    const summaryBox = document.getElementById('summary-box');
    const searchExportContainer = document.getElementById('search-and-export-container');

    resultsTableBody.innerHTML = '';

    if (data.length === 0) {
        document.getElementById('error-alert').textContent = 'ไม่พบข้อมูลตามเงื่อนไขที่ระบุ';
        document.getElementById('error-alert').style.display = 'block';
        resultsTable.style.display = 'none';
        summaryBox.style.display = 'none';
        searchExportContainer.style.display = 'none';
        return;
    }

    let totalExpected = 0;
    let totalReturned = 0;

    data.forEach((item, index) => {
        const row = resultsTableBody.insertRow();
        row.insertCell().textContent = index + 1;
        row.insertCell().textContent = item.province;
        row.insertCell().textContent = item.amphoe;
        row.insertCell().textContent = item.tambon;
        row.insertCell().textContent = item.contract;
        row.insertCell().textContent = item.year;
        row.insertCell().textContent = item.projectName;
        row.insertCell().textContent = item.proposerName;
        row.insertCell().textContent = formatDate(item.firstDueDate); // แปลงวันที่
        row.insertCell().textContent = formatCurrency(item.totalExpected);
        row.insertCell().textContent = formatCurrency(item.totalReturned);

        totalExpected += item.totalExpected;
        totalReturned += item.totalReturned;
    });

    // อัปเดต Summary Box
    const percentage = totalExpected > 0 ? (totalReturned / totalExpected) * 100 : 0;
    document.getElementById('summary-contracts').textContent = data.length.toLocaleString();
    document.getElementById('summary-expected').textContent = formatCurrency(totalExpected);
    document.getElementById('summary-returned').textContent = formatCurrency(totalReturned);
    document.getElementById('summary-percentage').textContent = `${percentage.toFixed(2)} %`;

    resultsTable.style.display = 'table';
    summaryBox.style.display = 'flex';
    searchExportContainer.style.display = 'flex';
}

// --- 9. ฟังก์ชันช่วยเหลือด้านการจัดรูปแบบ ---
function formatCurrency(number) {
    return parseFloat(number).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
    // dateString มาในรูปแบบ YYYY-MM-DD
    const [year, month, day] = dateString.split('-');
    // แปลงปี พ.ศ.
    const thaiYear = parseInt(year) + 543;
    return `${day}/${month}/${thaiYear}`;
}

// --- 10. ฟังก์ชันจัดการการค้นหาในตาราง (Filter) ---
function filterTable() {
    const input = document.getElementById('search-in-table');
    const filter = input.value.toUpperCase();
    const table = document.getElementById('results-table');
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) { // เริ่มที่ 1 เพื่อข้าม header
        let rowText = '';
        const td = tr[i].getElementsByTagName('td');
        for (let j = 0; j < td.length; j++) {
            if (td[j]) {
                rowText += td[j].textContent || td[j].innerText;
            }
        }
        if (rowText.toUpperCase().indexOf(filter) > -1) {
            tr[i].style.display = "";
        } else {
            tr[i].style.display = "none";
        }
    }
}

// --- 11. ฟังก์ชันจัดการการส่งออกข้อมูล (Export to CSV/Excel) ---
function exportTableToCSV() {
    const table = document.getElementById('results-table');
    let csv = [];
    
    // Header
    const headerRow = table.querySelector('thead tr');
    let row = [];
    headerRow.querySelectorAll('th').forEach(th => {
        row.push(th.innerText);
    });
    csv.push(row.join(','));

    // Rows
    table.querySelectorAll('tbody tr').forEach(tr => {
        // ตรวจสอบเฉพาะแถวที่แสดงอยู่ (ไม่ได้ถูก filter ออก)
        if (tr.style.display !== 'none') {
            let row = [];
            tr.querySelectorAll('td').forEach(td => {
                // ห่อหุ้มด้วยเครื่องหมายคำพูดเพื่อจัดการกับข้อมูลที่มีเครื่องหมายจุลภาค
                row.push(`"${td.innerText.replace(/"/g, '""')}"`);
            });
            csv.push(row.join(','));
        }
    });

    // Download CSV
    const csvFile = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    downloadLink.download = `ข้อมูลสัญญา_${new Date().toISOString().slice(0,10)}.csv`;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    alert("ส่งออกข้อมูลเป็นไฟล์ CSV เรียบร้อยแล้ว");
}


// --- 12. Event Listeners และการเริ่มต้น ---
document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบ Session เมื่อโหลดหน้า
    const session = getSession();
    updateUI(session.isLoggedIn, session.userName);
    if (session.isLoggedIn) {
        loadInitialData();
    }

    // Event Listener สำหรับ Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Event Listener สำหรับ Logout
    document.getElementById('logout-button').addEventListener('click', handleLogout);

    // Event Listener สำหรับ Search
    document.getElementById('search-button').addEventListener('click', handleSearch);

    // Event Listener สำหรับ Filter ในตาราง
    document.getElementById('search-in-table').addEventListener('keyup', filterTable);

    // Event Listener สำหรับ Export
    document.getElementById('export-button').addEventListener('click', exportTableToCSV);

    // ตั้งค่า Datepicker
    $('#start-date, #end-date').datepicker({
        format: "dd/mm/yyyy",
        language: "th",
        thaiyear: true,
        autoclose: true,
        todayHighlight: true
    });
});
