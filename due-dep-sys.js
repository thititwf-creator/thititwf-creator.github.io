document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables & State ---
    // ใส่ URL ของ Web App ที่คุณคัดลอกมาใหม่ตรงนี้!
    const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxMr_WkWeaNwFuJC4YlOcdK4qLCEQodT__GITOFn3_vLXdknFUxejkJSefy29-JiEZCXA/exec';

    // --- DOM Elements (เหมือนเดิม ) ---
    const loginSection = document.getElementById('login-section');
    const mainSection = document.getElementById('main-section');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginErrorMsg = document.getElementById('login-error-message');
    const loginButton = document.getElementById('login-button');
    const loginSpinner = document.getElementById('login-spinner');
    const loginText = document.getElementById('login-text');
    const logoutButton = document.getElementById('logout-button');
    const userNameDisplay = document.getElementById('user-name-display');
    
    const provinceSelect = document.getElementById('province-select');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const searchButton = document.getElementById('search-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorAlert = document.getElementById('error-alert');
    const summaryBox = document.getElementById('summary-box');
    const searchInTableInput = document.getElementById('search-in-table');
    const resultsTable = document.getElementById('results-table');
    const resultsBody = document.getElementById('results-body');
    const searchAndExportContainer = document.getElementById('search-and-export-container');

    // --- Functions ---

    // ฟังก์ชันสำหรับเรียก API ของ Google Apps Script
    async function callGasApi(action, params = {}) {
        const url = new URL(GAS_API_URL);
        url.searchParams.append('action', action);
        for (const key in params) {
            url.searchParams.append(key, params[key]);
        }

        try {
            const response = await fetch(url, { method: 'GET' });
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'An unknown error occurred in the API.');
            }
            return result.data;
        } catch (error) {
            console.error(`Failed to call GAS API action "${action}":`, error);
            showError(`เกิดข้อผิดพลาดในการสื่อสารกับเซิร์ฟเวอร์: ${error.message}`);
            throw error; // Re-throw to stop further execution
        }
    }

    // Show/Hide main sections
    function showLogin() {
        loginSection.style.display = 'block';
        mainSection.style.display = 'none';
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    function showMainApp(userName) {
        loginSection.style.display = 'none';
        mainSection.style.display = 'block';
        document.body.style.background = 'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)';
        userNameDisplay.textContent = userName;
        initializeMainApp();
    }
    
    function showError(message) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        loadingSpinner.style.display = 'none';
    }

    // --- Login/Logout Logic ---
    async function handleLogin(event) {
        event.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        loginButton.disabled = true;
        loginText.style.display = 'none';
        loginSpinner.style.display = 'inline-block';
        loginErrorMsg.style.display = 'none';

        try {
            const result = await callGasApi('login', { username, password });
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userName', result.name);
            showMainApp(result.name);
        } catch (error) {
            loginErrorMsg.textContent = error.message;
            loginErrorMsg.style.display = 'block';
        } finally {
            loginButton.disabled = false;
            loginText.style.display = 'inline-block';
            loginSpinner.style.display = 'none';
        }
    }

    function handleLogout() {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userName');
        usernameInput.value = '';
        passwordInput.value = '';
        loginErrorMsg.style.display = 'none';
        showLogin();
    }

    // --- Main App Logic ---
    async function initializeMainApp() {
        $('.form-control[type="text"]').datepicker({
            format: 'dd/mm/yyyy', language: 'th',
            autoclose: true, todayHighlight: true, orientation: 'bottom'
        });

        try {
            const provinces = await callGasApi('getProvinces');
            provinceSelect.innerHTML = '<option value="ทุกจังหวัด">-- ทุกจังหวัด --</option>';
            provinces.forEach(province => {
                const option = document.createElement('option');
                option.value = province;
                option.textContent = province;
                provinceSelect.appendChild(option);
            });
        } catch (error) {
            // Error is already shown by callGasApi
        }
    }
    
    function convertBeToAd(beDate) {
        if (!beDate || beDate.split('/').length !== 3) return null;
        const [day, month, beYearStr] = beDate.split('/');
        const beYear = parseInt(beYearStr, 10);
        if (isNaN(beYear)) return null;
        const adYear = beYear - 543;
        return `${adYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    async function handleSearch() {
        const startDateAd = convertBeToAd(startDateInput.value);
        const endDateAd = convertBeToAd(endDateInput.value);

        if (!provinceSelect.value || !startDateAd || !endDateAd) {
            showError("กรุณาเลือกจังหวัดและกรอกช่วงวันที่ให้ครบถ้วน");
            return;
        }
        
        errorAlert.style.display = 'none';
        loadingSpinner.style.display = 'block';
        resultsTable.style.display = 'none';
        summaryBox.style.display = 'none';
        searchAndExportContainer.style.display = 'none';

        try {
            const params = {
                province: provinceSelect.value,
                startDate: startDateAd,
                endDate: endDateAd
            };
            const contracts = await callGasApi('getContracts', params);
            renderResults(contracts);
        } catch (error) {
            // Error is already shown by callGasApi
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    function renderResults(data) {
        // ฟังก์ชันนี้เหมือนเดิม ไม่ต้องแก้ไข
        resultsBody.innerHTML = '';
        if (!data || data.length === 0) {
            resultsTable.style.display = 'table';
            const row = resultsBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 12;
            cell.className = 'text-center text-muted p-3';
            cell.textContent = 'ไม่พบข้อมูลสัญญาตามเงื่อนไขที่กำหนด';
            summaryBox.style.display = 'none';
            searchAndExportContainer.style.display = 'none';
            return;
        }

        let grandTotalExpected = 0;
        let grandTotalReturned = 0;

        data.forEach((item, index) => {
            grandTotalExpected += item.totalExpected;
            grandTotalReturned += item.totalReturned;
            const row = resultsBody.insertRow();
            row.innerHTML = `
                <th scope="row">${index + 1}</th>
                <td>${item.province || ''}</td><td>${item.amphoe || ''}</td><td>${item.tambon || ''}</td>
                <td>${item.contract}</td><td>${item.year}</td><td>${item.projectName}</td>
                <td>${item.proposerName}</td><td style="text-align: right;">${item.count}</td>
                <td>${new Date(item.firstDueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</td>
                <td style="text-align: right;">${item.totalExpected.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="text-align: right;">${item.totalReturned.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            `;
        });
        
        const percentage = grandTotalExpected > 0 ? (grandTotalReturned * 100) / grandTotalExpected : 0;
        summaryBox.innerHTML = `
            <div class="summary-item"><div class="label">จำนวนสัญญา</div><div class="value">${data.length}</div></div>
            <div class="summary-item"><div class="label">รวมเงินต้นคาดว่าจะได้</div><div class="value">${grandTotalExpected.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
            <div class="summary-item"><div class="label">รวมเงินต้นรับคืน</div><div class="value">${grandTotalReturned.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
            <div class="summary-item"><div class="label">คิดเป็นร้อยละ</div><div class="value highlight">${percentage.toFixed(2)} %</div></div>
        `;
        
        resultsTable.querySelector('thead').innerHTML = `
            <tr><th>ลำดับ</th><th>จังหวัด</th><th>อำเภอ</th><th>ตำบล</th><th>เลขที่สัญญา</th><th>ปีงบประมาณ</th><th>ชื่อโครงการ</th><th>ชื่อผู้เสนอ</th><th>จำนวนงวด</th><th>กำหนดชำระ</th><th>เงินต้นคาดว่าจะได้</th><th>เงินต้นรับคืน</th></tr>
        `;

        summaryBox.style.display = 'flex';
        resultsTable.style.display = 'table';
        searchAndExportContainer.style.display = 'flex';
    }

    // --- Initial Load ---
    function init() {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        const userName = sessionStorage.getItem('userName');

        if (isLoggedIn && userName) {
            showMainApp(userName);
        } else {
            showLogin();
        }

        loginForm.addEventListener('submit', handleLogin);
        logoutButton.addEventListener('click', handleLogout);
        searchButton.addEventListener('click', handleSearch);
    }

    init();
});
