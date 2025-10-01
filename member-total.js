document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // 1. การตั้งค่า (Configuration)
    // =================================================================
    
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZceIHi5hcr_J-uV_HBVQXX8Z9NCZOiygswERJzkxb0iZUhm0dvSvj73p7khB8u-g1Kvk-_hZikgpb/pub?gid=0&single=true&output=csv';

    // =================================================================
    // 2. การอ้างอิงถึงองค์ประกอบ HTML (DOM Elements )
    // =================================================================

    const yearFilter = document.getElementById('year-filter');
    const dataContainer = document.getElementById('data-container');
    
    let allData = [];

    // =================================================================
    // 3. ฟังก์ชันเสริม (Helper Functions)
    // =================================================================

    /**
     * *** ฟังก์ชันใหม่: จัดรูปแบบตัวเลขให้มีเครื่องหมายจุลภาค (,) ***
     * แปลงตัวเลข (หรือข้อความที่เป็นตัวเลข) ให้มี comma คั่นทุกสามหลัก
     * @param {string | number} num - ตัวเลขที่ต้องการจัดรูปแบบ
     * @returns {string} - ข้อความตัวเลขที่จัดรูปแบบแล้ว หรือค่าเดิมถ้าไม่ใช่ตัวเลข
     */
    function formatNumberWithCommas(num) {
        // ตรวจสอบว่าค่าที่รับมาเป็น null, undefined หรือเป็นข้อความว่างหรือไม่
        if (num === null || num === undefined || num === '') {
            return ''; // ถ้าใช่ ให้คืนค่าว่างไปเลย
        }
        // แปลงค่าที่รับมาเป็น String และลบ comma ที่อาจมีอยู่แล้วออก
        const numStr = String(num).replace(/,/g, '');
        // ตรวจสอบว่าค่าที่ได้เป็นตัวเลขที่ถูกต้องหรือไม่
        if (isNaN(parseFloat(numStr))) {
            return num; // ถ้าไม่ใช่ตัวเลข (เช่น เป็นข้อความ "จังหวัด") ให้คืนค่าเดิมกลับไป
        }
        // ใช้ toLocaleString() ซึ่งเป็นวิธีมาตรฐานในการจัดรูปแบบตัวเลขตามภาษาและภูมิภาค
        // 'en-US' เป็นมาตรฐานที่ใช้ comma คั่นและแสดงผลได้ถูกต้อง
        return parseFloat(numStr).toLocaleString('en-US');
    }


    // =================================================================
    // 4. การดึงและประมวลผลข้อมูล (Data Fetching & Processing)
    // =================================================================

    dataContainer.innerHTML = '<p>กำลังโหลดข้อมูลจาก Google Sheet...</p>';

    Papa.parse(googleSheetUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                allData = results.data;
                console.log("ข้อมูลที่ดึงมาสำเร็จ:", allData[0]);
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
    // 5. ฟังก์ชันจัดการหน้าเว็บ (UI Functions)
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

    function displayDataForYear(year) {
        dataContainer.innerHTML = '';

        if (!year) {
            dataContainer.innerHTML = '<p>กรุณาเลือกปีงบประมาณเพื่อแสดงข้อมูล</p>';
            return;
        }

        const filteredData = allData.filter(row => row.ปีงบ && row.ปีงบ.trim() == year.trim());

        if (filteredData.length === 0) {
            dataContainer.innerHTML = '<p>ไม่พบข้อมูลสำหรับปีที่เลือก</p>';
            return;
        }

        const table = document.createElement('table');
        
        const tableHead = `
            <thead>
                <tr>
                    <th>จังหวัด</th>
                    <th>สตรีที่มีอายุ 15 ปีขึ้นไป</th>
                    <th>ฐานข้อมูล สมาชิก ณ 1 ต.ค.</th>
                    <th>คิดเป็นร้อยละ</th>
                    <th>ฐานข้อมูล สมาชิก ณ ปัจจุบัน</th>
                    <th>คิดเป็นร้อยละ</th>
                    <th>เป้าหมายปี(คน)</th>
                    <th>จำนวนสมาชิกที่เพิ่มขึ้น</th>
                    <th>คิดเป็นร้อยละ</th>
                </tr>
            </thead>
        `;

        // *** จุดแก้ไขสำคัญ: เรียกใช้ formatNumberWithCommas() กับคอลัมน์ที่เป็นตัวเลข ***
        const tableBody = `
            <tbody>
                ${filteredData.map(row => `
                    <tr>
                        <td>${row.จังหวัด || ''}</td>
                        <td>${formatNumberWithCommas(row['จำนวนสตรีที่มีอายุ 15 ปีขึ้นไป'])}</td>
                        <td>${formatNumberWithCommas(row['ฐานข้อมูล สมาชิก ณ 1 ต.ค.'])}</td>
                        <td>${row['คิดเป็นร้อยละ'] || ''}</td>
                        <td>${formatNumberWithCommas(row['ฐานข้อมูล สมาชิก ณ ปัจจุบัน'])}</td>
                        <td>${row['คิดเป็นร้อยละ_1'] || ''}</td>
                        <td>${formatNumberWithCommas(row['เป้าหมายปี(คน)'])}</td>
                        <td>${formatNumberWithCommas(row['จำนวนสมาชิกที่เพิ่มขึ้น'])}</td>
                        <td>${row['คิดเป็นร้อยละ_2'] || ''}</td> 
                    </tr>
                `).join('')}
            </tbody>
        `;

        table.innerHTML = tableHead + tableBody;
        dataContainer.appendChild(table);
    }

    // =================================================================
    // 6. การกำหนด Event Listeners
    // =================================================================

    yearFilter.addEventListener('change', function() {
        const selectedYear = this.value;
        displayDataForYear(selectedYear);
    });

});
