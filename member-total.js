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
                console.log("ข้อมูลที่ดึงมาสำเร็จ (ตรวจสอบชื่อคอลัมน์ที่นี่):", allData[0]);
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
        // *** จุดแก้ไข: เปลี่ยน "ปงบ" เป็น "ปีงบ" ***
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

        // *** จุดแก้ไข: เปลี่ยน "ปงบ" เป็น "ปีงบ" ***
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
                    <th>ฐานข้อมูล สมาชิก ณ 30 ก.ย.</th>
                    <th>คิดเป็นร้อยละ</th>
                    <th>เป้าหมายปี(คน)</th>
                    <th>จำนวนสมาชิกที่เพิ่มขึ้น</th>
                    <th>คิดเป็นร้อยละ</th>
                </tr>
            </thead>
        `;

        const tableBody = `
            <tbody>
                ${filteredData.map(row => `
                    <tr>
                        <td>${row.จังหวัด || ''}</td>
                        <td>${row['สตรีที่มีอายุ 15 ปีขึ้นไป'] || ''}</td>
                        <td>${row['ฐานข้อมูล สมาชิก ณ 1 ต.ค.'] || ''}</td>
                        <td>${row['คิดเป็นร้อยละ'] || ''}</td>
                        <td>${row['ฐานข้อมูล สมาชิก ณ 30 ก.ย.'] || ''}</td>
                        <td>${row['คิดเป็นร้อยละ_1'] || ''}</td>
                        <td>${row['เป้าหมายปี(คน)'] || ''}</td>
                        <td>${row['จำนวนสมาชิกที่เพิ่มขึ้น'] || ''}</td>
                        <td>${row['คิดเป็นร้อยละ_2'] || ''}</td> 
                    </tr>
                `).join('')}
            </tbody>
        `;

        table.innerHTML = tableHead + tableBody;
        dataContainer.appendChild(table);
    }

    // =================================================================
    // 5. การกำหนด Event Listeners
    // =================================================================

    yearFilter.addEventListener('change', function() {
        const selectedYear = this.value;
        displayDataForYear(selectedYear);
    });

});
