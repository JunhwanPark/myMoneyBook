// ==========================================
// 1. 설정 및 전역 변수
// ==========================================
const ALLOWED_EMAILS = ['semoking@gmail.com', 'minxuan85@gmail.com'];

const GAS_URL =
    'https://script.google.com/macros/s/AKfycbxbFpQb3KzV2ObfUB22N0BmyVpy8EuxXF3G8BwfT-y5XRDkKZ7Gb0d3LOIE33kkthGhJA/exec';
let currentUserEmail = '';

let globalData = [];
let calendar = null;
let expenseChart = null;
let globalCategories = [];
let globalCards = []; // 신용카드 전용 데이터 보관
let currentCountry = 'KR';
let currentDisplayDate = new Date(); // 현재 기준 월

// ==========================================
// 로딩 화면 제어
// ==========================================
window.showLoader = function () {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('hidden');
};

window.hideLoader = function () {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
};

// ==========================================
// 2. 구글 로그인 및 인증 로직
// ==========================================
window.handleCredentialResponse = function (response) {
    const responsePayload = jwt_decode(response.credential);
    const userEmail = responsePayload.email;

    if (ALLOWED_EMAILS.includes(userEmail)) {
        currentUserEmail = userEmail;
        document.getElementById('settings-user-email').innerText = currentUserEmail;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        loadDailyRecords();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
};

// ==========================================
// 3. 마법의 메모 파싱 함수 (결제수단 읽기)
// ==========================================
// [수정] 메모 파싱 함수: 결제수단에서 내부용 기준일(|14)을 제거하고 이름만 반환
window.parseMemo = function (rawMemo) {
    const lines = (rawMemo || '').split('\n');
    let itemName = lines[0] || '내역 없음';
    let payMethod = '현금';
    let detailMemo = '';

    if (lines.length > 1) {
        if (lines[1].startsWith('PAY:')) {
            // 👇 '|' 기호를 기준으로 앞부분(이름)만 가져옵니다.
            payMethod = lines[1].substring(4).split('|')[0];
            detailMemo = lines.slice(2).join('\n');
        } else {
            detailMemo = lines.slice(1).join('\n');
        }
    }
    return { itemName, payMethod, detailMemo };
};

// ==========================================
// 4. 공통 월 이동 로직 (일간, 통계, 달력 동기화)
// ==========================================
window.updateMonthTitles = function () {
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth() + 1;
    const titleStr = `${year}년 ${month}월`;

    const dailyTitle = document.getElementById('daily-month-title');
    if (dailyTitle) dailyTitle.innerText = titleStr;
    const statsTitle = document.getElementById('stats-month-title');
    if (statsTitle) statsTitle.innerText = titleStr;
    const monthlyTitle = document.getElementById('monthly-month-title');
    if (monthlyTitle) monthlyTitle.innerText = titleStr;
};

window.changeGlobalMonth = function (offset) {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
    updateMonthTitles();
    renderDailyList(globalData);
    if (document.getElementById('view-stats').classList.contains('active')) renderChart();
    if (calendar) calendar.gotoDate(currentDisplayDate);
};

// ==========================================
// 5. 탭 및 네비게이션 제어
// ==========================================
window.switchTab = function (tabId, title, btnElement) {
    document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
    document.getElementById('view-' + tabId).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.classList.remove('text-indigo-600', 'text-primary');
        btn.classList.add('text-gray-400');
    });

    if (btnElement) {
        btnElement.classList.remove('text-gray-400');
        btnElement.classList.add('text-primary');
    }

    if (tabId === 'daily') renderDailyList(globalData);
    else if (tabId === 'monthly') {
        if (!calendar) initCalendar();
        else setTimeout(() => calendar.render(), 10);
    } else if (tabId === 'stats') renderChart();
};

window.switchCountry = function (country) {
    if (currentCountry === country) return;
    currentCountry = country;

    const btnKr = document.getElementById('btn-kr');
    const btnCn = document.getElementById('btn-cn');

    if (country === 'KR') {
        document.body.classList.remove('theme-cn');
        btnKr.className =
            'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';
        btnCn.className =
            'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 hover:opacity-100 transition-all';
        document.getElementById('input-amount').placeholder = '금액 (원)';
    } else {
        document.body.classList.add('theme-cn');
        btnCn.className =
            'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';
        btnKr.className =
            'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 hover:opacity-100 transition-all';
        document.getElementById('input-amount').placeholder = '금액 (¥)';
    }
    loadDailyRecords();
};

// ==========================================
// 6. 데이터 통신 (불러오기 & 저장 & 삭제)
// ==========================================
window.loadDailyRecords = async function () {
    showLoader();
    try {
        const response = await fetch(GAS_URL + '?country=' + currentCountry);
        const result = await response.json();

        if (result.status === 'success') {
            globalData = result.data || [];
            const allCats = result.categories || [];

            // 영리한 분리: 'card' 타입은 신용카드 배열로, 나머지는 카테고리 배열로 분리!
            globalCategories = allCats.filter((c) => c.Type !== 'card');
            globalCards = allCats.filter((c) => c.Type === 'card');

            renderDailyList(globalData);
            if (calendar) renderCalendarEvents();
            if (document.getElementById('view-stats').classList.contains('active')) renderChart();
        } else {
            console.error('서버 에러:', result.message);
        }
    } catch (e) {
        alert('데이터를 불러오는 데 실패했습니다.');
    } finally {
        hideLoader();
    }
};

window.saveRecord = async function () {
    const type = document.querySelector('input[name="type"]:checked').value;
    const date = document.getElementById('input-date').value;
    const category = document.getElementById('input-category').value;
    const rawAmount = document.getElementById('input-amount').value;
    const amount = rawAmount.replace(/,/g, '');

    const itemName = document.getElementById('input-item-name').value;
    const memoDetail = document.getElementById('input-memo-detail').value;

    // 결제 수단 확인
    const payType = document.querySelector('input[name="pay_type"]:checked').value;
    let paymentMethod = '현금';
    if (payType === 'card') {
        paymentMethod = document.getElementById('input-card-select').value;
        if (!paymentMethod) {
            alert('신용카드를 선택해주세요.');
            return;
        }
    }

    if (!date || !amount || !itemName) {
        alert('항목 이름, 날짜, 금액을 모두 입력해주세요.');
        return;
    }

    // PAY: 태그를 붙여서 병합
    const payStr = 'PAY:' + paymentMethod;
    const memo = memoDetail
        ? itemName + '\n' + payStr + '\n' + memoDetail
        : itemName + '\n' + payStr;

    const payload = {
        action: document.getElementById('input-action').value,
        id: document.getElementById('input-id').value,
        country: currentCountry,
        date: date,
        userEmail: currentUserEmail,
        type: type,
        category: category,
        amount: amount,
        memo: memo,
    };

    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = '저장 중...';
    saveBtn.disabled = true;

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (result.status === 'success') {
            closeAddModal();
            loadDailyRecords();
        } else {
            alert('저장 실패: ' + result.message);
        }
    } catch (error) {
        alert('통신 오류');
    } finally {
        saveBtn.innerText = '저장하기';
        saveBtn.disabled = false;
    }
};

window.deleteRecord = async function () {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const id = document.getElementById('input-id').value;
    const deleteBtn = document.getElementById('delete-btn');
    deleteBtn.innerText = '삭제 중...';
    deleteBtn.disabled = true;

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete', id: id, country: currentCountry }),
        });
        const result = await response.json();
        if (result.status === 'success') {
            closeAddModal();
            loadDailyRecords();
        }
    } catch (error) {
        alert('통신 오류');
    } finally {
        deleteBtn.innerText = '삭제';
        deleteBtn.disabled = false;
    }
};

// ==========================================
// 7. 모달 제어 (입력 폼)
// ==========================================
window.toggleCardSelect = function () {
    const payType = document.querySelector('input[name="pay_type"]:checked').value;
    const cardSelect = document.getElementById('input-card-select');
    if (payType === 'card') cardSelect.classList.remove('hidden');
    else {
        cardSelect.classList.add('hidden');
        cardSelect.value = '';
    }
};

window.openAddModal = function () {
    document.getElementById('add-form').reset();
    document.getElementById('input-id').value = '';
    document.getElementById('input-action').value = 'create';

    // 기본 날짜를 오늘로
    const today = new Date();
    document.getElementById('input-date').value =
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    document.getElementById('modal-title').innerText = '새 내역 추가';
    document.getElementById('save-btn').innerText = '저장하기';
    document.getElementById('delete-btn').classList.add('hidden');

    document.querySelector('input[name="type"][value="expense"]').checked = true; // 기본값 지출
    document.getElementById('payment-section').classList.remove('hidden'); // 지출이므로 결제창 표시

    document.querySelector('input[name="pay_type"][value="cash"]').checked = true;
    renderCardDropdown();
    toggleCardSelect();
    if (globalCategories.length > 0) renderCategoryDropdown('expense');

    const modal = document.getElementById('add-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.openEditModal = function (id) {
    const targetItem = globalData.find((item) => item.ID === id);
    if (!targetItem) return;

    document.getElementById('modal-title').innerText = '내역 수정';
    document.getElementById('input-id').value = targetItem.ID;
    document.getElementById('input-action').value = 'update';

    document.querySelector(`input[name="type"][value="${targetItem.Type}"]`).checked = true;
    renderCategoryDropdown(targetItem.Type);

    document.getElementById('input-date').value = targetItem.Date.substring(0, 10);
    document.getElementById('input-category').value = targetItem.Category;
    document.getElementById('input-amount').value = Number(targetItem.Amount).toLocaleString(
        'ko-KR'
    );

    // 👇 수정하려는 내역이 수입이면 결제 섹션 숨김, 지출이면 표시
    const paySection = document.getElementById('payment-section');
    if (targetItem.Type === 'income') {
        paySection.classList.add('hidden');
    } else {
        paySection.classList.remove('hidden');
    }

    // 메모와 결제수단 쪼개기
    const parsed = parseMemo(targetItem.Memo);
    document.getElementById('input-item-name').value = parsed.itemName;
    document.getElementById('input-memo-detail').value = parsed.detailMemo;

    renderCardDropdown();
    if (parsed.payMethod === '현금') {
        document.querySelector('input[name="pay_type"][value="cash"]').checked = true;
    } else {
        document.querySelector('input[name="pay_type"][value="card"]').checked = true;
        // 👇 파싱된 이름만 select box의 값으로 넣어줍니다.
        document.getElementById('input-card-select').value = parsed.payMethod;
    }
    toggleCardSelect();

    document.getElementById('save-btn').innerText = '수정하기';
    document.getElementById('delete-btn').classList.remove('hidden');

    const modal = document.getElementById('add-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.closeAddModal = function () {
    const modal = document.getElementById('add-modal');
    modal.classList.add('opacity-0');
    document.getElementById('modal-content').classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// ==========================================
// 8. 일간 리스트 렌더링
// ==========================================
window.renderDailyList = function (data) {
    const listContainer = document.getElementById('daily-list-container');
    const totalExpenseText = document.getElementById('daily-total-expense');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    let totalExpense = 0;
    updateMonthTitles();

    const targetPrefix = `${currentDisplayDate.getFullYear()}-${String(currentDisplayDate.getMonth() + 1).padStart(2, '0')}`;
    const filteredData = (data || []).filter(
        (item) => item.Date && item.Date.substring(0, 7) === targetPrefix
    );

    if (!filteredData || filteredData.length === 0) {
        listContainer.innerHTML =
            '<p class="text-center text-gray-500 py-10 text-sm">해당 월의 내역이 없습니다.</p>';
        totalExpenseText.innerText = formatMoney(0);
        return;
    }

    filteredData.forEach((item) => {
        if (item.Type === 'expense') totalExpense += Number(item.Amount);

        const isExpense = item.Type === 'expense';
        const amountColor = isExpense ? 'text-red-500' : 'text-blue-500';
        const sign = isExpense ? '-' : '+';
        const iconBg = isExpense ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';

        let catLabel = '미분류';
        if (item.Category) {
            const foundCat = globalCategories.find((c) => c.Value === item.Category);
            catLabel = foundCat ? foundCat.Label : item.Category;
        }

        // 파싱 함수로 데이터 가져오기
        const parsed = parseMemo(item.Memo);
        const iconName = getCategoryIcon(catLabel);

        const listItem = `
            <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 p-3 rounded-xl shadow-sm mb-3 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition-all">
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
                    <p class="text-[10px] text-gray-300">${item.User.split('@')[0]}</p>
                </div>
            </div>`;
        listContainer.insertAdjacentHTML('beforeend', listItem);
    });

    if (totalExpenseText) totalExpenseText.innerText = formatMoney(totalExpense);
};

// ==========================================
// 9. 월간 뷰 (달력) 렌더링
// ==========================================
window.initCalendar = function () {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ko',
        fixedWeekCount: false,
        headerToolbar: false, // 커스텀 네비게이션 사용
        height: 'auto',
        dayCellContent: function (info) {
            return info.dayNumberText.replace('일', '');
        },
        dateClick: function (info) {
            openWeeklyModal(info.dateStr);
        },
        datesSet: function (info) {
            updateMonthlyTotals(info.view.currentStart);
            currentDisplayDate = new Date(info.view.currentStart);
            updateMonthTitles();
            renderDailyList(globalData);
            if (document.getElementById('view-stats').classList.contains('active')) renderChart();
        },
    });
    calendar.render();
    renderCalendarEvents();
};

window.renderCalendarEvents = function () {
    if (!calendar) return;
    calendar.removeAllEvents();
    if (!globalData || globalData.length === 0) {
        updateMonthlyTotals(calendar.view.currentStart);
        return;
    }

    const dailyTotals = {};
    globalData.forEach((item) => {
        if (!item.Date) return;
        const date = String(item.Date).substring(0, 10);
        if (!dailyTotals[date]) dailyTotals[date] = { income: 0, expense: 0 };
        if (item.Type === 'expense') dailyTotals[date].expense += Number(item.Amount);
        else dailyTotals[date].income += Number(item.Amount);
    });

    const events = [];
    for (const [date, totals] of Object.entries(dailyTotals)) {
        if (totals.income > 0)
            events.push({
                title: `+${formatMoney(totals.income)}`,
                start: date,
                allDay: true,
                backgroundColor: 'transparent',
                textColor: '#10b981',
            });
        if (totals.expense > 0)
            events.push({
                title: `-${formatMoney(totals.expense)}`,
                start: date,
                allDay: true,
                backgroundColor: 'transparent',
                textColor: '#ef4444',
            });
    }
    calendar.addEventSource(events);
    updateMonthlyTotals(calendar.view.currentStart);
};

// ==========================================
// 10. 통계 차트 및 카드별 정산 렌더링 (최종 완성본)
// ==========================================
window.renderChart = function () {
    // 1. 현재 선택된 기준 월 계산
    updateMonthTitles();
    const targetYear = currentDisplayDate.getFullYear();
    const targetMonth = currentDisplayDate.getMonth(); // 0 (1월) ~ 11 (12월)
    const targetPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

    // 2. UI 요소 초기화
    const canvasContainer = document.getElementById('expenseChart');
    const noDataMsg = document.getElementById('no-chart-data');
    const totalExpenseText = document.getElementById('chart-total-expense');
    const cardContainer = document.getElementById('card-stats-container');

    // 3. 현재 월의 지출 데이터 필터링 (차트용)
    const expenses = globalData.filter(
        (item) => item.Type === 'expense' && item.Date && item.Date.substring(0, 7) === targetPrefix
    );

    // 지출 내역이 없는 경우 처리
    if (expenses.length === 0) {
        if (canvasContainer) canvasContainer.style.display = 'none';
        if (noDataMsg) noDataMsg.classList.remove('hidden');
        if (totalExpenseText) totalExpenseText.innerText = '총 0원';
        if (cardContainer) cardContainer.innerHTML = '';
        return;
    }

    if (canvasContainer) canvasContainer.style.display = 'block';
    if (noDataMsg) noDataMsg.classList.add('hidden');

    // 4. 카테고리별 금액 합산 (차트용)
    const categoryTotals = {};
    let totalSum = 0;

    expenses.forEach((item) => {
        let catName = '기타';
        if (item.Category) {
            const foundCat = globalCategories.find((c) => c.Value === item.Category);
            catName = foundCat ? foundCat.Label : item.Category;
        }
        const amount = Number(item.Amount);
        categoryTotals[catName] = (categoryTotals[catName] || 0) + amount;
        totalSum += amount;
    });

    if (totalExpenseText) totalExpenseText.innerText = `총 ${formatMoney(totalSum)}`;

    // 5. 도넛 차트 그리기
    const labels = Object.keys(categoryTotals);
    const chartData = Object.values(categoryTotals);

    if (expenseChart) {
        expenseChart.destroy();
    }

    const ctx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
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
                    borderWidth: 0,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: "'Pretendard', sans-serif", size: 12 } },
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

    // 6. 카드별 실적 계산 (기준일 정산 로직 반영)
    if (cardContainer) {
        cardContainer.innerHTML =
            '<h3 class="text-xs font-bold text-gray-500 mb-3 mt-6">카드별 정산 (기준일 반영)</h3>';

        const cardAccumulator = {};

        // 전체 지출 데이터를 돌며 각 카드의 기준일에 맞춰 해당 월 실적인지 판별
        globalData.forEach((item) => {
            if (item.Type !== 'expense') return;
            const parsed = parseMemo(item.Memo);
            if (parsed.payMethod === '현금') return;

            // 카드의 기준일 찾기
            const cardDef = globalCards.find((c) => c.Label.split('|')[0] === parsed.payMethod);
            if (!cardDef) return;

            const closingDay = parseInt(cardDef.Label.split('|')[1] || '31');
            const d = new Date(item.Date);
            let y = d.getFullYear();
            let m = d.getMonth();

            // 결제일이 기준일을 초과하면 다음 달 통계 실적으로 처리
            if (d.getDate() > closingDay) {
                m += 1;
                if (m > 11) {
                    m = 0;
                    y += 1;
                }
            }
            const statMonth = `${y}-${String(m + 1).padStart(2, '0')}`;

            // 계산된 실적 월이 현재 화면의 월과 일치하면 합산
            if (statMonth === targetPrefix) {
                cardAccumulator[parsed.payMethod] =
                    (cardAccumulator[parsed.payMethod] || 0) + Number(item.Amount);
            }
        });

        // 카드별 UI 생성
        globalCards.forEach((card) => {
            const name = card.Label.split('|')[0];
            const closingDay = parseInt(card.Label.split('|')[1] || '31');
            const total = cardAccumulator[name] || 0;

            // 정산 기간 계산 (예: 2월 14일 ~ 3월 13일)
            const endDate = new Date(targetYear, targetMonth, closingDay);
            const startDate = new Date(targetYear, targetMonth - 1, closingDay + 1);

            const periodStr = `${startDate.getFullYear()}.${startDate.getMonth() + 1}.${startDate.getDate()} ~ ${endDate.getFullYear()}.${endDate.getMonth() + 1}.${endDate.getDate()}`;

            const cardHtml = `
                <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm">
                    <div class="flex justify-between items-start mb-1">
                        <div>
                            <span class="text-sm font-extrabold text-gray-800">${name}</span>
                            <span class="text-[10px] text-indigo-500 font-bold ml-1">기준: ${closingDay}일</span>
                        </div>
                        <span class="text-sm font-black text-gray-900">${formatMoney(total)}</span>
                    </div>
                    <div class="text-[10px] text-gray-400 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[12px]">calendar_today</span>
                        ${periodStr}
                    </div>
                </div>`;
            cardContainer.insertAdjacentHTML('beforeend', cardHtml);
        });
    }
};

// ==========================================
// 11. 카테고리/신용카드 관리 및 UI 유틸리티
// ==========================================
window.getCategoryIcon = function (label) {
    if (!label) return 'payments';
    const text = label.replace(/\s+/g, '');
    if (
        text.includes('식비') ||
        text.includes('외식') ||
        text.includes('식재료') ||
        text.includes('마트')
    )
        return 'restaurant';
    if (
        text.includes('카페') ||
        text.includes('커피') ||
        text.includes('간식') ||
        text.includes('디저트')
    )
        return 'local_cafe';
    if (
        text.includes('교통') ||
        text.includes('주유') ||
        text.includes('택시') ||
        text.includes('버스') ||
        text.includes('자동차')
    )
        return 'commute';
    if (
        text.includes('쇼핑') ||
        text.includes('의류') ||
        text.includes('생활') ||
        text.includes('물건') ||
        text.includes('미용')
    )
        return 'shopping_cart';
    if (
        text.includes('주거') ||
        text.includes('관리비') ||
        text.includes('공과금') ||
        text.includes('통신') ||
        text.includes('인터넷')
    )
        return 'home';
    if (
        text.includes('병원') ||
        text.includes('의료') ||
        text.includes('약국') ||
        text.includes('건강') ||
        text.includes('운동')
    )
        return 'medical_services';
    if (
        text.includes('교육') ||
        text.includes('학원') ||
        text.includes('책') ||
        text.includes('도서')
    )
        return 'school';
    if (
        text.includes('문화') ||
        text.includes('여가') ||
        text.includes('취미') ||
        text.includes('여행') ||
        text.includes('영화')
    )
        return 'flight';
    if (text.includes('경조사') || text.includes('선물') || text.includes('용돈')) return 'redeem';
    if (text.includes('육아') || text.includes('아이') || text.includes('장난감'))
        return 'child_care';
    if (
        text.includes('월급') ||
        text.includes('급여') ||
        text.includes('수입') ||
        text.includes('부수입')
    )
        return 'account_balance';
    if (text.includes('저축') || text.includes('투자')) return 'savings';
    return 'payments';
};

window.renderCategoryDropdown = function (selectedType) {
    const select = document.getElementById('input-category');
    if (!select) return;
    select.innerHTML = '<option value="">카테고리 선택</option>';
    const filteredAndSorted = globalCategories
        .filter((cat) => cat.Type === selectedType)
        .sort((a, b) => a.Label.localeCompare(b.Label));
    filteredAndSorted.forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.Value;
        option.textContent = cat.Label;
        select.appendChild(option);
    });
};

// [수정] 수입/지출 라디오 버튼 변경 시 처리
document.querySelectorAll('input[name="type"]').forEach((radio) => {
    radio.addEventListener('change', function () {
        renderCategoryDropdown(this.value);

        // 👇 수입일 때는 결제 수단 선택 영역을 숨기고 '현금'으로 고정
        const paySection = document.getElementById('payment-section');
        if (this.value === 'income') {
            paySection.classList.add('hidden');
            document.querySelector('input[name="pay_type"][value="cash"]').checked = true;
            toggleCardSelect(); // 카드 선택창도 함께 닫힘
        } else {
            paySection.classList.remove('hidden');
        }

        const currentId = document.getElementById('input-id').value;
        if (currentId) {
            const item = globalData.find((d) => d.ID === currentId);
            if (item && item.Type === this.value)
                document.getElementById('input-category').value = item.Category;
        }
    });
});

window.updateMonthlyTotals = function (dateObj) {
    const incomeEl = document.getElementById('monthly-income-total');
    const expenseEl = document.getElementById('monthly-expense-total');
    if (!incomeEl || !expenseEl) return;
    let incomeTotal = 0;
    let expenseTotal = 0;
    if (globalData && globalData.length > 0) {
        const targetPrefix = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        globalData.forEach((item) => {
            if (item.Date && item.Date.substring(0, 7) === targetPrefix) {
                if (item.Type === 'income') incomeTotal += Number(item.Amount);
                else if (item.Type === 'expense') expenseTotal += Number(item.Amount);
            }
        });
    }
    incomeEl.innerText = formatMoney(incomeTotal);
    expenseEl.innerText = formatMoney(expenseTotal);
};

document.getElementById('input-amount').addEventListener('input', function (e) {
    let val = e.target.value;
    if (currentCountry === 'KR') {
        val = val.replace(/[^0-9]/g, '');
        e.target.value = val ? Number(val).toLocaleString('ko-KR') : '';
    } else {
        val = val.replace(/[^0-9.]/g, '');
        const parts = val.split('.');
        let integerPart = parts[0];
        let decimalPart = parts.length > 1 ? '.' + parts[1] : '';
        if (integerPart !== '') integerPart = Number(integerPart).toLocaleString('en-US');
        e.target.value = integerPart + decimalPart;
    }
});

window.formatMoney = function (amount) {
    const num = Number(amount);
    if (isNaN(num)) return currentCountry === 'KR' ? '0원' : '¥0';
    if (currentCountry === 'KR') return num.toLocaleString('ko-KR') + '원';
    else
        return (
            '¥' +
            num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        );
};

// ==========================================
// 12. 모달 공통/기타 (주간, 카테고리 관리, 카드 관리)
// ==========================================
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

    if (weeklyData.length === 0)
        container.innerHTML =
            '<p class="text-center text-gray-500 py-10 text-sm">해당 주간에 내역이 없습니다.</p>';
    else {
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

            const listItem = `
                <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 p-3 rounded-lg shadow-sm mb-3 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition">
                    <div class="flex items-center gap-3">
                        <div class="${iconBg} p-2 rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-sm">${iconName}</span></div>
                        <div>
                            <p class="text-sm font-bold">${parsed.itemName}</p>
                            <p class="text-xs text-gray-400">${catLabel} • ${parsed.payMethod} • ${item.Date.substring(0, 10)}</p>
                        </div>
                    </div>
                    <div class="text-right"><p class="${amountColor} font-bold">${sign}${formatMoney(item.Amount)}</p></div>
                </div>`;
            container.insertAdjacentHTML('beforeend', listItem);
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

// 카테고리 관리 모달
window.openCategoryModal = function () {
    const container = document.getElementById('category-list-container');
    container.innerHTML = '';
    const sorted = [...globalCategories].sort((a, b) => {
        if (a.Type !== b.Type) return a.Type === 'income' ? -1 : 1;
        return a.Label.localeCompare(b.Label);
    });
    sorted.forEach((cat) => {
        const typeBadge =
            cat.Type === 'expense'
                ? '<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold mr-2">지출</span>'
                : '<span class="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold mr-2">수입</span>';
        container.insertAdjacentHTML(
            'beforeend',
            `<li class="py-3 flex justify-between items-center"><div class="flex items-center">${typeBadge}<span class="text-sm text-gray-800">${cat.Label}</span></div><button onclick="deleteCategory('${cat.Value}')" class="text-gray-400 hover:text-red-500 p-1 transition"><span class="material-symbols-outlined text-sm">delete</span></button></li>`
        );
    });
    document.getElementById('category-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('category-modal').classList.remove('opacity-0');
        document.getElementById('category-modal-content').classList.remove('scale-95');
    }, 10);
};

window.closeCategoryModal = function () {
    document.getElementById('category-modal').classList.add('opacity-0');
    document.getElementById('category-modal-content').classList.add('scale-95');
    setTimeout(() => {
        document.getElementById('category-modal').classList.add('hidden');
    }, 300);
};

window.addCategory = async function () {
    const type = document.getElementById('new-cat-type').value;
    const label = document.getElementById('new-cat-label').value.trim();
    if (!label) return alert('카테고리 이름을 입력해주세요.');
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'add_category', catType: type, catLabel: label }),
        });
        const result = await response.json();
        if (result.status === 'success') {
            document.getElementById('new-cat-label').value = '';
            await loadDailyRecords();
            openCategoryModal();
            renderCategoryDropdown(document.querySelector('input[name="type"]:checked').value);
        }
    } catch (e) {
        alert('통신 에러');
    }
};

window.deleteCategory = async function (catValue) {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete_category', catValue: catValue }),
        });
        if ((await response.json()).status === 'success') {
            await loadDailyRecords();
            openCategoryModal();
            renderCategoryDropdown(document.querySelector('input[name="type"]:checked').value);
        }
    } catch (e) {
        alert('삭제 실패');
    }
};

// [수정] 카드 드롭다운: 화면과 값 모두 이름만 사용
window.renderCardDropdown = function () {
    const select = document.getElementById('input-card-select');
    if (!select) return;
    select.innerHTML = '<option value="">카드 선택</option>';

    globalCards.forEach((card) => {
        const cardName = card.Label.split('|')[0]; // 이름만 추출
        const option = document.createElement('option');
        option.value = cardName;
        option.textContent = cardName;
        select.appendChild(option);
    });
};

// [수정] 설정 내 카드 관리 리스트
window.openCardModal = function () {
    const container = document.getElementById('card-list-container');
    container.innerHTML = '';

    globalCards.forEach((card) => {
        const name = card.Label.split('|')[0];
        const day = card.Label.split('|')[1] || '말';
        container.insertAdjacentHTML(
            'beforeend',
            `
            <li class="py-3 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-indigo-500 text-sm">credit_card</span>
                    <span class="text-sm text-gray-800 font-medium">${name}</span>
                    <span class="text-[10px] text-gray-400">기준: ${day}일</span>
                </div>
                <button onclick="deleteCard('${card.Value}')" class="text-gray-400 hover:text-red-500 p-1 transition">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </li>`
        );
    });
    document.getElementById('card-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('card-modal').classList.remove('opacity-0');
        document.getElementById('card-modal-content').classList.remove('scale-95');
    }, 10);
};

window.closeCardModal = function () {
    document.getElementById('card-modal').classList.add('opacity-0');
    document.getElementById('card-modal-content').classList.add('scale-95');
    setTimeout(() => {
        document.getElementById('card-modal').classList.add('hidden');
    }, 300);
};

window.addCard = async function () {
    const label = document.getElementById('new-card-label').value.trim();
    let day = document.getElementById('new-card-day').value;

    if (!label) return alert('카드 이름을 입력해주세요.');
    if (!day || day < 1 || day > 31) {
        alert('기준일을 1~31 사이의 숫자로 입력해주세요.');
        return;
    }

    try {
        const combinedLabel = `${label}|${day}`;
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'add_category',
                catType: 'card',
                catLabel: combinedLabel,
            }),
        });
        if ((await response.json()).status === 'success') {
            document.getElementById('new-card-label').value = '';
            document.getElementById('new-card-day').value = '';
            await loadDailyRecords();
            openCardModal();
        }
    } catch (e) {
        alert('통신 에러');
    }
};

window.deleteCard = async function (catValue) {
    if (!confirm('이 카드를 삭제하시겠습니까? (기존 결제 내역의 카드명은 유지됩니다)')) return;
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete_category', catValue: catValue }),
        });
        if ((await response.json()).status === 'success') {
            await loadDailyRecords();
            openCardModal();
        }
    } catch (e) {
        alert('삭제 실패');
    }
};
