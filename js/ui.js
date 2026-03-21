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

            // 💡 flex-1, min-w-0, truncate 등을 조합한 방탄 레이아웃 적용
            container.insertAdjacentHTML(
                'beforeend',
                `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                    <div class="flex items-center gap-2.5 flex-1 min-w-0">
                        <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm">${getCategoryIcon(catLabel)}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center">
                                <p class="text-sm font-bold text-gray-800 truncate">${parsed.itemName}</p>
                                ${item.rankBadge || ''}
                            </div>
                            <p class="text-[10px] text-gray-400 mt-1 truncate">${catLabel} • ${parsed.payMethod}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0 ml-3">
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
// 1. 통계 화면 렌더링 (말일 정산 및 에러 방지 안전망 적용)
// ==========================================
window.renderChart = function () {
    updateMonthTitles();
    const targetY = currentDisplayDate.getFullYear();
    const targetM = currentDisplayDate.getMonth();
    const prefix = `${targetY}-${String(targetM + 1).padStart(2, '0')}`;

    // 이번 달 '달력 기준' 지출 내역 (도넛 차트용)
    const expenses = globalData.filter((d) => d.Type === 'expense' && d.Date?.startsWith(prefix));
    const chartEl = document.getElementById('expenseChart');
    const noDataEl = document.getElementById('no-chart-data');
    const container = document.getElementById('card-stats-container');

    // ==========================================
    // 📊 상단 도넛 차트 렌더링 (안전망 씌움)
    // ==========================================
    try {
        let sum = 0;
        const catTotals = {};
        expenses.forEach((item) => {
            const cat = globalCategories.find((c) => c.Value === item.Category)?.Label || '기타';
            catTotals[cat] = (catTotals[cat] || 0) + Number(item.Amount);
            sum += Number(item.Amount);
        });

        const totalEl = document.getElementById('chart-total-expense');
        if (totalEl) totalEl.innerText = `총 ${formatMoney(sum)}`;

        // 차트를 감싸고 있는 하얀색 배경 박스 찾기
        const chartWrapper = chartEl ? chartEl.closest('.bg-white') : null;

        if (!expenses.length) {
            // 지출이 없으면 캔버스와 하얀 박스를 통째로 숨깁니다.
            if (chartWrapper) chartWrapper.style.display = 'none';
            if (noDataEl) noDataEl.classList.remove('hidden');
        } else {
            // 지출이 있으면 하얀 박스를 다시 보여줍니다.
            if (chartWrapper) chartWrapper.style.display = 'flex';
            if (noDataEl) noDataEl.classList.add('hidden');

            // 💡 핵심 버그 픽스: 캔버스에 이미 그려진 차트가 있다면 변수명에 상관없이 강제로 찾아내 파괴!
            const existingChart = Chart.getChart(chartEl);
            if (existingChart) {
                existingChart.destroy();
            }

            const chartLabels = [];
            const chartData = [];
            for (const [cat, val] of Object.entries(catTotals)) {
                if (val > 0) {
                    chartLabels.push(cat);
                    chartData.push(val);
                }
            }

            // 새 차트 그리기
            new Chart(chartEl.getContext('2d'), {
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
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 25, bottom: 25, left: 10, right: 10 } },
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 10,
                                padding: 8,
                                font: { size: 10, family: "'Pretendard', sans-serif" },
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
    } catch (e) {
        console.error('차트 렌더링 중 에러 발생:', e);
    }

    // ==========================================
    // 💳 하단 카드별 정산 리스트 (기준일 vs 달력월 토글 적용)
    // ==========================================
    try {
        if (!container) return;

        // 💡 기본값을 'calendar'(1일~말일)로 변경했습니다!
        window.cardStatMode = window.cardStatMode || 'calendar';
        const isBilling = window.cardStatMode === 'billing';

        const btnClassOn = 'bg-white text-gray-800 shadow-sm rounded-md px-2 py-1 transition-all';
        const btnClassOff = 'text-gray-400 hover:text-gray-600 px-2 py-1 transition-all';

        // 👇 버튼 순서 스왑 (1일~말일이 왼쪽으로 오도록 수정)
        container.innerHTML = `
            <div class="flex justify-between items-end mb-3 mt-6">
                <h3 class="text-xs font-bold text-gray-500">카드별 결제액</h3>
                <div class="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button onclick="setCardStatMode('calendar')" class="${!isBilling ? btnClassOn : btnClassOff}">1일~말일</button>
                    <button onclick="setCardStatMode('billing')" class="${isBilling ? btnClassOn : btnClassOff}">기준일</button>
                </div>
            </div>`;

        const cardSums = {};

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

            if (amount > 0) {
                cardStatsList.push({ name, displayDay, start, end, amount });
            }
        });

        cardStatsList.sort((a, b) => {
            if (b.amount !== a.amount) return b.amount - a.amount;
            return a.name.localeCompare(b.name);
        });

        cardStatsList.forEach((stat) => {
            container.insertAdjacentHTML(
                'beforeend',
                `<div onclick="openCardDetailModal('${stat.name}', '${prefix}', '${window.cardStatMode}')" class="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 mb-2 shadow-sm cursor-pointer hover:bg-gray-200 active:scale-[0.99] transition">
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

        if (cardStatsList.length === 0) {
            container.insertAdjacentHTML(
                'beforeend',
                '<p class="text-center text-gray-400 text-sm py-4 font-medium">이번 달 정산될 카드 내역이 없습니다.</p>'
            );
        }
    } catch (e) {
        console.error('카드 리스트 렌더링 중 에러 발생:', e);
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
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const displayDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;

    const modal = document.getElementById('weekly-modal');
    const titleEl = modal.querySelector('h3');
    if (titleEl) titleEl.innerText = '일간 상세 내역';
    document.getElementById('weekly-date-range').innerText = displayDate;

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
                    <div class="flex items-center gap-2.5 flex-1 min-w-0">
                        <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm">${iconName}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center">
                                <p class="text-sm font-bold text-gray-800 truncate">${parsed.itemName}</p>
                                ${item.rankBadge || ''}
                            </div>
                            <p class="text-[10px] text-gray-400 mt-1 truncate">${catLabel} • ${parsed.payMethod} • ${item.Date.substring(0, 10)}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0 ml-3">
                        <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formatMoney(Math.abs(amountNum))}</p>
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

    filteredData.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    const container = document.getElementById('card-detail-list-container');
    container.innerHTML = '';

    if (filteredData.length === 0) {
        container.innerHTML =
            '<p class="text-center text-gray-500 py-10 text-sm">결제 내역이 없습니다.</p>';
    } else {
        applyTopRanks(filteredData);

        filteredData.forEach((item) => {
            const parsed = parseMemo(item.Memo);
            const catLabel =
                globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
            const iconName = getCategoryIcon(catLabel);
            const amountNum = Number(item.Amount);
            const displayColor = 'text-red-500';
            const iconBg = 'bg-red-100 text-red-600';
            const displaySign = amountNum < 0 ? '-' : '';

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
                                <p class="text-sm font-bold text-gray-800 truncate">${parsed.itemName}</p>
                                ${item.rankBadge || ''}
                            </div>
                            <p class="text-[10px] text-gray-400 mt-1 truncate">${catLabel} • ${item.Date.substring(0, 10)}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0 ml-3">
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
        applyTopRanks(monthlyData);

        const groupedByDate = {};
        monthlyData.forEach((item) => {
            const dateStr = item.Date.substring(0, 10);
            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
            groupedByDate[dateStr].push(item);
        });

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
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                            <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-sm">${iconName}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center">
                                    <p class="text-sm font-bold text-gray-800 truncate">${parsed.itemName}</p>
                                    ${item.rankBadge || ''}
                                </div>
                                <p class="text-[10px] text-gray-400 mt-1 truncate">${catLabel} • ${parsed.payMethod}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0 ml-3">
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
            ${name}
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
