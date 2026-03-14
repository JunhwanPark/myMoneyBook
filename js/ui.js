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

window.renderDailyList = (data) => {
    const container = document.getElementById('daily-list-container');
    if (!container) return;
    updateMonthTitles();
    const prefix = `${currentDisplayDate.getFullYear()}-${String(currentDisplayDate.getMonth() + 1).padStart(2, '0')}`;
    const filtered = data.filter((d) => d.Date?.startsWith(prefix));
    container.innerHTML = filtered.length
        ? ''
        : '<p class="text-center text-gray-500 py-10">내역이 없습니다.</p>';

    let total = 0;
    filtered.forEach((item) => {
        if (item.Type === 'expense') total += Number(item.Amount);
        const parsed = parseMemo(item.Memo);
        const isExp = item.Type === 'expense';
        const cat = globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
        container.insertAdjacentHTML(
            'beforeend',
            `
            <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 p-3 rounded-xl mb-3 flex justify-between items-center border border-gray-100 cursor-pointer">
                <div class="flex items-center gap-3">
                    <div class="${isExp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} p-2 rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-sm">${getCategoryIcon(cat)}</span>
                    </div>
                    <div><p class="text-sm font-bold text-gray-800">${parsed.itemName}</p><p class="text-[11px] text-gray-400">${cat} • ${parsed.payMethod} • ${item.Date.substring(0, 10)}</p></div>
                </div>
                <div class="text-right">
                    <p class="${isExp ? 'text-red-500' : 'text-blue-500'} font-bold text-sm">${isExp ? '-' : '+'}${formatMoney(item.Amount)}</p>
                    <p class="text-[10px] text-gray-300">${item.User?.split('@')[0]}</p>
                </div>
            </div>`
        );
    });
    document.getElementById('daily-total-expense').innerText = formatMoney(total);
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
        if (t.in)
            events.push({
                title: `+${formatMoney(t.in)}`,
                start: d,
                allDay: true,
                textColor: '#10b981',
            });
        if (t.ex)
            events.push({
                title: `-${formatMoney(t.ex)}`,
                start: d,
                allDay: true,
                textColor: '#ef4444',
            });
    }
    calendar.addEventSource(events);
};

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
    expenseChart = new Chart(chartEl.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(catTotals),
            datasets: [
                {
                    data: Object.values(catTotals),
                    backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'],
                    borderWidth: 0,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
        },
    });

    const container = document.getElementById('card-stats-container');
    container.innerHTML =
        '<h3 class="text-xs font-bold text-gray-500 mb-3 mt-6">카드별 정산 (기준일 반영)</h3>';
    const cardSums = {};

    globalData.forEach((item) => {
        if (item.Type !== 'expense') return;
        const parsed = parseMemo(item.Memo);
        const cardDef = globalCards.find((c) => c.Label.split('|')[0] === parsed.payMethod);
        if (!cardDef) return;

        const closingDay = parseInt(cardDef.Label.split('|')[1] || '31');
        const d = new Date(item.Date);
        let y = d.getFullYear(),
            m = d.getMonth();
        if (d.getDate() > closingDay) m++;
        if (m > 11) {
            m = 0;
            y++;
        }

        if (`${y}-${String(m + 1).padStart(2, '0')}` === prefix)
            cardSums[parsed.payMethod] = (cardSums[parsed.payMethod] || 0) + Number(item.Amount);
    });

    globalCards.forEach((card) => {
        const [name, day] = card.Label.split('|');
        const end = new Date(targetY, targetM, parseInt(day || '31'));
        const start = new Date(targetY, targetM - 1, parseInt(day || '31') + 1);
        container.insertAdjacentHTML(
            'beforeend',
            `<div class="bg-gray-50 p-4 rounded-2xl border mb-3"><div class="flex justify-between items-start"><div><span class="text-sm font-extrabold">${name}</span><span class="text-[10px] text-indigo-500 ml-1">기준: ${day}일</span></div><span class="text-sm font-black">${formatMoney(cardSums[name] || 0)}</span></div><div class="text-[10px] text-gray-400 mt-1">${start.toLocaleDateString()} ~ ${end.toLocaleDateString()}</div></div>`
        );
    });
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

window.openCardModal = () => {
    const container = document.getElementById('card-list-container');
    container.innerHTML = globalCards.length
        ? ''
        : '<li class="py-4 text-center text-gray-500">카드가 없습니다.</li>';
    globalCards.forEach((c) => {
        const [name, day] = c.Label.split('|');
        container.insertAdjacentHTML(
            'beforeend',
            `<li class="py-3 flex justify-between items-center"><div class="flex items-center gap-2"><span class="text-sm font-medium">${name}</span><span class="text-[10px] text-gray-400">${day}일</span></div><button onclick="deleteCard('${c.Value}')"><span class="material-symbols-outlined text-sm">delete</span></button></li>`
        );
    });
    document.getElementById('card-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('card-modal').classList.remove('opacity-0');
        document.getElementById('card-modal-content').classList.remove('scale-95');
    }, 10);
};

window.closeCardModal = () => {
    document.getElementById('card-modal').classList.add('opacity-0');
    setTimeout(() => document.getElementById('card-modal').classList.add('hidden'), 300);
};

window.openCategoryModal = () => {
    const container = document.getElementById('category-list-container');
    container.innerHTML = '';
    globalCategories.forEach((c) =>
        container.insertAdjacentHTML(
            'beforeend',
            `<li class="py-3 flex justify-between"><span>${c.Label}</span><button onclick="deleteCategory('${c.Value}')">삭제</button></li>`
        )
    );
    document.getElementById('category-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('category-modal').classList.remove('opacity-0'), 10);
};

window.closeCategoryModal = () => document.getElementById('category-modal').classList.add('hidden');

window.openWeeklyModal = function (clickedDateStr) {
    const clickedDate = new Date(clickedDateStr);
    const day = clickedDate.getDay();
    const startOfWeek = new Date(clickedDate);
    startOfWeek.setDate(clickedDate.getDate() - day);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const offset = startOfWeek.getTimezoneOffset() * 60000;
    const startStr = new Date(startOfWeek.getTime() - offset).toISOString().substring(0, 10);
    const endStr = new Date(endOfWeek.getTime() - offset).toISOString().substring(0, 10);

    document.getElementById('weekly-date-range').innerText = `${startStr} ~ ${endStr}`;

    const weeklyData = globalData.filter((item) => {
        const itemDate = item.Date.substring(0, 10);
        return itemDate >= startStr && itemDate <= endStr;
    });

    const container = document.getElementById('weekly-list-container');
    container.innerHTML = '';

    if (weeklyData.length === 0) {
        container.innerHTML =
            '<p class="text-center text-gray-500 py-10 text-sm">해당 주간에 내역이 없습니다.</p>';
    } else {
        weeklyData.forEach((item) => {
            const isExpense = item.Type === 'expense';
            const amountColor = isExpense ? 'text-red-500' : 'text-blue-500';
            const sign = isExpense ? '-' : '+';
            const iconBg = isExpense ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';

            let catLabel = '미분류';
            if (item.Category) {
                const foundCat = globalCategories.find((c) => c.Value === item.Category);
                catLabel = foundCat ? foundCat.Label : item.Category;
            }

            const parsed = parseMemo(item.Memo);
            const iconName = getCategoryIcon(catLabel);

            container.insertAdjacentHTML(
                'beforeend',
                `
                <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 p-3 rounded-lg shadow-sm mb-3 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition">
                    <div class="flex items-center gap-3">
                        <div class="${iconBg} p-2 rounded-full flex items-center justify-center">
                            <span class="material-symbols-outlined text-sm">${iconName}</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-800">${parsed.itemName}</p>
                            <p class="text-[11px] text-gray-400">${catLabel} • ${parsed.payMethod} • ${item.Date.substring(0, 10)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="${amountColor} font-bold text-sm">${sign}${formatMoney(item.Amount)}</p>
                    </div>
                </div>`
            );
        });
    }

    const modal = document.getElementById('weekly-modal');
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
