document.addEventListener('DOMContentLoaded', function() {
    // --- START: ค่าที่ต้องแก้ไข ---
    // วาง URL ที่คัดลอกมาจากขั้นตอน "เผยแพร่สู่เว็บ" (รูปแบบ .csv) ที่นี่
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT-SCxmiGBupFuWqnhtusaLSmpKiIYBvjM02wlpOTQdJY5AW1iY2pLmvSbGnxW7UPJNn4yHaw3Abdcv/pub?gid=0&single=true&output=csv';
    // --- END: ค่าที่ต้องแก้ไข ---

    fetch(CSV_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.text(); // ดึงข้อมูลมาเป็น Text ธรรมดา
        })
        .then(csvText => {
            // แปลง Text ที่เป็น CSV ให้เป็น Array สองมิติ
            const rows = csvText.split('\n').map(row => row.split(','));

            if (rows && rows.length > 1) {
                // แยก Header ออกจากข้อมูล
                const headers = rows[0];
                const dataRows = rows.slice(1);

                // เตรียมข้อมูลสำหรับกราฟและการ์ด
                const labels = dataRows.map(row => row[0]); // เดือน
                const salesData = dataRows.map(row => parseInt(row[1])); // ยอดขาย
                const visitorsData = dataRows.map(row => parseInt(row[2])); // ผู้เข้าชม

                // 1. อัปเดตการ์ดข้อมูล (Cards)
                updateCards(salesData, visitorsData, labels);

                // 2. สร้างกราฟ
                createSalesChart(labels, salesData, visitorsData);

            } else {
                console.log('No data found in CSV.');
            }
        })
        .catch(error => {
            console.error('Error fetching or parsing CSV data:', error);
            document.getElementById('total-sales').textContent = 'Error';
            document.getElementById('total-visitors').textContent = 'Error';
            document.getElementById('best-month').textContent = 'Error';
        });

    function updateCards(sales, visitors, labels) {
        // ฟังก์ชันนี้เหมือนเดิม ไม่ต้องแก้ไข
        const totalSales = sales.reduce((sum, current) => sum + current, 0);
        document.getElementById('total-sales').textContent = totalSales.toLocaleString() + ' บาท';

        const totalVisitors = visitors.reduce((sum, current) => sum + current, 0);
        document.getElementById('total-visitors').textContent = totalVisitors.toLocaleString();

        const maxSale = Math.max(...sales);
        const bestMonthIndex = sales.indexOf(maxSale);
        document.getElementById('best-month').textContent = labels[bestMonthIndex];
    }

    function createSalesChart(labels, salesData, visitorsData) {
        // ฟังก์ชันนี้เหมือนเดิม ไม่ต้องแก้ไข
        const ctx = document.getElementById('salesChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ยอดขาย (บาท)',
                    data: salesData,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    yAxisID: 'y'
                }, {
                    label: 'จำนวนผู้เข้าชม',
                    data: visitorsData,
                    type: 'line',
                    backgroundColor: 'rgba(255, 193, 7, 0.7)',
                    borderColor: 'rgba(255, 193, 7, 1)',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: { display: true, text: 'ยอดขาย (บาท)' }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: { display: true, text: 'จำนวนผู้เข้าชม' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }
});
