// ==========================================
// 🌐 다국어(i18n) 번역 엔진 및 딕셔너리
// ==========================================
window.appLang = localStorage.getItem('appLang') || 'ko';

window.changeLanguage = (lang) => {
    localStorage.setItem('appLang', lang);
    window.location.reload(); // 언어 변경 시 화면을 싹 지우고 새 언어로 다시 그립니다.
};

window.i18nDict = {
    내역: '明细',
    달력: '日历',
    통계: '统计',
    설정: '设置',
    '월 내역': '月度明细',
    '월 달력': '月度日历',
    '월 수입': '月收入',
    '월 지출': '月支出',
    지출: '支出',
    수입: '收入',
    누적추이: '累计趋势',
    '현재 계정': '当前账号',
    '앱 스킨 (배경색)': '应用主题',
    '기본 (White)': '默认 (白)',
    '계절 (Season)': '季节',
    '언어 설정 (Language)': '语言设置 (Language)',
    '신용카드 관리': '信用卡管理',
    '카테고리 관리': '分类管理',
    '새 내역 추가': '添加新明细',
    '내역 수정': '修改明细',
    저장하기: '保存',
    수정하기: '修改',
    삭제: '删除',
    추가: '添加',
    '검색어를 입력하세요': '请输入搜索词',
    '내역이 없습니다.': '没有明细。',
    '검색 결과가 없습니다.': '没有搜索结果。',
    '지난달 vs 이번달 (지출)': '上月 vs 本月 (支出)',
    '지난달 vs 이번달 (수입/지출)': '上月 vs 本月 (收入/支出)',
    '수입 포함': '包含收入',
    총: '总计',
    '카드별 결제액': '按信用卡结算额',
    기준일: '基准日',
    '1일~말일': '1日~月底',
    '이번달 정산될 카드 내역이 없습니다.': '本月没有要结算的信用卡明细。',
    '지난달과 동일': '与上月相同',
    '내역 없음': '无明细',
    '항목 이름': '项目名称',
    '카테고리 선택': '选择分类',
    금액: '金额',
    결제: '支付',
    할인: '折扣',
    '할인 금액': '折扣金额',
    '상세 메모 (선택 - 줄바꿈하여 길게 입력 가능)': '详细备注 (选填)',
    현금: '现金',
    카드: '信用卡',
    미분류: '未分类',
    '과거순 (1일 ➔ 말일)': '按时间正序 (1日 ➔ 月底)',
    '최신순 (말일 ➔ 1일)': '按时间倒序 (月底 ➔ 1日)',
    '동기화 중...': '同步中...',
};

// ==========================================
// 💡 작업 공간(모드) 상태 및 스마트 [+] 버튼
// ==========================================
window.currentAppMode = 'LEDGER'; // 기본값은 가계부(LEDGER) 모드

window.handleMainPlusClick = () => {
    // 자산 모드일 때는 예적금 모달을, 평소에는 일반 가계부 추가 모달을 띄웁니다!
    if (window.currentAppMode === 'ASSETS') {
        openDepositModal();
    } else {
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

// 동적으로 텍스트를 생성할 때 쓰는 번역 함수
window.t = (koStr) => {
    if (window.appLang === 'ko') return koStr;
    return window.i18nDict[koStr] || koStr;
};

// 공통 날짜 포맷팅 유틸리티
window.formatDateStr = (d) => {
    const daysKo = ['일', '월', '화', '수', '목', '금', '토'];
    const daysCn = ['日', '一', '二', '三', '四', '五', '六'];
    if (window.appLang === 'cn') {
        return `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日 星期${daysCn[d.getDay()]}`;
    }
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${daysKo[d.getDay()]}요일`;
};

// 앱 로딩 시 정적 HTML 텍스트들을 일괄 번역하는 스크립트
window.applyStaticTranslations = () => {
    const langSelector = document.getElementById('lang-selector');
    if (langSelector) langSelector.value = window.appLang;

    if (window.appLang === 'ko') return;

    // 1. DOM 내부의 일반 텍스트 노드 치환 (태그는 건드리지 않고 글자만 바꿈)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        const text = node.nodeValue.trim();
        if (window.i18nDict[text]) {
            node.nodeValue = node.nodeValue.replace(text, window.i18nDict[text]);
        }
    }

    // 2. Placeholder 및 Input Value 치환
    document.querySelectorAll('input, textarea, option').forEach((el) => {
        if (el.placeholder && window.i18nDict[el.placeholder])
            el.placeholder = window.i18nDict[el.placeholder];
        if (el.type === 'button' && el.value && window.i18nDict[el.value])
            el.value = window.i18nDict[el.value];
    });
};

document.addEventListener('DOMContentLoaded', window.applyStaticTranslations);

// ==========================================
// 🛡️ XSS 방어용 HTML 특수문자 치환 함수
// ==========================================
window.escapeHTML = function (str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

window.updateMonthTitles = function () {
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth() + 1;
    // 중국어일 때는 "년 월" 대신 "年 月" 사용
    const titleStr = window.appLang === 'cn' ? `${year}年 ${month}月` : `${year}년 ${month}월`;

    if (document.getElementById('daily-month-title'))
        document.getElementById('daily-month-title').innerText = titleStr;
    if (document.getElementById('stats-month-title'))
        document.getElementById('stats-month-title').innerText = titleStr;
    if (document.getElementById('monthly-month-title'))
        document.getElementById('monthly-month-title').innerText = titleStr;
};

window.changeGlobalMonth = (offset) => {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
    updateMonthTitles();
    renderDailyList(globalData);
    if (document.getElementById('view-stats').classList.contains('active')) renderChart();
    if (calendar) calendar.gotoDate(currentDisplayDate);
};

window.switchTab = (tabId, title, btnElement, forceDirection = null) => {
    // 💡 자산 모드에서 탈출할 때 원래 테마(KR/CN)로 색상 복구!
    // 👇 수정됨: tabId가 'assets'로 시작하지 않을 때만 탈출로 간주합니다! (assets, assets-settings 모두 무사 통과)
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

    // 검색창에 글씨가 남아있으면 비우고 리스트 원상복구
    if (searchInput && searchInput.value !== '') {
        searchInput.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
        if (typeof renderDailyList === 'function' && typeof globalData !== 'undefined') {
            renderDailyList(globalData);
        }
    }

    // 💡 애니메이션 방향 계산 (현재 탭과 이동할 탭의 순서 비교)
    const tabOrder = ['daily', 'monthly', 'stats', 'settings'];
    const currentActive = document.querySelector('.tab-content.active');
    let currentTabId = 'daily';
    if (currentActive) {
        currentTabId = currentActive.id.replace('view-', '');
    }

    const currentIndex = tabOrder.indexOf(currentTabId);
    const newIndex = tabOrder.indexOf(tabId);

    let direction = 'right'; // 기본 방향
    if (forceDirection) {
        direction = forceDirection; // 스와이프 시 강제 지정된 방향
    } else if (currentIndex !== -1 && newIndex !== -1) {
        direction = newIndex > currentIndex ? 'right' : 'left'; // 하단 버튼 클릭 시 방향 계산
    }

    // 기존 탭 숨기기 및 애니메이션 클래스 초기화
    document.querySelectorAll('.tab-content').forEach((el) => {
        el.classList.remove('active', 'slide-in-right', 'slide-in-left');
    });

    // 새 탭 띄우기 및 방향에 맞는 애니메이션 장착!
    const targetTab = document.getElementById('view-' + tabId);
    targetTab.classList.add('active');
    if (direction === 'right') {
        targetTab.classList.add('slide-in-right');
    } else {
        targetTab.classList.add('slide-in-left');
    }

    // 하단 버튼 색상 변경
    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.classList.remove('text-primary');
        btn.classList.add('text-gray-400');
    });
    if (btnElement) btnElement.classList.replace('text-gray-400', 'text-primary');

    // 각 탭에 맞는 렌더링 함수 실행
    if (tabId === 'daily') {
        renderDailyList(globalData);
    } else if (tabId === 'monthly') {
        updateMonthlyTotals();
        if (!calendar) initCalendar();
        else setTimeout(() => calendar.render(), 10);
    } else if (tabId === 'stats') {
        renderChart();
    } else if (tabId === 'assets' || tabId === 'assets-stats') {
        // 👈 assets-stats(자산 통계) 탭 조건 추가!
        renderAssetsList();
    }
};

window.switchCountry = function (mode) {
    const btnKr = document.getElementById('btn-kr');
    const btnCn = document.getElementById('btn-cn');
    const btnAssets = document.getElementById('btn-assets');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const badge = document.getElementById('exchange-rate-badge');

    // 1. 모든 상단 버튼의 불을 끕니다.
    if (btnKr)
        btnKr.className =
            'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 transition-all';
    if (btnCn)
        btnCn.className =
            'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 transition-all';
    if (btnAssets)
        btnAssets.className =
            'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 transition-all';

    // ==========================================
    // 💰 자산 (ASSETS) 모드를 선택했을 때
    // ==========================================
    if (mode === 'ASSETS') {
        window.currentAppMode = 'ASSETS';
        if (badge) badge.classList.add('hidden'); // 환율 뱃지 숨김

        // 💡 1) 하단 네비게이션 아이콘 & 텍스트를 자산 전용으로 변경
        document.getElementById('nav-icon-main').innerText = 'savings';
        document.getElementById('nav-label-main').innerText = '예적금';
        document.getElementById('nav-icon-sub').innerText = 'payments';
        document.getElementById('nav-label-sub').innerText = '배당금';
        document.getElementById('nav-label-stats').innerText = '통계';

        // 💡 2) 초록색 자산 테마 입히기
        document.body.classList.remove('theme-cn');
        document.body.classList.add('theme-assets');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#10b981');

        // 상단 '자산' 버튼에 불 켜기
        if (btnAssets)
            btnAssets.className =
                'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';

        // 💡 3) 기존 화면 모두 숨기고 자산 리스트 화면 띄우기
        document
            .querySelectorAll('.tab-content')
            .forEach((el) => el.classList.remove('active', 'slide-in-right', 'slide-in-left'));
        document.getElementById('view-assets').classList.add('active', 'slide-in-right');

        // 💡 4) 하단 버튼 색상 초기화 후 '예적금(main)' 버튼만 초록색 불 켜기
        document.querySelectorAll('.nav-btn').forEach((btn) => {
            btn.classList.remove('text-primary');
            btn.classList.add('text-gray-400');
        });
        const mainNavBtn = document.getElementById('nav-btn-main');
        if (mainNavBtn) mainNavBtn.classList.replace('text-gray-400', 'text-primary');

        renderAssetsList(); // 예적금 데이터 그리기
        return;
    }

    // ==========================================
    // 🇰🇷/🇨🇳 국가(가계부) 모드를 선택했을 때
    // ==========================================
    window.currentAppMode = 'LEDGER';
    document.body.classList.remove('theme-assets'); // 초록색 테마 벗기기

    // 💡 1) 하단 네비게이션 아이콘 & 텍스트를 가계부 전용으로 원상복구
    document.getElementById('nav-icon-main').innerText = 'list_alt';
    document.getElementById('nav-label-main').innerText = '내역';
    document.getElementById('nav-icon-sub').innerText = 'calendar_month';
    document.getElementById('nav-label-sub').innerText = '달력';
    document.getElementById('nav-label-stats').innerText = '통계';

    // 💡 2) 국가가 진짜로 변경되었을 때만 데이터 다시 불러오기
    if (currentCountry !== mode) {
        currentCountry = mode;
        loadDailyRecords();
    } else {
        // 이미 중국 모드인데 자산에서 돌아왔다면 환율 뱃지 복구
        if (mode === 'CN' && typeof fetchExchangeRate === 'function') fetchExchangeRate();
    }

    // 💡 3) 선택한 국가에 맞는 파란색/빨간색 테마 입히기
    if (mode === 'KR') {
        document.body.classList.remove('theme-cn');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#4f46e5');
        if (btnKr)
            btnKr.className =
                'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';
        if (badge) badge.classList.add('hidden'); // 한국 모드는 환율 뱃지 숨김
    } else {
        document.body.classList.add('theme-cn');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#ef4444');
        if (btnCn)
            btnCn.className =
                'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';
    }

    // 💡 4) 자산 모드에서 탈출한 경우, 가계부의 '내역' 탭으로 강제 이동시켜 자연스럽게 복구
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id.startsWith('view-assets')) {
        const mainNavBtn = document.getElementById('nav-btn-main');
        switchTab('daily', '내역', mainNavBtn);
    }
};

// ==========================================
// 💡 검색창 제어 함수 추가
// ==========================================
window.handleSearch = () => {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    const keyword = input.value;

    if (keyword.length > 0) {
        clearBtn.classList.remove('hidden'); // X 버튼 표시
    } else {
        clearBtn.classList.add('hidden'); // X 버튼 숨김
    }

    renderDailyList(globalData, keyword);
};

window.clearSearch = () => {
    const input = document.getElementById('search-input');
    input.value = '';
    document.getElementById('search-clear-btn').classList.add('hidden');
    renderDailyList(globalData);
};

// ==========================================
// 기존 일간 내역 렌더링 함수 교체 (전체 기간 검색 기능 호환)
// ==========================================
window.renderDailyList = (data, searchKeyword = '') => {
    const container = document.getElementById('daily-list-container');
    if (!container) return;

    updateMonthTitles();
    const prefix = `${currentDisplayDate.getFullYear()}-${String(currentDisplayDate.getMonth() + 1).padStart(2, '0')}`;

    let filtered = [];
    const isSearching = searchKeyword.trim().length > 0;

    if (isSearching) {
        const kw = searchKeyword.trim().toLowerCase();
        filtered = data.filter((d) => {
            const catLabel = globalCategories.find((c) => c.Value === d.Category)?.Label || '';
            const parts = d.Memo ? d.Memo.split('|') : [];
            if (parts.length > 1) parts[1] = '';
            const searchableText = (parts.join(' ') + ' ' + catLabel).toLowerCase();
            return searchableText.includes(kw);
        });
        const navEl = document.getElementById('daily-month-navigation');
        if (navEl) navEl.classList.add('hidden');
    } else {
        filtered = data.filter((d) => d.Date?.startsWith(prefix));
        const navEl = document.getElementById('daily-month-navigation');
        if (navEl) navEl.classList.remove('hidden');
    }

    container.innerHTML = filtered.length
        ? ''
        : isSearching
          ? '<p class="text-center text-gray-500 py-10">검색 결과가 없습니다.</p>'
          : '<p class="text-center text-gray-500 py-10">내역이 없습니다.</p>';

    if (filtered.length === 0) {
        document.getElementById('daily-total-expense').innerText = '0';
        return;
    }

    applyTopRanks(filtered);

    let total = 0;
    const groupedByDate = {};

    filtered.forEach((item) => {
        if (item.Type === 'expense') total += Number(item.Amount);
        const dateStr = item.Date.substring(0, 10);
        if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
        groupedByDate[dateStr].push(item);
    });

    document.getElementById('daily-total-expense').innerText = isSearching
        ? `검색 합계: ${formatMoney(total)}`
        : formatMoney(total);

    // 👇 정렬 로직 적용 (과거순 vs 최신순)
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        return window.listSortOrder === 'asc'
            ? new Date(a) - new Date(b)
            : new Date(b) - new Date(a);
    });

    // 👇 정렬 토글 버튼 UI 추가
    container.insertAdjacentHTML(
        'beforeend',
        `
        <div class="flex justify-end mb-2 px-1">
            <button onclick="toggleListSortOrder()" class="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 font-bold bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm transition-all active:scale-95">
                <span class="material-symbols-outlined text-[14px]">swap_vert</span>
                ${window.listSortOrder === 'asc' ? t('과거순 (1일 ➔ 말일)') : t('최신순 (말일 ➔ 1일)')}
            </button>
        </div>
    `
    );

    sortedDates.forEach((dateStr) => {
        const d = new Date(dateStr);
        const displayDate = window.formatDateStr(d);

        container.insertAdjacentHTML(
            'beforeend',
            `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
                <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                ${displayDate}
            </div>`
        );

        // 👇 추가된 부분: 같은 날짜 안에서 최신순이면 뒤집기!
        let itemsForDate = groupedByDate[dateStr];
        if (window.listSortOrder === 'desc') {
            itemsForDate = [...itemsForDate].reverse();
        }

        itemsForDate.forEach((item) => {
            const parsed = parseMemo(item.Memo);
            const isExp = item.Type === 'expense';
            const catLabel =
                globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
            const amountNum = Number(item.Amount);
            const displayColor = isExp ? 'text-red-500' : 'text-blue-500';
            const iconBg = isExp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
            const displaySign = amountNum < 0 ? '-' : '';

            const krwValue = getKrwEquivalent(Math.abs(amountNum)); // 원화 환산액 계산

            container.insertAdjacentHTML(
                'beforeend',
                `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                    <div class="flex items-center gap-2.5 flex-1 min-w-0">
                        <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm">${getCategoryIcon(catLabel)}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center">
                                <p class="text-sm font-bold text-gray-800 truncate">${escapeHTML(parsed.itemName)}</p>
                                ${item.rankBadge || ''}
                            </div>
                            <p class="text-[10px] text-gray-400 mt-1 truncate">${escapeHTML(catLabel)} • ${escapeHTML(parsed.payMethod)}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0 ml-3">
                        <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formatMoney(Math.abs(amountNum))}</p>
                        ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                        ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${formatMoney(parsed.discount)}</p>` : ''}
                    </div>
                </div>`
            );
        });
    });
};

window.initCalendar = () => {
    calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        locale: 'ko',
        headerToolbar: false,
        height: 'auto',
        fixedWeekCount: false,
        dayCellContent: (info) => info.dayNumberText.replace('일', ''),
        dateClick: (info) => openWeeklyModal(info.dateStr),
        datesSet: (info) => {
            currentDisplayDate = new Date(info.view.currentStart);
            updateMonthTitles();
            updateMonthlyTotals(currentDisplayDate);
            renderDailyList(globalData);
            if (document.getElementById('view-stats').classList.contains('active')) renderChart();
        },
    });
    calendar.render();
    renderCalendarEvents();
};

window.renderCalendarEvents = () => {
    if (!calendar) return;

    // 💡 핵심: 캘린더의 기본 알파벳 정렬을 무시하고,
    // 우리가 이벤트에 부여한 'order' 번호표 순서대로 강제 정렬시킵니다.
    calendar.setOption('eventOrder', 'order');
    calendar.removeAllEvents();

    const totals = {};
    globalData.forEach((item) => {
        const date = item.Date.substring(0, 10);
        if (!totals[date]) totals[date] = { in: 0, ex: 0 };
        item.Type === 'expense'
            ? (totals[date].ex += Number(item.Amount))
            : (totals[date].in += Number(item.Amount));
    });

    const events = [];
    for (const [d, t] of Object.entries(totals)) {
        // 수입과 지출이 모두 0인 날은 그릴 필요가 없으므로 패스
        if (t.in === 0 && t.ex === 0) continue;

        // ==========================================
        // 1. 지출 (무조건 첫 번째 줄) -> order: 1 부여
        // ==========================================
        events.push({
            title:
                t.ex !== 0
                    ? (t.ex < 0 ? '-' : '') + Math.abs(t.ex).toLocaleString('en-US')
                    : '\u00A0',
            start: d,
            allDay: true,
            textColor: t.ex !== 0 ? '#ef4444' : 'transparent',
            order: 1, // 👈 지출은 무조건 1등
        });

        // ==========================================
        // 2. 수입 (무조건 두 번째 줄) -> order: 2 부여
        // ==========================================
        events.push({
            title:
                t.in !== 0
                    ? (t.in < 0 ? '-' : '') + Math.abs(t.in).toLocaleString('en-US')
                    : '\u00A0',
            start: d,
            allDay: true,
            textColor: t.in !== 0 ? '#3b82f6' : 'transparent',
            order: 2, // 👈 수입은 무조건 2등
        });
    }
    calendar.addEventSource(events);
};

// ==========================================
// 💡 지출/수입 차트 토글 함수
// ==========================================
window.setChartMode = (mode) => {
    window.chartStatMode = mode;
    renderChart(); // 상태를 바꾸고 차트 영역을 다시 그립니다.
};

// ==========================================
// 1. 통계 화면 렌더링 (지출/수입/누적추이 토글 및 카드 정산)
// ==========================================
window.renderChart = function () {
    updateMonthTitles();
    const targetY = currentDisplayDate.getFullYear();
    const targetM = currentDisplayDate.getMonth();
    const prefix = `${targetY}-${String(targetM + 1).padStart(2, '0')}`;

    // 💡 차트 모드 확인 (기본값: 지출)
    window.chartStatMode = window.chartStatMode || 'expense';
    const mode = window.chartStatMode;

    // 3단 토글 버튼 디자인 처리
    const btnExp = document.getElementById('btn-tab-expense');
    const btnInc = document.getElementById('btn-tab-income');
    const btnCum = document.getElementById('btn-tab-cum');
    const btnClassOn = 'bg-white text-gray-800 shadow-sm rounded-md px-3 py-1 transition-all';
    const btnClassOff = 'text-gray-400 hover:text-gray-600 px-3 py-1 transition-all';

    if (btnExp && btnInc && btnCum) {
        btnExp.className = mode === 'expense' ? btnClassOn : btnClassOff;
        btnInc.className = mode === 'income' ? btnClassOn : btnClassOff;
        btnCum.className = mode === 'cumulative' ? btnClassOn : btnClassOff;
    }

    const chartEl = document.getElementById('mainChart');
    const noDataEl = document.getElementById('no-chart-data');
    const totalAmountEl = document.getElementById('chart-total-amount');
    const chartWrapper = document.getElementById('chart-wrapper');

    const existingChart = Chart.getChart(chartEl);
    if (existingChart) existingChart.destroy();

    if (mode === 'cumulative') {
        // 💡 1. 상단 타이틀 우측 정렬 및 좌측 탭 찌그러짐 완벽 방지
        if (totalAmountEl) {
            const titleText = window.showCumulativeIncome
                ? '지난달 vs 이번달 (수입/지출)'
                : '지난달 vs 이번달 (지출)';
            const titleColor = window.showCumulativeIncome ? 'text-gray-600' : 'text-red-500';

            totalAmountEl.innerHTML = `<span class="text-sm font-bold ${titleColor} truncate">${titleText}</span>`;

            // 👇 🚨 w-full을 지우고, 남은 공간만 유연하게 쓰는 flex-1과 텍스트 넘침 방지용 min-w-0 추가!
            totalAmountEl.className = 'flex-1 mb-1 flex justify-end items-center min-w-0 pl-2';
        }

        // 💡 1-2. '수입 포함' 토글 버튼을 차트 영역(chart-wrapper) 내부 좌측 상단에 예쁘게 띄웁니다!
        if (chartWrapper) {
            chartWrapper.classList.add('relative'); // 자식 요소를 absolute로 띄우기 위해 필수 추가

            // 기존에 만들어둔 토글이 있다면 먼저 지우기 (중복 생성 방지)
            const oldToggle = document.getElementById('chart-income-toggle');
            if (oldToggle) oldToggle.remove();

            const isChecked = window.showCumulativeIncome ? 'checked' : '';

            // 차트 캔버스 위에 반투명한 배경(backdrop-blur)으로 스티커처럼 오버레이!
            chartWrapper.insertAdjacentHTML(
                'beforeend',
                `
                <label id="chart-income-toggle" class="absolute top-2 left-2 z-10 flex items-center gap-1.5 cursor-pointer bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-md border border-gray-200 shadow-sm transition active:scale-95">
                    <input type="checkbox" ${isChecked} onchange="window.toggleCumIncome(this.checked)" class="w-3.5 h-3.5 text-blue-500 rounded border-gray-300 focus:ring-blue-500 cursor-pointer">
                    <span class="text-[10px] ${window.showCumulativeIncome ? 'text-blue-600 font-bold' : 'text-gray-500 font-medium'} leading-none mt-px whitespace-nowrap">수입 포함</span>
                </label>
            `
            );
        }

        let prevY = targetY;
        let prevM = targetM - 1;
        if (prevM < 0) {
            prevM = 11;
            prevY--;
        }
        const prevPrefix = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;

        const daysInMonth = new Date(targetY, targetM + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const currentExpenses = globalData.filter(
            (d) => d.Type === 'expense' && d.Date?.startsWith(prefix)
        );
        const prevExpenses = globalData.filter(
            (d) => d.Type === 'expense' && d.Date?.startsWith(prevPrefix)
        );
        const currentIncomes = globalData.filter(
            (d) => d.Type === 'income' && d.Date?.startsWith(prefix)
        );
        const prevIncomes = globalData.filter(
            (d) => d.Type === 'income' && d.Date?.startsWith(prevPrefix)
        );

        const currentCum = new Array(daysInMonth).fill(null);
        const prevCum = new Array(daysInMonth).fill(null);
        const currentIncCum = new Array(daysInMonth).fill(null);
        const prevIncCum = new Array(daysInMonth).fill(null);

        let currentSum = 0,
            prevSum = 0,
            currentIncSum = 0,
            prevIncSum = 0;
        const today = new Date();
        const isActualCurrentMonth =
            targetY === today.getFullYear() && targetM === today.getMonth();
        const todayDate = today.getDate();
        const daysInPrevMonth = new Date(prevY, prevM + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            if (i <= daysInPrevMonth) {
                const pDayStr = String(i).padStart(2, '0');
                prevSum += prevExpenses
                    .filter((d) => d.Date.substring(8, 10) === pDayStr)
                    .reduce((a, b) => a + Number(b.Amount), 0);
                prevIncSum += prevIncomes
                    .filter((d) => d.Date.substring(8, 10) === pDayStr)
                    .reduce((a, b) => a + Number(b.Amount), 0);
            }
            prevCum[i - 1] = prevSum;
            prevIncCum[i - 1] = prevIncSum;

            if (!(isActualCurrentMonth && i > todayDate)) {
                const cDayStr = String(i).padStart(2, '0');
                currentSum += currentExpenses
                    .filter((d) => d.Date.substring(8, 10) === cDayStr)
                    .reduce((a, b) => a + Number(b.Amount), 0);
                currentIncSum += currentIncomes
                    .filter((d) => d.Date.substring(8, 10) === cDayStr)
                    .reduce((a, b) => a + Number(b.Amount), 0);
                currentCum[i - 1] = currentSum;
                currentIncCum[i - 1] = currentIncSum;
            }
        }

        if (chartWrapper) chartWrapper.style.display = 'flex';
        if (noDataEl) noDataEl.classList.add('hidden');

        // 💡 2. 체크박스 상태에 따라 차트에 그릴 선(Dataset)을 동적으로 조립합니다.
        const chartDatasets = [];

        // 옵션이 켜져 있을 때만 수입 데이터(파란선)를 차트에 밀어 넣습니다.
        if (window.showCumulativeIncome) {
            chartDatasets.push({
                label: '지난달 수입',
                data: prevIncCum,
                borderColor: '#93c5fd',
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderDash: [3, 3],
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.3,
                hidden: true, // 복잡함 방지 위해 기본 숨김
            });
            chartDatasets.push({
                label: '이번달 수입',
                data: currentIncCum,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.3,
            });
        }

        // 지출 데이터(빨간선)는 무조건 들어갑니다.
        chartDatasets.push({
            label: '지난달 지출',
            data: prevCum,
            borderColor: '#d1d5db',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
        });
        chartDatasets.push({
            label: '이번달 지출',
            data: currentCum,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderWidth: 2.5,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.3,
        });

        // 차트 생성 (기존 data 속성의 배열을 chartDatasets 변수로 교체)
        new Chart(chartEl.getContext('2d'), {
            type: 'line',
            plugins: [ChartDataLabels],
            data: {
                labels: labels,
                datasets: chartDatasets, // 👈 여기에 동적으로 조립된 배열을 넣습니다.
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 20, bottom: 0, left: 10, right: 10 } },
                interaction: { mode: 'index', intersect: false },

                // 👇 이 부분을 새로 추가해서 모든 도트(점)를 강제로 숨깁니다!
                elements: {
                    point: {
                        radius: 0, // 평소에는 점을 아예 숨김
                        hitRadius: 10, // 대신 손가락 터치 인식 범위는 넓게 확보
                        hoverRadius: 5, // 터치(마우스 오버) 했을 때만 점이 뿅! 나타나게 함
                    },
                },

                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 8,
                            usePointStyle: true,
                            font: { size: 9, family: "'Pretendard', sans-serif" },
                        },
                    },
                    datalabels: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 11 },
                        bodyFont: { size: 11, weight: 'bold' },
                        padding: 10,
                        callbacks: {
                            title: (items) => `${items[0].label}일 누적액`,
                            label: (context) => {
                                if (context.parsed.y !== null && context.parsed.y > 0) {
                                    return ` ${context.dataset.label}: ${formatMoney(context.parsed.y)}`;
                                }
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 7, font: { size: 9 }, color: '#9ca3af' },
                    },
                    y: { display: false, min: 0 },
                },
            },
        });
    } else {
        // 👇 (기존의 모드 2 & 3: 도넛 차트 그리는 else 문은 그대로 유지)
        // ==========================================
        // 🍩 모드 2 & 3: 지출 / 수입 도넛 차트 그리기
        // ==========================================

        // 💡 도넛 차트 탭으로 넘어오면 누적추이 전용 '수입 포함' 버튼을 깔끔하게 지워줍니다.
        const oldToggle = document.getElementById('chart-income-toggle');
        if (oldToggle) oldToggle.remove();

        const isExpense = mode === 'expense';
        const filteredData = globalData.filter(
            (d) => d.Type === mode && d.Date?.startsWith(prefix)
        );

        let sum = 0;
        const catTotals = {};
        filteredData.forEach((item) => {
            const cat = globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
            catTotals[cat] = (catTotals[cat] || 0) + Number(item.Amount);
            sum += Number(item.Amount);
        });

        // 👇 바로 이 부분입니다! 누적추이 탭과 완전히 동일한 구조와 클래스(flex-1, mb-1 등)를 적용합니다.
        if (totalAmountEl) {
            const textColor = isExpense ? 'text-red-500' : 'text-blue-500';
            totalAmountEl.innerHTML = `<span class="text-sm font-bold ${textColor} truncate">총 ${formatMoney(sum)}</span>`;
            totalAmountEl.className = 'flex-1 mb-1 flex justify-end items-center min-w-0 pl-2';
        }

        if (!filteredData.length) {
            if (chartWrapper) chartWrapper.style.display = 'none';
            if (noDataEl) {
                noDataEl.innerText = isExpense ? '지출 내역이 없습니다.' : '수입 내역이 없습니다.';
                noDataEl.classList.remove('hidden');
            }
        } else {
            if (chartWrapper) chartWrapper.style.display = 'flex';
            if (noDataEl) noDataEl.classList.add('hidden');

            const sortedCategories = [];
            for (const [cat, val] of Object.entries(catTotals)) {
                if (val > 0) sortedCategories.push({ label: cat, value: val });
            }
            sortedCategories.sort((a, b) => b.value - a.value);

            const chartLabels = sortedCategories.map((item) => item.label);
            const chartData = sortedCategories.map((item) => item.value);

            const colorsExpense = [
                '#ef4444',
                '#f59e0b',
                '#3b82f6',
                '#10b981',
                '#8b5cf6',
                '#6366f1',
                '#ec4899',
            ];
            const colorsIncome = [
                '#3b82f6',
                '#10b981',
                '#0ea5e9',
                '#6366f1',
                '#8b5cf6',
                '#d946ef',
                '#f43f5e',
            ];

            new Chart(chartEl.getContext('2d'), {
                type: 'doughnut',
                plugins: [ChartDataLabels],
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            data: chartData,
                            backgroundColor: isExpense ? colorsExpense : colorsIncome,
                            borderWidth: 2,
                            borderColor: '#ffffff',
                            hoverOffset: 4,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 20, bottom: 20, left: 35, right: 10 } },
                    onClick: (event, elements, chart) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const categoryLabel = chart.data.labels[index];
                            openCategoryDetailModal(categoryLabel, mode, prefix);
                        }
                    },
                    onHover: (event, elements) => {
                        event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
                    },
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 8,
                                padding: 12,
                                font: { size: 9, family: "'Pretendard', sans-serif" },
                            },
                        },
                        datalabels: {
                            color: '#4b5563',
                            anchor: 'end',
                            align: 'end',
                            offset: 4,
                            font: { weight: 'bold', size: 10, family: "'Pretendard', sans-serif" },
                            formatter: (value, ctx) => {
                                let totalSum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                let percentage = ((value * 100) / totalSum).toFixed(0) + '%';
                                if ((value * 100) / totalSum <= 4) return null;
                                return percentage;
                            },
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    let label = context.label || '';
                                    if (label) label += ': ';
                                    if (context.parsed !== null)
                                        label += formatMoney(context.parsed);
                                    return label;
                                },
                            },
                        },
                    },
                },
            });
        }
    }

    // ==========================================
    // 💳 하단 카드별 정산 리스트 렌더링 (기존 로직 동일 유지)
    // ==========================================
    try {
        const container = document.getElementById('card-stats-container');
        if (!container) return;

        window.cardStatMode = window.cardStatMode || 'calendar';
        const isBilling = window.cardStatMode === 'billing';

        const btnClassOn = 'bg-white text-gray-800 shadow-sm rounded-md px-2 py-1 transition-all';
        const btnClassOff = 'text-gray-400 hover:text-gray-600 px-2 py-1 transition-all';

        container.innerHTML = `
            <div class="flex justify-between items-end mb-3 mt-6">
                <h3 class="text-xs font-bold text-gray-500">카드별 결제액</h3>
                <div class="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button onclick="setCardStatMode('calendar')" class="${!isBilling ? btnClassOn : btnClassOff}">1일~말일</button>
                    <button onclick="setCardStatMode('billing')" class="${isBilling ? btnClassOn : btnClassOff}">기준일</button>
                </div>
            </div>`;

        const cardSums = {};
        const cardDiscounts = {}; // 👇 할인 누적액을 담아둘 바구니 추가!

        globalData.forEach((item) => {
            if (item.Type !== 'expense') return;
            const parsed = parseMemo(item.Memo);
            const cardDef = globalCards.find((c) => c.Label.split('|')[0] === parsed.payMethod);
            if (!cardDef) return;

            const dayStr = cardDef.Label.split('|')[1] || '31';
            const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';

            let isTargetMonth = false;

            if (isBilling) {
                const d = new Date(item.Date);
                let y = d.getFullYear(),
                    m = d.getMonth();
                if (!isEnd && d.getDate() > parseInt(dayStr)) {
                    m++;
                    if (m > 11) {
                        m = 0;
                        y++;
                    }
                }
                if (`${y}-${String(m + 1).padStart(2, '0')}` === prefix) {
                    isTargetMonth = true;
                }
            } else {
                if (item.Date.startsWith(prefix)) {
                    isTargetMonth = true;
                }
            }

            if (isTargetMonth) {
                cardSums[parsed.payMethod] =
                    (cardSums[parsed.payMethod] || 0) + Number(item.Amount);
                // 👇 해당 달의 카드별 할인액도 차곡차곡 더해줍니다!
                cardDiscounts[parsed.payMethod] =
                    (cardDiscounts[parsed.payMethod] || 0) + (parsed.discount || 0);
            }
        });

        const cardStatsList = [];

        globalCards.forEach((card) => {
            const [name, dayStr] = card.Label.split('|');
            const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';

            let start, end;
            if (isBilling) {
                if (isEnd) {
                    start = new Date(targetY, targetM, 1);
                    end = new Date(targetY, targetM + 1, 0);
                } else {
                    const closingDay = parseInt(dayStr);
                    end = new Date(targetY, targetM, closingDay);
                    start = new Date(targetY, targetM - 1, closingDay + 1);
                }
            } else {
                start = new Date(targetY, targetM, 1);
                end = new Date(targetY, targetM + 1, 0);
            }

            const displayDay = isBilling ? (isEnd ? '말일' : `${dayStr}일`) : '1일~말일';
            const amount = cardSums[name] || 0;
            const discount = cardDiscounts[name] || 0; // 👇 누적된 할인액 가져오기

            if (amount > 0) {
                cardStatsList.push({ name, displayDay, start, end, amount, discount }); // 리스트에 할인액도 포함
            }
        });

        cardStatsList.sort((a, b) => {
            if (b.amount !== a.amount) return b.amount - a.amount;
            return a.name.localeCompare(b.name);
        });

        cardStatsList.forEach((stat) => {
            container.insertAdjacentHTML(
                'beforeend',
                // 👇 전체 뼈대를 flex justify-between items-center 로 묶어서 좌우 수직 중앙 정렬을 맞춥니다.
                `<div onclick="openCardDetailModal('${stat.name}', '${prefix}', '${window.cardStatMode}')" class="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 mb-2 shadow-sm cursor-pointer hover:bg-gray-200 active:scale-[0.99] transition flex justify-between items-center">

                    <div class="flex-1 min-w-0">
                        <div class="flex items-center mb-1">
                            <span class="text-sm font-extrabold text-gray-800 leading-none truncate">${stat.name}</span>
                            <span class="text-[10px] text-indigo-500 font-bold ml-1 shrink-0">기준: ${stat.displayDay}</span>
                        </div>
                        <div class="text-[10px] text-gray-400 flex items-center gap-1">
                            <span class="material-symbols-outlined text-[12px]">calendar_today</span>
                            ${stat.start.toLocaleDateString()} ~ ${stat.end.toLocaleDateString()}
                        </div>
                    </div>

                    <div class="text-right shrink-0 ml-3">
                        <p class="text-sm font-black text-gray-900 leading-none">${formatMoney(stat.amount)}</p>
                        ${stat.discount > 0 ? `<p class="text-[10px] text-blue-500 mt-1 font-bold tracking-tight">할인 ${formatMoney(stat.discount)}</p>` : ''}
                    </div>

                </div>`
            );
        });

        if (cardStatsList.length === 0) {
            container.insertAdjacentHTML(
                'beforeend',
                '<p class="text-center text-gray-400 text-sm py-4 font-medium">이번달 정산될 카드 내역이 없습니다.</p>'
            );
        }
    } catch (e) {
        console.error('카드 리스트 렌더링 중 에러 발생:', e);
    }
};

// ==========================================
// 💡 이번 달 총 수입/지출 및 지난달 대비 증감 계산
// ==========================================
window.updateMonthlyTotals = function () {
    if (typeof globalData === 'undefined' || !globalData) return;

    const targetY = currentDisplayDate.getFullYear();
    const targetM = currentDisplayDate.getMonth();

    // 이번 달 접두사 (예: "2026-03")
    const currentPrefix = `${targetY}-${String(targetM + 1).padStart(2, '0')}`;

    // 지난달 접두사 계산
    let prevY = targetY;
    let prevM = targetM - 1;
    if (prevM < 0) {
        prevM = 11;
        prevY--;
    }
    const prevPrefix = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;

    let currentIncome = 0;
    let currentExpense = 0;
    let prevIncome = 0;
    let prevExpense = 0;

    globalData.forEach((item) => {
        if (!item.Date) return;

        if (item.Date.startsWith(currentPrefix)) {
            if (item.Type === 'income') currentIncome += Number(item.Amount);
            if (item.Type === 'expense') currentExpense += Number(item.Amount);
        } else if (item.Date.startsWith(prevPrefix)) {
            if (item.Type === 'income') prevIncome += Number(item.Amount);
            if (item.Type === 'expense') prevExpense += Number(item.Amount);
        }
    });

    // 👇 1. HTML의 실제 ID(monthly-income-total)에 맞춰서 이번 달 금액 넣기
    const elIncome = document.getElementById('monthly-income-total');
    const elExpense = document.getElementById('monthly-expense-total');
    if (elIncome) elIncome.innerText = formatMoney(currentIncome);
    if (elExpense) elExpense.innerText = formatMoney(currentExpense);

    // 👇 2. 지난달 대비 증감(MoM) 계산 및 화면에 찍기
    const momIncomeEl = document.getElementById('mom-income');
    const momExpenseEl = document.getElementById('mom-expense');

    if (momIncomeEl) {
        const diff = currentIncome - prevIncome;
        if (prevIncome === 0 && currentIncome === 0) {
            momIncomeEl.innerHTML = `<span class="text-gray-300">내역 없음</span>`;
        } else if (diff > 0) {
            momIncomeEl.innerHTML = `<span class="text-blue-500 font-bold flex items-center justify-center gap-0.5"><span class="material-symbols-outlined text-[12px]">arrow_upward</span>${formatMoney(diff)}</span>`;
        } else if (diff < 0) {
            momIncomeEl.innerHTML = `<span class="text-red-400 font-bold flex items-center justify-center gap-0.5"><span class="material-symbols-outlined text-[12px]">arrow_downward</span>${formatMoney(Math.abs(diff))}</span>`;
        } else {
            momIncomeEl.innerHTML = `<span class="text-gray-400">지난달과 동일</span>`;
        }
    }

    if (momExpenseEl) {
        const diff = currentExpense - prevExpense;
        if (prevExpense === 0 && currentExpense === 0) {
            momExpenseEl.innerHTML = `<span class="text-gray-300">내역 없음</span>`;
        } else if (diff > 0) {
            momExpenseEl.innerHTML = `<span class="text-red-500 font-bold flex items-center justify-center gap-0.5"><span class="material-symbols-outlined text-[12px]">arrow_upward</span>${formatMoney(diff)}</span>`;
        } else if (diff < 0) {
            momExpenseEl.innerHTML = `<span class="text-blue-500 font-bold flex items-center justify-center gap-0.5"><span class="material-symbols-outlined text-[12px]">arrow_downward</span>${formatMoney(Math.abs(diff))}</span>`;
        } else {
            momExpenseEl.innerHTML = `<span class="text-gray-400">지난달과 동일</span>`;
        }
    }
};

// ==========================================
// Dropdown 및 Modal 제어
// ==========================================
window.renderCardDropdown = () => {
    const select = document.getElementById('input-card-select');
    if (!select) return;
    select.innerHTML = '<option value="">카드 선택</option>';
    globalCards.forEach((c) => {
        const name = c.Label.split('|')[0];
        select.insertAdjacentHTML(
            'beforeend',
            `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`
        );
    });
};

// ==========================================
// 💡 입력창(Dropdown) 카테고리 렌더링 (커스텀 순서 반영)
// ==========================================
window.renderCategoryDropdown = (type) => {
    const select = document.getElementById('input-category');
    if (!select) return;
    select.innerHTML = '<option value="">카테고리 선택</option>';

    // 스마트폰에 저장된 나만의 카테고리 순서표를 불러옵니다.
    const savedOrder = JSON.parse(localStorage.getItem('categoryOrder')) || [];

    globalCategories
        .filter((c) => c.Type === type)
        .sort((a, b) => {
            const idxA = savedOrder.indexOf(a.Value);
            const idxB = savedOrder.indexOf(b.Value);

            // 둘 다 저장된 순서가 있으면 그 순서대로
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            // a만 있으면 a가 위로
            if (idxA !== -1) return -1;
            // b만 있으면 b가 위로
            if (idxB !== -1) return 1;

            // 새로 추가해서 순서가 없는 애들은 맨 밑에서 가나다순 정렬
            return a.Label.localeCompare(b.Label);
        })
        .forEach((c) =>
            select.insertAdjacentHTML('beforeend', `<option value="${c.Value}">${c.Label}</option>`)
        );
};

window.toggleCardSelect = () => {
    const isCard = document.querySelector('input[name="pay_type"]:checked')?.value === 'card';
    document.getElementById('input-card-select')?.classList.toggle('hidden', !isCard);
    document.getElementById('discount-area')?.classList.toggle('hidden', !isCard);
    if (!isCard) document.getElementById('input-discount').value = '';
};

window.openAddModal = () => {
    document.getElementById('modal-title').innerText = '새 내역 추가';
    document.getElementById('add-form').reset();
    document.getElementById('input-id').value = '';
    document.getElementById('input-action').value = 'create';

    // 👇 UTC 기준이 아닌, 사용자의 로컬 시간(한국 시간) 기준으로 오늘 날짜를 구합니다!
    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    document.getElementById('input-date').value = localDate;

    document.getElementById('save-btn').innerText = '저장하기';
    document.getElementById('delete-btn').classList.add('hidden');
    document.getElementById('payment-section').classList.remove('hidden');

    renderCardDropdown();
    toggleCardSelect();
    renderCategoryDropdown('expense');

    const modal = document.getElementById('add-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('modal-content').classList.remove('translate-y-full');
    }, 10);

    const amountInput = document.getElementById('input-amount');

    // 💡 HTML에 가이드 텍스트 요소가 없으면, 입력창을 감싸는 껍데기를 만들고 우측에 텍스트를 띄웁니다!
    if (!document.getElementById('krw-guide-text')) {
        // 1. input을 감싸는 상대적(relative) 껍데기(div) 생성
        const wrapper = document.createElement('div');
        wrapper.className = 'relative flex items-center w-full';

        // 2. 기존 input 자리에 껍데기를 넣고, input을 껍데기 안으로 쏙 집어넣음
        amountInput.parentNode.insertBefore(wrapper, amountInput);
        wrapper.appendChild(amountInput);

        // 3. 타이핑한 숫자와 우측 글씨가 겹치지 않도록 input에 우측 여백(padding)을 넉넉히 줌
        amountInput.classList.add('pr-[80px]');

        // 4. 환산 텍스트를 생성하여 input 내 우측에 둥둥 띄움 (absolute)
        const guide = document.createElement('span');
        guide.id = 'krw-guide-text';
        // pointer-events-none을 줘서, 파란 글씨를 터치해도 input이 정상적으로 선택되게 만듭니다.
        guide.className =
            'absolute right-3 text-[12px] text-blue-500 font-bold hidden pointer-events-none bg-transparent text-right truncate';
        wrapper.appendChild(guide);

        // 입력할 때마다 환산액 업데이트 리스너 등록
        amountInput.addEventListener('input', window.updateKrwGuide);
    }

    // 모달 열 때 초기 실행
    window.updateKrwGuide();
};

window.openEditModal = (id) => {
    const item = globalData.find((d) => d.ID === id);
    if (!item) return;
    document.getElementById('modal-title').innerText = '내역 수정';
    document.getElementById('input-id').value = item.ID;
    document.getElementById('input-action').value = 'update';
    document.querySelector(`input[name="type"][value="${item.Type}"]`).checked = true;
    renderCategoryDropdown(item.Type);
    document.getElementById('input-date').value = item.Date.substring(0, 10);
    document.getElementById('input-category').value = item.Category;

    const parsed = parseMemo(item.Memo);
    const originalPrice = Number(item.Amount) + parsed.discount;
    document.getElementById('input-amount').value = originalPrice.toLocaleString('ko-KR');
    document.getElementById('input-discount').value =
        parsed.discount > 0 ? parsed.discount.toLocaleString('ko-KR') : '';
    document.getElementById('input-item-name').value = parsed.itemName;
    document.getElementById('input-memo-detail').value = parsed.detailMemo;

    const paySection = document.getElementById('payment-section');
    if (item.Type === 'income') {
        paySection.classList.add('hidden');
    } else {
        paySection.classList.remove('hidden');
        renderCardDropdown();
        if (parsed.payMethod === '현금') {
            document.querySelector('input[name="pay_type"][value="cash"]').checked = true;
        } else {
            document.querySelector('input[name="pay_type"][value="card"]').checked = true;
            document.getElementById('input-card-select').value = parsed.payMethod;
        }
        toggleCardSelect();
    }
    document.getElementById('save-btn').innerText = '수정하기';
    document.getElementById('delete-btn').classList.remove('hidden');
    const modal = document.getElementById('add-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('modal-content').classList.remove('translate-y-full');
    }, 10);

    const amountInput = document.getElementById('input-amount');

    // 💡 HTML에 가이드 텍스트 요소가 없으면, 입력창을 감싸는 껍데기를 만들고 우측에 텍스트를 띄웁니다!
    if (!document.getElementById('krw-guide-text')) {
        // 1. input을 감싸는 상대적(relative) 껍데기(div) 생성
        const wrapper = document.createElement('div');
        wrapper.className = 'relative flex items-center w-full';

        // 2. 기존 input 자리에 껍데기를 넣고, input을 껍데기 안으로 쏙 집어넣음
        amountInput.parentNode.insertBefore(wrapper, amountInput);
        wrapper.appendChild(amountInput);

        // 3. 타이핑한 숫자와 우측 글씨가 겹치지 않도록 input에 우측 여백(padding)을 넉넉히 줌
        amountInput.classList.add('pr-[80px]');

        // 4. 환산 텍스트를 생성하여 input 내 우측에 둥둥 띄움 (absolute)
        const guide = document.createElement('span');
        guide.id = 'krw-guide-text';
        // pointer-events-none을 줘서, 파란 글씨를 터치해도 input이 정상적으로 선택되게 만듭니다.
        guide.className =
            'absolute right-3 text-[12px] text-blue-500 font-bold hidden pointer-events-none bg-transparent text-right truncate';
        wrapper.appendChild(guide);

        // 입력할 때마다 환산액 업데이트 리스너 등록
        amountInput.addEventListener('input', window.updateKrwGuide);
    }

    // 모달 열 때 초기 실행
    window.updateKrwGuide();
};

window.closeAddModal = () => {
    const modal = document.getElementById('add-modal');
    modal.classList.add('opacity-0');
    document.getElementById('modal-content').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

// ==========================================
// 신용카드 관리 모달 리스트 렌더링
// ==========================================
window.openCardModal = () => {
    // 💡 모달을 열 때 폼과 버튼을 항상 초기 상태('추가')로 리셋
    const btnCard = document.getElementById('btn-add-card');
    if (btnCard) {
        btnCard.innerText = '추가';
        btnCard.className =
            'bg-primary text-white px-3 py-2 text-sm rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors';
        btnCard.onclick = addCard;
    }
    document.getElementById('new-card-label').value = '';
    document.getElementById('new-card-day').value = '';

    const container = document.getElementById('card-list-container');
    container.innerHTML = globalCards.length
        ? ''
        : '<li class="py-4 text-center text-gray-500 text-sm">카드가 없습니다.</li>';

    globalCards.forEach((c) => {
        const [name, dayStr] = c.Label.split('|');
        const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';
        const displayDay = isEnd ? '말일' : `${dayStr}일`;

        container.insertAdjacentHTML(
            'beforeend',
            `<li class="py-1.5 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-800">${escapeHTML(name)}</span>
                    <span class="text-[10px] text-gray-400">기준: ${displayDay}</span>
                </div>
                <div class="flex gap-1 shrink-0">
                    <button onclick="prepareEditCard('${c.Value}', '${escapeHTML(name)}', '${dayStr}')" class="text-gray-400 hover:text-blue-500 transition p-1">
                        <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onclick="deleteCard('${c.Value}')" class="text-gray-400 hover:text-red-500 transition p-1">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            </li>`
        );
    });

    document.getElementById('card-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('card-modal').classList.remove('opacity-0');
        document.getElementById('card-modal-content').classList.remove('scale-95');
    }, 10);
};

// 👇 수정 버튼 클릭 시 상단 입력칸으로 데이터를 불러오는 로직
window.prepareEditCard = (val, name, dayStr) => {
    document.getElementById('new-card-label').value = name;
    document.getElementById('new-card-day').value =
        dayStr === '말' || dayStr === '말일' || dayStr === '31' ? '말' : dayStr;

    const btn = document.getElementById('btn-add-card');
    btn.innerText = '수정';
    btn.className =
        'bg-blue-500 text-white px-3 py-2 text-sm rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors shadow-md';
    btn.onclick = () => submitEditCard(val);
};

window.closeCardModal = () => {
    document.getElementById('card-modal').classList.add('opacity-0');
    setTimeout(() => document.getElementById('card-modal').classList.add('hidden'), 300);
};

// ==========================================
// 💡 카테고리 관리 모달 리스트 렌더링 및 드래그 엔진 장착
// ==========================================
window.openCategoryModal = () => {
    const btnCat = document.getElementById('btn-add-cat');
    if (btnCat) {
        btnCat.innerText = '추가';
        btnCat.className =
            'bg-primary text-white px-3 py-2 text-sm rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors';
        btnCat.onclick = addCategory;
    }
    document.getElementById('new-cat-label').value = '';

    const container = document.getElementById('category-list-container');
    container.innerHTML = '';

    // 스마트폰에 저장된 나만의 카테고리 순서표를 불러옵니다.
    const savedOrder = JSON.parse(localStorage.getItem('categoryOrder')) || [];

    const sortedCategories = [...globalCategories].sort((a, b) => {
        const idxA = savedOrder.indexOf(a.Value);
        const idxB = savedOrder.indexOf(b.Value);

        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;

        if (a.Type !== b.Type) return a.Type === 'income' ? -1 : 1;
        return a.Label.localeCompare(b.Label);
    });

    if (sortedCategories.length === 0) {
        container.innerHTML =
            '<li class="py-4 text-center text-gray-500 text-sm">카테고리가 없습니다.</li>';
    } else {
        sortedCategories.forEach((c) => {
            const typeBadge =
                c.Type === 'expense'
                    ? '<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">지출</span>'
                    : '<span class="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">수입</span>';

            // 👇 li 태그에 data-id를 달아주고, 햄버거 버튼(menu)을 추가했습니다.
            container.insertAdjacentHTML(
                'beforeend',
                `<li class="py-2 flex justify-between items-center gap-2 bg-white" data-id="${c.Value}">
                    <div class="flex items-center gap-2 overflow-hidden flex-1">
                        <span class="material-symbols-outlined text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 drag-handle text-[18px] p-1">menu</span>
                        ${typeBadge}
                        <span class="text-sm font-medium text-gray-800 truncate">${c.Label}</span>
                    </div>
                    <div class="flex gap-1 shrink-0">
                        <button onclick="prepareEditCategory('${c.Value}', '${c.Label}', '${c.Type}')" class="text-gray-400 hover:text-blue-500 transition p-1">
                            <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onclick="deleteCategory('${c.Value}')" class="text-gray-400 hover:text-red-500 transition p-1">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </li>`
            );
        });
    }

    // 💡 부드러운 드래그 앤 드롭 기능(SortableJS) 활성화
    if (window.categorySortable) {
        window.categorySortable.destroy(); // 중복 생성 방지
    }

    window.categorySortable = new Sortable(container, {
        handle: '.drag-handle', // 햄버거 아이콘을 잡았을 때만 이동하게 설정
        animation: 150, // 스르륵 이동하는 애니메이션 속도
        ghostClass: 'bg-gray-50', // 드래그 중인 항목의 배경색 변경
        onEnd: function () {
            // 드래그해서 위치를 내려놓는 순간, 바뀐 순서를 쫙 읽어들여서 스마트폰에 기억시킵니다!
            const newOrder = Array.from(container.children).map((li) => li.getAttribute('data-id'));
            localStorage.setItem('categoryOrder', JSON.stringify(newOrder));
        },
    });

    document.getElementById('category-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('category-modal').classList.remove('opacity-0'), 10);
};

// 👇 수정 버튼 클릭 시 상단 입력칸으로 데이터를 불러오는 로직
window.prepareEditCategory = (val, label, type) => {
    document.getElementById('new-cat-type').value = type;
    document.getElementById('new-cat-label').value = label;

    const btn = document.getElementById('btn-add-cat');
    btn.innerText = '수정';
    btn.className =
        'bg-blue-500 text-white px-3 py-2 text-sm rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors shadow-md';
    btn.onclick = () => submitEditCategory(val);
};

window.closeCategoryModal = () => document.getElementById('category-modal').classList.add('hidden');

// ==========================================
// 날짜 클릭 시 상세 내역 모달 (기존 주간 -> 일간으로 변경)
// ==========================================
window.openWeeklyModal = function (clickedDateStr) {
    const targetDate = clickedDateStr.substring(0, 10);
    const d = new Date(targetDate);
    const displayDate = window.formatDateStr(d);

    const modal = document.getElementById('weekly-modal');
    const titleEl = modal.querySelector('h3');
    if (titleEl) titleEl.innerText = '일간 상세 내역';

    document.getElementById('weekly-date-range').innerHTML = `
        <div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
            <span class="material-symbols-outlined text-[14px]">calendar_today</span>
            ${displayDate}
        </div>
    `;

    const dailyData = globalData.filter((item) => item.Date.substring(0, 10) === targetDate);
    const container = document.getElementById('weekly-list-container');
    container.innerHTML = '';

    if (dailyData.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16">
                <span class="material-symbols-outlined text-gray-300 text-5xl mb-3">receipt_long</span>
                <p class="text-center text-gray-400 text-sm font-medium">이 날은 내역이 없습니다.</p>
            </div>`;
    } else {
        applyTopRanks(dailyData);

        // 👇 추가된 부분: 일간 데이터 배열 뒤집기
        let itemsToRender = dailyData;
        if (window.listSortOrder === 'desc') {
            itemsToRender = [...dailyData].reverse();
        }

        itemsToRender.forEach((item) => {
            const isExp = item.Type === 'expense';
            let catLabel = '미분류';
            if (item.Category) {
                const foundCat = globalCategories.find((c) => c.Value === item.Category);
                catLabel = foundCat ? foundCat.Label : item.Category;
            }
            const parsed = parseMemo(item.Memo);
            const iconName = getCategoryIcon(catLabel);
            const amountNum = Number(item.Amount);
            const displayColor = isExp ? 'text-red-500' : 'text-blue-500';
            const iconBg = isExp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
            const displaySign = amountNum < 0 ? '-' : '';

            const krwValue = getKrwEquivalent(Math.abs(amountNum));

            container.insertAdjacentHTML(
                'beforeend',
                `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                    <div class="flex items-center gap-2.5 flex-1 min-w-0">
                        <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm">${iconName}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center">
                                <p class="text-sm font-bold text-gray-800 truncate">${escapeHTML(parsed.itemName)}</p>
                                ${item.rankBadge || ''}
                            </div>
                            <p class="text-[10px] text-gray-400 mt-1 truncate">${escapeHTML(catLabel)} • ${escapeHTML(parsed.payMethod)}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0 ml-3">
                        <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formatMoney(Math.abs(amountNum))}</p>
                        ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                        ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${formatMoney(parsed.discount)}</p>` : ''}
                    </div>
                </div>`
            );
        });
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('weekly-modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.closeWeeklyModal = function () {
    const modal = document.getElementById('weekly-modal');
    modal.classList.add('opacity-0');
    document.getElementById('weekly-modal-content').classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// ==========================================
// 2. 카드 상세 내역 모달 제어 (말일 로직 추가)
// ==========================================
window.openCardDetailModal = function (cardName, prefix, mode = 'calendar') {
    const cardDef = globalCards.find((c) => c.Label.split('|')[0] === cardName);
    if (!cardDef) return;

    const dayStr = cardDef.Label.split('|')[1] || '31';
    const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';
    const isBilling = mode === 'billing';

    const [targetY, targetMStr] = prefix.split('-');
    const year = parseInt(targetY);
    const month = parseInt(targetMStr) - 1;

    let start, end;
    if (isBilling) {
        if (isEnd) {
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0);
        } else {
            const closingDay = parseInt(dayStr);
            end = new Date(year, month, closingDay);
            start = new Date(year, month - 1, closingDay + 1);
        }
    } else {
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
    }

    document.getElementById('card-detail-title').innerText = `${cardName} 결제 내역`;
    document.getElementById('card-detail-date-range').innerText =
        `${start.toLocaleDateString()} ~ ${end.toLocaleDateString()} ${!isBilling ? '(달력 기준)' : ''}`;

    const filteredData = globalData.filter((item) => {
        if (item.Type !== 'expense') return false;
        const parsed = parseMemo(item.Memo);
        if (parsed.payMethod !== cardName) return false;

        if (isBilling) {
            const d = new Date(item.Date);
            let y = d.getFullYear(),
                m = d.getMonth();
            if (!isEnd && d.getDate() > parseInt(dayStr)) {
                m++;
                if (m > 11) {
                    m = 0;
                    y++;
                }
            }
            return `${y}-${String(m + 1).padStart(2, '0')}` === prefix;
        } else {
            return item.Date.startsWith(prefix);
        }
    });

    const container = document.getElementById('card-detail-list-container');
    container.innerHTML = '';

    if (filteredData.length === 0) {
        container.innerHTML =
            '<p class="text-center text-gray-500 py-10 text-sm">결제 내역이 없습니다.</p>';
    } else {
        applyTopRanks(filteredData);

        // 💡 날짜별로 데이터를 그룹핑(묶기) 합니다.
        const groupedByDate = {};
        filteredData.forEach((item) => {
            const dateStr = item.Date.substring(0, 10);
            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
            groupedByDate[dateStr].push(item);
        });

        // 👇 그룹핑된 날짜들을 정렬 옵션에 맞춰 정렬합니다.
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
            return window.listSortOrder === 'asc'
                ? new Date(a) - new Date(b)
                : new Date(b) - new Date(a);
        });

        // 정렬 토글 버튼 삽입
        container.insertAdjacentHTML(
            'beforeend',
            `
            <div class="flex justify-end mb-3 px-1">
                <button onclick="window.listSortOrder = window.listSortOrder === 'asc' ? 'desc' : 'asc'; localStorage.setItem('listSortOrder', window.listSortOrder); openCardDetailModal('${cardName}', '${prefix}', '${mode}');" class="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 font-bold bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm transition-all active:scale-95">
                    <span class="material-symbols-outlined text-[14px]">swap_vert</span>
                    ${window.listSortOrder === 'asc' ? t('과거순 (1일 ➔ 말일)') : t('최신순 (말일 ➔ 1일)')}
                </button>
            </div>
        `
        );

        // 💡 정렬된 날짜 순서대로 그룹 헤더와 내부 아이템들을 그려줍니다.
        sortedDates.forEach((dateStr) => {
            const d = new Date(dateStr);
            const displayDate = window.formatDateStr(d);

            // 날짜 구분선 (헤더) 렌더링
            container.insertAdjacentHTML(
                'beforeend',
                `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
                    <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                    ${displayDate}
                </div>`
            );

            // 👇 추가된 부분: 카드 상세 모달 내부 순서 뒤집기
            let itemsForDate = groupedByDate[dateStr];
            if (window.listSortOrder === 'desc') {
                itemsForDate = [...itemsForDate].reverse();
            }

            // 해당 날짜에 속한 항목 렌더링
            itemsForDate.forEach((item) => {
                const parsed = parseMemo(item.Memo);
                const catLabel =
                    globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
                const iconName = getCategoryIcon(catLabel);
                const amountNum = Number(item.Amount);
                const displayColor = 'text-red-500';
                const iconBg = 'bg-red-100 text-red-600';
                const displaySign = amountNum < 0 ? '-' : '';

                const krwValue = getKrwEquivalent(Math.abs(amountNum));

                container.insertAdjacentHTML(
                    'beforeend',
                    `
                    <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition">
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                            <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-sm">${iconName}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center">
                                    <p class="text-sm font-bold text-gray-800 truncate">${escapeHTML(parsed.itemName)}</p>
                                    ${item.rankBadge || ''}
                                </div>
                                <p class="text-[10px] text-gray-400 mt-1 truncate">${catLabel}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0 ml-3">
                            <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formatMoney(Math.abs(amountNum))}</p>
                            ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                            ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${formatMoney(parsed.discount)}</p>` : ''}
                        </div>
                    </div>
                `
                );
            });
        });
    }

    const modal = document.getElementById('card-detail-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('card-detail-modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.closeCardDetailModal = function () {
    const modal = document.getElementById('card-detail-modal');
    modal.classList.add('opacity-0');
    document.getElementById('card-detail-modal-content').classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// ==========================================
// 월간 수입/지출 클릭 시 상세 내역 모달 띄우기 (날짜별 그룹핑 적용)
// ==========================================
window.openMonthlyModal = function (type) {
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    const typeName = type === 'income' ? '수입' : '지출';
    const modal = document.getElementById('weekly-modal');
    const titleEl = modal.querySelector('h3');
    if (titleEl) titleEl.innerText = `${month}월 ${typeName} 상세 내역`;
    document.getElementById('weekly-date-range').innerText = `${year}년 ${month}월 전체`;

    const monthlyData = globalData.filter((item) => {
        return item.Date.startsWith(prefix) && item.Type === type;
    });

    const container = document.getElementById('weekly-list-container');
    container.innerHTML = '';

    if (monthlyData.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16">
                <span class="material-symbols-outlined text-gray-300 text-5xl mb-3">receipt_long</span>
                <p class="text-center text-gray-400 text-sm font-medium">이번달 ${typeName} 내역이 없습니다.</p>
            </div>`;
    } else {
        applyTopRanks(monthlyData);

        const groupedByDate = {};
        monthlyData.forEach((item) => {
            const dateStr = item.Date.substring(0, 10);
            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
            groupedByDate[dateStr].push(item);
        });

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
            return window.listSortOrder === 'asc'
                ? new Date(a) - new Date(b)
                : new Date(b) - new Date(a);
        });

        container.insertAdjacentHTML(
            'beforeend',
            `
            <div class="flex justify-end mb-2 px-1">
                <button onclick="window.listSortOrder = window.listSortOrder === 'asc' ? 'desc' : 'asc'; localStorage.setItem('listSortOrder', window.listSortOrder); openMonthlyModal('${type}');" class="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 font-bold bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm transition-all active:scale-95">
                    <span class="material-symbols-outlined text-[14px]">swap_vert</span>
                    ${window.listSortOrder === 'asc' ? t('과거순 (1일 ➔ 말일)') : t('최신순 (말일 ➔ 1일)')}
                </button>
            </div>
        `
        );

        sortedDates.forEach((dateStr) => {
            const d = new Date(dateStr);
            const displayDate = window.formatDateStr(d);

            container.insertAdjacentHTML(
                'beforeend',
                `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
                    <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                    ${displayDate}
                </div>`
            );

            // 👇 추가된 부분: 월간 수입/지출 모달 내부 순서 뒤집기
            let itemsForDate = groupedByDate[dateStr];
            if (window.listSortOrder === 'desc') {
                itemsForDate = [...itemsForDate].reverse();
            }

            itemsForDate.forEach((item) => {
                const isExp = item.Type === 'expense';
                let catLabel = '미분류';
                if (item.Category) {
                    const foundCat = globalCategories.find((c) => c.Value === item.Category);
                    catLabel = foundCat ? foundCat.Label : item.Category;
                }
                const parsed = parseMemo(item.Memo);
                const iconName = getCategoryIcon(catLabel);
                const amountNum = Number(item.Amount);
                const displayColor = isExp ? 'text-red-500' : 'text-blue-500';
                const iconBg = isExp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
                const displaySign = amountNum < 0 ? '-' : '';

                const krwValue = getKrwEquivalent(Math.abs(amountNum));

                container.insertAdjacentHTML(
                    'beforeend',
                    `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                            <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-sm">${iconName}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center">
                                    <p class="text-sm font-bold text-gray-800 truncate">${escapeHTML(parsed.itemName)}</p>
                                    ${item.rankBadge || ''}
                                </div>
                                <p class="text-[10px] text-gray-400 mt-1 truncate">${escapeHTML(catLabel)} • ${escapeHTML(parsed.payMethod)}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0 ml-3">
                            <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formatMoney(Math.abs(amountNum))}</p>
                            ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                            ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${formatMoney(parsed.discount)}</p>` : ''}
                        </div>
                    </div>`
                );
            });
        });
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('weekly-modal-content').classList.remove('translate-y-full');
    }, 10);
};

// ==========================================
// 💡 항목명 자동완성(Auto-complete) 기능
// ==========================================
window.showSuggestions = (text) => {
    const box = document.getElementById('suggestion-box');
    if (!box) return;

    const keyword = text.trim().toLowerCase();

    // 검색어가 없으면 박스 숨김
    if (keyword.length === 0) {
        box.innerHTML = '';
        box.classList.add('hidden');
        return;
    }

    // 1. 과거 데이터에서 항목명만 중복 없이 싹 뽑아옵니다.
    const uniqueNames = [];
    const seen = new Set();

    if (typeof globalData !== 'undefined') {
        globalData.forEach((item) => {
            if (!item.Memo) return;
            const parsed = parseMemo(item.Memo);
            const name = parsed.itemName.trim();

            if (name && !seen.has(name)) {
                seen.add(name);
                uniqueNames.push(name);
            }
        });
    }

    // 2. 내가 입력한 글자가 포함된 항목명만 걸러내기 (최대 5개)
    const matched = uniqueNames.filter((name) => name.toLowerCase().includes(keyword)).slice(0, 5);

    // 검색 결과가 없으면 박스 숨김
    if (matched.length === 0) {
        box.innerHTML = '';
        box.classList.add('hidden');
        return;
    }

    // 3. 찾은 항목들을 화면에 예쁘게 그려주기
    box.innerHTML = matched
        .map(
            (name) =>
                `<div onclick="selectSuggestion('${name.replace(/'/g, "\\'")}')" class="px-4 py-2.5 border-b border-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer active:bg-gray-200 transition">
            <span class="material-symbols-outlined text-[14px] text-gray-400 align-middle mr-1">history</span>
            ${escapeHTML(name)}
        </div>`
        )
        .join('');

    box.classList.remove('hidden');
};

// ==========================================
// 💡 추천 항목을 터치했을 때 입력창에 쏙 집어넣는 함수
// ==========================================
window.selectSuggestion = (name) => {
    // 👇 회원님의 실제 input id 적용
    const input = document.getElementById('input-item-name');
    if (input) {
        input.value = name;
    }

    const box = document.getElementById('suggestion-box');
    if (box) {
        box.innerHTML = '';
        box.classList.add('hidden');
    }
};

// ==========================================
// 💡 화면의 다른 곳을 터치하면 자동완성 박스가 조용히 닫히도록 처리
// ==========================================
document.addEventListener('click', (e) => {
    const box = document.getElementById('suggestion-box');
    const input = document.getElementById('input-item-name');

    if (box && input && e.target !== input && !box.contains(e.target)) {
        box.classList.add('hidden');
    }
});

// ==========================================
// 💡 금액 입력창 마이너스(+/-) 토글 기능
// ==========================================
window.toggleMinusSign = () => {
    const input = document.getElementById('input-amount');
    if (!input) return;

    let val = input.value.trim();

    // 이미 '-' 기호가 맨 앞에 있다면 지워주고 (플러스로 변경)
    if (val.startsWith('-')) {
        input.value = val.substring(1);
    }
    // '-' 기호가 없다면 맨 앞에 붙여줍니다 (마이너스로 변경)
    else {
        input.value = '-' + val;
    }
};

// ==========================================
// 💡 수입 탭으로 변경 시, 입력창의 '-' 기호 자동 제거
// ==========================================
document.addEventListener('change', (e) => {
    // 클릭한 것이 수입/지출 라디오 버튼이고, 그 값이 'income(수입)'이라면
    if (e.target.name === 'type' && e.target.value === 'income') {
        const amountInput = document.getElementById('input-amount');
        // 금액에 마이너스가 붙어있으면 떼어버립니다.
        if (amountInput && amountInput.value.startsWith('-')) {
            amountInput.value = amountInput.value.substring(1);
        }
    }
});

// ==========================================
// 📈 환율 미니 차트 (Sparkline) 팝업 기능
// ==========================================
window.exchangeMiniChartInstance = null;

// 1. 팝업 열기/닫기 함수
window.toggleExchangeRateChart = () => {
    const popup = document.getElementById('exchange-chart-popup');
    if (!popup) return;

    if (popup.classList.contains('hidden')) {
        popup.classList.remove('hidden');
        renderExchangeMiniChart(); // 열릴 때 차트를 그립니다.
    } else {
        popup.classList.add('hidden');
    }
};

// 2. 미니 꺾은선 차트 그리기 (실제 데이터 연동)
window.renderExchangeMiniChart = async () => {
    const canvas = document.getElementById('exchangeMiniChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 차트를 새로 그리기 전에 혹시 남아있을지 모를 기존 차트 삭제
    if (window.exchangeMiniChartInstance) {
        window.exchangeMiniChartInstance.destroy();
        window.exchangeMiniChartInstance = null;
    }

    // 💡 데이터를 가져오는 동안 빈 화면 대신 로딩 문구를 띄워줍니다.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 11px 'Pretendard', sans-serif";
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('실제 환율 데이터를 불러오는 중...', 10, 40);

    try {
        const labels = [];
        const data = [];
        const fetchPromises = [];
        const today = new Date();

        // 1. 오늘부터 과거 6일까지 총 7일치의 날짜를 계산합니다.
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);

            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateString = `${yyyy}-${mm}-${dd}`; // 예: 2026-03-20

            labels.push(`${d.getMonth() + 1}/${d.getDate()}`);

            // 2. 무료 환율 API 주소 설정 (오늘 날짜는 latest, 과거는 특정 날짜)
            const apiUrl =
                i === 0
                    ? 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json'
                    : `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateString}/v1/currencies/cny.json`;

            // 7일 치 API 요청을 배열에 담습니다.
            fetchPromises.push(
                fetch(apiUrl)
                    .then((res) => res.json())
                    .then((json) => json.cny.krw)
                    .catch((err) => null) // 통신 실패 시 에러 방지
            );
        }

        // 3. 7일 치 데이터를 동시에 빠르게 다 가져옵니다!
        const results = await Promise.all(fetchPromises);

        // 데이터 정제 (만약 과거 특정일 데이터가 비어있다면, 현재 환율로 임시 대체)
        const currentRateEl = document.getElementById('cny-rate-value');
        let fallbackRate = 185.0;
        if (currentRateEl && currentRateEl.innerText !== '...') {
            fallbackRate = parseFloat(currentRateEl.innerText.replace(/,/g, ''));
        }

        results.forEach((rate) => {
            // 소수점 1자리까지만 남기고 숫자로 변환
            data.push(rate ? +rate.toFixed(1) : fallbackRate);
        });

        // 4. 로딩 문구를 지우고 진짜 차트를 그립니다.
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        window.exchangeMiniChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#4f46e5',
                        fill: true,
                        tension: 0.4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        display: true,
                        align: 'top',
                        anchor: 'end',
                        offset: 3,
                        color: '#4f46e5',
                        font: { size: 9, weight: '900' },
                        formatter: function (value) {
                            return value.toFixed(1);
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.parsed.y + '원';
                            },
                        },
                        displayColors: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { size: 10 },
                        bodyFont: { size: 11, weight: 'bold' },
                        padding: 8,
                    },
                },
                scales: {
                    x: {
                        ticks: { font: { size: 9 }, color: '#9ca3af' },
                        grid: { display: false },
                    },
                    y: {
                        display: false,
                        suggestedMin: Math.min(...data) - 1,
                        suggestedMax: Math.max(...data) + 2,
                    },
                },
                layout: { padding: { top: 15, bottom: 0, left: 10, right: 10 } },
            },
        });
    } catch (error) {
        // 혹시라도 인터넷이 끊기거나 API에 문제가 생겼을 때의 안전장치
        console.error('환율 데이터 로드 실패:', error);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillText('데이터를 불러오지 못했습니다.', 10, 40);
    }
};

// 3. 팝업 바깥(다른 화면)을 터치하면 팝업이 조용히 닫히도록 처리
document.addEventListener('click', (e) => {
    const popup = document.getElementById('exchange-chart-popup');
    const badge = document.getElementById('exchange-rate-badge');

    if (popup && badge && !popup.classList.contains('hidden')) {
        if (!badge.contains(e.target) && !popup.contains(e.target)) {
            popup.classList.add('hidden');
        }
    }
});

// ==========================================
// 🏆 리스트 내 Top 1~3 랭킹 뱃지 생성기 (디자인 개선)
// ==========================================
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
        // 💡 shrink-0 추가 및 텍스트를 'TOP 1' -> '1위'로 축소
        item.rankBadge = `<span class="shrink-0 ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-black text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-100 leading-none shadow-sm">${medal} ${index + 1}위</span>`;
    });

    incomes.slice(0, 3).forEach((item, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        item.rankBadge = `<span class="shrink-0 ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 leading-none shadow-sm">${medal} ${index + 1}위</span>`;
    });
};

// ==========================================
// 💡 카드 통계 기준 토글 함수 (기준일 <-> 달력월)
// ==========================================
window.setCardStatMode = (mode) => {
    window.cardStatMode = mode;
    renderChart(); // 상태를 바꾸고 차트 영역만 다시 그립니다!
};

// ==========================================
// 🚀 앱 버전(Git Commit SHA) 자동 불러오기 기능
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

            // 1. Short SHA 추출 (앞 7자리)
            const shortSha = latestCommit.sha.substring(0, 7);

            // 2. 날짜 포맷팅 (한국 시간 기준)
            const commitDate = new Date(latestCommit.commit.author.date);
            const dateStr = `${commitDate.getFullYear()}.${String(commitDate.getMonth() + 1).padStart(2, '0')}.${String(commitDate.getDate()).padStart(2, '0')} ${String(commitDate.getHours()).padStart(2, '0')}:${String(commitDate.getMinutes()).padStart(2, '0')}`;

            shaEl.innerText = shortSha;
            dateEl.innerText = dateStr;
        }
    } catch (error) {
        console.error('버전 정보를 불러오지 못했습니다.', error);
        shaEl.innerText = 'unknown';
        dateEl.innerText = '업데이트 확인 불가';
    }
};

// 앱 로딩이 완료되면 즉시 버전 정보를 가져옵니다.
document.addEventListener('DOMContentLoaded', window.fetchAppVersion);

// ==========================================
// 💡 도넛 차트 카테고리 클릭 시 상세 내역 모달 띄우기
// ==========================================
window.openCategoryDetailModal = function (categoryLabel, type, prefix) {
    const typeName = type === 'income' ? '수입' : '지출';
    const modal = document.getElementById('weekly-modal');
    const titleEl = modal.querySelector('h3');

    if (titleEl) titleEl.innerText = `${categoryLabel} 상세 내역`;

    const [year, month] = prefix.split('-');
    document.getElementById('weekly-date-range').innerText =
        `${year}년 ${parseInt(month)}월 ${typeName}`;

    const catData = globalData.filter((item) => {
        if (!item.Date.startsWith(prefix) || item.Type !== type) return false;
        const itemCatLabel =
            globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
        return itemCatLabel === categoryLabel;
    });

    const container = document.getElementById('weekly-list-container');
    container.innerHTML = '';

    if (catData.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16">
                <span class="material-symbols-outlined text-gray-300 text-5xl mb-3">receipt_long</span>
                <p class="text-center text-gray-400 text-sm font-medium">내역이 없습니다.</p>
            </div>`;
    } else {
        applyTopRanks(catData);

        const groupedByDate = {};
        catData.forEach((item) => {
            const dateStr = item.Date.substring(0, 10);
            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
            groupedByDate[dateStr].push(item);
        });

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
            return window.listSortOrder === 'asc'
                ? new Date(a) - new Date(b)
                : new Date(b) - new Date(a);
        });

        container.insertAdjacentHTML(
            'beforeend',
            `
            <div class="flex justify-end mb-2 px-1">
                <button onclick="window.listSortOrder = window.listSortOrder === 'asc' ? 'desc' : 'asc'; localStorage.setItem('listSortOrder', window.listSortOrder); openCategoryDetailModal('${categoryLabel}', '${type}', '${prefix}');" class="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 font-bold bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm transition-all active:scale-95">
                    <span class="material-symbols-outlined text-[14px]">swap_vert</span>
                    ${window.listSortOrder === 'asc' ? t('과거순 (1일 ➔ 말일)') : t('최신순 (말일 ➔ 1일)')}
                </button>
            </div>
        `
        );

        sortedDates.forEach((dateStr) => {
            const d = new Date(dateStr);
            const displayDate = window.formatDateStr(d);

            container.insertAdjacentHTML(
                'beforeend',
                `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
                    <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                    ${displayDate}
                </div>`
            );

            // 👇 추가된 부분: 카테고리 상세 모달 내부 순서 뒤집기
            let itemsForDate = groupedByDate[dateStr];
            if (window.listSortOrder === 'desc') {
                itemsForDate = [...itemsForDate].reverse();
            }

            itemsForDate.forEach((item) => {
                const parsed = parseMemo(item.Memo);
                const isExp = item.Type === 'expense';
                const iconName = getCategoryIcon(categoryLabel);
                const amountNum = Number(item.Amount);
                const displayColor = isExp ? 'text-red-500' : 'text-blue-500';
                const iconBg = isExp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
                const displaySign = amountNum < 0 ? '-' : '';

                const krwValue = getKrwEquivalent(Math.abs(amountNum));

                container.insertAdjacentHTML(
                    'beforeend',
                    `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                            <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-sm">${iconName}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center">
                                    <p class="text-sm font-bold text-gray-800 truncate">${escapeHTML(parsed.itemName)}</p>
                                    ${item.rankBadge || ''}
                                </div>
                                <p class="text-[10px] text-gray-400 mt-1 truncate">${escapeHTML(categoryLabel)} • ${escapeHTML(parsed.payMethod)}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0 ml-3">
                            <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formatMoney(Math.abs(amountNum))}</p>
                            ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                            ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${formatMoney(parsed.discount)}</p>` : ''}
                        </div>
                    </div>`
                );
            });
        });
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('weekly-modal-content').classList.remove('translate-y-full');
    }, 10);
};

// ==========================================
// 💡 리스트 정렬 순서 전역 상태 및 토글 함수
// ==========================================
window.listSortOrder = localStorage.getItem('listSortOrder') || 'asc'; // 기본값: asc (1일 ➔ 말일)

window.toggleListSortOrder = () => {
    // 상태를 반대로 뒤집고 스마트폰에 기억시킵니다.
    window.listSortOrder = window.listSortOrder === 'asc' ? 'desc' : 'asc';
    localStorage.setItem('listSortOrder', window.listSortOrder);

    // 현재 내역 탭이 열려있다면 즉시 리스트를 다시 그립니다.
    const searchInput = document.getElementById('search-input');
    const keyword = searchInput ? searchInput.value : '';
    if (typeof renderDailyList === 'function' && typeof globalData !== 'undefined') {
        renderDailyList(globalData, keyword);
    }
};

// ==========================================
// 💡 이번 달로 순간이동(복귀) 하는 함수
// ==========================================
window.goToCurrentMonth = () => {
    // 1. 기준 날짜를 진짜 '오늘'로 리셋합니다.
    currentDisplayDate = new Date();

    // 2. 상단 타이틀 글씨들을 일제히 업데이트합니다.
    if (typeof updateMonthTitles === 'function') updateMonthTitles();

    // 3. 현재 열려있는 탭들에 맞춰 데이터를 다시 화면에 뿌려줍니다.
    if (typeof renderDailyList === 'function' && typeof globalData !== 'undefined') {
        const searchInput = document.getElementById('search-input');
        const keyword = searchInput ? searchInput.value : '';
        renderDailyList(globalData, keyword);
    }

    if (typeof calendar !== 'undefined' && calendar) {
        calendar.gotoDate(currentDisplayDate); // 캘린더 라이브러리도 이번 달로 이동
        if (typeof renderCalendarEvents === 'function') renderCalendarEvents();
    }

    if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();

    const statsTab = document.getElementById('view-stats');
    if (statsTab && statsTab.classList.contains('active') && typeof renderChart === 'function') {
        renderChart();
    }
};

// ==========================================
// 🎨 앱 스킨(배경색) 제어 함수
// ==========================================
window.changeSkin = (skin) => {
    localStorage.setItem('appSkin', skin); // 스마트폰에 설정 저장
    applySkin(); // 즉시 스킨 적용
};

window.applySkin = () => {
    const skin = localStorage.getItem('appSkin') || 'default';
    const selectEl = document.getElementById('skin-selector');
    if (selectEl) selectEl.value = skin;

    const body = document.body;
    if (skin === 'season') {
        body.classList.add('theme-season');
        const month = new Date().getMonth() + 1; // 오늘 날짜 기준 월(1~12)
        let seasonBg = '#ffffff';

        // 가장 예쁘고 가독성을 해치지 않는 Tailwind 50단계 파스텔톤 컬러 적용!
        if (month >= 3 && month <= 5) {
            seasonBg = '#fff1f2'; // 봄 🌸 (연한 벚꽃 핑크 - rose-50)
        } else if (month >= 6 && month <= 8) {
            seasonBg = '#f0f9ff'; // 여름 🍉 (시원한 바다 파랑 - sky-50)
        } else if (month >= 9 && month <= 11) {
            seasonBg = '#fffbeb'; // 가을 🍁 (따뜻한 단풍 베이지 - amber-50)
        } else {
            seasonBg = '#f8fafc'; // 겨울 ❄️ (포근한 눈꽃 회색 - slate-50)
        }

        // 전체 앱의 배경색 변수(CSS 마법)를 해당 계절색으로 교체!
        document.documentElement.style.setProperty('--season-bg', seasonBg);
    } else {
        // 기본(White) 모드일 경우 원래대로 복구
        body.classList.remove('theme-season');
        document.documentElement.style.removeProperty('--season-bg');
    }
};

// 💡 앱 로딩 시 마지막으로 저장된 스킨을 잊지 않고 불러옵니다.
document.addEventListener('DOMContentLoaded', window.applySkin);

// ==========================================
// 👆 화면 스와이프(Swipe) 제스처로 탭 이동하기 (자산 모드 완벽 호환)
// ==========================================
(function initSwipeNavigation() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // 스와이프 이벤트를 감지할 메인 영역을 잡습니다.
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

        // X축(가로) 이동 거리가 50px 이상이고, Y축(세로) 스크롤보다 클 때만 스와이프로 인정!
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
            const activeTabSection = document.querySelector('.tab-content.active');
            if (!activeTabSection) return;

            const activeTabId = activeTabSection.id.replace('view-', '');

            // 💡 핵심: 현재 모드(LEDGER vs ASSETS)에 따라 스와이프할 탭의 종류와 순서를 다르게 세팅합니다!
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

            // 👈 화면을 왼쪽으로 밀었을 때 (다음 탭으로)
            if (deltaX < 0) {
                currentIndex = (currentIndex + 1) % tabOrder.length;
                direction = 'right'; // 새 화면이 오른쪽에서 밀려 들어옴
            }
            // 👉 화면을 오른쪽으로 밀었을 때 (이전 탭으로)
            else {
                currentIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
                direction = 'left'; // 새 화면이 왼쪽에서 밀려 들어옴
            }

            const nextTabId = tabOrder[currentIndex];
            const nextTabName = tabNames[currentIndex];
            // 💡 숨은 버그 픽스: onclick 문자열 매칭 대신, 고정된 ID로 하단 버튼을 정확히 타겟팅합니다.
            const nextBtn = document.getElementById(navBtnIds[currentIndex]);

            if (nextTabId && nextBtn) {
                // 방향(direction) 변수를 끝에 같이 넘겨줍니다!
                window.switchTab(nextTabId, nextTabName, nextBtn, direction);
            }
        }
    }
})();

// ==========================================
// 💡 브라우저 뒤로 가기(History API) 자동 감지 엔진 (자산 모달 추가)
// ==========================================
(function initModalHistoryManager() {
    window.modalStack = [];
    window.isProgrammaticBack = false;

    // 💡 우리 앱에서 사용하는 모든 팝업창(모달)의 ID 목록입니다. (자산 모달 추가 완료!)
    const modalIds = [
        'add-modal',
        'card-modal',
        'category-modal',
        'weekly-modal',
        'card-detail-modal',
        'deposit-modal', // 👈 예적금 입력 모달
        'asset-config-modal', // 👈 자산 설정 모달
        'asset-owner-detail-modal',
    ];

    // 💡 마법의 핵심: MutationObserver로 팝업들의 'hidden' 클래스 변화를 실시간으로 감시합니다.
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const target = mutation.target;
                const id = target.id;

                if (modalIds.includes(id)) {
                    const isHidden = target.classList.contains('hidden');
                    const isInStack = window.modalStack.includes(id);

                    if (!isHidden && !isInStack) {
                        // 1. 모달이 화면에 나타났을 때 (가짜 페이지 이동 기록을 하나 만듭니다)
                        window.modalStack.push(id);
                        history.pushState({ modal: id }, '', '');
                    } else if (isHidden && isInStack) {
                        // 2. 사용자가 화면의 [X] 버튼이나 취소를 눌러 정상적으로 닫았을 때
                        window.modalStack = window.modalStack.filter((mId) => mId !== id);

                        // 이미 닫혔으니 뒤로가기 기록도 코드로 조용히 한 칸 지워줍니다.
                        window.isProgrammaticBack = true;
                        history.back();

                        // 약간의 시간차 후 플래그 해제
                        setTimeout(() => {
                            window.isProgrammaticBack = false;
                        }, 100);
                    }
                }
            }
        });
    });

    // 앱이 켜질 때, 모든 모달 팝업의 옷(class)에 감시 카메라를 달아줍니다.
    document.addEventListener('DOMContentLoaded', () => {
        modalIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        });
    });

    // 💡 스마트폰에서 진짜 '물리적 뒤로 가기' 제스처를 했을 때의 동작을 가로챕니다!
    window.addEventListener('popstate', (e) => {
        if (window.isProgrammaticBack) return;

        // 화면에 열려있는 모달이 있다면? (앱이 꺼지는 대신 모달만 닫게 함)
        if (window.modalStack.length > 0) {
            const topModalId = window.modalStack.pop();

            // 💡 자산 모달 닫기 함수들도 분기에 연결해 줍니다!
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
                closeDepositModal(); // 👈 자산 입력 모달 닫기
            else if (
                topModalId === 'asset-config-modal' &&
                typeof closeAssetConfigModal === 'function'
            )
                closeAssetConfigModal(); // 👈 자산 설정 모달 닫기
            else if (
                topModalId === 'asset-owner-detail-modal' &&
                typeof closeOwnerAssetDetail === 'function'
            )
                closeOwnerAssetDetail(); // 👈 명의자 상세 내역 모달 닫기
        }
    });
})();

// ==========================================
// 💡 CNY -> KRW 환산 금액 계산기 (수정본)
// ==========================================
window.getKrwEquivalent = (cnyAmount) => {
    // 👇 window.currentCountry 대신 전역 변수 currentCountry를 직접 확인합니다!
    if (currentCountry !== 'CN') return null;

    // 로컬 스토리지에서 캐싱된 환율 가져오기 (없으면 기본값 185.0)
    const savedRate = localStorage.getItem('cachedCnyRate');
    const rate = savedRate ? parseFloat(savedRate.replace(/,/g, '')) : 185.0;

    const krw = Math.round(Number(cnyAmount) * rate);
    return krw.toLocaleString('ko-KR') + (window.appLang === 'cn' ? '韩元' : '원');
};

window.updateKrwGuide = () => {
    const amountInput = document.getElementById('input-amount');
    const guideEl = document.getElementById('krw-guide-text');
    if (!amountInput || !guideEl) return;

    // 👇 여기도 마찬가지로 window. 부분을 제거합니다!
    if (currentCountry !== 'CN') {
        guideEl.classList.add('hidden');
        return;
    }

    const val = amountInput.value.replace(/,/g, '');
    if (val && !isNaN(val)) {
        const krw = getKrwEquivalent(val);
        if (krw) {
            guideEl.innerText = window.appLang === 'cn' ? `约 ${krw}` : `약 ${krw}`;
            guideEl.classList.remove('hidden');
        }
    } else {
        guideEl.classList.add('hidden');
    }
};

// ==========================================
// 🌍 접속 지역(타임존) 기반 국가 모드 자동 설정
// ==========================================
window.initCountryByTimezone = () => {
    try {
        // 1. 브라우저/스마트폰에 설정된 타임존 가져오기 (예: 'Asia/Seoul', 'Asia/Shanghai')
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // 2. 중국 본토 타임존인지 확인 (상해, 북경, 심천 모두 Asia/Shanghai 하나로 통일됨)
        const isChina = tz === 'Asia/Shanghai' || tz === 'Asia/Urumqi';

        // 3. 전역 상태 변수 업데이트
        currentCountry = isChina ? 'CN' : 'KR';

        // 4. 앱 상단의 토글 버튼 디자인과 테마를 타임존에 맞게 세팅 (데이터 로딩 없이 UI만!)
        const btnKr = document.getElementById('btn-kr');
        const btnCn = document.getElementById('btn-cn');

        if (currentCountry === 'KR') {
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

        console.log(`🌍 현재 타임존: ${tz} -> ${currentCountry} 모드로 시작합니다.`);
    } catch (e) {
        console.warn('타임존 인식에 실패하여 기본 모드로 시작합니다.', e);
    }
};

// HTML 문서(DOM)가 모두 그려지자마자 가장 먼저 타임존을 파악해서 세팅합니다.
document.addEventListener('DOMContentLoaded', window.initCountryByTimezone);

// ==========================================
// 📈 누적추이 차트 수입 포함 여부 상태 관리
// ==========================================
window.showCumulativeIncome = false; // 기본값: 지출만 보기(false)

window.toggleCumIncome = (checked) => {
    window.showCumulativeIncome = checked;
    renderChart(); // 상태를 바꾸고 차트를 즉시 다시 그립니다.
};

// ==========================================
// 💰 예적금(자산) 탭 전용 렌더링 및 기능
// ==========================================

// 💡 1. 계산기 (자동 계산 제거, DB 값 매핑)
window.getDepositCalc = (d) => {
    const start = new Date(d.가입일);
    const end = new Date(d.만기일);
    let months =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) months--;
    if (months <= 0) months = 0;

    const principal = Number(d.원금) || 0;
    const rate = Number(d.이율) || 0;

    // DB에 저장된 값을 그대로 꺼내옵니다.
    const preTax = Number(d.세전이자) || 0;
    const postTax = Number(d.세후이자) || 0;

    return { months, preTax, postTax, principal, rate, start, end, year: end.getFullYear() };
};

// 💡 2. 자산 탭 메인 화면 그리기 (가독성 및 상세 내역 개선 버전)
window.renderAssetsList = () => {
    const listContainer = document.getElementById('assets-list-container');
    const dashboard = document.getElementById('assets-stats-summary-dashboard');
    const alertBox = document.getElementById('maturity-alert-container');

    const totalSummaryBox = document.getElementById('assets-total-summary');
    const ownerSummaryBox = document.getElementById('assets-stats-owner-summary');

    if (!listContainer || !dashboard) return;

    listContainer.innerHTML = '';
    dashboard.innerHTML = '';
    alertBox.innerHTML = '';
    if (totalSummaryBox) totalSummaryBox.innerHTML = '';
    if (ownerSummaryBox) ownerSummaryBox.innerHTML = '';

    if (!window.globalDeposits || window.globalDeposits.length === 0) {
        listContainer.innerHTML =
            '<p class="text-center text-gray-400 py-10 text-sm">등록된 예적금이 없습니다.</p>';
        dashboard.innerHTML = '<p class="text-center text-gray-400 text-xs">데이터가 없습니다.</p>';
        return;
    }

    const summary = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let maturedCount = 0;
    let soonCount = 0;
    let totalOperatingPrincipal = 0;
    let totalOperatingPostTax = 0;

    // 💡 명의자별 원금과 이자를 각각 관리하기 위한 객체
    const ownerDetails = {};

    window.globalDeposits.forEach((d) => {
        if (d.상태 !== '만기' && d.상태 !== '중도해지') {
            const end = new Date(d.만기일);
            end.setHours(0, 0, 0, 0);
            const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) maturedCount++;
            else if (diffDays > 0 && diffDays <= 3) soonCount++;

            const principal = Number(d.원금) || 0;
            const postTax = Number(d.세후이자) || 0;
            const owner = d.명의자 || '미상';

            totalOperatingPrincipal += principal;
            totalOperatingPostTax += postTax;

            // 명의자별 합산 로직 (원금/이자 분리)
            if (!ownerDetails[owner]) ownerDetails[owner] = { principal: 0, postTax: 0 };
            ownerDetails[owner].principal += principal;
            ownerDetails[owner].postTax += postTax;
        }
    });

    // 💡 [개선] 전체 운용 합계 배너 (폰트 색상 및 배경 가독성 수정)
    if (totalSummaryBox && totalOperatingPrincipal > 0) {
        const totalEstimated = totalOperatingPrincipal + totalOperatingPostTax;
        totalSummaryBox.innerHTML = `
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm active:scale-[0.99] transition-transform">
                <p class="text-emerald-700 text-xs font-bold mb-1.5 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">account_balance</span>총 예상 수령액 (원금+세후이자)
                </p>
                <p class="text-3xl font-black text-slate-900 mb-4 tracking-tight">${totalEstimated.toLocaleString('ko-KR')}원</p>
                <div class="flex justify-between text-[11px] bg-white/60 border border-emerald-100 rounded-xl p-3">
                    <div class="flex flex-col gap-0.5">
                        <span class="text-emerald-600/70 font-medium">총 납입원금</span>
                        <span class="font-bold text-slate-700">${totalOperatingPrincipal.toLocaleString('ko-KR')}원</span>
                    </div>
                    <div class="flex flex-col gap-0.5 text-right">
                        <span class="text-emerald-600/70 font-medium">총 세후이자</span>
                        <span class="font-bold text-emerald-600">+${totalOperatingPostTax.toLocaleString('ko-KR')}원</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 💡 [개선] 명의자별 요약 현황 (원금/이자 분리 표현)
    if (ownerSummaryBox) {
        const sortedOwners = Object.entries(ownerDetails).sort(
            (a, b) => b[1].principal + b[1].postTax - (a[1].principal + a[1].postTax)
        );
        if (sortedOwners.length === 0) {
            ownerSummaryBox.innerHTML =
                '<p class="text-xs text-gray-400 col-span-2 text-center py-4 font-medium">운용중인 자산이 없습니다.</p>';
        } else {
            // (renderAssetsList 함수 내부 수정)
            sortedOwners.forEach(([owner, data]) => {
                const total = data.principal + data.postTax;
                ownerSummaryBox.insertAdjacentHTML(
                    'beforeend',
                    `
                    <div onclick="openOwnerAssetDetail('${owner}')" class="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex flex-col shadow-sm cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition">
                        <span class="text-[11px] font-black text-gray-500 mb-2 border-b border-gray-200 pb-1 flex justify-between items-center">
                            ${owner}
                            <span class="material-symbols-outlined text-[12px] text-gray-400">arrow_forward_ios</span>
                        </span>
                        <div class="flex flex-col gap-1">
                            <span class="text-[14px] font-black text-slate-800 tracking-tight">${total.toLocaleString('ko-KR')}원</span>
                            <div class="flex flex-col text-[10px] text-gray-400 leading-tight">
                                <span>원금: ${data.principal.toLocaleString('ko-KR')}</span>
                                <span class="text-indigo-500 font-bold">이자: +${data.postTax.toLocaleString('ko-KR')}</span>
                            </div>
                        </div>
                    </div>
                `
                );
            });
        }
    }

    // (알림 배너 로직)
    let alertsHtml = '';
    if (window.currentAssetFilter !== 'all') {
        const filterTitle =
            window.currentAssetFilter === 'matured' ? '만기 도래 상품' : '만기 임박 상품';
        alertsHtml += `
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-indigo-500 text-lg">filter_list</span>
                    <p class="text-xs font-bold text-indigo-700">${filterTitle} 모아보기 중</p>
                </div>
                <button onclick="setAssetFilter('all')" class="text-[10px] bg-white border border-indigo-200 px-2 py-1 rounded text-indigo-600 font-bold active:bg-indigo-100 transition shadow-sm">필터 해제</button>
            </div>
        `;
    } else {
        if (maturedCount > 0) {
            alertsHtml += `
                <div onclick="setAssetFilter('matured')" class="cursor-pointer bg-red-50 border border-red-200 rounded-xl p-3 mb-2 flex items-center justify-between shadow-sm animate-pulse hover:bg-red-100 transition">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-red-500 text-lg">notifications_active</span>
                        <p class="text-xs font-bold text-red-700">만기된 상품이 <span class="text-lg">${maturedCount}</span>건 있습니다!</p>
                    </div>
                    <span class="material-symbols-outlined text-red-400">chevron_right</span>
                </div>
            `;
        }
        if (soonCount > 0) {
            alertsHtml += `
                <div onclick="setAssetFilter('soon')" class="cursor-pointer bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm hover:bg-amber-100 transition">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-amber-500 text-lg">schedule</span>
                        <p class="text-xs font-bold text-amber-700">3일 내 만기 임박 상품이 <span class="text-lg">${soonCount}</span>건 있습니다.</p>
                    </div>
                    <span class="material-symbols-outlined text-amber-400">chevron_right</span>
                </div>
            `;
        }
    }
    alertBox.innerHTML = alertsHtml;

    // (정렬 및 리스트 필터링)
    let depositsToRender = [...window.globalDeposits];
    if (window.currentAssetFilter === 'matured') {
        depositsToRender = depositsToRender.filter((d) => {
            const end = new Date(d.만기일);
            end.setHours(0, 0, 0, 0);
            return (
                d.상태 !== '만기' &&
                d.상태 !== '중도해지' &&
                Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 0
            );
        });
    } else if (window.currentAssetFilter === 'soon') {
        depositsToRender = depositsToRender.filter((d) => {
            const end = new Date(d.만기일);
            end.setHours(0, 0, 0, 0);
            const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return d.상태 !== '만기' && d.상태 !== '중도해지' && diffDays > 0 && diffDays <= 3;
        });
    }

    if (window.currentAssetSort === 'end') {
        depositsToRender.sort((a, b) => new Date(b.만기일) - new Date(a.만기일));
    } else {
        depositsToRender.sort((a, b) => new Date(b.가입일) - new Date(a.가입일));
    }

    // (리스트 카드 렌더링 루프)
    let lastYear = null;
    depositsToRender.forEach((d) => {
        const calc = getDepositCalc(d);
        const owner = d.명의자 || '미상';
        const year = calc.year;

        if (!summary[year]) summary[year] = {};
        if (!summary[year][owner]) summary[year][owner] = 0;
        summary[year][owner] += calc.preTax;

        const displayYear =
            window.currentAssetSort === 'end'
                ? new Date(d.만기일).getFullYear()
                : new Date(d.가입일).getFullYear();

        if (lastYear !== displayYear) {
            lastYear = displayYear;
            listContainer.insertAdjacentHTML(
                'beforeend',
                `
                <div class="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-2 px-1 mt-4 first:mt-0">
                    <span class="text-sm font-black text-primary flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">calendar_today</span>${displayYear}년
                    </span>
                </div>
            `
            );
        }

        const isMatured = d.상태 === '만기';
        const isCanceled = d.상태 === '중도해지';
        const cardOpacity = isMatured || isCanceled ? 'opacity-60 grayscale-[50%]' : '';
        let badge = `<span class="bg-green-100 text-green-600 px-1.5 py-0.5 rounded text-[10px] font-black">운용중</span>`;
        if (isMatured)
            badge = `<span class="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-black">만기완료</span>`;
        if (isCanceled)
            badge = `<span class="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-black">중도해지</span>`;

        listContainer.insertAdjacentHTML(
            'beforeend',
            `
            <div onclick="openDepositModal('${d.ID}')" class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2.5 cursor-pointer active:scale-[0.99] transition ${cardOpacity}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-1.5">
                        <span class="text-sm font-black text-gray-800">${d.은행}</span>
                        <span class="text-[11px] text-gray-500 font-medium px-1.5 py-0.5 bg-gray-50 rounded">${d.종류}</span>
                    </div>
                    ${badge}
                </div>
                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-xs text-gray-500 mb-1">${d.명의자} • ${calc.months}개월 • 이율 ${Number(d.이율).toFixed(2)}%</p>
                        <p class="text-base font-black text-gray-900">${Number(d.원금).toLocaleString('ko-KR')}원</p>
                    </div>
                    <div class="text-right">
                        <div class="flex items-center justify-end gap-1.5 mb-1">
                            <span class="text-[10px] text-gray-500 font-medium">세전이자</span>
                            <span class="text-xs font-bold text-gray-600">+${Number(d.세전이자 || 0).toLocaleString('ko-KR')}원</span>
                        </div>
                        <div class="flex items-center justify-end gap-1.5">
                            <span class="text-xs text-indigo-500 font-bold">세후이자</span>
                            <span class="text-[15px] font-black text-indigo-600">+${Number(d.세후이자 || 0).toLocaleString('ko-KR')}원</span>
                        </div>
                    </div>
                </div>
                <div class="text-xs text-gray-400 flex items-center justify-between border-t border-gray-50 pt-2 mt-1">
                    <div class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">event</span>${d.가입일} ~ ${d.만기일}
                    </div>
                    <span class="text-[10px] font-medium text-gray-400 px-1 border border-gray-100 rounded">${d.과세여부 || '과세'}</span>
                </div>
            </div>
        `
        );
    });

    // (연도별 통계 대시보드 렌더링)
    const sortedYears = Object.keys(summary).sort((a, b) => b - a);
    sortedYears.forEach((year) => {
        let rowsHtml = '';
        let total = 0;
        const sortedOwners = Object.entries(summary[year]).sort((a, b) => b[1] - a[1]);
        for (const [owner, amount] of sortedOwners) {
            total += amount;
            rowsHtml += `
                <div class="flex justify-between items-center py-1">
                    <span class="text-sm font-bold text-gray-600">${owner}</span>
                    <span class="text-sm font-bold text-indigo-500">${amount.toLocaleString('ko-KR')}원</span>
                </div>
            `;
        }
        dashboard.insertAdjacentHTML(
            'beforeend',
            `
            <div class="pt-2 pb-1">
                <div class="flex justify-between items-end mb-1">
                    <span class="text-sm font-black text-gray-800">${year}년 만기</span>
                    <span class="text-xs font-black text-gray-400">총합계: ${total.toLocaleString('ko-KR')}원</span>
                </div>
                <div class="bg-gray-50 p-2.5 rounded-lg mt-1 border border-gray-100">${rowsHtml}</div>
            </div>
        `
        );
    });

    renderAssetChart(summary);
};

// 💡 3. 모달 열고 닫기 로직
window.openDepositModal = (id = null) => {
    const form = document.getElementById('deposit-form');
    form.reset();
    document.getElementById('dep-delete-btn').classList.add('hidden');
    document.getElementById('deposit-modal-title').innerText = '새 상품 추가';

    const renderSelect = (elId, type, placeholder) => {
        const el = document.getElementById(elId);

        // 💡 해당 타입의 저장된 순서를 가져와서 정렬 로직 추가!
        const orderKey = 'assetOrder_' + type;
        const savedOrder = JSON.parse(localStorage.getItem(orderKey)) || [];

        const options = globalCategories
            .filter((c) => c.Type === type)
            .sort((a, b) => {
                const idxA = savedOrder.indexOf(a.Value);
                const idxB = savedOrder.indexOf(b.Value);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.Label.localeCompare(b.Label);
            });

        el.innerHTML = `<option value="">${placeholder}</option>`;
        options.forEach((c) =>
            el.insertAdjacentHTML('beforeend', `<option value="${c.Label}">${c.Label}</option>`)
        );
    };
    renderSelect('dep-input-bank', 'asset_bank', '은행 선택 (설정에서 추가)');
    renderSelect('dep-input-owner', 'asset_owner', '명의자 선택');
    renderSelect('dep-input-type', 'asset_type', '종류 선택');
    renderSelect('dep-input-tax', 'asset_tax', '과세 기준 선택');

    if (id) {
        const d = window.globalDeposits.find((item) => item.ID === id);
        if (d) {
            document.getElementById('deposit-modal-title').innerText = '상품 정보 수정';
            document.getElementById('dep-input-id').value = d.ID;
            document.getElementById('dep-input-start').value = d.가입일;
            document.getElementById('dep-input-end').value = d.만기일;

            // 콤마 및 소수점 포맷팅을 적용해서 폼에 뿌려줍니다.
            document.getElementById('dep-input-principal').value = Number(
                d.원금 || 0
            ).toLocaleString('ko-KR');
            document.getElementById('dep-input-pretax').value = Number(
                d.세전이자 || 0
            ).toLocaleString('ko-KR');
            document.getElementById('dep-input-posttax').value = Number(
                d.세후이자 || 0
            ).toLocaleString('ko-KR');
            document.getElementById('dep-input-rate').value = d.이율
                ? Number(d.이율).toFixed(2)
                : '';

            if (d.은행)
                document.getElementById('dep-input-bank').innerHTML +=
                    `<option value="${d.은행}" selected>${d.은행}</option>`;
            if (d.명의자)
                document.getElementById('dep-input-owner').innerHTML +=
                    `<option value="${d.명의자}" selected>${d.명의자}</option>`;
            if (d.종류)
                document.getElementById('dep-input-type').innerHTML +=
                    `<option value="${d.종류}" selected>${d.종류}</option>`;
            if (d.과세여부)
                document.getElementById('dep-input-tax').innerHTML +=
                    `<option value="${d.과세여부}" selected>${d.과세여부}</option>`;
            if (d.상태) document.getElementById('dep-input-status').value = d.상태;

            document.getElementById('dep-delete-btn').classList.remove('hidden');
        }
    }

    const modal = document.getElementById('deposit-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('deposit-modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.closeDepositModal = () => {
    const modal = document.getElementById('deposit-modal');
    modal.classList.add('opacity-0');
    document.getElementById('deposit-modal-content').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.saveDeposit = () => {
    const id = document.getElementById('dep-input-id').value;
    const payload = {
        action: id ? 'update_deposit' : 'create_deposit',
        id: id || 'temp_' + Date.now(),
        country: 'KR',
        startDate: document.getElementById('dep-input-start').value,
        endDate: document.getElementById('dep-input-end').value,
        depType: document.getElementById('dep-input-type').value,
        principal: document.getElementById('dep-input-principal').value.replace(/,/g, ''),
        rate: document.getElementById('dep-input-rate').value,
        taxType: document.getElementById('dep-input-tax').value,
        preTax: document.getElementById('dep-input-pretax').value.replace(/,/g, ''),
        postTax: document.getElementById('dep-input-posttax').value.replace(/,/g, ''),
        owner: document.getElementById('dep-input-owner').value,
        bank: document.getElementById('dep-input-bank').value,
        status: document.getElementById('dep-input-status').value,
    };

    if (
        !payload.startDate ||
        !payload.endDate ||
        !payload.principal ||
        !payload.bank ||
        !payload.owner ||
        !payload.depType ||
        !payload.taxType
    ) {
        alert('과세여부를 포함한 필수 항목을 모두 선택해 주세요.');
        return;
    }

    // 🚀 1. 즉시 모달 닫기 (로딩 스피너 X)
    closeDepositModal();

    // 🚀 2. 낙관적 업데이트: 서버 응답을 기다리지 않고 화면에 먼저 그리기
    const optimisticData = {
        ID: payload.id,
        가입일: payload.startDate,
        만기일: payload.endDate,
        종류: payload.depType,
        원금: payload.principal,
        이율: payload.rate,
        과세여부: payload.taxType,
        세전이자: payload.preTax,
        세후이자: payload.postTax,
        명의자: payload.owner,
        은행: payload.bank,
        상태: payload.status,
    };

    if (payload.action === 'create_deposit') {
        window.globalDeposits.push(optimisticData);
    } else {
        const idx = window.globalDeposits.findIndex((d) => d.ID === payload.id);
        if (idx > -1) {
            window.globalDeposits.splice(idx, 1);
            window.globalDeposits.push(optimisticData);
        }
    }

    // 변경된 데이터로 즉시 리스트 새로고침
    if (typeof renderAssetsList === 'function') renderAssetsList();

    // 🚀 3. 백그라운드 서버 동기화
    fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === 'success') loadDailyRecords(true); // 성공 시 무음(Silent) 동기화
        })
        .catch((e) => {
            alert('저장 중 네트워크 오류가 발생하여 이전 상태로 복구됩니다.');
            loadDailyRecords(true);
        });
};

// 💡 자산 전용 설정 모달 로직 (드래그 앤 드롭 순서 관리 추가)
window.currentAssetConfigType = '';

window.openAssetConfigModal = (type, title) => {
    window.currentAssetConfigType = type;
    document.getElementById('asset-config-title').innerText = title;
    document.getElementById('new-asset-config-label').value = '';

    const container = document.getElementById('asset-config-list-container');
    container.innerHTML = '';

    // 1. 해당 타입의 저장된 순서를 불러옵니다. (없으면 빈 배열)
    const orderKey = 'assetOrder_' + type;
    const savedOrder = JSON.parse(localStorage.getItem(orderKey)) || [];

    // 2. 항목들을 가져와서 사용자 정의 순서대로 정렬합니다.
    const items = [...globalCategories]
        .filter((c) => c.Type === type)
        .sort((a, b) => {
            const idxA = savedOrder.indexOf(a.Value);
            const idxB = savedOrder.indexOf(b.Value);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.Label.localeCompare(b.Label);
        });

    if (items.length === 0) {
        container.innerHTML =
            '<li class="py-4 text-center text-gray-500 text-sm">등록된 항목이 없습니다.</li>';
    } else {
        items.forEach((c) => {
            container.insertAdjacentHTML(
                'beforeend',
                `
                <li class="py-2.5 flex justify-between items-center gap-2 bg-white" data-id="${c.Value}">
                    <div class="flex items-center gap-2 overflow-hidden flex-1">
                        <span class="material-symbols-outlined text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 drag-handle text-[18px] p-1">menu</span>
                        <span class="text-sm font-medium text-gray-800 truncate">${c.Label}</span>
                    </div>
                    <div class="flex gap-1 shrink-0">
                        <button onclick="deleteAssetConfig('${c.Value}')" class="text-gray-400 hover:text-red-500 transition p-1">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </li>
            `
            );
        });
    }

    // 3. SortableJS 드래그 엔진 활성화
    if (window.assetSortable) window.assetSortable.destroy();
    window.assetSortable = new Sortable(container, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'bg-gray-50',
        onEnd: function () {
            // 드래그가 끝나면 바뀐 순서를 해당 타입별로 localStorage에 저장!
            const newOrder = Array.from(container.children).map((li) => li.getAttribute('data-id'));
            localStorage.setItem(orderKey, JSON.stringify(newOrder));
        },
    });

    const modal = document.getElementById('asset-config-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
};

window.closeAssetConfigModal = () =>
    document.getElementById('asset-config-modal').classList.add('hidden');

window.addAssetConfig = async () => {
    const label = document.getElementById('new-asset-config-label').value.trim();
    if (!label) return alert('이름을 입력해주세요.');
    showLoader();
    try {
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_category',
                catType: window.currentAssetConfigType,
                catLabel: label,
            }),
        });
        await loadDailyRecords();
        openAssetConfigModal(
            window.currentAssetConfigType,
            document.getElementById('asset-config-title').innerText
        );
    } catch (e) {
        alert('에러');
    } finally {
        hideLoader();
    }
};

window.deleteAssetConfig = async (catValue) => {
    if (!confirm('삭제하시겠습니까?')) return;
    showLoader();
    try {
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_category', catValue }),
        });
        await loadDailyRecords();
        openAssetConfigModal(
            window.currentAssetConfigType,
            document.getElementById('asset-config-title').innerText
        );
    } catch (e) {
        alert('에러');
    } finally {
        hideLoader();
    }
};

window.deleteDeposit = () => {
    if (!confirm('이 상품을 삭제하시겠습니까?')) return;
    const id = document.getElementById('dep-input-id').value;

    // 🚀 1. 즉시 모달 닫기
    closeDepositModal();

    // 🚀 2. 낙관적 업데이트: 화면에서 즉시 제거
    window.globalDeposits = window.globalDeposits.filter((d) => d.ID !== id);
    if (typeof renderAssetsList === 'function') renderAssetsList();

    // 🚀 3. 백그라운드 서버 동기화
    fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_deposit', id: id }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === 'success') loadDailyRecords(true);
        })
        .catch((e) => {
            alert('삭제 중 통신 오류가 발생하여 원상복구 되었습니다.');
            loadDailyRecords(true);
        });
};

// 💡 예적금 리스트 정렬 상태 관리 (기본값: 만기일순)
window.currentAssetSort = 'end';

window.setAssetSort = (type) => {
    window.currentAssetSort = type;
    const btnEnd = document.getElementById('btn-sort-end');
    const btnStart = document.getElementById('btn-sort-start');

    // 버튼 스타일 (스위치 애니메이션 효과) 변경
    if (type === 'end') {
        if (btnEnd)
            btnEnd.className =
                'px-2 py-1 text-[10px] font-bold bg-white text-gray-800 rounded-md shadow-sm transition-all';
        if (btnStart)
            btnStart.className =
                'px-2 py-1 text-[10px] font-bold text-gray-400 rounded-md transition-all';
    } else {
        if (btnStart)
            btnStart.className =
                'px-2 py-1 text-[10px] font-bold bg-white text-gray-800 rounded-md shadow-sm transition-all';
        if (btnEnd)
            btnEnd.className =
                'px-2 py-1 text-[10px] font-bold text-gray-400 rounded-md transition-all';
    }

    // 변경된 정렬 기준으로 리스트 다시 그리기
    if (typeof renderAssetsList === 'function') renderAssetsList();
};

// 💡 예적금 리스트 필터 상태 관리
window.currentAssetFilter = 'all';

window.setAssetFilter = (filterType) => {
    window.currentAssetFilter = filterType;
    if (typeof renderAssetsList === 'function') renderAssetsList();
};

window.assetChartInstance = null;

window.renderAssetChart = (summary) => {
    const ctx = document.getElementById('assetInterestChart');
    if (!ctx) return;

    if (window.assetChartInstance) window.assetChartInstance.destroy();

    const years = Object.keys(summary).sort(); // 2023, 2024, 2025...
    const owners = [...new Set(years.flatMap((y) => Object.keys(summary[y])))];

    // 가족 구성원별 색상 매핑 (정후, 지한 등 가족 구성원에 맞춰 배정)
    const colorPalette = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

    const datasets = owners.map((owner, idx) => ({
        label: owner,
        data: years.map((year) => summary[year][owner] || 0),
        backgroundColor: colorPalette[idx % colorPalette.length],
        borderRadius: 4,
    }));

    window.assetChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: years, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: false }, // 그룹형 막대 차트
                y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => (v / 10000).toLocaleString() + '만' },
                },
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 10, weight: 'bold' } },
                },
            },
        },
    });
};

// 💡 특정 명의자의 운용 자산 상세 조회
window.openOwnerAssetDetail = (owner) => {
    const container = document.getElementById('owner-detail-list-container');
    const title = document.getElementById('owner-detail-title');
    const summaryBar = document.getElementById('owner-detail-stat-bar');
    if (!container || !title) return;

    title.innerText = `${owner} 님의 자산 현황`;
    container.innerHTML = '';

    // 1. 해당 명의자의 '운용중'인 항목만 필터링
    const filtered = window.globalDeposits.filter(
        (d) => d.명의자 === owner && d.상태 !== '만기' && d.상태 !== '중도해지'
    );

    let pSum = 0,
        iSum = 0;

    if (filtered.length === 0) {
        container.innerHTML =
            '<p class="text-center text-gray-400 py-20 text-sm">운용중인 자산이 없습니다.</p>';
        summaryBar.innerHTML = '';
    } else {
        // 만기일 빠른 순으로 정렬
        filtered.sort((a, b) => new Date(a.만기일) - new Date(b.만기일));

        filtered.forEach((d) => {
            const calc = getDepositCalc(d);
            pSum += Number(d.원금);
            iSum += Number(d.세후이자);

            container.insertAdjacentHTML(
                'beforeend',
                `
                <div onclick="openDepositModal('${d.ID}')" class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-2 transition active:scale-[0.99]">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-black text-gray-800">${d.은행}</span>
                        <span class="text-[10px] text-green-600 font-black bg-green-50 px-1.5 py-0.5 rounded">운용중</span>
                    </div>
                    <div class="flex justify-between items-end">
                        <div class="text-xs text-gray-500">
                            ${d.종류} • ${calc.months}개월 • ${Number(d.이율).toFixed(2)}%
                            <p class="text-base font-black text-slate-800 mt-1">${Number(d.원금).toLocaleString('ko-KR')}원</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-indigo-500 font-bold">세후이자</p>
                            <p class="text-sm font-black text-indigo-600">+${Number(d.세후이자).toLocaleString('ko-KR')}원</p>
                        </div>
                    </div>
                    <div class="text-[11px] text-gray-400 pt-2 border-t border-gray-100 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[13px]">event</span>${d.가입일} ~ ${d.만기일}
                    </div>
                </div>
            `
            );
        });

        // 상단 요약 바 렌더링
        summaryBar.innerHTML = `
            <div class="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[11px] font-bold opacity-80 text-white/90">총 운용 자산</span>
                    <span class="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">${filtered.length}건</span>
                </div>
                <div class="text-xl font-black mb-3 tracking-tight">${(pSum + iSum).toLocaleString('ko-KR')}원</div>
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                    <div class="bg-black/10 rounded-lg p-2">
                        <span class="opacity-70 block mb-0.5 text-white/90">총 원금</span>
                        <span class="font-bold text-white">${pSum.toLocaleString('ko-KR')}원</span>
                    </div>
                    <div class="bg-black/10 rounded-lg p-2">
                        <span class="opacity-70 block mb-0.5 text-white/90">총 세후이자</span>
                        <span class="font-bold text-indigo-200">+${iSum.toLocaleString('ko-KR')}원</span>
                    </div>
                </div>
            </div>
        `;
    }

    const modal = document.getElementById('asset-owner-detail-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document
            .getElementById('asset-owner-detail-modal-content')
            .classList.remove('translate-y-full');
    }, 10);
};

window.closeOwnerAssetDetail = () => {
    const modal = document.getElementById('asset-owner-detail-modal');
    modal.classList.add('opacity-0');
    document.getElementById('asset-owner-detail-modal-content').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};
