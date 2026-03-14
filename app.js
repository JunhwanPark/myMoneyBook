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
let currentCountry = 'KR'; // 기본 국가

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

        // 👇 [수정] 헤더 대신, 설정 탭의 프로필 영역에 이메일을 표시합니다.
        document.getElementById('settings-user-email').innerText = currentUserEmail;

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
    // 1. 화면(탭) 전환
    document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
    document.getElementById('view-' + tabId).classList.add('active');

    // 2. 하단 네비게이션 버튼 색상 초기화 (모두 회색으로)
    document.querySelectorAll('.nav-btn').forEach((btn) => {
        // 기존에 남아있을 수 있는 파란색/테마색 모두 제거
        btn.classList.remove('text-indigo-600', 'text-primary');
        btn.classList.add('text-gray-400');
    });

    // 3. 클릭한 버튼만 활성화 (현재 테마의 포인트 색상 적용)
    if (btnElement) {
        btnElement.classList.remove('text-gray-400');
        btnElement.classList.add('text-primary');
    }

    // 4. 월간 달력 렌더링
    if (tabId === 'monthly') {
        if (!calendar) {
            initCalendar();
        } else {
            setTimeout(() => calendar.render(), 10);
        }
    }

    // 5. 통계 차트 렌더링
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
    document.getElementById('input-amount').value = Number(targetItem.Amount).toLocaleString(
        'ko-KR'
    );
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
            // 👇 [수정] country 항목 추가
            body: JSON.stringify({ action: 'delete', id: id, country: currentCountry }),
        });
        const result = await response.json();

        if (result.status === 'success') {
            // alert('삭제되었습니다.');
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
        // 기존 openWeeklyModal 내부 수정
        weeklyData.forEach((item) => {
            const isExpense = item.Type === 'expense';
            const amountColor = isExpense ? 'text-red-500' : 'text-blue-500';
            const sign = isExpense ? '-' : '+';
            const iconBg = isExpense ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';

            // 👇 [추가된 부분] 영문 Value를 한글 Label로 변환
            let catLabel = '미분류';
            if (item.Category) {
                const foundCat = globalCategories.find((c) => c.Value === item.Category);
                catLabel = foundCat ? foundCat.Label : item.Category;
            }

            const listItem = `
                <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 p-3 rounded-lg shadow-sm mb-3 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition">
                    <div class="flex items-center gap-3">
                        <div class="${iconBg} p-2 rounded-full flex items-center justify-center">
                            <span class="material-symbols-outlined text-sm">${item.Category === 'food' ? 'restaurant' : 'payments'}</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold">${item.Memo || '내역 없음'}</p>
                            <p class="text-xs text-gray-400">${catLabel} • ${item.Date.substring(0, 10)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="${amountColor} font-bold">${sign}${formatMoney(item.Amount)}</p>
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
    const rawAmount = document.getElementById('input-amount').value;
    const amount = rawAmount.replace(/,/g, '');

    const memo = document.getElementById('input-memo').value;

    if (!date || !amount) {
        alert('날짜와 금액을 입력해주세요.');
        return;
    }

    // 전송할 페이로드 구성
    const payload = {
        action: document.getElementById('input-action').value,
        id: document.getElementById('input-id').value,
        country: currentCountry, // 👇 [새로 추가] 어느 국가 시트에 저장할지 전달
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
            // alert('가계부 내역이 저장되었습니다.');
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
        const response = await fetch(GAS_URL + '?country=' + currentCountry);
        const result = await response.json();

        if (result.status === 'success') {
            globalData = result.data;

            // 👇 1. [순서 변경] 카테고리 데이터를 제일 먼저 전역 변수에 저장합니다!
            if (result.categories && result.categories.length > 0) {
                globalCategories = result.categories;

                // 설정된 탭(지출/수입)에 맞게 드롭다운도 미리 업데이트
                const currentType = document.querySelector('input[name="type"]:checked').value;
                renderCategoryDropdown(currentType);
            }

            // 👇 2. 카테고리가 준비된 상태에서 리스트를 그립니다. (이제 한글 변환이 정상 작동합니다)
            renderDailyList(globalData);

            // 👇 3. 달력 업데이트
            if (calendar) {
                renderCalendarEvents();
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
// [함수] 일간 내역 리스트를 화면에 그리는 함수
function renderDailyList(data) {
    const listContainer = document.getElementById('daily-list-container');
    const totalExpenseText = document.getElementById('daily-total-expense');

    // 요소가 없으면 실행 중단 방지
    if (!listContainer) return;

    listContainer.innerHTML = '';
    let totalExpense = 0;

    // 2. 데이터가 없을 때 처리
    if (!data || data.length === 0) {
        listContainer.innerHTML =
            '<p class="text-center text-gray-500 py-10 text-sm">내역이 없습니다.</p>';
        totalExpenseText.innerText = formatMoney(0); // 0원 또는 ¥0 표기
        return;
    }

    // 3. 데이터를 하나씩 돌면서 리스트 아이템 생성
    data.forEach((item) => {
        // 지출 합계 계산 (지출일 때만 더함)
        if (item.Type === 'expense') {
            totalExpense += Number(item.Amount);
        }

        const isExpense = item.Type === 'expense';
        const amountColor = isExpense ? 'text-red-500' : 'text-blue-500';
        const sign = isExpense ? '-' : '+';
        const iconBg = isExpense ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';

        // 카테고리 ID를 한글 이름으로 변환 (예: cat_123 -> 외식비)
        let catLabel = '미분류';
        if (item.Category) {
            const foundCat = globalCategories.find((c) => c.Value === item.Category);
            catLabel = foundCat ? foundCat.Label : item.Category;
        }

        // 아이콘 결정 (기본값 payments)
        let iconName = 'payments';
        if (item.Category === 'food') iconName = 'restaurant';
        if (item.Category === 'living') iconName = 'shopping_cart';
        if (item.Category === 'transport') iconName = 'directions_bus';

        // HTML 리스트 아이템 생성 (formatMoney 함수 사용)
        const listItem = `
            <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 p-3 rounded-xl shadow-sm mb-3 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition-all">
                <div class="flex items-center gap-3">
                    <div class="${iconBg} p-2 rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-sm">${iconName}</span>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-gray-800">${item.Memo || '내역 없음'}</p>
                        <p class="text-[11px] text-gray-400">${catLabel} • ${item.Date}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="${amountColor} font-bold text-sm">
                        ${sign}${formatMoney(item.Amount)}
                    </p>
                    <p class="text-[10px] text-gray-300">${item.User.split('@')[0]}</p>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', listItem);
    });

    // 4. 상단(또는 하단) 총 지출 요약 업데이트 (formatMoney 적용)
    if (totalExpenseText) {
        totalExpenseText.innerText = formatMoney(totalExpense);
    }
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
        dateClick: function (info) {
            openWeeklyModal(info.dateStr);
        },
        // 👇 [추가된 부분] 달력의 '월'이 바뀔 때마다 실행 (예: < > 버튼 클릭 시)
        datesSet: function (info) {
            // info.view.currentStart는 현재 달력 화면의 해당 월 1일 날짜 객체를 반환합니다.
            updateMonthlyTotals(info.view.currentStart);
        },
    });
    calendar.render();
    renderCalendarEvents();
};

// 달력에 이벤트를 그리는 함수 (수정본)
window.renderCalendarEvents = function () {
    // 1. 달력이 아직 화면에 없으면 중단
    if (!calendar) return;

    // 👇 [핵심 포인트] 데이터 유무와 상관없이 무조건 기존 달력의 글씨들을 싹 지웁니다!
    calendar.removeAllEvents();

    // 2. 가져온 데이터가 아예 없으면 하단 합계를 0원으로 만들고 종료
    if (!globalData || globalData.length === 0) {
        updateMonthlyTotals(calendar.view.currentStart);
        return;
    }

    // 3. 일별 총액 계산
    const dailyTotals = {};
    globalData.forEach((item) => {
        if (!item.Date) return;
        const date = String(item.Date).substring(0, 10);

        if (!dailyTotals[date]) dailyTotals[date] = { income: 0, expense: 0 };

        if (item.Type === 'expense') {
            dailyTotals[date].expense += Number(item.Amount);
        } else {
            dailyTotals[date].income += Number(item.Amount);
        }
    });

    // 4. 달력에 넣을 이벤트 배열 생성 (포맷팅 적용)
    const events = [];
    for (const [date, totals] of Object.entries(dailyTotals)) {
        if (totals.income > 0) {
            events.push({
                title: `+${formatMoney(totals.income)}`,
                start: date,
                allDay: true,
                color: '#eff6ff',
                textColor: '#3b82f6',
            });
        }
        if (totals.expense > 0) {
            events.push({
                title: `-${formatMoney(totals.expense)}`,
                start: date,
                allDay: true,
                color: '#fef2f2',
                textColor: '#ef4444',
            });
        }
    }

    // 5. 새 데이터 달력에 꽂아넣기
    calendar.addEventSource(events);

    // 6. 달력 하단 월간 합계 업데이트
    updateMonthlyTotals(calendar.view.currentStart);
};

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
        // 👇 [수정된 부분] 하드코딩 매핑 제거하고 globalCategories에서 라벨 찾기
        let catName = '기타';
        if (item.Category) {
            const foundCat = globalCategories.find((c) => c.Value === item.Category);
            catName = foundCat ? foundCat.Label : item.Category;
        }

        const amount = Number(item.Amount);
        categoryTotals[catName] = (categoryTotals[catName] || 0) + amount;
        totalSum += amount;
    });

    totalExpenseText.innerText = `총 ${formatMoney(totalSum)}`;

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
                    position: 'bottom',
                    labels: { font: { family: "'Pretendard', sans-serif", size: 12 } },
                },
                // 👇 [새로 추가] 차트 조각을 터치했을 때 뜨는 툴팁에 콤마 적용
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += formatMoney(context.parsed);
                            }
                            return label;
                        },
                    },
                },
            },
        },
    });
};

// ==========================================
// 8. 설정 및 카테고리 동적 렌더링
// ==========================================
// [수정] 입력창 카테고리 드롭다운 생성 (수입/지출 필터링 + 가나다 정렬)
window.renderCategoryDropdown = function (selectedType) {
    const select = document.getElementById('input-category');
    if (!select) return;

    // 초기화
    select.innerHTML = '<option value="">카테고리 선택</option>';

    // 1. 현재 선택된 타입(수입/지출)에 맞는 카테고리만 골라내고 가나다순 정렬
    const filteredAndSorted = globalCategories
        .filter((cat) => cat.Type === selectedType)
        .sort((a, b) => a.Label.localeCompare(b.Label));

    // 2. 정렬된 카테고리를 드롭다운 옵션으로 추가
    filteredAndSorted.forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.Value;
        option.textContent = cat.Label;
        select.appendChild(option);
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

// [새로운 함수] 특정 월의 수입/지출 합계를 계산하여 UI에 표기하는 함수
window.updateMonthlyTotals = function (dateObj) {
    let incomeTotal = 0;
    let expenseTotal = 0;

    if (globalData && globalData.length > 0) {
        // 날짜 객체에서 연도와 월 추출 (예: 2024, 03)
        const year = dateObj.getFullYear();
        // getMonth()는 0부터 시작하므로 1을 더해주고, 두 자리로 포맷팅(padStart)
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const targetMonthPrefix = `${year}-${month}`; // "2024-03" 형태의 문자열 생성

        // 전역 데이터에서 해당 월의 데이터만 합산
        globalData.forEach((item) => {
            if (!item.Date) return;

            // 데이터의 날짜 문자열 앞 7자리("YYYY-MM") 추출하여 비교
            const itemDatePrefix = item.Date.substring(0, 7);

            if (itemDatePrefix === targetMonthPrefix) {
                if (item.Type === 'income') {
                    incomeTotal += Number(item.Amount);
                } else if (item.Type === 'expense') {
                    expenseTotal += Number(item.Amount);
                }
            }
        });
    }

    // HTML 요소에 결과값 텍스트 업데이트
    document.getElementById('monthly-income-total').innerText = '+' + formatMoney(incomeTotal);
    document.getElementById('monthly-expense-total').innerText = '-' + formatMoney(expenseTotal);
};

// ==========================================
// 11. 금액 입력 실시간 처리 (국가별)
// ==========================================
document.getElementById('input-amount').addEventListener('input', function (e) {
    let val = e.target.value;

    if (currentCountry === 'KR') {
        val = val.replace(/[^0-9]/g, '');
        e.target.value = val ? Number(val).toLocaleString('ko-KR') : '';
    } else {
        // 👇 [수정] 중국: 소수점 유지하면서 정수 부분에만 콤마 찍기
        val = val.replace(/[^0-9.]/g, ''); // 숫자와 소수점만 허용

        const parts = val.split('.');
        let integerPart = parts[0];
        let decimalPart = parts.length > 1 ? '.' + parts[1] : ''; // 두 번째 소수점부터는 버림

        if (integerPart !== '') {
            // 정수 부분에만 천 단위 콤마 적용
            integerPart = Number(integerPart).toLocaleString('en-US');
        }

        e.target.value = integerPart + decimalPart;
    }
});

// ==========================================
// 12. 카테고리 관리 모달 제어 및 API 통신
// ==========================================
window.openCategoryModal = function () {
    renderCategoryList(); // 모달 열기 전에 리스트 새로 그리기
    const modal = document.getElementById('category-modal');
    const content = document.getElementById('category-modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 10);
};

window.closeCategoryModal = function () {
    const modal = document.getElementById('category-modal');
    const content = document.getElementById('category-modal-content');
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// [수정] 카테고리 관리 팝업 리스트 (수입->지출 순서 & 그룹 내 가나다 정렬)
window.renderCategoryList = function () {
    const container = document.getElementById('category-list-container');
    if (!container) return;

    container.innerHTML = '';

    if (!globalCategories || globalCategories.length === 0) {
        container.innerHTML =
            '<li class="py-4 text-center text-gray-500 text-sm">등록된 카테고리가 없습니다.</li>';
        return;
    }

    // 정렬: 1순위 수입 먼저, 2순위 가나다순
    const sortedCategories = [...globalCategories].sort((a, b) => {
        if (a.Type !== b.Type) {
            return a.Type === 'income' ? -1 : 1;
        }
        return a.Label.localeCompare(b.Label);
    });

    sortedCategories.forEach((cat) => {
        const typeBadge =
            cat.Type === 'expense'
                ? '<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold mr-2">지출</span>'
                : '<span class="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold mr-2">수입</span>';

        const li = `
            <li class="py-3 flex justify-between items-center">
                <div class="flex items-center">
                    ${typeBadge}
                    <span class="text-sm text-gray-800">${cat.Label}</span>
                </div>
                <button onclick="deleteCategory('${cat.Value}')" class="text-gray-400 hover:text-red-500 p-1 transition">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </li>
        `;
        container.insertAdjacentHTML('beforeend', li);
    });
};

// 카테고리 추가 함수 (수정본)
window.addCategory = async function () {
    const type = document.getElementById('new-cat-type').value;
    const label = document.getElementById('new-cat-label').value.trim();

    if (!label) {
        alert('카테고리 이름을 입력해주세요.');
        return;
    }

    // 추가 버튼 요소 찾기
    const btn = document.querySelector('#category-modal-content button.bg-indigo-600');
    if (btn) {
        btn.innerText = '...';
        btn.disabled = true;
    }

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'add_category', catType: type, catLabel: label }),
        });
        const result = await response.json();

        if (result.status === 'success') {
            document.getElementById('new-cat-label').value = ''; // 입력창 초기화
            await loadDailyRecords(); // 데이터 갱신
            renderCategoryList(); // 리스트 갱신

            const currentMainType = document.querySelector('input[name="type"]:checked').value;
            renderCategoryDropdown(currentMainType);
        } else {
            // 👇 백엔드 에러 시 원인을 파악할 수 있도록 알림창 추가
            alert('서버 거절: ' + result.message);
        }
    } catch (e) {
        alert('통신 에러: 네트워크 상태를 확인해주세요.');
    } finally {
        if (btn) {
            btn.innerText = '추가';
            btn.disabled = false;
        }
    }
};

// 카테고리 삭제 함수
window.deleteCategory = async function (catValue) {
    if (!confirm('이 카테고리를 삭제하시겠습니까? (기존 내역의 카테고리는 유지됩니다)')) return;

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete_category', catValue: catValue }),
        });
        const result = await response.json();

        if (result.status === 'success') {
            await loadDailyRecords();
            renderCategoryList();

            const currentMainType = document.querySelector('input[name="type"]:checked').value;
            renderCategoryDropdown(currentMainType);
        }
    } catch (e) {
        alert('카테고리 삭제에 실패했습니다.');
    }
};

// ==========================================
// 13. 국가별 금액 표기 포맷팅 함수
// ==========================================
window.formatMoney = function (amount) {
    const num = Number(amount);
    if (currentCountry === 'KR') {
        return num.toLocaleString('ko-KR') + '원';
    } else {
        // 👇 [수정] 중국: 기호(¥)를 앞에 붙이고 2글자 '위안' 삭제
        return (
            '¥' +
            num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        );
    }
};

// ==========================================
// 14. 국가 및 테마 전환 로직
// ==========================================
window.switchCountry = function (country) {
    if (currentCountry === country) return; // 이미 선택된 국가면 무시
    currentCountry = country;

    const btnKr = document.getElementById('btn-kr');
    const btnCn = document.getElementById('btn-cn');

    if (country === 'KR') {
        document.body.classList.remove('theme-cn'); // 중국 테마 제거 (파란색으로 돌아옴)
        btnKr.className =
            'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';
        btnCn.className =
            'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 hover:opacity-100 transition-all';
        document.getElementById('input-amount').placeholder = '금액 (원)';
    } else {
        document.body.classList.add('theme-cn'); // 중국 테마 적용 (빨간색으로 변함)
        btnCn.className =
            'px-3 py-1 rounded-md text-xs font-bold bg-white text-primary shadow transition-all';
        btnKr.className =
            'px-3 py-1 rounded-md text-xs font-bold text-white opacity-70 hover:opacity-100 transition-all';
        document.getElementById('input-amount').placeholder = '금액 (¥)';
    }

    // 국가를 바꾼 뒤 해당 국가의 데이터를 새로 불러와서 화면에 그림
    loadDailyRecords();
};
