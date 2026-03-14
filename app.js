// ==========================================
// 1. 설정 및 전역 변수
// ==========================================
const ALLOWED_EMAILS = ['semoking@gmail.com', 'minxuan85@gmail.com'];
const GAS_URL =
    'https://script.google.com/macros/s/AKfycbxbFpQb3KzV2ObfUB22N0BmyVpy8EuxXF3G8BwfT-y5XRDkKZ7Gb0d3LOIE33kkthGhJA/exec';

let currentUserEmail = '';
let globalData = [];
let globalCategories = [];
let globalCards = [];
let calendar = null;
let expenseChart = null;
let currentCountry = 'KR';
let currentDisplayDate = new Date();

// ==========================================
// 2. 유틸리티 및 구글 로그인
// ==========================================
window.showLoader = () => document.getElementById('global-loader')?.classList.remove('hidden');
window.hideLoader = () => document.getElementById('global-loader')?.classList.add('hidden');

window.handleCredentialResponse = (response) => {
    const payload = jwt_decode(response.credential);
    if (ALLOWED_EMAILS.includes(payload.email)) {
        currentUserEmail = payload.email;
        document.getElementById('settings-user-email').innerText = currentUserEmail;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        loadDailyRecords();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
};

window.parseMemo = (rawMemo) => {
    const lines = (rawMemo || '').split('\n');
    let itemName = lines[0] || '내역 없음';
    let payMethod = '현금';
    let discount = 0;
    let detailLines = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('PAY:')) payMethod = line.substring(4).split('|')[0];
        else if (line.startsWith('DISC:')) discount = Number(line.substring(5)) || 0;
        else detailLines.push(line);
    }
    return { itemName, payMethod, discount, detailMemo: detailLines.join('\n') };
};

window.formatMoney = (amount) => {
    const num = Number(amount);
    if (isNaN(num)) return currentCountry === 'KR' ? '0원' : '¥0';
    return currentCountry === 'KR'
        ? num.toLocaleString('ko-KR') + '원'
        : '¥' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

window.getCategoryIcon = (label) => {
    const text = (label || '').replace(/\s+/g, '');
    if (/식비|외식|식재료|마트/.test(text)) return 'restaurant';
    if (/카페|커피|간식|디저트/.test(text)) return 'local_cafe';
    if (/교통|주유|택시|버스|자동차/.test(text)) return 'commute';
    if (/쇼핑|의류|생활|물건|미용/.test(text)) return 'shopping_cart';
    if (/주거|관리비|공과금|통신|인터넷/.test(text)) return 'home';
    if (/병원|의료|약국|건강|운동/.test(text)) return 'medical_services';
    if (/교육|학원|책|도서/.test(text)) return 'school';
    if (/문화|여가|취미|여행|영화/.test(text)) return 'flight';
    if (/경조사|선물|용돈/.test(text)) return 'redeem';
    if (/육아|아이|장난감/.test(text)) return 'child_care';
    if (/월급|급여|수입|부수입/.test(text)) return 'account_balance';
    if (/저축|투자/.test(text)) return 'savings';
    return 'payments';
};

// ==========================================
// 3. 월 이동 및 탭 동기화
// ==========================================
window.updateMonthTitles = function () {
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth() + 1;
    const titleStr = `${year}년 ${month}월`;

    // 모든 탭의 월 제목을 동시에 업데이트
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

// [수정] app.js의 switchTab 함수
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
        // 👇 월간 탭으로 올 때 합계를 다시 계산하여 화폐 단위를 맞춥니다.
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
// 4. 모달 제어 및 실시간 콤마
// ==========================================
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

['input-amount', 'input-discount'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9.]/g, '');
        if (currentCountry === 'KR') {
            val = val.replace(/\./g, '');
            e.target.value = val ? Number(val).toLocaleString('ko-KR') : '';
        } else {
            const parts = val.split('.');
            parts[0] = parts[0] ? Number(parts[0]).toLocaleString('en-US') : '';
            e.target.value = parts.join('.');
        }
    });
});

document.querySelectorAll('input[name="type"]').forEach((radio) => {
    radio.addEventListener('change', function () {
        renderCategoryDropdown(this.value);
        const isIncome = this.value === 'income';
        document.getElementById('payment-section').classList.toggle('hidden', isIncome);
        if (isIncome) {
            document.querySelector('input[name="pay_type"][value="cash"]').checked = true;
            toggleCardSelect();
        }
    });
});

// ==========================================
// 5. 데이터 저장 및 통신
// ==========================================
// [수정] app.js의 loadDailyRecords 함수
window.loadDailyRecords = async () => {
    showLoader();
    try {
        const res = await fetch(`${GAS_URL}?country=${currentCountry}`);
        const result = await res.json();
        if (result.status === 'success') {
            globalData = result.data || [];
            globalCategories = (result.categories || []).filter((c) => c.Type !== 'card');
            globalCards = (result.categories || []).filter((c) => c.Type === 'card');

            renderDailyList(globalData);
            if (calendar) renderCalendarEvents();

            // 👇 이 줄을 추가하여 데이터 로드 시 월간 합계를 즉시 갱신합니다.
            updateMonthlyTotals();

            if (document.getElementById('view-stats').classList.contains('active')) renderChart();
        }
    } finally {
        hideLoader();
    }
};

window.saveRecord = async () => {
    const type = document.querySelector('input[name="type"]:checked').value;
    const date = document.getElementById('input-date').value;
    const category = document.getElementById('input-category').value;
    const amountVal = Number(document.getElementById('input-amount').value.replace(/,/g, '')) || 0;
    const discountVal =
        Number(document.getElementById('input-discount').value.replace(/,/g, '')) || 0;
    const finalAmount = amountVal - discountVal;
    const itemName = document.getElementById('input-item-name').value;
    const memoDetail = document.getElementById('input-memo-detail').value;
    const payType = document.querySelector('input[name="pay_type"]:checked').value;
    let paymentMethod = '현금';
    if (type === 'expense' && payType === 'card') {
        paymentMethod = document.getElementById('input-card-select').value;
        if (!paymentMethod) return alert('카드를 선택해주세요.');
    }
    if (!date || !amountVal || !itemName) return alert('필수 항목을 입력해주세요.');
    const memo = `${itemName}\nPAY:${paymentMethod}\nDISC:${discountVal}\n${memoDetail}`;
    const payload = {
        action: document.getElementById('input-action').value,
        id: document.getElementById('input-id').value,
        country: currentCountry,
        date,
        userEmail: currentUserEmail,
        type,
        category,
        amount: finalAmount,
        memo,
    };
    const btn = document.getElementById('save-btn');
    btn.innerText = '저장 중...';
    btn.disabled = true;
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        if ((await res.json()).status === 'success') {
            closeAddModal();
            loadDailyRecords();
        }
    } finally {
        btn.innerText = '저장하기';
        btn.disabled = false;
    }
};

window.deleteRecord = async function () {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const id = document.getElementById('input-id').value;
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', id: id, country: currentCountry }),
        });
        if ((await res.json()).status === 'success') {
            closeAddModal();
            loadDailyRecords();
        }
    } catch (e) {
        alert('통신 오류');
    }
};

// ==========================================
// 6. 화면 렌더링 (리스트/달력/차트)
// ==========================================
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
            // 달력에서 월을 넘기면 앱 전체 기준 월(currentDisplayDate)도 동기화
            currentDisplayDate = new Date(info.view.currentStart);
            updateMonthTitles();
            // 👇 하단 수입/지출 합계 즉시 업데이트
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
    const targetY = currentDisplayDate.getFullYear(),
        targetM = currentDisplayDate.getMonth();
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
        const end = new Date(targetY, targetM, parseInt(day || '31')),
            start = new Date(targetY, targetM - 1, parseInt(day || '31') + 1);
        container.insertAdjacentHTML(
            'beforeend',
            `<div class="bg-gray-50 p-4 rounded-2xl border mb-3"><div class="flex justify-between items-start"><div><span class="text-sm font-extrabold">${name}</span><span class="text-[10px] text-indigo-500 ml-1">기준: ${day}일</span></div><span class="text-sm font-black">${formatMoney(cardSums[name] || 0)}</span></div><div class="text-[10px] text-gray-400 mt-1">${start.toLocaleDateString()} ~ ${end.toLocaleDateString()}</div></div>`
        );
    });
};

// ==========================================
// 7. 기타 관리 (주간/카테고리/카드)
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

window.openCardModal = () => {
    const container = document.getElementById('card-list-container');
    container.innerHTML = globalCards.length
        ? ''
        : '<li class="py-4 text-center text-gray-500">카드가 없습니다.</li>';
    globalCards.forEach((c) => {
        const [name, day] = c.Label.split('|');
        container.insertAdjacentHTML(
            'beforeend',
            `<li class="py-3 flex justify-between items-center"><div class="flex items-center gap-2"><span class="text-sm font-medium">${name}</span><span class="text-[10px] text-gray-400">${day}일</span></div><button onclick="deleteCategory('${c.Value}')"><span class="material-symbols-outlined text-sm">delete</span></button></li>`
        );
    });
    document.getElementById('card-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('card-modal').classList.remove('opacity-0');
        document.getElementById('card-modal-content').classList.remove('scale-95');
    }, 10);
};

window.addCard = async () => {
    const label = document.getElementById('new-card-label').value.trim(),
        day = document.getElementById('new-card-day').value;
    if (!label || !day) return alert('정보를 입력하세요.');
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_category',
                catType: 'card',
                catLabel: `${label}|${day}`,
            }),
        });
        if ((await res.json()).status === 'success') {
            await loadDailyRecords();
            openCardModal();
        }
    } catch (e) {
        alert('에러');
    }
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

// ==========================================
// [수정] 주간 내역 모달 열기 및 렌더링 (복구 완료)
// ==========================================
window.openWeeklyModal = function (clickedDateStr) {
    // 1. 클릭한 날짜를 기준으로 일요일(시작) ~ 토요일(끝) 날짜 계산
    const clickedDate = new Date(clickedDateStr);
    const day = clickedDate.getDay();
    const startOfWeek = new Date(clickedDate);
    startOfWeek.setDate(clickedDate.getDate() - day);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // 타임존 오차 보정 후 YYYY-MM-DD 문자열 추출
    const offset = startOfWeek.getTimezoneOffset() * 60000;
    const startStr = new Date(startOfWeek.getTime() - offset).toISOString().substring(0, 10);
    const endStr = new Date(endOfWeek.getTime() - offset).toISOString().substring(0, 10);

    // 2. 모달 상단에 주간 범위 텍스트 업데이트
    document.getElementById('weekly-date-range').innerText = `${startStr} ~ ${endStr}`;

    // 3. 해당 주간에 속하는 데이터만 필터링
    const weeklyData = globalData.filter((item) => {
        const itemDate = item.Date.substring(0, 10);
        return itemDate >= startStr && itemDate <= endStr;
    });

    const container = document.getElementById('weekly-list-container');
    container.innerHTML = '';

    // 4. 리스트 렌더링
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

            // 파싱 함수로 아이템 이름과 결제 수단 분리
            const parsed = parseMemo(item.Memo);
            const iconName = getCategoryIcon(catLabel);

            const listItem = `
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
                </div>`;
            container.insertAdjacentHTML('beforeend', listItem);
        });
    }

    // 5. 모달 열기 애니메이션 실행
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

window.updateMonthlyTotals = function (dateObj) {
    const incomeEl = document.getElementById('monthly-income-total');
    const expenseEl = document.getElementById('monthly-expense-total');
    if (!incomeEl || !expenseEl) return;

    let incomeTotal = 0;
    let expenseTotal = 0;

    // 인자가 없으면 현재 앱 기준 월(currentDisplayDate) 사용
    const targetDate = dateObj || currentDisplayDate;
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const targetMonthPrefix = `${year}-${month}`;

    if (globalData && globalData.length > 0) {
        globalData.forEach((item) => {
            if (item.Date && item.Date.substring(0, 7) === targetMonthPrefix) {
                if (item.Type === 'income') incomeTotal += Number(item.Amount);
                else if (item.Type === 'expense') expenseTotal += Number(item.Amount);
            }
        });
    }

    // formatMoney 함수가 'KR'일 땐 '원', 'CN'일 땐 '¥'를 붙여줍니다.
    incomeEl.innerText = formatMoney(incomeTotal);
    expenseEl.innerText = formatMoney(expenseTotal);
};
