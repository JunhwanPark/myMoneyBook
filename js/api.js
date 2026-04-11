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
// 무료 API를 이용한 실시간 환율 호출 함수 (오프라인 캐싱 & 3초 타임아웃 적용)
// ==========================================
window.fetchExchangeRate = async () => {
    try {
        const badge = document.getElementById('exchange-rate-badge');
        const rateValue = document.getElementById('cny-rate-value');

        if (!badge || !rateValue) return;

        // 1. 한국 모드일 때: 뱃지를 숨기고, 기억해둔 상태를 'KR'로 변경
        if (currentCountry !== 'CN') {
            badge.classList.add('hidden');
            window._lastRateFetchedCountry = 'KR';
            return;
        }

        // 2. 이미 통신 성공했던 경우 캐싱 (함수 조기 종료)
        if (
            window._lastRateFetchedCountry === 'CN' &&
            rateValue.innerText !== '...' &&
            rateValue.innerText !== '오류'
        ) {
            badge.classList.remove('hidden');
            return;
        }

        window._lastRateFetchedCountry = 'CN';
        rateValue.innerText = '...';
        rateValue.classList.remove('text-red-400'); // 에러/캐시 색상 초기화

        // 💡 3초 타임아웃 엔진: 중국 네트워크 지연 시 무한 로딩 방지!
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
            const res = await fetch('https://open.er-api.com/v6/latest/CNY', {
                signal: controller.signal,
            });
            clearTimeout(timeoutId); // 통신 성공 시 타이머 해제
            const data = await res.json();

            if (data && data.rates && data.rates.KRW) {
                const rate = data.rates.KRW;
                const formattedRate = rate.toLocaleString('ko-KR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });

                rateValue.innerText = formattedRate;
                badge.classList.remove('hidden');

                // 💡 통신에 성공했으니 이 소중한 환율을 스마트폰에 기록해 둡니다!
                localStorage.setItem('cachedCnyRate', formattedRate);
                localStorage.setItem('cachedCnyDate', new Date().toLocaleDateString());
            }
        } catch (networkError) {
            clearTimeout(timeoutId);
            console.warn('환율 API 통신 지연 또는 실패. 캐시된 데이터를 확인합니다.', networkError);

            // 💡 통신 실패 시 스마트폰(localStorage)에서 마지막으로 성공했던 환율을 꺼내옵니다.
            const cachedRate = localStorage.getItem('cachedCnyRate');
            const cachedDate = localStorage.getItem('cachedCnyDate');

            if (cachedRate) {
                // 캐시 데이터가 있으면 그걸 보여주되, 끝에 '*'를 붙이고 살짝 붉은 톤으로 오프라인임을 알립니다.
                rateValue.innerText = `${cachedRate}*`;
                rateValue.title = `마지막 업데이트: ${cachedDate}`; // PC에서는 마우스 올리면 확인 가능
                rateValue.classList.add('text-red-400');
                badge.classList.remove('hidden');
            } else {
                // 앱을 처음 켰는데 오프라인이라 캐시조차 없다면? 안전한 임시 환율(185.00)을 제공합니다.
                rateValue.innerText = '185.00*';
                rateValue.classList.add('text-red-400');
                badge.classList.remove('hidden');
            }
        }
    } catch (e) {
        console.error('환율 처리 중 치명적 에러:', e);
        const badge = document.getElementById('exchange-rate-badge');
        const rateValue = document.getElementById('cny-rate-value');
        if (badge && rateValue) {
            rateValue.innerText = '오류';
            badge.classList.remove('hidden');
        }
    }
};

// ==========================================
// 🚀 최적화된 데이터 로드 함수 (SWR 캐싱 패턴 적용)
// ==========================================
window.loadDailyRecords = async (isSilent = false) => {
    const cacheKey = `ledgerCache_${currentCountry}`; // 국가별 캐시 키 분리

    // 💡 1. 앱을 켜자마자 로컬 스토리지에 캐시된 어제 데이터가 있다면 즉시 화면에 렌더링!
    if (!isSilent) {
        const cachedString = localStorage.getItem(cacheKey);
        if (cachedString) {
            try {
                const result = JSON.parse(cachedString);
                globalData = result.data || [];
                window.globalDeposits = result.deposits || [];
                globalCategories = (result.categories || []).filter(
                    (c) => !c.Type.startsWith('card')
                );
                globalCards = (result.categories || [])
                    .filter((c) => {
                        if (currentCountry === 'KR')
                            return c.Type === 'card' || c.Type === 'card_KR';
                        if (currentCountry === 'CN') return c.Type === 'card_CN';
                        return false;
                    })
                    .sort((a, b) => {
                        const nameA = a.Label.split('|')[0];
                        const nameB = b.Label.split('|')[0];
                        return nameA.localeCompare(nameB);
                    });

                // 캐시 데이터로 즉시 화면 그리기 (0.1초 컷)
                renderDailyList(globalData);
                if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
                updateMonthlyTotals();
                const statsTab = document.getElementById('view-stats');
                if (statsTab && statsTab.classList.contains('active')) renderChart();

                // 이미 화면이 떴으므로, 이어지는 백그라운드 동기화는 무음(Silent) 모드로 강제 전환!
                isSilent = true;
            } catch (e) {
                console.warn('캐시 데이터를 읽는 중 오류 발생:', e);
            }
        }
    }

    // 캐시가 아예 없는(앱 첫 실행) 경우에만 로딩 스피너를 띄웁니다.
    if (!isSilent) showLoader();

    try {
        fetchExchangeRate().catch((e) => console.log('환율 로드 무시됨', e));

        const res = await fetch(`${GAS_URL}?country=${currentCountry}`);
        const result = await res.json();

        if (result.status === 'success') {
            // 💡 2. 통신에 성공하면 최신 데이터를 로컬 스토리지에 조용히 덮어씌워 둡니다 (다음 접속을 위해)
            localStorage.setItem(cacheKey, JSON.stringify(result));

            globalData = result.data || [];
            window.globalDeposits = result.deposits || [];
            globalCategories = (result.categories || []).filter((c) => !c.Type.startsWith('card'));
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

            // 데이터가 변경되었을 수 있으니 화면을 다시 한번 살짝(Silent) 새로고침 합니다.
            renderDailyList(globalData);
            if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
            updateMonthlyTotals();
            const statsTab = document.getElementById('view-stats');
            if (statsTab && statsTab.classList.contains('active')) renderChart();
        }
    } catch (error) {
        console.error('데이터 로드 중 에러 발생:', error);
        if (!isSilent) alert('데이터를 불러오는 중 문제가 발생했습니다. 새로고침 해주세요.');
    } finally {
        if (!isSilent) hideLoader();
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

    // 임시 ID 생성
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

    // 🚀 1. 딜레이 제로(0초): 모달창 즉시 닫기
    closeAddModal();

    // 🚀 2. 낙관적 업데이트: 서버 응답을 기다리지 않고 화면에 먼저 그려버리기!
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
        if (idx > -1) {
            // 💡 백엔드와 동일하게 기존 위치에서 빼서 맨 뒤로 넣습니다. (최신순 상단 노출용)
            globalData.splice(idx, 1);
            globalData.push(optimisticData);
        }
    }

    // 변경된 데이터를 바탕으로 화면 즉시 렌더링
    if (typeof renderDailyList === 'function') renderDailyList(globalData);
    if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
    if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();
    const statsTab = document.getElementById('view-stats');
    if (statsTab && statsTab.classList.contains('active') && typeof renderChart === 'function')
        renderChart();

    // 🚀 3. 백그라운드 동기화 (로딩 스피너 완전 제거!)
    fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === 'success') {
                // 성공 시 화면 깜빡임 없이 조용히(isSilent=true) 서버 데이터와 싱크 맞추기
                loadDailyRecords(true);
            }
        })
        .catch((e) => {
            alert('저장 중 네트워크 오류가 발생하여 이전 상태로 복구됩니다.');
            loadDailyRecords(true);
        });
};

window.deleteRecord = () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const recordId = document.getElementById('input-id').value;

    // 🚀 1. 즉시 모달 닫기
    closeAddModal();

    // 🚀 2. 즉시 화면에서 데이터 삭제 및 새로고침 (로딩 바 없음)
    globalData = globalData.filter((d) => d.ID !== recordId);

    if (typeof renderDailyList === 'function') renderDailyList(globalData);
    if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
    if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();
    const statsTab = document.getElementById('view-stats');
    if (statsTab && statsTab.classList.contains('active') && typeof renderChart === 'function')
        renderChart();

    // 🚀 3. 백그라운드 삭제 요청
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
                loadDailyRecords(true); // 성공 시 조용히 데이터 싱크
            }
        })
        .catch((e) => {
            alert('삭제 중 통신 오류가 발생하여 원상복구 되었습니다.');
            loadDailyRecords(true); // 실패 시 롤백
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
