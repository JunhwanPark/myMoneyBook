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
    return koStr; // 번역 없이 무조건 한국어 그대로 반환!
};

// 공통 날짜 포맷팅 유틸리티
window.formatDateStr = (d) => {
    const daysKo = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${daysKo[d.getDay()]}요일`;
};

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
    const titleStr = `${year}년 ${month}월`; // 무조건 한국어 포맷 사용

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
