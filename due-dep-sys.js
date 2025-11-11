document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables & State ---
    let allContractsData = [];
    let allUsers = [];

    // --- DOM Elements ---
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
    const resultsContainer = document.getElementById('results-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorAlert = document.getElementById('error-alert');
    const summaryBox = document.getElementById('summary-box');
    const searchInTableInput = document.getElementById('search-in-table');
    const resultsTable = document.getElementById('results-table');
    const resultsBody = document.getElementById('results-body');
    const searchAndExportContainer = document.getElementById('search-and-export-container');

    // --- Functions ---

    // Function to fetch data from JSON files
    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to fetch data from ${url}:`, error);
            showError(`ไม่สามารถโหลดข้อมูลสำคัญได้: ${error.message}`);
            return null;
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
    function handleLogin(event) {
        event.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        loginButton.disabled = true;
        loginText.style.display = 'none';
        loginSpinner.style.display = 'inline-block';
        loginErrorMsg.style.display = 'none';

        const user = allUsers.find(u => u.username === username && u.password.toString() === password);

        setTimeout(() => { // Simulate network delay
            if (user) {
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userName', user.name);
                showMainApp(user.name);
            } else {
                loginErrorMsg.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
                loginErrorMsg.style.display = 'block';
            }
            loginButton.disabled = false;
            loginText.style.display = 'inline-block';
            loginSpinner.style.display = 'none';
        }, 500);
    }

    function handleLogout() {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userName');
        // Reset UI
        usernameInput.value = '';
        passwordInput.value = '';
        loginErrorMsg.style.display = 'none';
        showLogin();
    }

    // --- Main App Logic ---
    function initializeMainApp() {
        // Initialize date pickers
        $('.form-control[type="text"]').datepicker({
            format: 'dd/mm/yyyy',
            language: 'th',
            autoclose: true,
            todayHighlight: true,
            orientation: 'bottom'
        });

        // Populate provinces
        const provinces = [...new Set(allContractsData.map(item => item.province).filter(p => p))].sort();
        provinceSelect.innerHTML = '<option value="ทุกจังหวัด">-- ทุกจังหวัด --</option>';
        provinces.forEach(province => {
            const option = document.createElement('option');
            option.value = province;
            option.textContent = province;
            provinceSelect.appendChild(option);
        });
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

    function handleSearch() {
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

        setTimeout(() => { // Simulate processing
            const params = {
                province: provinceSelect.value,
                startDate: new Date(startDateAd),
                endDate: new Date(endDateAd)
            };
            params.endDate.setHours(23, 59, 59, 999); // Include the whole end day

            const filtered = getFilteredContracts(params);
            renderResults(filtered);
            loadingSpinner.style.display = 'none';
        }, 500);
    }

    function getFilteredContracts(params) {
        const filteredData = allContractsData.filter(row => {
            const dueDate = new Date(row.dueDate);
            const isProvinceMatch = (params.province === "ทุกจังหวัด" || row.province === params.province);
            const isDateMatch = (dueDate >= params.startDate && dueDate <= params.endDate);
            return isProvinceMatch && isDateMatch;
        });

        // Grouping logic (same as your Apps Script)
        const groupedByContract = filteredData.reduce((acc, row) => {
            const contractId = row.contractId;
            if (!acc[contractId]) {
                acc[contractId] = {
                    province: row.province,
                    amphoe: row.amphoe,
                    tambon: row.tambon,
                    contract: contractId,
                    year: row.year,
                    projectName: row.projectName,
                    proposerName: row.proposerName,
                    firstDueDate: new Date(row.dueDate),
                    count: 0,
                    totalExpected: 0,
                    totalReturned: 0,
                };
            }
            if (new Date(row.dueDate) < acc[contractId].firstDueDate) {
                acc[contractId].firstDueDate = new Date(row.dueDate);
            }
            acc[contractId].count++;
            acc[contractId].totalExpected += parseFloat(row.expectedAmount || 0);
            acc[contractId].totalReturned += parseFloat(row.returnedAmount || 0);
            return acc;
        }, {});

        return Object.values(groupedByContract).map(item => {
            item.firstDueDate = item.firstDueDate.toISOString().split('T')[0];
            return item;
        });
    }

    function renderResults(data) {
        resultsBody.innerHTML = '';
        if (data.length === 0) {
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
                <td>${item.province || ''}</td>
                <td>${item.amphoe || ''}</td>
                <td>${item.tambon || ''}</td>
                <td>${item.contract}</td>
                <td>${item.year}</td>
                <td>${item.projectName}</td>
                <td>${item.proposerName}</td>
                <td style="text-align: right;">${item.count}</td>
                <td>${new Date(item.firstDueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                <td style="text-align: right;">${item.totalExpected.toFixed(2)}</td>
                <td style="text-align: right;">${item.totalReturned.toFixed(2)}</td>
            `;
        });
        
        // Update summary
        const percentage = grandTotalExpected > 0 ? (grandTotalReturned * 100) / grandTotalExpected : 0;
        summaryBox.innerHTML = `
            <div class="summary-item"><div class="label">จำนวนสัญญา</div><div class="value">${data.length}</div></div>
            <div class="summary-item"><div class="label">รวมเงินต้นคาดว่าจะได้</div><div class="value">${grandTotalExpected.toFixed(2)}</div></div>
            <div class="summary-item"><div class="label">รวมเงินต้นรับคืน</div><div class="value">${grandTotalReturned.toFixed(2)}</div></div>
            <div class="summary-item"><div class="label">คิดเป็นร้อยละ</div><div class="value highlight">${percentage.toFixed(2)} %</div></div>
        `;
        
        resultsTable.querySelector('thead').innerHTML = `
            <tr>
                <th>ลำดับ</th><th>จังหวัด</th><th>อำเภอ</th><th>ตำบล</th><th>เลขที่สัญญา</th>
                <th>ปีงบประมาณ</th><th>ชื่อโครงการ</th><th>ชื่อผู้เสนอ</th><th>จำนวนงวด</th>
                <th>กำหนดชำระ</th><th>เงินต้นคาดว่าจะได้</th><th>เงินต้นรับคืน</th>
            </tr>
        `;

        summaryBox.style.display = 'flex';
        resultsTable.style.display = 'table';
        searchAndExportContainer.style.display = 'flex';
    }


    // --- Initial Load ---
    async function init() {
        // Check session storage first
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        const userName = sessionStorage.getItem('userName');

        // Fetch data in parallel
        const [usersData, contractsData] = await Promise.all([
            fetchData('./data/users.json'),
            fetchData('./data/contracts.json')
        ]);

        if (!usersData || !contractsData) {
            showLogin(); // Show login but with an error state
            loginErrorMsg.textContent = 'ไม่สามารถโหลดข้อมูลพื้นฐานได้ กรุณาลองรีเฟรชหน้า';
            loginErrorMsg.style.display = 'block';
            loginButton.disabled = true;
            return;
        }
        
        allUsers = usersData;
        allContractsData = contractsData;

        if (isLoggedIn && userName) {
            showMainApp(userName);
        } else {
            showLogin();
        }

        // Attach event listeners
        loginForm.addEventListener('submit', handleLogin);
        logoutButton.addEventListener('click', handleLogout);
        searchButton.addEventListener('click', handleSearch);
    }

    init();
});
