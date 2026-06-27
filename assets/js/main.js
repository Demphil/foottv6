// --- استيراد دوال جلب البيانات من ملف الـ API ---
import { getTodayMatches, getTomorrowMatches } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    highlightActiveLink();
    
    // تشغيل جلب وعرض المباريات تلقائياً عند تحميل الواجهة
    initMatchesLayout();
});

function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.querySelector('.nav ul');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('open');
        });
    }
}

function highlightActiveLink() {
    const links = document.querySelectorAll('nav ul li a');
    links.forEach(link => {
        if (link.href === window.location.href) {
            link.classList.add('active');
        }
    });
}

// ====================================================================
// 🚀 كود عرض ورسم المباريات ديناميكياً في الواجهة بدون نقص
// ====================================================================
async function initMatchesLayout() {
    // ابحث عن الحاوية (Container) التي تعرض المباريات في الـ HTML لديك
    // تأكد أن الحاوية في ملف index.html تملك معرّف id="matchesContainer" أو قم بتغييره هنا
    const container = document.getElementById('matchesContainer') || document.querySelector('.matches-grid');
    
    if (!container) {
        console.log("⚠️ لم يتم العثور على حاوية عرض المباريات في هذه الصفحة.");
        return;
    }

    try {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#fff;">جاري تحديث وإعداد سيرفرات البث المباشر...</div>`;
        
        // جلب قائمة المباريات المدمجة والآمنة من توقيت منتصف الليل
        const matches = await getTodayMatches();
        
        if (!matches || matches.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#fff;">لا توجد مباريات جارية أو قادمة اليوم.</div>`;
            return;
        }

        // الحصول على الساعة الحالية لمعرفة حالة المباراة بالنسبة للمتصفح
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // رسم بطاقات المباريات بناءً على التصميم الاحترافي لموقعك
        container.innerHTML = matches.map(match => {
            
            // حساب الحالة ديناميكياً لتجنب مشاكل الواجهة (جاري الآن / قريباً)
            let statusLabel = 'قريباً';
            let statusClass = 'upcoming';
            
            // إذا كانت المباراة تملك سكور حقيقي (وليس VS) ولم تنتهِ، أو إذا مر على وقتها أقل من 120 دقيقة
            const timeDiff = currentMinutes - match.rawMinutes;
            
            if (match.score !== 'VS') {
                statusLabel = 'جاري الآن';
                statusClass = 'live';
            } else if (timeDiff >= 0 && timeDiff < 120) {
                statusLabel = 'جاري الآن';
                statusClass = 'live';
            } else if (timeDiff >= 120) {
                statusLabel = 'انتهت';
                statusClass = 'ended';
            }

            return `
                <div class="match-card ${statusClass}">
                    <div class="match-status-badge">${statusLabel}</div>
                    <div class="match-league">${match.league}</div>
                    
                    <div class="match-teams-container">
                        <div class="team home-team">
                            <img src="${match.homeTeam.logo}" alt="${match.homeTeam.name}" class="team-logo" onerror="this.src='/assets/images/default-logo.png'">
                            <span class="team-name">${match.homeTeam.name}</span>
                        </div>
                        
                        <div class="match-center">
                            <div class="match-score">${match.score}</div>
                            <div class="match-time">${match.time}</div>
                        </div>
                        
                        <div class="team away-team">
                            <img src="${match.awayTeam.logo}" alt="${match.awayTeam.name}" class="team-logo" onerror="this.src='/assets/images/default-logo.png'">
                            <span class="team-name">${match.awayTeam.name}</span>
                        </div>
                    </div>
                    
                    <div class="match-footer-info">
                        <span class="match-channel">📺 ${match.channel || 'غير معروف'}</span>
                        <span class="match-commentator">🎙️ ${match.commentator || 'لا يوجد معلق'}</span>
                    </div>
                    
                    <a href="${match.matchLink}" class="watch-button-link">مشاهدة البث المباشر</a>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("خطأ أثناء رسم بطاقات المباريات:", error);
        container.innerHTML = `<div style="text-align:center; padding:20px; color:red;">حدث خطأ أثناء جلب السيرفر المباشر، يرجى تحديث الصفحة.</div>`;
    }
}
