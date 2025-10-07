// =================================================================
//                      Q&A Logic for GitHub Pages
// =================================================================

// --- การตั้งค่า ---
// URL ที่ได้จากการเผยแพร่ Google Sheet เป็นไฟล์ CSV
// วิธีทำ: ใน Google Sheet -> ไฟล์ (File ) -> แชร์ (Share) -> เผยแพร่ไปยังเว็บ (Publish to web)
// เลือกชีตที่ต้องการ, เลือกรูปแบบเป็น "Comma-separated values (.csv)" แล้วกด "เผยแพร่" (Publish)
// จากนั้นคัดลอกลิงก์ที่ได้มาวางที่นี่
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9TK4pGi-Bpwl-pejFksJ07GL73M7_7fK9Rx6whKOOcMhGg_V7v3wt8KLwIVcxmaqNNcS5itvKGddd/pub?gid=0&single=true&output=csv'

// --- ตัวแปรและค่าคงที่ ---
let faqsData = [];
const converter = new showdown.Converter( );

// --- การอ้างอิงถึง Element ในหน้าเว็บ ---
const searchInput = document.getElementById('searchInput');
const faqContainer = document.getElementById('faqContainer');
const modal = document.getElementById('qaModal');
const modalQuestion = document.getElementById('modalQuestion');
const modalAnswer = document.getElementById('modalAnswer');
const closeButton = document.querySelector('.close-button');

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", fetchFAQs);
searchInput.addEventListener('input', (e) => filterFAQs(e.target.value));
closeButton.onclick = closeModal;
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

// --- ฟังก์ชันหลัก ---

/**
 * ดึงข้อมูลจาก Google Sheet CSV และเริ่มกระบวนการสร้างรายการ
 */
function fetchFAQs() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        complete: (results) => {
            // PapaParse จะคืนค่า header มาด้วย เราจึงต้องรู้ชื่อคอลัมน์
            const headers = results.meta.fields;
            const questionHeader = headers[0]; // คอลัมน์แรกคือ 'question'
            const answerHeader = headers[1];   // คอลัมน์ที่สองคือ 'answer'

            const faqs = results.data.map(row => ({
                question: row[questionHeader],
                answer: row[answerHeader]
            })).filter(faq => faq.question && faq.question.trim() !== ''); // กรองแถวที่คำถามว่างออก

            createFAQList(faqs);
        },
        error: (error) => {
            showError(error);
        }
    });
}

/**
 * สร้างและแสดงรายการคำถามบนหน้าเว็บ
 * @param {Array<Object>} faqs - อาร์เรย์ของอ็อบเจกต์คำถาม-คำตอบ
 */
function createFAQList(faqs) {
    faqContainer.innerHTML = '';

    if (!faqs || faqs.length === 0) {
        faqContainer.innerHTML = '<p class="error-text">ไม่พบข้อมูลคำถามที่พบบ่อย</p>';
        searchInput.disabled = true;
        return;
    }

    faqsData = faqs;
    searchInput.disabled = false; // เปิดใช้งานช่องค้นหาเมื่อมีข้อมูล

    faqs.forEach((faq, index) => {
        const item = document.createElement('div');
        item.className = 'faq-item';
        item.textContent = faq.question;
        item.setAttribute('data-index', index);
        item.onclick = () => openModal(index);
        faqContainer.appendChild(item);
    });
}

/**
 * กรองและแสดงผลรายการคำถามตามคำค้นหา
 * @param {string} searchTerm - คำที่ใช้ในการค้นหา
 */
function filterFAQs(searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    let hasResults = false;

    const faqItems = faqContainer.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const questionText = item.textContent.toLowerCase();
        if (questionText.includes(lowerCaseSearchTerm)) {
            item.classList.remove('hidden');
            hasResults = true;
        } else {
            item.classList.add('hidden');
        }
    });

    // จัดการการแสดงข้อความ "ไม่พบผลลัพธ์"
    let noResultsMessage = faqContainer.querySelector('.no-results-text');
    if (!hasResults && !noResultsMessage) {
        noResultsMessage = document.createElement('p');
        noResultsMessage.className = 'no-results-text';
        noResultsMessage.textContent = 'ไม่พบผลลัพธ์ที่ตรงกับการค้นหา';
        faqContainer.appendChild(noResultsMessage);
    } else if (hasResults && noResultsMessage) {
        noResultsMessage.remove();
    }
}

/**
 * แสดงข้อความเมื่อเกิดข้อผิดพลาดในการโหลดข้อมูล
 * @param {Object} error - อ็อบเจกต์ข้อผิดพลาด
 */
function showError(error) {
    faqContainer.innerHTML = `<p class="error-text">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}</p>`;
    searchInput.disabled = true;
}

// --- ฟังก์ชันสำหรับจัดการ Modal ---

/**
 * เปิด Modal และแสดงรายละเอียดของคำถามที่เลือก
 * @param {number} index - ดัชนีของคำถามในอาร์เรย์ faqsData
 */
function openModal(index) {
    const faq = faqsData[index];
    if (faq) {
        modalQuestion.textContent = faq.question;
        const answerHtml = converter.makeHtml(faq.answer || '');
        modalAnswer.innerHTML = answerHtml;
        modal.style.display = 'flex';
    }
}

/**
 * ปิด Modal
 */
function closeModal() {
    modal.style.display = 'none';
}
