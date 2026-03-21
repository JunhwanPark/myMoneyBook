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

// 👇 이전 국가 상태를 기억하기 위한 변수 추가
window._lastRateFetchedCountry = null;

// ==========================================
// 무료 API를 이용한 실시간 환율 호출 함수 (국가 전환 시에만 호출되도록 최적화)
// ==========================================
window.fetchExchangeRate = async () => {
    try {
        const badge = document.getElementById('exchange-rate-badge');
        const rateValue = document.getElementById('cny-rate-value');

        if (!badge || !rateValue) return;

        // 1. 한국 모드일 때: 뱃지를 숨기고, 기억해둔 상태를 'KR'로 변경
        // (이렇게 해야 다음에 중국으로 넘어갈 때 다시 환율을 받아옵니다)
        if (currentCountry !== 'CN') {
            badge.classList.add('hidden');
            window._lastRateFetchedCountry = 'KR';
            return;
        }

        // 2. 중국 모드인데 이미 이번 턴에 환율을 정상적으로 받아온 적이 있다면?
        // 💡 API를 호출하지 않고 여기서 함수를 즉시 종료합니다! (캐싱 효과)
        if (
            window._lastRateFetchedCountry === 'CN' &&
            rateValue.innerText !== '...' &&
            rateValue.innerText !== '오류'
        ) {
            badge.classList.remove('hidden');
            return;
        }

        // 3. 한국 -> 중국으로 막 넘어왔거나, 이전 통신이 실패했던 경우에만 API 실제 호출
        window._lastRateFetchedCountry = 'CN';
        rateValue.innerText = '...'; // 로딩 중 표시

        const res = await fetch('https://open.er-api.com/v6/latest/CNY');
        const data = await res.json();

        if (data && data.rates && data.rates.KRW) {
            rateValue.innerText = data.rates.KRW.toLocaleString('ko-KR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            badge.classList.remove('hidden');
        }
    } catch (e) {
        console.error('환율 정보를 가져오는데 실패했습니다.', e);
        const badge = document.getElementById('exchange-rate-badge');
        const rateValue = document.getElementById('cny-rate-value');
        if (badge && rateValue) {
            rateValue.innerText = '오류';
            badge.classList.remove('hidden');
        }
    }
};

// ==========================================
// 기존 데이터 로드 함수 (국가별 신용카드 분리 로직 적용)
// ==========================================
window.loadDailyRecords = async () => {
    showLoader();
    try {
        fetchExchangeRate().catch((e) => console.log('환율 로드 무시됨', e));

        const res = await fetch(`${GAS_URL}?country=${currentCountry}`);
        const result = await res.json();

        if (result.status === 'success') {
            globalData = result.data || [];

            // 👇 일반 카테고리에서는 'card', 'card_KR', 'card_CN'을 모두 제외합니다.
            globalCategories = (result.categories || []).filter((c) => !c.Type.startsWith('card'));

            // 👇 국가별 신용카드 분리 (한국은 기존 'card' 호환 유지, 중국은 'card_CN'만)
            globalCards = (result.categories || [])
                .filter((c) => {
                    if (currentCountry === 'KR') return c.Type === 'card' || c.Type === 'card_KR';
                    if (currentCountry === 'CN') return c.Type === 'card_CN';
                    return false;
                })
                .sort((a, b) => {
                    const nameA = a.Label.split('|')[0];
                    const nameB = b.Label.split('|')[0];
                    return nameA.localeCompare(nameB);
                });

            renderDailyList(globalData);
            if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
            updateMonthlyTotals();

            const statsTab = document.getElementById('view-stats');
            if (statsTab && statsTab.classList.contains('active')) renderChart();
        }
    } catch (error) {
        console.error('데이터 로드 중 에러 발생:', error);
        alert('데이터를 불러오는 중 문제가 발생했습니다. 새로고침 해주세요.');
    } finally {
        hideLoader();
    }
};

window.saveRecord = () => {
    const type = document.querySelector('input[name="type"]:checked').value;
    const date = document.getElementById('input-date').value;
    const category = document.getElementById('input-category').value;
    const itemName = document.getElementById('input-item-name').value;
    const memoDetail = document.getElementById('input-memo-detail').value;
    const payType = document.querySelector('input[name="pay_type"]:checked').value;

    const rawAmount = document
        .getElementById('input-amount')
        .value.replace(/,/g, '')
        .replace(/-/g, '');
    const rawDiscount = document.getElementById('input-discount').value.replace(/,/g, '');

    if (!date || rawAmount === '' || !itemName) {
        return alert('필수 항목(날짜, 항목 이름, 금액)을 입력해주세요.');
    }

    const amountStr = document.getElementById('input-amount').value.replace(/,/g, '');
    const amountVal = Number(amountStr);
    const discountVal = Number(rawDiscount) || 0;
    const finalAmount = amountVal - discountVal;

    let paymentMethod = '현금';
    if (type === 'expense' && payType === 'card') {
        paymentMethod = document.getElementById('input-card-select').value;
        if (!paymentMethod) return alert('카드를 선택해주세요.');
    }

    const memo = `${itemName}\nPAY:${paymentMethod}\nDISC:${discountVal}\n${memoDetail}`;
    const action = document.getElementById('input-action').value;

    // 💡 임시 ID 생성 (새로 추가할 경우 구글 시트가 ID를 주기도 전에 화면에 그리기 위함)
    const recordId = document.getElementById('input-id').value || 'temp_' + Date.now();

    const payload = {
        action: action,
        id: recordId,
        country: currentCountry,
        date,
        userEmail: currentUserEmail,
        type,
        category,
        amount: finalAmount,
        memo,
    };

    // ==========================================
    // 🚀 1. 딜레이 제로(0초): 모달창 즉시 닫기
    // ==========================================
    closeAddModal();

    // ==========================================
    // 🚀 2. 낙관적 업데이트: 서버 응답을 기다리지 않고 화면에 먼저 그려버리기!
    // ==========================================
    const optimisticData = {
        ID: recordId,
        Date: date + 'T00:00:00.000Z',
        Type: type,
        Category: category,
        Amount: finalAmount.toString(),
        Memo: memo,
        User: currentUserEmail || 'me',
    };

    if (action === 'create') {
        globalData.push(optimisticData);
    } else {
        const idx = globalData.findIndex((d) => d.ID === recordId);
        if (idx > -1) globalData[idx] = optimisticData;
    }

    // 변경된 데이터를 바탕으로 화면 즉시 새로고침 (사용자는 여기서 저장이 끝났다고 느낍니다)
    if (typeof renderDailyList === 'function') renderDailyList(globalData);
    if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
    if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();
    const statsTab = document.getElementById('view-stats');
    if (statsTab && statsTab.classList.contains('active') && typeof renderChart === 'function')
        renderChart();

    // ==========================================
    // 🚀 3. 백그라운드 동기화: 사용자가 딴짓할 때 조용히 서버에 전송
    // ==========================================
    showLoader(); // 상단에 '동기화 중...' 토스트 띄우기

    fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === 'success') {
                // 구글 시트에 안전하게 저장이 끝나면, 임시 ID 등을 실제 ID로 덮어씌우기 위해 조용히 싱크
                loadDailyRecords();
            }
        })
        .catch((e) => {
            alert('저장 중 통신 오류가 발생했습니다.');
            loadDailyRecords(); // 실패 시 원래 서버 데이터로 원상복구
        });
};

window.deleteRecord = () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const recordId = document.getElementById('input-id').value;

    // 🚀 1. 즉시 모달 닫기
    closeAddModal();

    // 🚀 2. 즉시 화면에서 데이터 삭제 및 새로고침 (낙관적 업데이트)
    globalData = globalData.filter((d) => d.ID !== recordId);

    if (typeof renderDailyList === 'function') renderDailyList(globalData);
    if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
    if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();
    const statsTab = document.getElementById('view-stats');
    if (statsTab && statsTab.classList.contains('active') && typeof renderChart === 'function')
        renderChart();

    // 🚀 3. 백그라운드 삭제 요청
    showLoader(); // 토스트 띄우기

    fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'delete',
            id: recordId,
            country: currentCountry,
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === 'success') {
                loadDailyRecords(); // 삭제 성공 시 조용히 데이터 싱크
            }
        })
        .catch((e) => {
            alert('삭제 중 통신 오류가 발생했습니다.');
            loadDailyRecords(); // 실패 시 삭제 취소 및 롤백
        });
};

// ==========================================
// 💡 신용카드 추가/수정 로직 (국가별 분리 저장)
// ==========================================
window.addCard = async () => {
    const label = document.getElementById('new-card-label').value.trim();
    const day = document.getElementById('new-card-day').value.trim();
    if (!label || !day) return alert('정보를 정확히 입력하세요.');

    showLoader();
    try {
        // 👇 현재 국가 코드(KR 또는 CN)를 붙여서 Type을 생성합니다.
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_category',
                catType: `card_${currentCountry}`,
                catLabel: `${label}|${day}`,
            }),
        });

        await loadDailyRecords();
        openCardModal(); // 화면을 초기화하고 수정된 리스트를 다시 보여줌
    } catch (e) {
        alert('카드 추가 중 에러가 발생했습니다.');
        hideLoader();
    }
};

window.deleteCard = async (catValue) => {
    if (!confirm('카드를 삭제하시겠습니까? (기존 내역 유지)')) return;
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_category', catValue }),
        });
        if ((await res.json()).status === 'success') {
            await loadDailyRecords();
            openCardModal();
        }
    } catch (e) {
        alert('에러');
    }
};

window.addCategory = async () => {
    const type = document.getElementById('new-cat-type').value;
    const label = document.getElementById('new-cat-label').value.trim();
    if (!label) return alert('카테고리 이름을 입력해주세요.');
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'add_category', catType: type, catLabel: label }),
        });
        if ((await res.json()).status === 'success') {
            document.getElementById('new-cat-label').value = '';
            await loadDailyRecords();
            openCategoryModal();
        }
    } catch (e) {
        alert('에러');
    }
};

window.deleteCategory = async (catValue) => {
    if (!confirm('카테고리를 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_category', catValue }),
        });
        if ((await res.json()).status === 'success') {
            await loadDailyRecords();
            openCategoryModal();
        }
    } catch (e) {
        alert('에러');
    }
};

// ==========================================
// 💡 카테고리 & 카드 수정(Edit) 로직
// ==========================================
window.submitEditCategory = async (oldValue) => {
    const type = document.getElementById('new-cat-type').value;
    const label = document.getElementById('new-cat-label').value.trim();
    if (!label) return alert('카테고리 이름을 입력해주세요.');

    showLoader();
    try {
        // 1. 기존 데이터 삭제
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_category', catValue: oldValue }),
        });
        // 2. 수정된 데이터 추가
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'add_category', catType: type, catLabel: label }),
        });

        await loadDailyRecords();
        openCategoryModal(); // 화면을 초기화하고 수정된 리스트를 다시 보여줌
    } catch (e) {
        alert('수정 중 에러가 발생했습니다.');
        hideLoader();
    }
};

window.submitEditCard = async (oldValue) => {
    const label = document.getElementById('new-card-label').value.trim();
    const day = document.getElementById('new-card-day').value.trim();
    if (!label || !day) return alert('정보를 정확히 입력하세요.');

    showLoader();
    try {
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_category', catValue: oldValue }),
        });

        // 👇 수정 시에도 현재 국가 코드를 붙여서 새 데이터로 갈아끼웁니다.
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_category',
                catType: `card_${currentCountry}`,
                catLabel: `${label}|${day}`,
            }),
        });

        await loadDailyRecords();
        openCardModal();
    } catch (e) {
        alert('수정 중 에러가 발생했습니다.');
        hideLoader();
    }
};
