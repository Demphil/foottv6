// assets/js/main.js

// وظيفة لتفعيل الرابط النشط في التنقل (Navigation)
document.addEventListener('DOMContentLoaded', () => {
    highlightActiveLink();
    setupMobileMenu();
});

// تحديد الرابط النشط حسب الصفحة الحالية
function highlightActiveLink() {
    const links = document.querySelectorAll('nav ul li a');
    links.forEach(link => {
        if (link.href === window.location.href) {
            link.classList.add('active');
        }
    });
}

// إعداد قائمة الهاتف (إذا أردت تطوير قائمة موبايل مستقبلًا)
function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav ul');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('open');
        });
    }
}

// Scroll to top button (اختياري مستقبلا)
const scrollTopBtn = document.getElementById('scroll-top');
if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.style.display = 'block';
        } else {
            scrollTopBtn.style.display = 'none';
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}
