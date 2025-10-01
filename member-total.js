document.addEventListener('DOMContentLoaded', function( ) {
    // 1. ใส่ URL ของไฟล์ CSV ที่ได้จากการเผยแพร่ Google Sheet ของคุณที่นี่
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZceIHi5hcr_J-uV_HBVQXX8Z9NCZOiygswERJzkxb0iZUhm0dvSvj73p7khB8u-g1Kvk-_hZikgpb/pub?gid=0&single=true&output=csv';

    const yearFilter = document.getElementById('year-filter');
    const dataContainer = document.getElementById('data-container');
    let allData = [];

    dataContainer.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

    // 2. ใช้ PapaParse ดึงข้อมูล โดยให้มันอ่าน Header อัตโนมัติ
    Papa.parse(googleSheetUrl, {
        download: true,
        header: true, // อ่านหัวตารางแถวแรกเป็น key
        skipEmptyLines: true,
        complete: function(results) {
            allData = results.data;
            populateYearFilter(allData);
            dataContainer.innerHTML = '<p>กรุณาเลือกปีงบประมาณเพื่อแสดงข้อมูล</p>';
        },
        error: function(error) {
            console.error("เกิดข้อผิดพลาด:", error);
            dataContainer.innerHTML = '<p style="color: red;">ไม่สามารถโหลดข้อมูลได้</p>';
        }
    });

    // 3. สร้างตัวเลือก "ปี" (อ้างอิงจากชื่อคอลัมน์ "ปงบ")
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

    // 4. เมื่อมีการเลือกปี ให้แสดงข้อมูล
    yearFilter.addEventListener('change', function() {
        const selectedYear = this.value;
        displayDataForYear(selectedYear);
    });

    // 5. ฟังก์ชันแสดงผลข้อมูล (อ้างอิงชื่อคอลัมน์โดยตรง)
    function displayDataForYear(year) {
        dataContainer.innerHTML = '';

        if (!year) {
            dataContainer.innerHTML = '<p>กรุณาเลือกปีงบประมาณเพื่อแสดงข้อมูล</p>';
            return;
        }

        const filteredData = allData.filter(row => row.ปีงบ === year);

        if (filteredData.length === 0) {
            dataContainer.innerHTML = '<p>ไม่พบข้อมูลสำหรับปีที่เลือก</p>';
            return;
        }

        const table = document.createElement('table');
        
        // สร้างหัวตาราง
        const tableHead = `
            <thead>
                <tr>
                    <th>จังหวัด</th>
                    <th>สตรีที่มีอายุ 15 ปีขึ้นไป</th>
                    <th>ฐานข้อมูล สมาชิก ณ 1 ต.ค.</th>
                    <th>คิดเป็นร้อยละ</th>
                    <th>เป้าหมาย ปี(คน)</th>
                    <th>จำนวนสมาชิกที่เพิ่มขึ้น</th>
                    <th>คิดเป็นร้อยละ</th>
                </tr>
            </thead>
        `;

        // สร้างเนื้อหาตาราง
        const tableBody = `
            <tbody>
                ${filteredData.map(row => `
                    <tr>
                        <td>${row.จังหวัด || ''}</td>
                        <td>${row['สตรีที่มีอายุ 15 ปีขึ้นไป'] || ''}</td>
                        <td>${row['ฐานข้อมูล สมาชิก ณ 1 ต.ค.'] || ''}</td>
                        <td>${row['คิดเป็นร้อยละ'] || ''}</td>
                        <td>${row['เป้าหมาย ปี(คน)'] || ''}</td>
                        <td>${row['จำนวนสมาชิกที่เพิ่มขึ้น'] || ''}</td>
                        <td>${row['คิดเป็นร้อยละ_1'] || ''}</td> 
                    </tr>
                `).join('')}
            </tbody>
        `;

        table.innerHTML = tableHead + tableBody;
        dataContainer.appendChild(table);
    }
});
