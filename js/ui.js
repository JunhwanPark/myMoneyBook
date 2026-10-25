// ==========================================
// 💡 1. 전역 상태 및 스마트 버튼 제어
// ==========================================
window.currentAppMode = 'LEDGER';

window.handleMainPlusClick = () => {
    if (window.currentAppMode === 'LIFE') {
        if (typeof window.openLifeRecordModal === 'function') window.openLifeRecordModal();
        return;
    }
    if (window.currentAppMode === 'ASSETS') {
        // 💡 현재 어떤 자산 탭(예적금 vs 배당금)이 활성화되어 있는지 정확히 체크합니다.
        const activeTab = document.querySelector('.tab-content.active');
        const activeId = activeTab ? activeTab.id : '';

        if (activeId === 'view-assets-dividends') {
            // 배당금 탭일 때
            if (typeof openDividendModal === 'function') openDividendModal();
            else console.error('openDividendModal 함수를 찾을 수 없습니다.');
        } else {
            // 그 외 자산 탭(예적금, 통계 등)일 때
            if (typeof openDepositModal === 'function') openDepositModal();
            else console.error('openDepositModal 함수를 찾을 수 없습니다.');
        }
    } else {
        // 가계부 모드일 때
        if (typeof openAddModal === 'function') openAddModal();
    }
};

window.handleNavMain = () => {
    const btn = document.getElementById('nav-btn-main');
    if (window.currentAppMode === 'LIFE') switchTab('life-records', '기록', btn);
    else if (window.currentAppMode === 'ASSETS') switchTab('assets', '예적금', btn);
    else switchTab('daily', '내역', btn);
};

window.handleNavSub = () => {
    const btn = document.getElementById('nav-btn-sub');
    if (window.currentAppMode === 'LIFE') switchTab('life-trends', '추이', btn);
    else if (window.currentAppMode === 'ASSETS') switchTab('assets-dividends', '배당금', btn);
    else switchTab('monthly', '달력', btn);
};

window.handleNavStats = () => {
    const btn = document.getElementById('nav-btn-stats');
    if (window.currentAppMode === 'LIFE') switchTab('life-types', '기록 종류', btn);
    else if (window.currentAppMode === 'ASSETS') switchTab('assets-stats', '자산통계', btn);
    else switchTab('stats', '통계', btn);
};

window.handleNavSettings = () => {
    const btn = document.getElementById('nav-btn-settings');
    if (window.currentAppMode === 'ASSETS') switchTab('assets-settings', '자산설정', btn);
    else switchTab('settings', '설정', btn);
};

window.syncAppModeButtons = () => {
    const activeMode = window.currentAppMode === 'LIFE'
        ? 'life'
        : window.currentAppMode === 'ASSETS'
          ? 'assets'
          : String(currentCountry || 'KR').toLowerCase();
    document.querySelectorAll('.app-mode-switcher button').forEach((button) => {
        const isActive = button.id === `mode-btn-${activeMode}`;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
};

window.switchAppMode = (mode) => {
    if (mode !== 'LIFE') {
        window.switchCountry(mode);
        return;
    }

    window.currentAppMode = 'LIFE';
    document.getElementById('app-title').innerText = '변민삼박 생활기록';
    document.body.classList.remove('theme-cn', 'theme-assets');
    document.body.classList.add('theme-life');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0f766e');
    window.syncAppModeButtons();

    document.getElementById('nav-icon-main').innerText = 'edit_note';
    document.getElementById('nav-label-main').innerText = '기록';
    document.getElementById('nav-icon-sub').innerText = 'show_chart';
    document.getElementById('nav-label-sub').innerText = '추이';
    document.getElementById('nav-icon-stats').innerText = 'category';
    document.getElementById('nav-label-stats').innerText = '유형';
    document.getElementById('nav-icon-settings').innerText = 'settings';
    document.getElementById('nav-label-settings').innerText = '설정';

    const targetTab = window.currentLifeTab || 'life-records';
    document.querySelectorAll('.tab-content').forEach((el) =>
        el.classList.remove('active', 'slide-in-right', 'slide-in-left')
    );
    document.getElementById(`view-${targetTab}`)?.classList.add('active', 'slide-in-right');
    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.classList.remove('text-primary');
        btn.classList.add('text-gray-400');
    });
    const navId = targetTab === 'life-trends'
        ? 'nav-btn-sub'
        : targetTab === 'life-types'
          ? 'nav-btn-stats'
          : targetTab === 'settings'
            ? 'nav-btn-settings'
            : 'nav-btn-main';
    document.getElementById(navId)?.classList.replace('text-gray-400', 'text-primary');
    if (typeof window.updateSpendingTicker === 'function') window.updateSpendingTicker();
    if (typeof window.fetchExchangeRate === 'function') window.fetchExchangeRate();
    if (typeof window.renderLifeMode === 'function') window.renderLifeMode();
    if (typeof window.loadDailyRecords === 'function') window.loadDailyRecords();
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
        document.getElementById('app-title').innerText = '변민삼박 가계부';
        document.body.classList.remove('theme-assets');
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        window.syncAppModeButtons();
        if (currentCountry === 'KR') {
            document.body.classList.remove('theme-cn');
            if (metaThemeColor) metaThemeColor.setAttribute('content', '#4f46e5');
        } else {
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
    if (window.currentAppMode === 'LIFE' && tabId.startsWith('life-')) {
        window.currentLifeTab = tabId;
    }
    if (typeof window.updateSpendingTicker === 'function') window.updateSpendingTicker();

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
    } else if (tabId === 'assets' || tabId === 'assets-stats') {
        // 기존: renderAssetsList();
        // 수정: 통계 탭일 때는 통합 함수를, 목록 탭일 때는 기존 함수를 호출
        if (tabId === 'assets-stats') {
            if (typeof renderCombinedAssetsStats === 'function') renderCombinedAssetsStats();
        } else {
            if (typeof renderAssetsList === 'function') renderAssetsList();
        }
    } else if (tabId === 'assets-dividends') {
        // 👇 배당금 탭으로 진입 시 배당금 리스트 그리기 함수 호출!
        if (typeof renderDividendsList === 'function') renderDividendsList();
    } else if (tabId === 'life-records' && typeof window.renderLifeRecords === 'function') {
        window.renderLifeRecords();
    } else if (tabId === 'life-trends' && typeof window.renderLifeTrend === 'function') {
        window.renderLifeTrend();
    } else if (tabId === 'life-types' && typeof window.renderLifeTypes === 'function') {
        window.renderLifeTypes();
    }
};

window.switchCountry = function (mode) {
    const previousAppMode = window.currentAppMode;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (mode === 'ASSETS') {
        window.currentAppMode = 'ASSETS';
        document.getElementById('app-title').innerText = '변민삼박 자산';

        document.getElementById('nav-icon-main').innerText = 'savings';
        document.getElementById('nav-label-main').innerText = '예적금';
        document.getElementById('nav-icon-sub').innerText = 'payments';
        document.getElementById('nav-label-sub').innerText = '배당금';
        document.getElementById('nav-icon-stats').innerText = 'pie_chart';
        document.getElementById('nav-label-stats').innerText = '통계';

        document.body.classList.remove('theme-cn', 'theme-life');
        document.body.classList.add('theme-assets');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#10b981');

        window.syncAppModeButtons();

        document
            .querySelectorAll('.tab-content')
            .forEach((el) => el.classList.remove('active', 'slide-in-right', 'slide-in-left'));
        document.getElementById('view-assets').classList.add('active', 'slide-in-right');
        if (typeof window.updateSpendingTicker === 'function') window.updateSpendingTicker();

        document.querySelectorAll('.nav-btn').forEach((btn) => {
            btn.classList.remove('text-primary');
            btn.classList.add('text-gray-400');
        });
        const mainNavBtn = document.getElementById('nav-btn-main');
        if (mainNavBtn) mainNavBtn.classList.replace('text-gray-400', 'text-primary');

        if (typeof loadDailyRecords === 'function') {
            loadDailyRecords();
        } else if (typeof renderAssetsList === 'function') {
            renderAssetsList();
        }
        return;
    }

    window.currentAppMode = 'LEDGER';
    document.getElementById('app-title').innerText = '변민삼박 가계부';
    document.body.classList.remove('theme-assets', 'theme-life');
    window.syncAppModeButtons();

    document.getElementById('nav-icon-main').innerText = 'list_alt';
    document.getElementById('nav-label-main').innerText = '내역';
    document.getElementById('nav-icon-sub').innerText = 'calendar_month';
    document.getElementById('nav-label-sub').innerText = '달력';
    document.getElementById('nav-icon-stats').innerText = 'pie_chart';
    document.getElementById('nav-label-stats').innerText = '통계';
    document.getElementById('nav-icon-settings').innerText = 'settings';
    document.getElementById('nav-label-settings').innerText = '설정';

    if (typeof currentCountry !== 'undefined' && currentCountry !== mode) {
        // 국가 전환 시 이전 국가의 검색 조건 초기화
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('search-clear-btn');
        const currentMonthOnly = document.getElementById('search-current-month-only');

        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
        if (currentMonthOnly) currentMonthOnly.checked = false;

        currentCountry = mode;
        window.syncAppModeButtons();

        if (typeof loadDailyRecords === 'function') {
            loadDailyRecords();
        }
    } else if (mode === 'CN' && typeof fetchExchangeRate === 'function') {
        fetchExchangeRate();
    }

    if (mode === 'KR') {
        document.body.classList.remove('theme-cn');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#4f46e5');
    } else {
        document.body.classList.add('theme-cn');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#ef4444');
    }

    const activeTab = document.querySelector('.tab-content.active');
    if (
        activeTab &&
        (activeTab.id.startsWith('view-assets') ||
            (previousAppMode === 'LIFE' && activeTab.id.startsWith('view-life')))
    ) {
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
        const detectedCountry = isChina ? 'CN' : 'KR';

        // 💡 핵심 버그 수정: 화면뿐만 아니라 api.js의 전역 변수도 강제로 동기화!
        window.currentCountry = detectedCountry;
        if (typeof currentCountry !== 'undefined') {
            currentCountry = detectedCountry;
        }

        if (detectedCountry === 'KR') {
            document.body.classList.remove('theme-cn');
        } else {
            document.body.classList.add('theme-cn');
        }
        if (typeof window.syncAppModeButtons === 'function') window.syncAppModeButtons();
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
            } else if (window.currentAppMode === 'LIFE') {
                tabOrder = ['life-records', 'life-trends', 'life-types', 'settings'];
                tabNames = ['기록', '추이', '유형', '설정'];
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
        'life-record-modal',
        'life-type-modal',
        'card-detail-modal',
        'deposit-modal',
        'dividend-modal',
        'asset-config-modal',
        'asset-owner-detail-modal',
        'combined-owner-detail-modal',
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
            else if (topModalId === 'life-record-modal' && typeof closeLifeRecordModal === 'function')
                closeLifeRecordModal();
            else if (topModalId === 'life-type-modal' && typeof closeLifeTypeModal === 'function')
                closeLifeTypeModal();
            else if (
                topModalId === 'card-detail-modal' &&
                typeof closeCardDetailModal === 'function'
            )
                closeCardDetailModal();
            else if (topModalId === 'deposit-modal' && typeof closeDepositModal === 'function')
                closeDepositModal();
            else if (topModalId === 'dividend-modal' && typeof closeDividendModal === 'function')
                closeDividendModal();
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
            else if (
                topModalId === 'combined-owner-detail-modal' &&
                typeof closeCombinedOwnerDetail === 'function'
            )
                closeCombinedOwnerDetail();
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
