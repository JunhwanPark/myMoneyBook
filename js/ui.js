// ==========================================
// 💡 1. 전역 상태 및 스마트 버튼 제어
// ==========================================
window.currentAppMode = 'LEDGER';

window.handleMainPlusClick = () => {
    if (window.currentAppMode === 'ASSETS' && typeof openDepositModal === 'function') {
        openDepositModal();
    } else if (typeof openAddModal === 'function') {
        openAddModal();
    }
};

window.handleNavMain = () => {
    const btn = document.getElementById('nav-btn-main');
    if (window.currentAppMode === 'ASSETS') switchTab('assets', '예적금', btn);
    else switchTab('daily', '내역', btn);
};

window.handleNavSub = () => {
    const btn = document.getElementById('nav-btn-sub');
    if (window.currentAppMode === 'ASSETS') switchTab('assets-dividends', '배당금', btn);
    else switchTab('monthly', '달력', btn);
};

window.handleNavStats = () => {
    const btn = document.getElementById('nav-btn-stats');
    if (window.currentAppMode === 'ASSETS') switchTab('assets-stats', '자산통계', btn);
    else switchTab('stats', '통계', btn);
};

window.handleNavSettings = () => {
    const btn = document.getElementById('nav-btn-settings');
    if (window.currentAppMode === 'ASSETS') switchTab('assets-settings', '자산설정', btn);
    else switchTab('settings', '설정', btn);
};

// ==========================================
// 💡 2. 공통 UI 유틸리티 (날짜, 포맷팅, 뱃지)
// ==========================================
window.formatDateStr = (d) => {
    const daysKo = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${daysKo[d.getDay()]}요일`;
};

window.escapeHTML = function (str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

window.applyTopRanks = (list) => {
    list.forEach((item) => (item.rankBadge = ''));

    const expenses = list
        .filter((d) => d.Type === 'expense' && Number(d.Amount) > 0)
        .sort((a, b) => Number(b.Amount) - Number(a.Amount));
    const incomes = list
        .filter((d) => d.Type === 'income' && Number(d.Amount) > 0)
        .sort((a, b) => Number(b.Amount) - Number(a.Amount));

    expenses.slice(0, 3).forEach((item, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        item.rankBadge = `<span class="shrink-0 ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-black text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-100 leading-none shadow-sm">${medal} ${index + 1}위</span>`;
    });

    incomes.slice(0, 3).forEach((item, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        item.rankBadge = `<span class="shrink-0 ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 leading-none shadow-sm">${medal} ${index + 1}위</span>`;
    });
};

// ==========================================
// 💡 3. 화면(탭) 및 국가(테마) 전환 엔진
// ==========================================
window.switchTab = (tabId, title, btnElement, forceDirection = null) => {
    if (window.currentAppMode === 'ASSETS' && !tabId.startsWith('assets')) {
        window.currentAppMode = 'LEDGER';
        document.body.classList.remove('theme-assets');
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');

        const btnKr = document.getElementById('btn-kr');
        const btnCn = document.getElementById('btn-cn');
        const btnAssets = document.getElementById('btn-assets');
        const badge = document.getElementById('exchange-rate-badge');

        if (btnAssets)
            btnAssets.className =
                'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 transition-all';
        if (currentCountry === 'KR') {
            if (btnKr)
                btnKr.className =
                    'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';
            document.body.classList.remove('theme-cn');
            if (metaThemeColor) metaThemeColor.setAttribute('content', '#4f46e5');
            if (badge) badge.classList.add('hidden');
        } else {
            if (btnCn)
                btnCn.className =
                    'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';
            document.body.classList.add('theme-cn');
            if (metaThemeColor) metaThemeColor.setAttribute('content', '#ef4444');
            if (typeof fetchExchangeRate === 'function') fetchExchangeRate();
        }
    }

    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');

    if (searchInput && searchInput.value !== '') {
        searchInput.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
        if (typeof renderDailyList === 'function' && typeof globalData !== 'undefined') {
            renderDailyList(globalData);
        }
    }

    const tabOrder = ['daily', 'monthly', 'stats', 'settings'];
    const currentActive = document.querySelector('.tab-content.active');
    let currentTabId = 'daily';
    if (currentActive) currentTabId = currentActive.id.replace('view-', '');

    const currentIndex = tabOrder.indexOf(currentTabId);
    const newIndex = tabOrder.indexOf(tabId);

    let direction =
        forceDirection ||
        (currentIndex !== -1 && newIndex !== -1 && newIndex > currentIndex ? 'right' : 'left');

    document.querySelectorAll('.tab-content').forEach((el) => {
        el.classList.remove('active', 'slide-in-right', 'slide-in-left');
    });

    const targetTab = document.getElementById('view-' + tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.classList.add(direction === 'right' ? 'slide-in-right' : 'slide-in-left');
    }

    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.classList.remove('text-primary');
        btn.classList.add('text-gray-400');
    });
    if (btnElement) btnElement.classList.replace('text-gray-400', 'text-primary');

    // 분리된 모듈들의 함수 호출
    if (tabId === 'daily' && typeof renderDailyList === 'function') {
        renderDailyList(globalData);
    } else if (tabId === 'monthly') {
        if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();
        if (typeof calendar === 'undefined' || !calendar) {
            if (typeof initCalendar === 'function') initCalendar();
        } else {
            setTimeout(() => {
                calendar.updateSize();
                if (typeof renderCalendarEvents === 'function') renderCalendarEvents();
            }, 300);
        }
    } else if (tabId === 'stats' && typeof renderChart === 'function') {
        renderChart();
    } else if (
        (tabId === 'assets' || tabId === 'assets-stats') &&
        typeof renderAssetsList === 'function'
    ) {
        renderAssetsList();
    }
};

window.switchCountry = function (mode) {
    const btnKr = document.getElementById('btn-kr');
    const btnCn = document.getElementById('btn-cn');
    const btnAssets = document.getElementById('btn-assets');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const badge = document.getElementById('exchange-rate-badge');

    if (btnKr)
        btnKr.className =
            'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 transition-all';
    if (btnCn)
        btnCn.className =
            'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 transition-all';
    if (btnAssets)
        btnAssets.className =
            'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 transition-all';

    if (mode === 'ASSETS') {
        window.currentAppMode = 'ASSETS';
        if (badge) badge.classList.add('hidden');

        document.getElementById('nav-icon-main').innerText = 'savings';
        document.getElementById('nav-label-main').innerText = '예적금';
        document.getElementById('nav-icon-sub').innerText = 'payments';
        document.getElementById('nav-label-sub').innerText = '배당금';
        document.getElementById('nav-label-stats').innerText = '통계';

        document.body.classList.remove('theme-cn');
        document.body.classList.add('theme-assets');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#10b981');

        if (btnAssets)
            btnAssets.className =
                'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';

        document
            .querySelectorAll('.tab-content')
            .forEach((el) => el.classList.remove('active', 'slide-in-right', 'slide-in-left'));
        document.getElementById('view-assets').classList.add('active', 'slide-in-right');

        document.querySelectorAll('.nav-btn').forEach((btn) => {
            btn.classList.remove('text-primary');
            btn.classList.add('text-gray-400');
        });
        const mainNavBtn = document.getElementById('nav-btn-main');
        if (mainNavBtn) mainNavBtn.classList.replace('text-gray-400', 'text-primary');

        if (typeof renderAssetsList === 'function') renderAssetsList();
        return;
    }

    window.currentAppMode = 'LEDGER';
    document.body.classList.remove('theme-assets');

    document.getElementById('nav-icon-main').innerText = 'list_alt';
    document.getElementById('nav-label-main').innerText = '내역';
    document.getElementById('nav-icon-sub').innerText = 'calendar_month';
    document.getElementById('nav-label-sub').innerText = '달력';
    document.getElementById('nav-label-stats').innerText = '통계';

    if (typeof currentCountry !== 'undefined' && currentCountry !== mode) {
        currentCountry = mode;
        if (typeof loadDailyRecords === 'function') loadDailyRecords();
    } else if (mode === 'CN' && typeof fetchExchangeRate === 'function') {
        fetchExchangeRate();
    }

    if (mode === 'KR') {
        document.body.classList.remove('theme-cn');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#4f46e5');
        if (btnKr)
            btnKr.className =
                'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';
        if (badge) badge.classList.add('hidden');
    } else {
        document.body.classList.add('theme-cn');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#ef4444');
        if (btnCn)
            btnCn.className =
                'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';
    }

    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id.startsWith('view-assets')) {
        const mainNavBtn = document.getElementById('nav-btn-main');
        switchTab('daily', '내역', mainNavBtn);
    }
};

// ==========================================
// 💡 4. 환율 및 지역(Timezone) 설정
// ==========================================
window.getKrwEquivalent = (cnyAmount) => {
    if (typeof currentCountry === 'undefined' || currentCountry !== 'CN') return null;
    const savedRate = localStorage.getItem('cachedCnyRate');
    const rate = savedRate ? parseFloat(savedRate.replace(/,/g, '')) : 185.0;
    return Math.round(Number(cnyAmount) * rate).toLocaleString('ko-KR') + '원';
};

window.updateKrwGuide = () => {
    const amountInput = document.getElementById('input-amount');
    const guideEl = document.getElementById('krw-guide-text');
    if (!amountInput || !guideEl) return;

    if (typeof currentCountry === 'undefined' || currentCountry !== 'CN') {
        guideEl.classList.add('hidden');
        return;
    }

    const val = amountInput.value.replace(/,/g, '');
    if (val && !isNaN(val)) {
        const krw = getKrwEquivalent(val);
        if (krw) {
            guideEl.innerText = `약 ${krw}`;
            guideEl.classList.remove('hidden');
        }
    } else {
        guideEl.classList.add('hidden');
    }
};

window.initCountryByTimezone = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isChina = tz === 'Asia/Shanghai' || tz === 'Asia/Urumqi';
        window.currentCountry = isChina ? 'CN' : 'KR';

        const btnKr = document.getElementById('btn-kr');
        const btnCn = document.getElementById('btn-cn');

        if (window.currentCountry === 'KR') {
            document.body.classList.remove('theme-cn');
            if (btnKr)
                btnKr.className =
                    'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow';
            if (btnCn)
                btnCn.className = 'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70';
        } else {
            document.body.classList.add('theme-cn');
            if (btnCn)
                btnCn.className =
                    'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow';
            if (btnKr)
                btnKr.className = 'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70';
        }
    } catch (e) {
        console.warn('타임존 인식 실패, 기본값으로 시작합니다.');
    }
};
document.addEventListener('DOMContentLoaded', window.initCountryByTimezone);

// ==========================================
// 💡 5. 제스처(스와이프) 및 히스토리(뒤로가기) 감지
// ==========================================
(function initSwipeNavigation() {
    let touchStartX = 0,
        touchStartY = 0,
        touchEndX = 0,
        touchEndY = 0;
    const mainArea = document.querySelector('main');
    if (!mainArea) return;

    mainArea.addEventListener(
        'touchstart',
        (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        },
        { passive: true }
    );

    mainArea.addEventListener(
        'touchend',
        (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        },
        { passive: true }
    );

    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
            const activeTabSection = document.querySelector('.tab-content.active');
            if (!activeTabSection) return;

            const activeTabId = activeTabSection.id.replace('view-', '');
            let tabOrder = ['daily', 'monthly', 'stats', 'settings'];
            let tabNames = ['내역', '달력', '통계', '설정'];
            const navBtnIds = ['nav-btn-main', 'nav-btn-sub', 'nav-btn-stats', 'nav-btn-settings'];

            if (window.currentAppMode === 'ASSETS') {
                tabOrder = ['assets', 'assets-dividends', 'assets-stats', 'assets-settings'];
                tabNames = ['예적금', '배당금', '통계', '설정'];
            }

            let currentIndex = tabOrder.indexOf(activeTabId);
            if (currentIndex === -1) return;

            let direction = 'right';
            if (deltaX < 0) {
                currentIndex = (currentIndex + 1) % tabOrder.length;
                direction = 'right';
            } else {
                currentIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
                direction = 'left';
            }

            const nextTabId = tabOrder[currentIndex];
            const nextTabName = tabNames[currentIndex];
            const nextBtn = document.getElementById(navBtnIds[currentIndex]);

            if (nextTabId && nextBtn) {
                window.switchTab(nextTabId, nextTabName, nextBtn, direction);
            }
        }
    }
})();

(function initModalHistoryManager() {
    window.modalStack = [];
    window.isProgrammaticBack = false;

    const modalIds = [
        'add-modal',
        'card-modal',
        'category-modal',
        'weekly-modal',
        'card-detail-modal',
        'deposit-modal',
        'asset-config-modal',
        'asset-owner-detail-modal',
    ];

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const target = mutation.target;
                const id = target.id;

                if (modalIds.includes(id)) {
                    const isHidden = target.classList.contains('hidden');
                    const isInStack = window.modalStack.includes(id);

                    if (!isHidden && !isInStack) {
                        window.modalStack.push(id);
                        history.pushState({ modal: id }, '', '');
                    } else if (isHidden && isInStack) {
                        window.modalStack = window.modalStack.filter((mId) => mId !== id);
                        window.isProgrammaticBack = true;
                        history.back();
                        setTimeout(() => (window.isProgrammaticBack = false), 100);
                    }
                }
            }
        });
    });

    document.addEventListener('DOMContentLoaded', () => {
        modalIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        });
    });

    window.addEventListener('popstate', (e) => {
        if (window.isProgrammaticBack) return;
        if (window.modalStack.length > 0) {
            const topModalId = window.modalStack.pop();
            if (topModalId === 'add-modal' && typeof closeAddModal === 'function') closeAddModal();
            else if (topModalId === 'card-modal' && typeof closeCardModal === 'function')
                closeCardModal();
            else if (topModalId === 'category-modal' && typeof closeCategoryModal === 'function')
                closeCategoryModal();
            else if (topModalId === 'weekly-modal' && typeof closeWeeklyModal === 'function')
                closeWeeklyModal();
            else if (
                topModalId === 'card-detail-modal' &&
                typeof closeCardDetailModal === 'function'
            )
                closeCardDetailModal();
            else if (topModalId === 'deposit-modal' && typeof closeDepositModal === 'function')
                closeDepositModal();
            else if (
                topModalId === 'asset-config-modal' &&
                typeof closeAssetConfigModal === 'function'
            )
                closeAssetConfigModal();
            else if (
                topModalId === 'asset-owner-detail-modal' &&
                typeof closeOwnerAssetDetail === 'function'
            )
                closeOwnerAssetDetail();
        }
    });
})();

// ==========================================
// 💡 6. 앱 버전(GitHub SHA) 로더
// ==========================================
window.fetchAppVersion = async () => {
    const githubUser = 'JunhwanPark';
    const githubRepo = 'myMoneyBook';
    const branch = 'main';
    const shaEl = document.getElementById('app-version-sha');
    const dateEl = document.getElementById('app-version-date');

    if (!shaEl || !dateEl) return;

    try {
        const res = await fetch(
            `https://api.github.com/repos/${githubUser}/${githubRepo}/commits?sha=${branch}&per_page=1`
        );
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();

        if (data && data.length > 0) {
            const latestCommit = data[0];
            const shortSha = latestCommit.sha.substring(0, 7);
            const commitDate = new Date(latestCommit.commit.author.date);
            const dateStr = `${commitDate.getFullYear()}.${String(commitDate.getMonth() + 1).padStart(2, '0')}.${String(commitDate.getDate()).padStart(2, '0')} ${String(commitDate.getHours()).padStart(2, '0')}:${String(commitDate.getMinutes()).padStart(2, '0')}`;

            shaEl.innerText = shortSha;
            dateEl.innerText = dateStr;
        }
    } catch (error) {
        shaEl.innerText = 'unknown';
        dateEl.innerText = '업데이트 확인 불가';
    }
};
document.addEventListener('DOMContentLoaded', window.fetchAppVersion);
