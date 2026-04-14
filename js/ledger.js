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
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
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

        container.insertAdjacentHTML(
            'beforeend',
            `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
                <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                ${displayDate}
            </div>`
        );

        let itemsForDate = groupedByDate[dateStr];
        if (window.listSortOrder === 'desc') {
            itemsForDate = [...itemsForDate].reverse();
        }

        itemsForDate.forEach((item) => {
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

            container.insertAdjacentHTML(
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

    const uniqueNames = [];
    const seen = new Set();

    if (typeof globalData !== 'undefined') {
        globalData.forEach((item) => {
            if (!item.Memo) return;
            const parsed =
                typeof parseMemo === 'function' ? parseMemo(item.Memo) : { itemName: item.Memo };
            const name = parsed.itemName.trim();

            if (name && !seen.has(name)) {
                seen.add(name);
                uniqueNames.push(name);
            }
        });
    }

    const matched = uniqueNames.filter((name) => name.toLowerCase().includes(keyword)).slice(0, 5);

    if (matched.length === 0) {
        box.innerHTML = '';
        box.classList.add('hidden');
        return;
    }

    box.innerHTML = matched
        .map(
            (name) =>
                `<div onclick="selectSuggestion('${name.replace(/'/g, "\\'")}')" class="px-4 py-2.5 border-b border-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer active:bg-gray-200 transition">
            <span class="material-symbols-outlined text-[14px] text-gray-400 align-middle mr-1">history</span>
            ${typeof escapeHTML === 'function' ? escapeHTML(name) : name}
        </div>`
        )
        .join('');

    box.classList.remove('hidden');
};

window.selectSuggestion = (name) => {
    const input = document.getElementById('input-item-name');
    if (input) input.value = name;
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
