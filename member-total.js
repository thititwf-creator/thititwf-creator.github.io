document.addEventListener('DOMContentLoaded', function() {
    // 1. ใส่ URL ของไฟล์ CSV ที่ได้จากการเผยแพร่ Google Sheet
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZceIHi5hcr_J-uV_HBVQXX8Z9NCZOiygswERJzkxb0iZUhm0dvSvj73p7khB8u-g1Kvk-_hZikgpb/pub?gid=0&single=true&output=csv';

    const yearFilter = document.getElementById('year-filter');
    const dataContainer = document.querySelector('.data-display-container');
    let allData = [];

    // 2. ใช้ PapaParse เพื่อดึงและแปลงข้อมูล CSV
    Papa.parse(googleSheetUrl, {
        download: true,
        header: true, // ตั้งค่าให้แถวแรกเป็น Header
        complete: function(results) {
            allData = results.data;
            populateYearFilter(allData);
        }
    });

    // 3. สร้างตัวเลือกปีใน Dropdown
    function populateYearFilter(data) {
        const years = [...new Set(data.map(row => row.ปี))]; // ดึงปีที่ไม่ซ้ำกัน
        years.forEach(year => {
            if (year) { // ตรวจสอบว่าไม่ใช่ค่าว่าง
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
        displayData(selectedYear);
    });

    // 5. ฟังก์ชันสำหรับแสดงผลข้อมูล
    function displayData(year) {
        dataContainer.innerHTML = ''; // ล้างข้อมูลเก่า

        if (!year) {
            dataContainer.innerHTML = '<p>กรุณาเลือกปีงบประมาณเพื่อแสดงข้อมูล</p>';
            return;
        }

        const filteredData = allData.filter(row => row.ปี === year);

        if (filteredData.length === 0) {
            dataContainer.innerHTML = '<p>ไม่พบข้อมูลสำหรับปีที่เลือก</p>';
            return;
        }

        // สร้างตารางเพื่อแสดงผล (หรือรูปแบบอื่นตามต้องการ)
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>จังหวัด</th>
                    <th>เป้าหมาย ปี ${year}</th>
                    <th>จำนวนสมาชิกที่เพิ่มขึ้น</th>
                </tr>
            </thead>
            <tbody>
                ${filteredData.map(row => `
                    <tr>
                        <td>${row.จังหวัด}</td>
                        <td>${row['เป้าหมาย ปี (คน)']}</td>
                        <td>${row['จำนวนสมาชิกที่เพิ่มขึ้น']}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        dataContainer.appendChild(table);
    }
});
