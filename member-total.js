document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // 1. การตั้งค่า (Configuration)
    // =================================================================
    
    // *** สำคัญ: ใส่ URL ของไฟล์ CSV ที่ได้จากการเผยแพร่ Google Sheet ของคุณที่นี่ ***
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZceIHi5hcr_J-uV_HBVQXX8Z9NCZOiygswERJzkxb0iZUhm0dvSvj73p7khB8u-g1Kvk-_hZikgpb/pub?gid=0&single=true&output=csv';

    // =================================================================
    // 2. การอ้างอิงถึงองค์ประกอบ HTML (DOM Elements)
    // =================================================================

    const yearFilter = document.getElementById('year-filter');
    const dataContainer = document.getElementById('data-container');
    
    // สร้างตัวแปรสำหรับเก็บข้อมูลทั้งหมดที่ดึงมา
    let allData = [];

    // =================================================================
    // 3. การดึงและประมวลผลข้อมูล (Data Fetching & Processing)
    // =================================================================

    // แสดงข้อความ "กำลังโหลดข้อมูล..." ระหว่างรอ
    dataContainer.innerHTML = '<p>กำลังโหลดข้อมูลจาก Google Sheet...</p>';

    // ใช้ไลบรารี PapaParse เพื่อดึงและแปลงข้อมูลจากไฟล์ CSV
    Papa.parse(googleSheetUrl, {
        download: true,      // สั่งให้ดาวน์โหลดไฟล์จาก URL
        header: true,        // กำหนดให้แถวแรกเป็น Header (สำคัญมาก)
        skipEmptyLines: true,// ข้ามแถวที่ว่าง
        
        // ฟังก์ชันที่จะทำงานเมื่อดึงข้อมูลสำเร็จ
        complete: function(results) {
            // ตรวจสอบว่ามีข้อมูลที่ดึงมาหรือไม่
            if (results.data && results.data.length > 0) {
                allData = results.data;
                console.log("ข้อมูลที่ดึงมาสำเร็จ:", allData); // แสดงข้อมูลใน Console เพื่อการตรวจสอบ
                populateYearFilter(allData);
                dataContainer.innerHTML = '<p>กรุณาเลือกปีงบประมาณเพื่อแสดงข้อมูล</p>';
            } else {
                dataContainer.innerHTML = '<p style="color: red;">ไม่พบข้อมูลในไฟล์ Google Sheet</p>';
            }
        },
        
        // ฟังก์ชันที่จะทำงานเมื่อเกิดข้อผิดพลาด
        error: function(error) {
            console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
            dataContainer.innerHTML = '<p style="color: red;">ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบ URL ของ Google Sheet และการตั้งค่าการเผยแพร่</p>';
        }
    });

    // =================================================================
    // 4. ฟังก์ชันจัดการหน้าเว็บ (UI Functions)
    // =================================================================

    /**
     * สร้างตัวเลือกปีใน Dropdown (id="year-filter")
     * @param {Array} data - ข้อมูลทั้งหมดที่ดึงมา
     */
    function populateYearFilter(data) {
        // ดึงค่าปีทั้งหมดที่ไม่ซ้ำกันจากคอลัมน์ "ปงบ" และเรียงลำดับจากมากไปน้อย
        const years = [...new Set(data.map(row => row.ปีงบ))].sort((a, b) => b - a);
        
        years.forEach(year => {
            if (year) { // ตรวจสอบว่าค่า 'year' ไม่ใช่ค่าว่าง
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            }
        });
    }

    /**
     * แสดงข้อมูลในรูปแบบตารางตามปีที่เลือก
     * @param {string} year - ปีงบประมาณที่ผู้ใช้เลือก
     */
    function displayDataForYear(year) {
        // ล้างข้อมูลเก่าในคอนเทนเนอร์
        dataContainer.innerHTML = '';

        // ถ้ายังไม่ได้เลือกปี ให้แสดงข้อความแนะนำ
        if (!year) {
            dataContainer.innerHTML = '<p>กรุณาเลือกปีงบประมาณเพื่อแสดงข้อมูล</p>';
            return;
        }

        // กรองข้อมูลเฉพาะปีที่เลือก
        const filteredData = allData.filter(row => row.ปงบ === year);

        // ถ้าไม่พบข้อมูลสำหรับปีที่เลือก
        if (filteredData.length === 0) {
            dataContainer.innerHTML = '<p>ไม่พบข้อมูลสำหรับปีที่เลือก</p>';
            return;
        }

        // สร้างตาราง
        const table = document.createElement('table');
        
        // สร้างส่วนหัวของตาราง (thead)
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

        // สร้างส่วนเนื้อหาของตาราง (tbody)
        // *** จุดสำคัญ: อ้างอิงชื่อคอลัมน์ให้ถูกต้องตามที่ PapaParse สร้างขึ้น ***
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
        // หมายเหตุ: หากคอลัมน์ร้อยละตัวสุดท้ายยังไม่แสดง ให้ตรวจสอบ Console
        // เพื่อดูว่า PapaParse ตั้งชื่อเป็นอะไร (อาจเป็น _1, _2) แล้วนำมาแก้ไขตรงนี้

        // ประกอบหัวและเนื้อหาเข้าด้วยกัน แล้วนำไปใส่ในคอนเทนเนอร์
        table.innerHTML = tableHead + tableBody;
        dataContainer.appendChild(table);
    }

    // =================================================================
    // 5. การกำหนด Event Listeners
    // =================================================================

    // เมื่อผู้ใช้เปลี่ยนค่าใน Dropdown เลือกปี ให้เรียกฟังก์ชันแสดงผลข้อมูลใหม่
    yearFilter.addEventListener('change', function() {
        const selectedYear = this.value;
        displayDataForYear(selectedYear);
    });

}); // สิ้นสุด document.addEventListener
