document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // 1. การตั้งค่า และตัวแปรสถานะ (State Variables)
    // =================================================================
    
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZceIHi5hcr_J-uV_HBVQXX8Z9NCZOiygswERJzkxb0iZUhm0dvSvj73p7khB8u-g1Kvk-_hZikgpb/pub?gid=0&single=true&output=csv';

    const yearFilter = document.getElementById('year-filter' );
    const dataContainer = document.getElementById('data-container');
    
    let allData = [];
    let currentSort = { key: null, direction: 'asc' };

    // =================================================================
    // 2. ฟังก์ชันเสริม (Helper Functions)
    // =================================================================

    function formatNumberWithCommas(num) {
        if (num === null || num === undefined || num === '') return '';
        const numStr = String(num).replace(/,/g, '');
        if (isNaN(parseFloat(numStr))) return num;
        // ถ้าเป็นตัวเลขทศนิยม ให้แสดงทศนิยม 2 ตำแหน่ง
        if (numStr.includes('.')) {
            return parseFloat(numStr).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return parseFloat(numStr).toLocaleString('en-US');
    }

    function parseNumber(str) {
        if (typeof str !== 'string') return parseFloat(str) || 0;
        return parseFloat(str.replace(/,/g, '')) || 0;
    }

    // =================================================================
    // 3. การดึงและประมวลผลข้อมูล (Data Fetching & Processing)
    // =================================================================

    dataContainer.innerHTML = '<p>กำลังโหลดข้อมูลจาก Google Sheet...</p>';

    Papa.parse(googleSheetUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                allData = results.data;
                populateYearFilter(allData);
                dataContainer.innerHTML = '<p>กรุณาเลือกปีงบประมาณเพื่อแสดงข้อมูล</p>';
            } else {
                dataContainer.innerHTML = '<p style="color: red;">ไม่พบข้อมูลในไฟล์ Google Sheet</p>';
            }
        },
        error: function(error) {
            console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
            dataContainer.innerHTML = '<p style="color: red;">ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบ URL</p>';
        }
    });

    // =================================================================
    // 4. ฟังก์ชันจัดการหน้าเว็บ (UI Functions)
    // =================================================================

    function populateYearFilter(data) {
        const years = [...new Set(data.map(row => row.ปีงบ))].sort((a, b) => b - a);
        years.forEach(year => {
            if (year) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            }
        });
    }

    function renderTable(dataToRender) {
        dataContainer.innerHTML = '';

        if (!dataToRender || dataToRender.length === 0) {
            dataContainer.innerHTML = '<p>ไม่พบข้อมูลสำหรับปีที่เลือก</p>';
            return;
        }

        const table = document.createElement('table');
        
        const tableHead = `
            <thead>
                <tr>
                    <th class="sortable" data-key="จังหวัด" rowspan = "2">จังหวัด</th>
                    <th class="sortable" data-key="สตรีที่มีอายุ 15 ปีขึ้นไป" rowspan = "2">สตรีที่มีอายุ 15 ปีขึ้นไป</th>
                    <th colspan = "4">ข้อมูลจำนวนสมาชิกกองทุนพัฒนาบทบาทสตรี (คน)</th>
                    <th colspan = "5">การดำเนินงาน</th>
                </tr>

                <tr>
                    <th class="sortable" data-key="ฐานข้อมูล สมาชิก ณ 1 ต.ค.">ฐานข้อมูล สมาชิก ณ 1 ต.ค.</th>
                    <th>คิดเป็นร้อยละ</th>
                    <th class="sortable" data-key="ฐานข้อมูล สมาชิก ณ 30 ก.ย.">ฐานข้อมูล สมาชิก ณ 30 ก.ย./ปัจจุบัน</th>
                    <th>คิดเป็นร้อยละ</th>
                    <th class="sortable" data-key="เป้าหมายปี(คน)">เป้าหมายปี(คน)</th>
                    <th class="sortable" data-key="จำนวนสมาชิกที่เพิ่มขึ้น">จำนวนสมาชิกที่เพิ่มขึ้น</th>
                    <th>คิดเป็นร้อยละ</th>
                </tr>
            </thead>
        `;

        const tableBody = `
            <tbody>
                ${dataToRender.map(row => `
                    <tr>
                        <td>${row.จังหวัด || ''}</td>
                        <td>${formatNumberWithCommas(row['สตรีที่มีอายุ 15 ปีขึ้นไป'])}</td>
                        <td>${formatNumberWithCommas(row['ฐานข้อมูล สมาชิก ณ 1 ต.ค.'])}</td>
                        <td>${row['คิดเป็นร้อยละ'] || ''}</td>
                        <td>${formatNumberWithCommas(row['ฐานข้อมูล สมาชิก ณ 30 ก.ย.'])}</td>
                        <td>${row['คิดเป็นร้อยละ_1'] || ''}</td>
                        <td>${formatNumberWithCommas(row['เป้าหมายปี(คน)'])}</td>
                        <td>${formatNumberWithCommas(row['จำนวนสมาชิกที่เพิ่มขึ้น'])}</td>
                        <td>${row['คิดเป็นร้อยละ_2'] || ''}</td> 
                    </tr>
                `).join('')}
            </tbody>
        `;

        // *** จุดแก้ไขสำคัญ: คำนวณผลรวมและเปอร์เซ็นต์ใหม่ทั้งหมด ***
        const totals = dataToRender.reduce((acc, row) => {
            acc.womenOver15 += parseNumber(row['สตรีที่มีอายุ 15 ปีขึ้นไป']);      // คอลัมน์ D
            acc.baseOct += parseNumber(row['ฐานข้อมูล สมาชิก ณ 1 ต.ค.']);          // คอลัมน์ E
            acc.baseSep += parseNumber(row['ฐานข้อมูล สมาชิก ณ 30 ก.ย.']);          // คอลัมน์ G
            acc.target += parseNumber(row['เป้าหมายปี(คน)']);                      // คอลัมน์ I
            acc.membersAdded += parseNumber(row['จำนวนสมาชิกที่เพิ่มขึ้น']);        // คอลัมน์ J
            return acc;
        }, { womenOver15: 0, baseOct: 0, baseSep: 0, target: 0, membersAdded: 0 });

        // คำนวณเปอร์เซ็นต์รวมตามสูตร
        // (ใช้ toFixed(2) เพื่อปัดเศษทศนิยม 2 ตำแหน่ง)
        const totalPercent1 = totals.womenOver15 > 0 ? (totals.baseOct * 100 / totals.womenOver15).toFixed(2) : 0;
        const totalPercent2 = totals.womenOver15 > 0 ? (totals.baseSep * 100 / totals.womenOver15).toFixed(2) : 0;
        const totalPercent3 = totals.target > 0 ? (totals.membersAdded * 100 / totals.target).toFixed(2) : 0;

        const tableFoot = `
            <tfoot>
                <tr style="font-weight: bold; background-color: rgba(255, 195, 160, 0.3);">
                    <td>รวมทั้งหมด</td>
                    <td>${formatNumberWithCommas(totals.womenOver15)}</td>
                    <td>${formatNumberWithCommas(totals.baseOct)}</td>
                    <td>${totalPercent1}</td>
                    <td>${formatNumberWithCommas(totals.baseSep)}</td>
                    <td>${totalPercent2}</td>
                    <td>${formatNumberWithCommas(totals.target)}</td>
                    <td>${formatNumberWithCommas(totals.membersAdded)}</td>
                    <td>${totalPercent3}</td>
                </tr>
            </tfoot>
        `;

        table.innerHTML = tableHead + tableBody + tableFoot;
        dataContainer.appendChild(table);

        table.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                handleSort(th.dataset.key);
            });
        });
    }

    function displayData() {
        const selectedYear = yearFilter.value;
        if (!selectedYear) {
            dataContainer.innerHTML = '<p>กรุณาเลือกปีงบประมาณเพื่อแสดงข้อมูล</p>';
            return;
        }

        let filteredData = allData.filter(row => row.ปีงบ && row.ปีงบ.trim() == selectedYear.trim());

        if (currentSort.key) {
            filteredData.sort((a, b) => {
                const valA = a[currentSort.key];
                const valB = b[currentSort.key];
                const isNumeric = !isNaN(parseNumber(valA)) && !isNaN(parseNumber(valB));
                
                let comparison = 0;
                if (isNumeric) {
                    comparison = parseNumber(valA) - parseNumber(valB);
                } else {
                    comparison = String(valA).localeCompare(String(valB), 'th');
                }
                return currentSort.direction === 'asc' ? comparison : -comparison;
            });
        }
        renderTable(filteredData);
    }

    function handleSort(key) {
        if (currentSort.key === key) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.key = key;
            currentSort.direction = 'asc';
        }
        displayData();
    }

    // =================================================================
    // 5. การกำหนด Event Listeners
    // =================================================================

    yearFilter.addEventListener('change', displayData);
});
