document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // 1. การตั้งค่า และตัวแปรสถานะ (State Variables)
    // =================================================================
    
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZceIHi5hcr_J-uV_HBVQXX8Z9NCZOiygswERJzkxb0iZUhm0dvSvj73p7khB8u-g1Kvk-_hZikgpb/pub?gid=0&single=true&output=csv';

    const yearFilter = document.getElementById('year-filter' );
    const dataContainer = document.getElementById('data-container');
    
    let allData = [];
    let currentSort = { key: null, direction: 'asc' }; // *** ใหม่: ตัวแปรสำหรับเก็บสถานะการเรียงข้อมูล ***

    // =================================================================
    // 2. ฟังก์ชันเสริม (Helper Functions)
    // =================================================================

    /**
     * จัดรูปแบบตัวเลขให้มีเครื่องหมายจุลภาค (,)
     */
    function formatNumberWithCommas(num) {
        if (num === null || num === undefined || num === '') return '';
        const numStr = String(num).replace(/,/g, '');
        if (isNaN(parseFloat(numStr))) return num;
        return parseFloat(numStr).toLocaleString('en-US');
    }

    /**
     * *** ใหม่: แปลงข้อความตัวเลขกลับเป็นตัวเลขสำหรับคำนวณ ***
     * @param {string} str - ข้อความตัวเลข เช่น "1,234.56"
     * @returns {number} - ตัวเลขที่สามารถคำนวณได้
     */
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

    /**
     * *** อัปเดต: ฟังก์ชันแสดงผลข้อมูลหลัก ***
     * ตอนนี้จะรับข้อมูลที่กรองและเรียงลำดับแล้วมาแสดงผล
     */
    function renderTable(dataToRender) {
        dataContainer.innerHTML = '';

        if (!dataToRender || dataToRender.length === 0) {
            dataContainer.innerHTML = '<p>ไม่พบข้อมูลสำหรับปีที่เลือก</p>';
            return;
        }

        const table = document.createElement('table');
        
        // *** ใหม่: เพิ่ม data-key เพื่อใช้ในการเรียงข้อมูล และ class 'sortable' เพื่อเปลี่ยน cursor ***
        const tableHead = `
            <thead>
                <tr>
                    <th class="sortable" data-key="จังหวัด">จังหวัด</th>
                    <th class="sortable" data-key="สตรีที่มีอายุ 15 ปีขึ้นไป">สตรีที่มีอายุ 15 ปีขึ้นไป</th>
                    <th class="sortable" data-key="ฐานข้อมูล สมาชิก ณ 1 ต.ค.">ฐานข้อมูล สมาชิก ณ 1 ต.ค.</th>
                    <th>คิดเป็นร้อยละ</th>
                    <th class="sortable" data-key="ฐานข้อมูล สมาชิก ณ 30 ก.ย.">ฐานข้อมูล สมาชิก ณ 30 ก.ย.</th>
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

        // *** ใหม่: สร้างแถวสรุปผลรวม (tfoot) ***
        const totals = dataToRender.reduce((acc, row) => {
            acc.womenOver15 += parseNumber(row['สตรีที่มีอายุ 15 ปีขึ้นไป']);
            acc.baseOct += parseNumber(row['ฐานข้อมูล สมาชิก ณ 1 ต.ค.']);
            acc.baseSep += parseNumber(row['ฐานข้อมูล สมาชิก ณ 30 ก.ย.']);
            acc.target += parseNumber(row['เป้าหมายปี(คน)']);
            acc.membersAdded += parseNumber(row['จำนวนสมาชิกที่เพิ่มขึ้น']);
            return acc;
        }, { womenOver15: 0, baseOct: 0, baseSep: 0, target: 0, membersAdded: 0 });

        const tableFoot = `
            <tfoot>
                <tr style="font-weight: bold; background-color: rgba(255, 195, 160, 0.3);">
                    <td>รวมทั้งหมด</td>
                    <td>${formatNumberWithCommas(totals.womenOver15)}</td>
                    <td>${formatNumberWithCommas(totals.baseOct)}</td>
                    <td></td>
                    <td>${formatNumberWithCommas(totals.baseSep)}</td>
                    <td></td>
                    <td>${formatNumberWithCommas(totals.target)}</td>
                    <td>${formatNumberWithCommas(totals.membersAdded)}</td>
                    <td></td>
                </tr>
            </tfoot>
        `;

        table.innerHTML = tableHead + tableBody + tableFoot;
        dataContainer.appendChild(table);

        // *** ใหม่: เพิ่ม Event Listener ให้กับหัวตารางที่สามารถเรียงข้อมูลได้ ***
        table.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                handleSort(th.dataset.key);
            });
        });
    }

    /**
     * *** ใหม่: ฟังก์ชันหลักที่ควบคุมการแสดงผลทั้งหมด ***
     * ทำหน้าที่กรอง, เรียงลำดับ, และส่งข้อมูลไปให้ renderTable
     */
    function displayData() {
        const selectedYear = yearFilter.value;
        if (!selectedYear) {
            dataContainer.innerHTML = '<p>กรุณาเลือกปีงบประมาณเพื่อแสดงข้อมูล</p>';
            return;
        }

        // 1. กรองข้อมูลตามปี
        let filteredData = allData.filter(row => row.ปีงบ && row.ปีงบ.trim() == selectedYear.trim());

        // 2. เรียงลำดับข้อมูล (ถ้ามีการกำหนด)
        if (currentSort.key) {
            filteredData.sort((a, b) => {
                const valA = a[currentSort.key];
                const valB = b[currentSort.key];

                // ตรวจสอบว่าเป็นตัวเลขหรือข้อความ
                const isNumeric = !isNaN(parseNumber(valA)) && !isNaN(parseNumber(valB));
                
                let comparison = 0;
                if (isNumeric) {
                    comparison = parseNumber(valA) - parseNumber(valB);
                } else {
                    comparison = String(valA).localeCompare(String(valB), 'th'); // 'th' เพื่อให้เรียงภาษาไทยถูกต้อง
                }

                return currentSort.direction === 'asc' ? comparison : -comparison;
            });
        }

        // 3. แสดงผล
        renderTable(filteredData);
    }

    /**
     * *** ใหม่: ฟังก์ชันจัดการการเรียงข้อมูลเมื่อคลิกหัวตาราง ***
     */
    function handleSort(key) {
        if (currentSort.key === key) {
            // ถ้าคลิกที่เดิม ให้สลับทิศทาง
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // ถ้าคลิกที่ใหม่ ให้เริ่มเรียงจากน้อยไปมาก
            currentSort.key = key;
            currentSort.direction = 'asc';
        }
        // เรียกแสดงผลข้อมูลใหม่ (ซึ่งจะทำการเรียงลำดับตาม `currentSort` ที่อัปเดตแล้ว)
        displayData();
    }

    // =================================================================
    // 5. การกำหนด Event Listeners
    // =================================================================

    // เมื่อผู้ใช้เปลี่ยนค่าใน Dropdown ให้เรียกฟังก์ชันแสดงผลข้อมูลใหม่
    yearFilter.addEventListener('change', displayData);

});
