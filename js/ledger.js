// ==========================================
// 📅 가계부 메인 내역 및 달력 렌더링 전용 (ledger.js)
// ==========================================

// 💡 월별 타이틀 갱신
window.updateMonthTitles = function () {
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth() + 1;
    const titleStr = `${year}년 ${month}월`;

    if (document.getElementById('daily-month-title'))
        document.getElementById('daily-month-title').innerText = titleStr;
    if (document.getElementById('stats-month-title'))
        document.getElementById('stats-month-title').innerText = titleStr;
    if (document.getElementById('monthly-month-title'))
        document.getElementById('monthly-month-title').innerText = titleStr;
};

// 💡 월 이동 (이전달/다음달 화살표)
window.changeGlobalMonth = (offset) => {
    currentDisplayDate = new Date(
        currentDisplayDate.getFullYear(),
        currentDisplayDate.getMonth() + offset,
        1
    );
    if (typeof updateMonthTitles === 'function') updateMonthTitles();
    if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();

    if (typeof renderDailyList === 'function' && typeof globalData !== 'undefined') {
        const searchInput = document.getElementById('search-input');
        const keyword = searchInput ? searchInput.value : '';
        renderDailyList(globalData, keyword);
    }

    if (
        document.getElementById('view-stats')?.classList.contains('active') &&
        typeof renderChart === 'function'
    ) {
        renderChart();
    }

    // 💡 window. 제거
    if (typeof calendar !== 'undefined' && calendar) {
        calendar.gotoDate(currentDisplayDate);
    }
};

// 💡 이번 달로 순간이동(복귀)
window.goToCurrentMonth = () => {
    currentDisplayDate = new Date();
    if (typeof updateMonthTitles === 'function') updateMonthTitles();

    if (typeof renderDailyList === 'function' && typeof globalData !== 'undefined') {
        const searchInput = document.getElementById('search-input');
        const keyword = searchInput ? searchInput.value : '';
        renderDailyList(globalData, keyword);
    }

    // 💡 window. 제거
    if (typeof calendar !== 'undefined' && calendar) {
        calendar.gotoDate(currentDisplayDate);
        if (typeof renderCalendarEvents === 'function') renderCalendarEvents();
    }

    if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();

    const statsTab = document.getElementById('view-stats');
    if (statsTab && statsTab.classList.contains('active') && typeof renderChart === 'function') {
        renderChart();
    }
};

// 💡 검색창 제어 함수
window.handleSearch = () => {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    const keyword = input.value;

    if (keyword.length > 0) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');

    renderDailyList(globalData, keyword);
};

window.clearSearch = () => {
    const input = document.getElementById('search-input');
    input.value = '';
    document.getElementById('search-clear-btn').classList.add('hidden');
    renderDailyList(globalData);
};

// 💡 리스트 정렬 순서 전역 상태 및 토글
window.listSortOrder = localStorage.getItem('listSortOrder') || 'asc';
window.collapsedDailyDates = new Set();

window.toggleDailyDateGroup = (button) => {
    const dateStr = button?.dataset.date;
    const contentId = button?.getAttribute('aria-controls');
    const content = contentId ? document.getElementById(contentId) : null;
    const summary = button?.querySelector('[data-daily-summary]');
    const arrow = button?.querySelector('[data-daily-arrow]');
    if (!dateStr || !content || !summary || !arrow) return;

    const isCollapsed = window.collapsedDailyDates.has(dateStr);
    if (isCollapsed) window.collapsedDailyDates.delete(dateStr);
    else window.collapsedDailyDates.add(dateStr);

    const shouldCollapse = !isCollapsed;
    button.setAttribute('aria-expanded', String(!shouldCollapse));
    content.classList.toggle('hidden', shouldCollapse);
    summary.classList.toggle('hidden', !shouldCollapse);
    arrow.textContent = shouldCollapse ? 'expand_more' : 'expand_less';
};

window.toggleListSortOrder = () => {
    window.listSortOrder = window.listSortOrder === 'asc' ? 'desc' : 'asc';
    localStorage.setItem('listSortOrder', window.listSortOrder);

    const searchInput = document.getElementById('search-input');
    const keyword = searchInput ? searchInput.value : '';
    if (typeof renderDailyList === 'function' && typeof globalData !== 'undefined') {
        renderDailyList(globalData, keyword);
    }
};

// 💡 가계부 메인 내역 리스트 렌더링
window.renderDailyList = (data, searchKeyword = '') => {
    const container = document.getElementById('daily-list-container');
    if (!container) return;

    if (typeof updateMonthTitles === 'function') updateMonthTitles();
    const prefix = `${currentDisplayDate.getFullYear()}-${String(currentDisplayDate.getMonth() + 1).padStart(2, '0')}`;

    let filtered = [];
    const isSearching = searchKeyword.trim().length > 0;

    // 👇 1. 추가: 체크박스가 켜져 있는지 확인합니다.
    const isCurrentMonthOnly = document.getElementById('search-current-month-only')?.checked;

    if (isSearching) {
        const kw = searchKeyword.trim().toLowerCase();
        filtered = data.filter((d) => {
            // 👇 2. 추가: '이번 달만 검색'이 켜져 있는데, 날짜가 이번 달(prefix)이 아니면 무조건 제외!
            if (isCurrentMonthOnly && !d.Date?.startsWith(prefix)) {
                return false;
            }

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

    if (typeof applyTopRanks === 'function') applyTopRanks(filtered);

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

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        return window.listSortOrder === 'asc'
            ? new Date(a) - new Date(b)
            : new Date(b) - new Date(a);
    });

    const sortText = window.listSortOrder === 'asc' ? '과거순 (1일 ➔ 말일)' : '최신순 (말일 ➔ 1일)';
    container.insertAdjacentHTML(
        'beforeend',
        `
        <div class="flex justify-end mb-2 px-1">
            <button onclick="toggleListSortOrder()" class="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 font-bold bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm transition-all active:scale-95">
                <span class="material-symbols-outlined text-[14px]">swap_vert</span>
                ${sortText}
            </button>
        </div>
    `
    );

    sortedDates.forEach((dateStr) => {
        const d = new Date(dateStr);
        const displayDate =
            typeof window.formatDateStr === 'function' ? window.formatDateStr(d) : dateStr;
        const itemsForDate = groupedByDate[dateStr];
        const dailyIncome = itemsForDate
            .filter((item) => item.Type === 'income')
            .reduce((sum, item) => sum + (Number(item.Amount) || 0), 0);
        const dailyExpense = itemsForDate
            .filter((item) => item.Type === 'expense')
            .reduce((sum, item) => sum + (Number(item.Amount) || 0), 0);
        const isCollapsed = window.collapsedDailyDates.has(dateStr);
        const contentId = `daily-date-content-${dateStr.replace(/[^0-9-]/g, '')}`;

        container.insertAdjacentHTML(
            'beforeend',
            `<div class="mt-5 mb-2 border-b border-gray-100 px-1 pb-1">
                <button type="button" data-date="${dateStr}" aria-controls="${contentId}" aria-expanded="${!isCollapsed}" onclick="toggleDailyDateGroup(this)" class="w-full min-h-10 text-xs font-bold text-gray-500 flex items-center gap-1 text-left">
                    <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                    <span class="flex-1">${displayDate}</span>
                    <span data-daily-summary class="${isCollapsed ? 'flex' : 'hidden'} items-center gap-2 text-[10px] font-semibold">
                        ${dailyIncome !== 0 ? `<span class="text-blue-500">수입 ${formatMoney(dailyIncome)}</span>` : ''}
                        ${dailyExpense !== 0 ? `<span class="text-red-500">지출 ${formatMoney(dailyExpense)}</span>` : ''}
                    </span>
                    <span data-daily-arrow class="material-symbols-outlined text-[16px]">${isCollapsed ? 'expand_more' : 'expand_less'}</span>
                </button>
            </div>
            <div id="${contentId}" class="${isCollapsed ? 'hidden' : ''}"></div>`
        );

        const dateContent = document.getElementById(contentId);
        let orderedItemsForDate = itemsForDate;
        if (window.listSortOrder === 'desc') {
            orderedItemsForDate = [...itemsForDate].reverse();
        }

        orderedItemsForDate.forEach((item) => {
            const parsed =
                typeof parseMemo === 'function'
                    ? parseMemo(item.Memo)
                    : { itemName: item.Memo, payMethod: '', discount: 0 };
            const isExp = item.Type === 'expense';
            const catLabel =
                globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
            const amountNum = Number(item.Amount);
            const displayColor = isExp ? 'text-red-500' : 'text-blue-500';
            const iconBg = isExp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
            const displaySign = amountNum < 0 ? '-' : '';
            const iconName =
                typeof getCategoryIcon === 'function' ? getCategoryIcon(catLabel) : 'payments';

            let krwValue = '';
            if (typeof getKrwEquivalent === 'function') {
                krwValue = getKrwEquivalent(Math.abs(amountNum));
            }

            dateContent.insertAdjacentHTML(
                'beforeend',
                `<div onclick="if(typeof openEditModal === 'function') openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                    <div class="flex items-center gap-2.5 flex-1 min-w-0">
                        <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm">${iconName}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center">
                                <p class="text-sm font-bold text-gray-800 truncate">${typeof escapeHTML === 'function' ? escapeHTML(parsed.itemName) : parsed.itemName}</p>
                                ${item.rankBadge || ''}
                            </div>
                            <p class="text-[10px] text-gray-400 mt-1 truncate">${typeof escapeHTML === 'function' ? escapeHTML(catLabel) : catLabel} • ${typeof escapeHTML === 'function' ? escapeHTML(parsed.payMethod) : parsed.payMethod}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0 ml-3">
                        <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${typeof formatMoney === 'function' ? formatMoney(Math.abs(amountNum)) : Math.abs(amountNum)}</p>
                        ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                        ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${typeof formatMoney === 'function' ? formatMoney(parsed.discount) : parsed.discount}</p>` : ''}
                    </div>
                </div>`
            );
        });
    });
};

// 이번 달 현재까지와 전월 같은 날짜 구간의 지출 및 카테고리 변화를 전광판에 표시합니다.
window.updateSpendingTicker = () => {
    const ticker = document.getElementById('spending-ticker');
    const messageEl = document.getElementById('spending-ticker-message');
    const copyEl = document.getElementById('spending-ticker-copy');
    if (!ticker || !messageEl || !copyEl) return;

    const dailyView = document.getElementById('view-daily');
    const mainApp = document.getElementById('main-app');
    const isDailyViewActive =
        window.currentAppMode !== 'ASSETS' && dailyView?.classList.contains('active');
    if (!isDailyViewActive) {
        ticker.classList.add('hidden');
        mainApp?.classList.remove('spending-ticker-visible');
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = (date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const currentStart = dateKey(new Date(today.getFullYear(), today.getMonth(), 1));
    const previousStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousEndDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    const previousCutoff = dateKey(
        new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            Math.min(today.getDate(), previousEndDay)
        )
    );
    const previousPrefix = dateKey(previousStartDate).slice(0, 7);
    let currentExpense = 0;
    let previousExpense = 0;
    const currentByCategory = new Map();
    const previousByCategory = new Map();

    (globalData || []).forEach((item) => {
        if (item.Type !== 'expense' || !item.Date) return;
        const date = String(item.Date).slice(0, 10);
        const amount = Number(item.Amount) || 0;
        const categoryKey = item.Category || '__uncategorized__';
        const categoryLabel =
            globalCategories.find((category) => category.Value === item.Category)?.Label ||
            item.Category ||
            '미분류';

        if (date >= currentStart && date <= dateKey(today)) {
            currentExpense += amount;
            const entry = currentByCategory.get(categoryKey) || { label: categoryLabel, amount: 0 };
            entry.amount += amount;
            currentByCategory.set(categoryKey, entry);
        } else if (date.startsWith(previousPrefix) && date <= previousCutoff) {
            previousExpense += amount;
            const entry = previousByCategory.get(categoryKey) || { label: categoryLabel, amount: 0 };
            entry.amount += amount;
            previousByCategory.set(categoryKey, entry);
        }
    });

    const difference = currentExpense - previousExpense;
    let headline;
    if (difference < 0) {
        ticker.dataset.trend = 'less';
        headline = `🎉 절약 중! 전월 같은 기간보다 <span class="spending-ticker-delta spending-ticker-delta--less">${escapeHTML(formatMoney(Math.abs(difference)))}</span> 덜 쓰고 있어요.`;
    } else if (difference > 0) {
        ticker.dataset.trend = 'more';
        headline = `⚠️ 지출 페이스가 빨라요! 전월 같은 기간보다 <span class="spending-ticker-delta spending-ticker-delta--more">${escapeHTML(formatMoney(difference))}</span> 더 쓰고 있어요.`;
    } else {
        ticker.dataset.trend = 'same';
        headline = currentExpense === 0
            ? '😌 이번 달은 아직 지출이 없어요.'
            : '😌 전월 같은 기간과 지출이 같아요.';
    }

    const categoryChanges = new Map();
    [...currentByCategory.keys(), ...previousByCategory.keys()].forEach((key) => {
        if (categoryChanges.has(key)) return;
        const current = currentByCategory.get(key);
        const previous = previousByCategory.get(key);
        const label = current?.label || previous?.label || '미분류';
        const amount = (current?.amount || 0) - (previous?.amount || 0);
        if (amount !== 0) categoryChanges.set(key, { label, amount });
    });
    const categorySummary = [...categoryChanges.values()]
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 2)
        .map(
            ({ label, amount }) =>
                `${escapeHTML(label)} <span class="spending-ticker-delta ${amount > 0 ? 'spending-ticker-delta--more' : 'spending-ticker-delta--less'}">${amount > 0 ? '+' : '−'}${escapeHTML(formatMoney(Math.abs(amount)))}</span>`
        )
        .join(' · ');
    const totals = `전월 같은 기간 ${escapeHTML(formatMoney(previousExpense))} → 이번 달 ${escapeHTML(formatMoney(currentExpense))}.`;
    const message = categorySummary
        ? `${headline} ${totals} 카테고리 변화: ${categorySummary}.`
        : `${headline} ${totals} 카테고리별 큰 변화는 없어요.`;

    messageEl.innerHTML = message;
    copyEl.innerHTML = message;
    ticker.classList.remove('hidden');
    mainApp?.classList.add('spending-ticker-visible');
};

// 💡 이번 달 총 수입/지출 및 증감 계산
window.updateMonthlyTotals = function () {
    if (typeof globalData === 'undefined' || !globalData) return;

    const targetY = currentDisplayDate.getFullYear();
    const targetM = currentDisplayDate.getMonth();

    const currentPrefix = `${targetY}-${String(targetM + 1).padStart(2, '0')}`;
    let prevY = targetY;
    let prevM = targetM - 1;
    if (prevM < 0) {
        prevM = 11;
        prevY--;
    }
    const prevPrefix = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;

    let currentIncome = 0,
        currentExpense = 0,
        prevIncome = 0,
        prevExpense = 0;

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

    const elIncome = document.getElementById('monthly-income-total');
    const elExpense = document.getElementById('monthly-expense-total');
    if (elIncome)
        elIncome.innerText =
            typeof formatMoney === 'function'
                ? formatMoney(currentIncome)
                : currentIncome.toLocaleString();
    if (elExpense)
        elExpense.innerText =
            typeof formatMoney === 'function'
                ? formatMoney(currentExpense)
                : currentExpense.toLocaleString();

    const momIncomeEl = document.getElementById('mom-income');
    const momExpenseEl = document.getElementById('mom-expense');

    if (momIncomeEl) {
        const diff = currentIncome - prevIncome;
        if (prevIncome === 0 && currentIncome === 0) {
            momIncomeEl.innerHTML = `<span class="text-gray-300">내역 없음</span>`;
        } else if (diff > 0) {
            momIncomeEl.innerHTML = `<span class="text-blue-500 font-bold flex items-center justify-center gap-0.5"><span class="material-symbols-outlined text-[12px]">arrow_upward</span>${typeof formatMoney === 'function' ? formatMoney(diff) : diff.toLocaleString()}</span>`;
        } else if (diff < 0) {
            momIncomeEl.innerHTML = `<span class="text-red-400 font-bold flex items-center justify-center gap-0.5"><span class="material-symbols-outlined text-[12px]">arrow_downward</span>${typeof formatMoney === 'function' ? formatMoney(Math.abs(diff)) : Math.abs(diff).toLocaleString()}</span>`;
        } else {
            momIncomeEl.innerHTML = `<span class="text-gray-400">지난달과 동일</span>`;
        }
    }

    if (momExpenseEl) {
        const diff = currentExpense - prevExpense;
        if (prevExpense === 0 && currentExpense === 0) {
            momExpenseEl.innerHTML = `<span class="text-gray-300">내역 없음</span>`;
        } else if (diff > 0) {
            momExpenseEl.innerHTML = `<span class="text-red-500 font-bold flex items-center justify-center gap-0.5"><span class="material-symbols-outlined text-[12px]">arrow_upward</span>${typeof formatMoney === 'function' ? formatMoney(diff) : diff.toLocaleString()}</span>`;
        } else if (diff < 0) {
            momExpenseEl.innerHTML = `<span class="text-blue-500 font-bold flex items-center justify-center gap-0.5"><span class="material-symbols-outlined text-[12px]">arrow_downward</span>${typeof formatMoney === 'function' ? formatMoney(Math.abs(diff)) : Math.abs(diff).toLocaleString()}</span>`;
        } else {
            momExpenseEl.innerHTML = `<span class="text-gray-400">지난달과 동일</span>`;
        }
    }

    if (typeof window.updateSpendingTicker === 'function') window.updateSpendingTicker();
};

// 💡 달력(FullCalendar) 초기화 (유령 렌더링 문제 완벽 해결!)
window.initCalendar = () => {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    // 💡 window.calendar가 아닌, 원본에서 쓰던 진짜 calendar 변수 사용!
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ko',
        headerToolbar: false,
        height: 'auto',
        fixedWeekCount: false,
        dayCellContent: (info) => info.dayNumberText.replace('일', ''),
        eventDidMount: (info) => {
            const digitCount = info.event.title.replace(/\D/g, '').length;
            if (digitCount < 7) return;

            const title = info.el.querySelector('.fc-event-title');
            if (!title) return;
            title.style.fontSize = '0.68em';
            title.style.letterSpacing = '-0.04em';
            title.style.whiteSpace = 'nowrap';
        },
        dateClick: (info) => {
            if (typeof openWeeklyModal === 'function') openWeeklyModal(info.dateStr);
        },
        datesSet: (info) => {
            // 💡 여기도 window.currentDisplayDate 대신 원본 변수 사용!
            currentDisplayDate = new Date(info.view.currentStart);

            if (typeof updateMonthTitles === 'function') updateMonthTitles();
            if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();
            if (typeof renderDailyList === 'function' && typeof globalData !== 'undefined') {
                renderDailyList(globalData);
            }
            const statsTab = document.getElementById('view-stats');
            if (
                statsTab &&
                statsTab.classList.contains('active') &&
                typeof renderChart === 'function'
            ) {
                renderChart();
            }
        },
    });

    calendar.render();
    if (typeof renderCalendarEvents === 'function') renderCalendarEvents();
};

window.renderCalendarEvents = () => {
    // 💡 window. 제거
    if (typeof calendar === 'undefined' || !calendar) return;

    calendar.setOption('eventOrder', 'order');
    calendar.removeAllEvents();

    const totals = {};
    if (typeof globalData !== 'undefined') {
        globalData.forEach((item) => {
            const date = item.Date.substring(0, 10);
            if (!totals[date]) totals[date] = { in: 0, ex: 0 };
            item.Type === 'expense'
                ? (totals[date].ex += Number(item.Amount))
                : (totals[date].in += Number(item.Amount));
        });
    }

    const events = [];
    for (const [d, t] of Object.entries(totals)) {
        if (t.in === 0 && t.ex === 0) continue;

        events.push({
            title:
                t.ex !== 0
                    ? (t.ex < 0 ? '-' : '') + Math.abs(t.ex).toLocaleString('en-US')
                    : '\u00A0',
            start: d,
            allDay: true,
            textColor: t.ex !== 0 ? '#ef4444' : 'transparent',
            classNames: [t.ex !== 0 ? 'calendar-expense-event' : 'calendar-empty-event'],
            order: 1,
        });

        events.push({
            title:
                t.in !== 0
                    ? (t.in < 0 ? '-' : '') + Math.abs(t.in).toLocaleString('en-US')
                    : '\u00A0',
            start: d,
            allDay: true,
            textColor: t.in !== 0 ? '#3b82f6' : 'transparent',
            classNames: [t.in !== 0 ? 'calendar-income-event' : 'calendar-empty-event'],
            order: 2,
        });
    }
    calendar.addEventSource(events);
};

// 💡 항목명 자동완성(Auto-complete) 기능
window.showSuggestions = (text) => {
    const box = document.getElementById('suggestion-box');
    if (!box) return;

    const keyword = text.trim().toLowerCase();
    if (keyword.length === 0) {
        box.innerHTML = '';
        box.classList.add('hidden');
        return;
    }

    const nameCategories = new Map();
    if (typeof globalData !== 'undefined') {
        globalData.forEach((item) => {
            if (!item.Memo) return;
            const parsed =
                typeof parseMemo === 'function' ? parseMemo(item.Memo) : { itemName: item.Memo };
            const name = parsed.itemName.trim();

            if (!name) return;
            // globalData는 오래된 내역부터 순회하므로 타입별 최신 카테고리로 갱신합니다.
            const existing = nameCategories.get(name) || {};
            existing[item.Type] = item.Category;
            nameCategories.set(name, existing);
        });
    }

    const matched = [...nameCategories.entries()]
        .filter(([name]) => name.toLowerCase().startsWith(keyword))
        .slice(0, 5);

    if (matched.length === 0) {
        box.innerHTML = '';
        box.classList.add('hidden');
        return;
    }

    window.currentSuggestions = matched;
    box.innerHTML = matched
        .map(
            ([name], index) =>
                `<div onclick="selectSuggestion(${index})" class="px-4 py-2.5 border-b border-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer active:bg-gray-200 transition">
            <span class="material-symbols-outlined text-[14px] text-gray-400 align-middle mr-1">history</span>
            ${typeof escapeHTML === 'function' ? escapeHTML(name) : name}
        </div>`
        )
        .join('');

    box.classList.remove('hidden');
};

window.selectSuggestion = (index) => {
    const suggestion = window.currentSuggestions?.[index];
    if (!suggestion) return;
    const [name, categories] = suggestion;
    const input = document.getElementById('input-item-name');
    if (input) input.value = name;
    const type = document.querySelector('input[name="type"]:checked')?.value;
    const previousCategory = categories[type];
    const categorySelect = document.getElementById('input-category');
    if (categorySelect && previousCategory && [...categorySelect.options].some((option) => option.value === previousCategory)) {
        categorySelect.value = previousCategory;
    }
    const box = document.getElementById('suggestion-box');
    if (box) {
        box.innerHTML = '';
        box.classList.add('hidden');
    }
};

document.addEventListener('click', (e) => {
    const box = document.getElementById('suggestion-box');
    const input = document.getElementById('input-item-name');
    if (box && input && e.target !== input && !box.contains(e.target)) {
        box.classList.add('hidden');
    }
});

// 💡 금액창 마이너스 토글 기능
window.toggleMinusSign = () => {
    const input = document.getElementById('input-amount');
    if (!input) return;
    let val = input.value.trim();
    if (val.startsWith('-')) input.value = val.substring(1);
    else input.value = '-' + val;
};

document.addEventListener('change', (e) => {
    if (e.target.name === 'type' && e.target.value === 'income') {
        const amountInput = document.getElementById('input-amount');
        if (amountInput && amountInput.value.startsWith('-')) {
            amountInput.value = amountInput.value.substring(1);
        }
    }
});
