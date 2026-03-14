// ==========================================
// 1. 설정 및 전역 변수
// ==========================================
// 허용된 구글 계정 리스트 (본인과 아내분 이메일 입력)
const ALLOWED_EMAILS = [
    'semoking@gmail.com', // 본인 이메일
    'minxuan85@gmail.com', // 아내분 이메일
];

// 발급받은 GAS 웹앱 URL
const GAS_URL =
    'https://script.google.com/macros/s/AKfycbxbFpQb3KzV2ObfUB22N0BmyVpy8EuxXF3G8BwfT-y5XRDkKZ7Gb0d3LOIE33kkthGhJA/exec';
let currentUserEmail = ''; // 현재 로그인한 사용자 이메일을 담아둘 변수

// [새로 추가된 변수]
let globalData = []; // 서버에서 불러온 데이터를 전체 앱에서 공유하기 위한 배열
let calendar = null; // FullCalendar 인스턴스
let expenseChart = null; // [새로 추가된 변수] 차트 인스턴스
let globalCategories = []; // [새로 추가] 카테고리 데이터를 담아둘 변수

// ==========================================
// 2. 구글 로그인 및 인증 로직
// ==========================================
window.handleCredentialResponse = function (response) {
    const responsePayload = jwt_decode(response.credential);
    const userEmail = responsePayload.email;
    const userName = responsePayload.name;

    if (ALLOWED_EMAILS.includes(userEmail)) {
        // [수정 포인트] 로그인 성공 시 이메일 전역 변수에 저장
        currentUserEmail = userEmail;

        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.innerText = userName + '님';
            loginBtn.classList.remove('bg-indigo-700', 'hover:bg-indigo-800');
            loginBtn.classList.add('bg-transparent', 'text-sm');
            loginBtn.removeAttribute('id');
        }

        // 로그인 성공 후 메인 화면이 뜨면 데이터 불러오기 실행
        loadDailyRecords();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
};

// ==========================================
// 3. UI 동작 로직 (탭 전환 및 모달) - 기존 코드 유지
// ==========================================
// 하단 네비게이션 탭 전환 함수
window.switchTab = function (tabId, title, btnElement) {
    document.getElementById('header-title').innerText = title;

    document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
    document.getElementById('view-' + tabId).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.classList.remove('text-indigo-600');
        btn.classList.add('text-gray-400');
    });
    btnElement.classList.remove('text-gray-400');
    btnElement.classList.add('text-indigo-600');

    // [새로 추가된 부분] 월간 탭 클릭 시 달력 렌더링
    if (tabId === 'monthly') {
        if (!calendar) {
            initCalendar(); // 처음 클릭 시 달력 생성
        } else {
            // 이미 생성된 경우 화면 크기에 맞게 다시 그려줌 (레이아웃 깨짐 방지)
            setTimeout(() => calendar.render(), 10);
        }
    }

    // [새로 추가된 부분] 통계 탭 클릭 시 차트 렌더링
    if (tabId === 'stats') {
        renderChart();
    }
};

// 바텀 시트 모달 (항목 추가) 열기
window.openAddModal = function () {
    document.getElementById('add-form').reset();
    document.getElementById('input-id').value = '';
    document.getElementById('input-action').value = 'create';

    // UI 초기화 (저장 버튼 텍스트 원복, 삭제 버튼 숨김)
    document.getElementById('save-btn').innerText = '저장하기';
    document.getElementById('delete-btn').classList.add('hidden');

    if (globalCategories.length > 0) renderCategoryDropdown('expense');

    const modal = document.getElementById('add-modal');
    const modalContent = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('translate-y-full');
    }, 10);
};

// [새 함수] 리스트 클릭 시 수정 모드로 모달 열기
window.openEditModal = function (id) {
    const targetItem = globalData.find((item) => item.ID === id);
    if (!targetItem) return;

    // 폼에 기존 데이터 채워넣기
    document.getElementById('input-id').value = targetItem.ID;
    document.getElementById('input-action').value = 'update';

    document.querySelector(`input[name="type"][value="${targetItem.Type}"]`).checked = true;
    renderCategoryDropdown(targetItem.Type);

    document.getElementById('input-date').value = targetItem.Date.substring(0, 10);
    document.getElementById('input-category').value = targetItem.Category;
    document.getElementById('input-amount').value = targetItem.Amount;
    document.getElementById('input-memo').value = targetItem.Memo || '';

    // UI 변경 (저장 -> 수정하기, 삭제 버튼 노출)
    document.getElementById('save-btn').innerText = '수정하기';
    document.getElementById('delete-btn').classList.remove('hidden');

    const modal = document.getElementById('add-modal');
    const modalContent = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('translate-y-full');
    }, 10);
};

// [새 함수] 삭제 실행
window.deleteRecord = async function () {
    if (!confirm('정말 이 내역을 삭제하시겠습니까?')) return;

    const id = document.getElementById('input-id').value;
    const deleteBtn = document.getElementById('delete-btn');
    deleteBtn.innerText = '삭제 중...';
    deleteBtn.disabled = true;

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete', id: id }), // action을 delete로 전송
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert('삭제되었습니다.');
            closeAddModal();
            loadDailyRecords(); // 삭제 후 화면 갱신
        } else {
            alert('삭제 실패: ' + result.message);
        }
    } catch (error) {
        alert('통신 중 오류가 발생했습니다.');
    } finally {
        deleteBtn.innerText = '삭제';
        deleteBtn.disabled = false;
    }
};

// [새 함수] 달력 클릭 시 주간 모달 열기
window.openWeeklyModal = function (clickedDateStr) {
    const clickedDate = new Date(clickedDateStr);
    const day = clickedDate.getDay(); // 일(0) ~ 토(6)

    // 클릭한 날짜가 속한 일요일(시작)과 토요일(끝) 계산
    const startOfWeek = new Date(clickedDate);
    startOfWeek.setDate(clickedDate.getDate() - day);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // 날짜 문자열(YYYY-MM-DD) 변환
    // 주의: 단순 toISOString은 타임존 이슈가 있으므로 안전하게 변환
    const offset = startOfWeek.getTimezoneOffset() * 60000;
    const startStr = new Date(startOfWeek.getTime() - offset).toISOString().substring(0, 10);
    const endStr = new Date(endOfWeek.getTime() - offset).toISOString().substring(0, 10);

    document.getElementById('weekly-date-range').innerText = `${startStr} ~ ${endStr}`;

    // 해당 주간의 데이터만 필터링
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

            // 일간 탭과 동일하게 클릭 시 수정 창이 뜨도록 onclick 유지
            const listItem = `
                <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 p-3 rounded-lg shadow-sm mb-3 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition">
                    <div class="flex items-center gap-3">
                        <div class="${iconBg} p-2 rounded-full flex items-center justify-center">
                            <span class="material-symbols-outlined text-sm">${item.Category === 'food' ? 'restaurant' : 'payments'}</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold">${item.Memo || '내역 없음'}</p>
                            <p class="text-xs text-gray-400">${item.Category || '미분류'} • ${item.Date.substring(0, 10)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="${amountColor} font-bold">${sign}${Number(item.Amount).toLocaleString()}원</p>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', listItem);
        });
    }

    // 모달 애니메이션
    const modal = document.getElementById('weekly-modal');
    const modalContent = document.getElementById('weekly-modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('translate-y-full');
    }, 10);
};

// [새 함수] 주간 모달 닫기
window.closeWeeklyModal = function () {
    const modal = document.getElementById('weekly-modal');
    const modalContent = document.getElementById('weekly-modal-content');
    modal.classList.add('opacity-0');
    modalContent.classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// 바텀 시트 모달 닫기
window.closeAddModal = function () {
    const modal = document.getElementById('add-modal');
    const modalContent = document.getElementById('modal-content');

    modal.classList.add('opacity-0');
    modalContent.classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// ==========================================
// 4. 데이터 저장 로직 (새로 추가)
// ==========================================
window.saveRecord = async function () {
    const type = document.querySelector('input[name="type"]:checked').value;
    const date = document.getElementById('input-date').value;
    const category = document.getElementById('input-category').value;
    const amount = document.getElementById('input-amount').value;
    const memo = document.getElementById('input-memo').value;

    if (!date || !amount) {
        alert('날짜와 금액을 입력해주세요.');
        return;
    }

    // 전송할 페이로드 구성
    const payload = {
        action: document.getElementById('input-action').value, // [추가] create 또는 update
        id: document.getElementById('input-id').value, // [추가] 수정할 때 필요한 고유 ID
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
        // CORS Preflight 우회를 위해 text/plain 사용
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.status === 'success') {
            alert('가계부 내역이 저장되었습니다.');
            closeAddModal(); // 입력 창 닫기
            document.getElementById('add-form').reset(); // 폼 초기화

            // 저장 성공 후 리스트 새로고침
            loadDailyRecords();
        } else {
            alert('저장 실패: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('통신 중 오류가 발생했습니다.');
    } finally {
        // 버튼 상태 복구
        saveBtn.innerText = '저장하기';
        saveBtn.disabled = false;
    }
};

// ==========================================
// 5. 데이터 불러오기 및 화면 렌더링 (새로 추가)
// ==========================================
window.loadDailyRecords = async function () {
    const listContainer = document.getElementById('daily-list-container');

    try {
        const response = await fetch(GAS_URL);
        const result = await response.json();

        if (result.status === 'success') {
            globalData = result.data;
            renderDailyList(globalData);

            if (calendar) {
                renderCalendarEvents();
            }

            // [수정된 부분] 전역 변수에 저장 후, 현재 선택된 타입(expense)에 맞게 렌더링
            if (result.categories && result.categories.length > 0) {
                globalCategories = result.categories;

                // 현재 체크된 라디오 버튼의 값('expense' 또는 'income') 가져오기
                const currentType = document.querySelector('input[name="type"]:checked').value;
                renderCategoryDropdown(currentType);
            }
        } else {
            listContainer.innerHTML = `<p class="text-center text-red-500 py-10 text-sm">오류: ${result.message}</p>`;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        listContainer.innerHTML =
            '<p class="text-center text-red-500 py-10 text-sm">데이터를 불러오지 못했습니다.</p>';
    }
};

// 가져온 JSON 데이터를 HTML로 만들어 컨테이너에 넣는 함수
function renderDailyList(data) {
    const listContainer = document.getElementById('daily-list-container');
    const totalSummary = document.getElementById('total-summary');

    listContainer.innerHTML = ''; // 로딩 메시지 삭제

    if (data.length === 0) {
        listContainer.innerHTML =
            '<p class="text-center text-gray-500 py-10 text-sm">저장된 내역이 없습니다.</p>';
        totalSummary.innerText = '총 지출: 0원';
        return;
    }

    let totalExpense = 0;

    // 각 데이터 항목을 HTML로 변환
    data.forEach((item) => {
        // 지출인 경우 총액 합산
        if (item.Type === 'expense') {
            totalExpense += Number(item.Amount);
        }

        // 아이콘 및 색상 설정
        const isExpense = item.Type === 'expense';
        const amountColor = isExpense ? 'text-red-500' : 'text-blue-500';
        const sign = isExpense ? '-' : '+';
        const iconBg = isExpense ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';

        // 간단한 카테고리 아이콘 매핑
        let iconName = 'payments';
        if (item.Category === 'food') iconName = 'restaurant';
        if (item.Category === 'living') iconName = 'shopping_cart';
        if (item.Category === 'transport') iconName = 'directions_bus';

        // app.js 의 renderDailyList 함수 내부 수정
        const listItem = `
            <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 p-3 rounded-lg shadow-sm mb-3 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition">
                <div class="flex items-center gap-3">
                    <div class="${iconBg} p-2 rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-sm">${iconName}</span>
                    </div>
                    <div>
                        <p class="text-sm font-bold">${item.Memo || '내역 없음'}</p>
                        <p class="text-xs text-gray-400">${item.Category || '미분류'} • ${item.Date}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="${amountColor} font-bold">${sign}${Number(item.Amount).toLocaleString()}원</p>
                    <p class="text-[10px] text-gray-400">${item.User.split('@')[0]}</p>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', listItem);
    });

    // 상단 총 지출액 업데이트
    totalSummary.innerText = `총 지출: ${totalExpense.toLocaleString()}원`;
}

// ==========================================
// 6. 달력(월간 뷰) 렌더링
// ==========================================
window.initCalendar = function () {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ko',
        headerToolbar: {
            left: 'prev',
            center: 'title',
            right: 'next',
        },
        height: 'auto',
        displayEventTime: false,
        events: [],

        // 👇 [새로 추가된 부분] 날짜를 클릭했을 때 실행할 동작
        dateClick: function (info) {
            openWeeklyModal(info.dateStr); // 클릭한 날짜 정보(YYYY-MM-DD)를 넘겨줌
        },
    });
    calendar.render();
    renderCalendarEvents();
};

function renderCalendarEvents() {
    if (!calendar || globalData.length === 0) return;

    const dailyTotals = {};
    globalData.forEach((item) => {
        // [수정] 날짜 데이터에서 순수 날짜(YYYY-MM-DD) 10자리만 강제로 잘라내어 타임존 밀림 현상 방지
        const date = String(item.Date).substring(0, 10);

        if (!dailyTotals[date]) dailyTotals[date] = { income: 0, expense: 0 };

        if (item.Type === 'expense') {
            dailyTotals[date].expense += Number(item.Amount);
        } else {
            dailyTotals[date].income += Number(item.Amount);
        }
    });

    const events = [];
    for (const [date, totals] of Object.entries(dailyTotals)) {
        if (totals.income > 0) {
            events.push({
                title: `+${totals.income.toLocaleString()}`,
                start: date,
                allDay: true, // [추가] 하루 종일 지속되는 이벤트로 명시하여 시간 표시 차단
                color: '#eff6ff',
                textColor: '#3b82f6',
            });
        }
        if (totals.expense > 0) {
            events.push({
                title: `-${totals.expense.toLocaleString()}`,
                start: date,
                allDay: true, // [추가]
                color: '#fef2f2',
                textColor: '#ef4444',
            });
        }
    }

    calendar.removeAllEvents();
    calendar.addEventSource(events);
}

// ==========================================
// 7. 통계(차트) 렌더링
// ==========================================
window.renderChart = function () {
    // 1. 지출 데이터만 필터링
    const expenses = globalData.filter((item) => item.Type === 'expense');

    const canvasContainer = document.getElementById('expenseChart');
    const noDataMsg = document.getElementById('no-chart-data');
    const totalExpenseText = document.getElementById('chart-total-expense');

    // 지출 내역이 없는 경우 예외 처리
    if (expenses.length === 0) {
        canvasContainer.style.display = 'none';
        noDataMsg.classList.remove('hidden');
        totalExpenseText.innerText = '총 0원';
        return;
    }

    canvasContainer.style.display = 'block';
    noDataMsg.classList.add('hidden');

    // 2. 카테고리별로 금액 합산하기
    const categoryTotals = {};
    let totalSum = 0;

    expenses.forEach((item) => {
        const cat = item.Category || '기타';
        // 영어 카테고리명을 한글로 매핑 (필요시 확장)
        const catName =
            cat === 'food'
                ? '식비'
                : cat === 'living'
                  ? '생활용품'
                  : cat === 'transport'
                    ? '교통비'
                    : cat;

        const amount = Number(item.Amount);
        categoryTotals[catName] = (categoryTotals[catName] || 0) + amount;
        totalSum += amount;
    });

    totalExpenseText.innerText = `총 ${totalSum.toLocaleString()}원`;

    // 3. 차트용 데이터 배열로 변환
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    // 4. 차트 그리기 (기존 차트가 있으면 지우고 다시 그림)
    if (expenseChart) {
        expenseChart.destroy();
    }

    const ctx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut', // 도넛 형태의 파이 차트
        data: {
            labels: labels,
            datasets: [
                {
                    data: data,
                    backgroundColor: [
                        '#ef4444', // 빨강 (식비)
                        '#3b82f6', // 파랑 (생활용품)
                        '#f59e0b', // 노랑 (교통비)
                        '#10b981', // 초록 (기타)
                        '#8b5cf6', // 보라 (추가 여분)
                    ],
                    borderWidth: 0, // 테두리 선 제거로 깔끔하게
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom', // 범례를 아래로
                    labels: { font: { family: "'Pretendard', sans-serif", size: 12 } },
                },
            },
        },
    });
};

// ==========================================
// 8. 설정 및 카테고리 동적 렌더링
// ==========================================
// [수정] selectedType 파라미터 추가
window.renderCategoryDropdown = function (selectedType) {
    const selectEl = document.getElementById('input-category');
    selectEl.innerHTML = '<option value="">카테고리 선택</option>';

    // globalCategories 배열에서 Type이 일치(expense 또는 income)하는 항목만 필터링
    const filteredCategories = globalCategories.filter((cat) => cat.Type === selectedType);

    filteredCategories.forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.Value;
        option.text = cat.Label;
        selectEl.appendChild(option);
    });
};

// ==========================================
// 9. 이벤트 리스너 설정
// ==========================================
// 수입/지출 라디오 버튼을 클릭(변경)할 때마다 카테고리 다시 그리기
document.querySelectorAll('input[name="type"]').forEach((radio) => {
    radio.addEventListener('change', function () {
        // this.value는 선택된 라디오 버튼의 값 ('expense' 또는 'income')
        renderCategoryDropdown(this.value);
    });
});
