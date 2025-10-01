document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // 1. การตั้งค่า และตัวแปรสถานะ (State Variables)
    // =================================================================
    
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZceIHi5hcr_J-uV_HBVQXX8Z9NCZOiygswERJzkxb0iZUhm0dvSvj73p7khB8u-g1Kvk-_hZikgpb/pub?gid=889852624&single=true&output=csv';

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
                
                // *** จุดแก้ไขที่ 1: คำนวณค่า "จำนวนสมาชิกที่เพิ่มขึ้น" ใหม่ ***
                // วนลูปข้อมูลทุกแถวเพื่อสร้างค่าที่ถูกต้อง
                allData = results.data.map(row => {
                    const baseOct = parseNumber(row['ฐานข้อมูล สมาชิก ณ 1 ต.ค.']); // คอลัมน์ I
                    const baseJul = parseNumber(row['ฐานข้อมูล สมาชิก ณ 31 ก.ค.']); // คอลัมน์ K
                    
                    // คำนวณค่าใหม่ตามสูตร K - I
                    const membersAdded = baseJul - baseOct;

                    // สร้าง property ใหม่ หรือเขียนทับค่าเดิมใน object ของแถว
                    // ใช้ชื่อ key ที่ไม่ซ้ำกับ header เดิมเพื่อป้องกันความสับสน
                    row.calculatedMembersAdded = membersAdded;
                    
                    return row;
                });

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
                    <th class="sortable" data-key="จังหวัด">จังหวัด</th>
                    <th class="sortable" data-key="จังหวัด (แห่ง)">จังหวัด (แห่ง)</th>
                    <th class="sortable" data-key="อำเภอ (แห่ง)">อำเภอ (แห่ง)</th>
                    <th class="sortable" data-key="ตำบล (แห่ง)">ตำบล (แห่ง)</th>
                    <th class="sortable" data-key="หมู่บ้าน(แห่ง)">หมู่บ้าน (แห่ง)</th>
                    <th class="sortable" data-key="รวม">รวม</th>
                    <th class="sortable" data-key="ฐานข้อมูล สมาชิก ณ 1 ต.ค.">ฐานข้อมูล ณ 1 ต.ค.</th>
                    <th>คิดเป็นร้อยละ</th>
                    <th class="sortable" data-key="ฐานข้อมูล สมาชิก ณ 31 ก.ค.">ฐานข้อมูล ณ 31 ก.ค.</th>
                    <th>คิดเป็นร้อยละ</th>
                    <th class="sortable" data-key="calculatedMembersAdded">จำนวนที่เพิ่มขึ้น</th>
                </tr>
            </thead>
        `;

        const tableBody = `
            <tbody>
                ${dataToRender.map(row => `
                    <tr>
                        <td>${row.จังหวัด || ''}</td>
                        <td>${formatNumberWithCommas(row['จังหวัด (แห่ง)'])}</td>
                        <td>${formatNumberWithCommas(row['อำเภอ (แห่ง)'])}</td>
                        <td>${formatNumberWithCommas(row['ตำบล (แห่ง)'])}</td>
                        <td>${formatNumberWithCommas(row['หมู่บ้าน(แห่ง)'])}</td>
                        <td>${formatNumberWithCommas(row['รวม'])}</td>
                        <td>${formatNumberWithCommas(row['ฐานข้อมูล สมาชิก ณ 1 ต.ค.'])}</td>
                        <td>${row['คิดเป็นร้อยละ_1'] || ''}</td>
                        <td>${formatNumberWithCommas(row['ฐานข้อมูล สมาชิก ณ 31 ก.ค.'])}</td>
                        <td>${row['คิดเป็นร้อยละ_2'] || ''}</td>
                        <!-- *** จุดแก้ไขที่ 2: แสดงผลค่าที่คำนวณใหม่ *** -->
                        <td>${formatNumberWithCommas(row.calculatedMembersAdded)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        const totals = dataToRender.reduce((acc, row) => {
            acc.provinceCount += parseNumber(row['จังหวัด (แห่ง)']);
            acc.districtCount += parseNumber(row['อำเภอ (แห่ง)']);
            acc.subdistrictCount += parseNumber(row['ตำบล (แห่ง)']);
            acc.villageCount += parseNumber(row['หมู่บ้าน(แห่ง)']);
            acc.totalOrgs += parseNumber(row['รวม']);
            acc.baseOct += parseNumber(row['ฐานข้อมูล สมาชิก ณ 1 ต.ค.']);
            acc.baseJul += parseNumber(row['ฐานข้อมูล สมาชิก ณ 31 ก.ค.']);
            // *** จุดแก้ไขที่ 3: คำนวณผลรวมจากค่าที่คำนวณใหม่ ***
            acc.membersAdded += parseNumber(row.calculatedMembersAdded);
            return acc;
        }, { provinceCount: 0, districtCount: 0, subdistrictCount: 0, villageCount: 0, totalOrgs: 0, baseOct: 0, baseJul: 0, membersAdded: 0 });

        const totalPercent1 = totals.totalOrgs > 0 ? ((totals.baseOct / totals.totalOrgs) * 100).toFixed(2) : 0;
        const totalPercent2 = totals.totalOrgs > 0 ? ((totals.baseJul / totals.totalOrgs) * 100).toFixed(2) : 0;

        const tableFoot = `
            <tfoot>
                <tr>
                    <td>รวมทั้งหมด</td>
                    <td>${formatNumberWithCommas(totals.provinceCount)}</td>
                    <td>${formatNumberWithCommas(totals.districtCount)}</td>
                    <td>${formatNumberWithCommas(totals.subdistrictCount)}</td>
                    <td>${formatNumberWithCommas(totals.villageCount)}</td>
                    <td>${formatNumberWithCommas(totals.totalOrgs)}</td>
                    <td>${formatNumberWithCommas(totals.baseOct)}</td>
                    <td>${totalPercent1}</td>
                    <td>${formatNumberWithCommas(totals.baseJul)}</td>
                    <td>${totalPercent2}</td>
                    <!-- *** จุดแก้ไขที่ 4: แสดงผลรวมของค่าที่คำนวณใหม่ *** -->
                    <td>${formatNumberWithCommas(totals.membersAdded)}</td>
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
                // *** จุดแก้ไขที่ 5: ใช้ parseNumber กับค่าที่อาจเป็นตัวเลขที่คำนวณขึ้นมาใหม่ ***
                const valA = currentSort.key === 'calculatedMembersAdded' ? a.calculatedMembersAdded : a[currentSort.key];
                const valB = currentSort.key === 'calculatedMembersAdded' ? b.calculatedMembersAdded : b[currentSort.key];
                
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
