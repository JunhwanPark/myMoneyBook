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

window.changeGlobalMonth = (offset) => {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
    updateMonthTitles();
    renderDailyList(globalData);
    if (document.getElementById('view-stats').classList.contains('active')) renderChart();
    if (calendar) calendar.gotoDate(currentDisplayDate);
};

window.switchTab = (tabId, title, btnElement) => {
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

    document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
    document.getElementById('view-' + tabId).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.classList.remove('text-primary');
        btn.classList.add('text-gray-400');
    });
    if (btnElement) btnElement.classList.replace('text-gray-400', 'text-primary');

    if (tabId === 'daily') {
        renderDailyList(globalData);
    } else if (tabId === 'monthly') {
        updateMonthlyTotals();
        if (!calendar) initCalendar();
        else setTimeout(() => calendar.render(), 10);
    } else if (tabId === 'stats') {
        renderChart();
    }
};

window.switchCountry = function (country) {
    if (currentCountry === country) return;
    currentCountry = country;
    const btnKr = document.getElementById('btn-kr');
    const btnCn = document.getElementById('btn-cn');
    if (country === 'KR') {
        document.body.classList.remove('theme-cn');
        btnKr.className = 'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow';
        btnCn.className = 'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70';
    } else {
        document.body.classList.add('theme-cn');
        btnCn.className = 'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow';
        btnKr.className = 'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70';
    }
    loadDailyRecords();
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

    // 💡 검색어가 있으면 "전체 기간"에서 찾고, 없으면 "이번 달" 데이터만 필터링합니다.
    if (isSearching) {
        const kw = searchKeyword.trim().toLowerCase();
        filtered = data.filter((d) => {
            const parsed = parseMemo(d.Memo);
            const catLabel = globalCategories.find((c) => c.Value === d.Category)?.Label || '';
            // 항목명, 카테고리명, 메모 전체에서 검색
            return (
                parsed.itemName.toLowerCase().includes(kw) ||
                catLabel.toLowerCase().includes(kw) ||
                d.Memo.toLowerCase().includes(kw)
            );
        });
        // 검색 중일 때는 월 이동 버튼을 숨깁니다.
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

    let total = 0;
    const groupedByDate = {};

    filtered.forEach((item) => {
        if (item.Type === 'expense') total += Number(item.Amount);

        const dateStr = item.Date.substring(0, 10);
        if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
        groupedByDate[dateStr].push(item);
    });

    // 💡 검색 중일 때는 상단에 '검색 합계액'을 표시해 줍니다.
    document.getElementById('daily-total-expense').innerText = isSearching
        ? `검색 합계: ${formatMoney(total)}`
        : formatMoney(total);

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach((dateStr) => {
        const d = new Date(dateStr);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const displayDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;

        container.insertAdjacentHTML(
            'beforeend',
            `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
                <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                ${displayDate}
            </div>`
        );

        groupedByDate[dateStr].forEach((item) => {
            const parsed = parseMemo(item.Memo);
            const isExp = item.Type === 'expense';
            const catLabel =
                globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';

            const amountNum = Number(item.Amount);
            const displayColor = isExp ? 'text-red-500' : 'text-blue-500';
            const iconBg = isExp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
            const displaySign = amountNum < 0 ? '-' : '';

            container.insertAdjacentHTML(
                'beforeend',
                `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                    <div class="flex items-center gap-2.5">
                        <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm">${getCategoryIcon(catLabel)}</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-800 leading-none">${parsed.itemName}</p>
                            <p class="text-[10px] text-gray-400 mt-1">${catLabel} • ${parsed.payMethod}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formatMoney(Math.abs(amountNum))}</p>
                        <p class="text-[9px] text-gray-300 mt-1">${item.User?.split('@')[0]}</p>
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
// 1. 통계 화면 렌더링 (말일 정산 로직 추가)
// ==========================================
window.renderChart = function () {
    updateMonthTitles();
    const targetY = currentDisplayDate.getFullYear();
    const targetM = currentDisplayDate.getMonth();
    const prefix = `${targetY}-${String(targetM + 1).padStart(2, '0')}`;
    const expenses = globalData.filter((d) => d.Type === 'expense' && d.Date?.startsWith(prefix));
    const chartEl = document.getElementById('expenseChart');

    if (!expenses.length) {
        chartEl.style.display = 'none';
        document.getElementById('no-chart-data').classList.remove('hidden');
        document.getElementById('chart-total-expense').innerText = '총 0원';
        document.getElementById('card-stats-container').innerHTML = '';
        return;
    }

    chartEl.style.display = 'block';
    document.getElementById('no-chart-data').classList.add('hidden');

    const catTotals = {};
    let sum = 0;
    expenses.forEach((item) => {
        const cat = globalCategories.find((c) => c.Value === item.Category)?.Label || '기타';
        catTotals[cat] = (catTotals[cat] || 0) + Number(item.Amount);
        sum += Number(item.Amount);
    });
    document.getElementById('chart-total-expense').innerText = `총 ${formatMoney(sum)}`;

    if (expenseChart) expenseChart.destroy();

    const chartLabels = [];
    const chartData = [];
    for (const [cat, val] of Object.entries(catTotals)) {
        if (val > 0) {
            chartLabels.push(cat);
            chartData.push(val);
        }
    }

    expenseChart = new Chart(chartEl.getContext('2d'), {
        type: 'doughnut',
        plugins: [ChartDataLabels],
        data: {
            labels: chartLabels,
            datasets: [
                {
                    data: chartData,
                    backgroundColor: [
                        '#ef4444',
                        '#3b82f6',
                        '#f59e0b',
                        '#10b981',
                        '#8b5cf6',
                        '#6366f1',
                        '#ec4899',
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4,
                },
            ],
        },
        // 👇 이 options 부분만 덮어씌워 주세요!
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // 차트 위아래 여백을 살짝 줄여서 범례가 들어갈 세로 공간을 더 확보합니다 (15 -> 10)
            layout: { padding: { top: 25, bottom: 25, left: 10, right: 10 } },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 10, // 컬러 네모 박스 크기 살짝 축소 (12 -> 10)
                        padding: 8, // 💡 핵심: 항목 사이의 줄 간격을 대폭 축소 (15 -> 8)
                        font: { size: 10, family: "'Pretendard', sans-serif" }, // 글씨 크기 미세 조정 (11 -> 10)
                    },
                },
                datalabels: {
                    color: '#4b5563',
                    anchor: 'end',
                    align: 'end',
                    offset: 2,
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
                            if (context.parsed !== null) label += formatMoney(context.parsed);
                            return label;
                        },
                    },
                },
            },
        },
    });

    // ==========================================
    // 여기서부터가 수정된 부분입니다!
    // ==========================================
    const container = document.getElementById('card-stats-container');
    container.innerHTML =
        '<h3 class="text-xs font-bold text-gray-500 mb-2 mt-6">카드별 정산 (기준일 반영)</h3>';
    const cardSums = {};

    globalData.forEach((item) => {
        if (item.Type !== 'expense') return;
        const parsed = parseMemo(item.Memo);
        const cardDef = globalCards.find((c) => c.Label.split('|')[0] === parsed.payMethod);
        if (!cardDef) return;

        const dayStr = cardDef.Label.split('|')[1] || '31';
        const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';

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
            cardSums[parsed.payMethod] = (cardSums[parsed.payMethod] || 0) + Number(item.Amount);
        }
    });

    // 💡 화면에 바로 그리지 않고 정렬을 위해 배열(cardStatsList)에 먼저 담습니다.
    const cardStatsList = [];

    globalCards.forEach((card) => {
        const [name, dayStr] = card.Label.split('|');
        const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';

        let start, end;
        if (isEnd) {
            start = new Date(targetY, targetM, 1);
            end = new Date(targetY, targetM + 1, 0);
        } else {
            const closingDay = parseInt(dayStr);
            end = new Date(targetY, targetM, closingDay);
            start = new Date(targetY, targetM - 1, closingDay + 1);
        }

        const displayDay = isEnd ? '말일' : `${dayStr}일`;
        const amount = cardSums[name] || 0;

        // 결제 금액이 0원보다 큰 카드만 배열에 추가합니다 (0원 숨김 반영)
        if (amount > 0) {
            cardStatsList.push({
                name: name,
                displayDay: displayDay,
                start: start,
                end: end,
                amount: amount,
            });
        }
    });

    // 💡 1순위: 금액 내림차순 정렬 / 2순위: 같으면 이름 가나다순 정렬
    cardStatsList.sort((a, b) => {
        if (b.amount !== a.amount) {
            return b.amount - a.amount;
        }
        return a.name.localeCompare(b.name);
    });

    // 💡 정렬이 끝난 배열을 순서대로 화면에 그려줍니다.
    cardStatsList.forEach((stat) => {
        container.insertAdjacentHTML(
            'beforeend',
            `<div onclick="openCardDetailModal('${stat.name}', '${prefix}')" class="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 mb-2 shadow-sm cursor-pointer hover:bg-gray-200 active:scale-[0.99] transition">
                <div class="flex justify-between items-center mb-0.5">
                    <div>
                        <span class="text-sm font-extrabold text-gray-800 leading-none">${stat.name}</span>
                        <span class="text-[10px] text-indigo-500 font-bold ml-1">기준: ${stat.displayDay}</span>
                    </div>
                    <span class="text-sm font-black text-gray-900 leading-none">${formatMoney(stat.amount)}</span>
                </div>
                <div class="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <span class="material-symbols-outlined text-[12px]">calendar_today</span>
                    ${stat.start.toLocaleDateString()} ~ ${stat.end.toLocaleDateString()}
                </div>
            </div>`
        );
    });

    // 결제된 카드가 하나도 없을 경우의 안내 문구
    if (cardStatsList.length === 0) {
        container.insertAdjacentHTML(
            'beforeend',
            '<p class="text-center text-gray-400 text-sm py-4 font-medium">이번 달 정산될 카드 내역이 없습니다.</p>'
        );
    }
};

window.updateMonthlyTotals = function (dateObj) {
    const incomeEl = document.getElementById('monthly-income-total');
    const expenseEl = document.getElementById('monthly-expense-total');
    if (!incomeEl || !expenseEl) return;

    let incomeTotal = 0;
    let expenseTotal = 0;
    const targetDate = dateObj || currentDisplayDate;
    const targetMonthPrefix = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    if (globalData && globalData.length > 0) {
        globalData.forEach((item) => {
            if (item.Date && item.Date.substring(0, 7) === targetMonthPrefix) {
                if (item.Type === 'income') incomeTotal += Number(item.Amount);
                else if (item.Type === 'expense') expenseTotal += Number(item.Amount);
            }
        });
    }
    incomeEl.innerText = formatMoney(incomeTotal);
    expenseEl.innerText = formatMoney(expenseTotal);
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
        select.insertAdjacentHTML('beforeend', `<option value="${name}">${name}</option>`);
    });
};

window.renderCategoryDropdown = (type) => {
    const select = document.getElementById('input-category');
    if (!select) return;
    select.innerHTML = '<option value="">카테고리 선택</option>';
    globalCategories
        .filter((c) => c.Type === type)
        .sort((a, b) => a.Label.localeCompare(b.Label))
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
    document.getElementById('input-date').value = new Date().toISOString().split('T')[0];
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
                    <span class="text-sm font-medium text-gray-800">${name}</span>
                    <span class="text-[10px] text-gray-400">기준: ${displayDay}</span>
                </div>
                <div class="flex gap-1 shrink-0">
                    <button onclick="prepareEditCard('${c.Value}', '${name}', '${dayStr}')" class="text-gray-400 hover:text-blue-500 transition p-1">
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
// 카테고리 관리 모달 리스트 렌더링
// ==========================================
window.openCategoryModal = () => {
    // 💡 모달을 열 때 폼과 버튼을 항상 초기 상태('추가')로 리셋
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

    const sortedCategories = [...globalCategories].sort((a, b) => {
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

            container.insertAdjacentHTML(
                'beforeend',
                `<li class="py-1.5 flex justify-between items-center gap-2">
                    <div class="flex items-center gap-2 overflow-hidden">
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
    // 1. 클릭한 날짜 하루만 타겟팅
    const targetDate = clickedDateStr.substring(0, 10);

    // 2. 모달 상단에 표시될 날짜를 보기 좋게 포맷팅 (예: 2026년 3월 15일 일요일)
    const d = new Date(targetDate);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const displayDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;

    // 3. 기존 모달의 제목(주간 내역)을 '일간 상세 내역'으로 동적 변경
    const modal = document.getElementById('weekly-modal');
    const titleEl = modal.querySelector('h3');
    if (titleEl) titleEl.innerText = '일간 상세 내역';
    document.getElementById('weekly-date-range').innerText = displayDate;

    // 4. 전체 데이터에서 해당 날짜 데이터만 쏙 필터링
    const dailyData = globalData.filter((item) => item.Date.substring(0, 10) === targetDate);

    const container = document.getElementById('weekly-list-container');
    container.innerHTML = '';

    // 5. 내역이 없을 경우 비어있는 UI 표시
    if (dailyData.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16">
                <span class="material-symbols-outlined text-gray-300 text-5xl mb-3">receipt_long</span>
                <p class="text-center text-gray-400 text-sm font-medium">이 날은 내역이 없습니다.</p>
            </div>`;
    } else {
        // 6. 내역이 있을 경우 리스트 렌더링 (클릭 시 수정 모달 연결 유지)
        dailyData.forEach((item) => {
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

            container.insertAdjacentHTML(
                'beforeend',
                `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                    <div class="flex items-center gap-2.5">
                        <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm">${iconName}</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-800 leading-none">${parsed.itemName}</p>
                            <p class="text-[10px] text-gray-400 mt-1">${catLabel} • ${parsed.payMethod} • ${item.Date.substring(0, 10)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formatMoney(Math.abs(amountNum))}</p>
                    </div>
                </div>`
            );
        });
    }

    // 7. 모달 애니메이션으로 띄우기
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
window.openCardDetailModal = function (cardName, prefix) {
    const cardDef = globalCards.find((c) => c.Label.split('|')[0] === cardName);
    if (!cardDef) return;

    const dayStr = cardDef.Label.split('|')[1] || '31';
    const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';

    const [targetY, targetMStr] = prefix.split('-');
    const year = parseInt(targetY);
    const month = parseInt(targetMStr) - 1;

    let start, end;
    if (isEnd) {
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
    } else {
        const closingDay = parseInt(dayStr);
        end = new Date(year, month, closingDay);
        start = new Date(year, month - 1, closingDay + 1);
    }

    document.getElementById('card-detail-title').innerText = `${cardName} 결제 내역`;
    document.getElementById('card-detail-date-range').innerText =
        `${start.toLocaleDateString()} ~ ${end.toLocaleDateString()}`;

    const filteredData = globalData.filter((item) => {
        if (item.Type !== 'expense') return false;
        const parsed = parseMemo(item.Memo);
        if (parsed.payMethod !== cardName) return false;

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
    });

    filteredData.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    const container = document.getElementById('card-detail-list-container');
    container.innerHTML = '';

    if (filteredData.length === 0) {
        container.innerHTML =
            '<p class="text-center text-gray-500 py-10 text-sm">결제 내역이 없습니다.</p>';
    } else {
        filteredData.forEach((item) => {
            const parsed = parseMemo(item.Memo);
            const catLabel =
                globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
            const iconName = getCategoryIcon(catLabel);

            // 👇 카드는 무조건 지출(expense)이므로 항상 빨간색
            const amountNum = Number(item.Amount);
            const displayColor = 'text-red-500';
            const iconBg = 'bg-red-100 text-red-600';
            const displaySign = amountNum < 0 ? '-' : '';

            container.insertAdjacentHTML(
                'beforeend',
                `
                <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition">
                    <div class="flex items-center gap-2.5">
                        <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm">${iconName}</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-800 leading-none">${parsed.itemName}</p>
                            <p class="text-[10px] text-gray-400 mt-1">${catLabel} • ${item.Date.substring(0, 10)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formatMoney(Math.abs(amountNum))}</p>
                        ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${formatMoney(parsed.discount)}</p>` : ''}
                    </div>
                </div>
            `
            );
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
                <p class="text-center text-gray-400 text-sm font-medium">이번 달 ${typeName} 내역이 없습니다.</p>
            </div>`;
    } else {
        // 1. 데이터를 날짜별로 그룹핑
        const groupedByDate = {};
        monthlyData.forEach((item) => {
            const dateStr = item.Date.substring(0, 10);
            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
            groupedByDate[dateStr].push(item);
        });

        // 2. 날짜를 최신순(내림차순)으로 정렬
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

        // 3. 그룹핑된 날짜 순서대로 렌더링
        sortedDates.forEach((dateStr) => {
            const d = new Date(dateStr);
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const displayDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;

            // 👇 날짜 헤더 추가
            container.insertAdjacentHTML(
                'beforeend',
                `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
                    <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                    ${displayDate}
                </div>`
            );

            // 👇 해당 날짜에 속한 항목 렌더링
            groupedByDate[dateStr].forEach((item) => {
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

                container.insertAdjacentHTML(
                    'beforeend',
                    `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                        <div class="flex items-center gap-2.5">
                            <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-sm">${iconName}</span>
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-800 leading-none">${parsed.itemName}</p>
                                <p class="text-[10px] text-gray-400 mt-1">${catLabel} • ${parsed.payMethod}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formatMoney(Math.abs(amountNum))}</p>
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
// 🌙 다크 모드 제어 및 상태 저장 로직
// ==========================================
window.toggleDarkMode = () => {
    const html = document.documentElement;
    // <html> 태그에 'dark' 클래스를 넣었다 뺐다 합니다.
    html.classList.toggle('dark');
    const isDark = html.classList.contains('dark');

    // 사용자가 선택한 테마를 브라우저에 저장 (새로고침해도 유지됨)
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // 버튼 아이콘 모양을 해/달로 변경
    const icon = document.getElementById('dark-mode-icon');
    if (icon) {
        icon.innerText = isDark ? 'light_mode' : 'dark_mode';
    }
};

// 앱이 처음 켜질 때, 이전에 저장해둔 테마가 있는지 확인하고 적용하는 함수
window.initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    const wantsDark = savedTheme === 'dark';

    if (wantsDark) {
        document.documentElement.classList.add('dark');
        const icon = document.getElementById('dark-mode-icon');
        if (icon) icon.innerText = 'light_mode';
    }
};

// 화면 로딩이 끝나면 바로 테마 초기화 함수를 실행합니다.
document.addEventListener('DOMContentLoaded', window.initTheme);
