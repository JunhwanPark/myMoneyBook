// js/api.js 최상단
window.googleAuthToken = null; // 👈 신규: 토큰 저장용 변수
window.countryDataVersions = window.countryDataVersions || { KR: 0, CN: 0 };
window.allCountryData = window.allCountryData || { KR: [], CN: [] };
window.allCategories = window.allCategories || [];
window.hasLoadedAllCountryData = false;
window.markCountryDataChanged = (country) => {
    window.countryDataVersions[country] = (window.countryDataVersions[country] || 0) + 1;
};

window.updateCachedCountryData = (country, records) => {
    window.allCountryData[country] = [...records];
    try {
        const allCacheKey = 'ledgerCache_ALL';
        const allCache = JSON.parse(localStorage.getItem(allCacheKey) || '{}');
        allCache.dataByCountry = allCache.dataByCountry || {
            KR: [...(window.allCountryData.KR || [])],
            CN: [...(window.allCountryData.CN || [])],
        };
        allCache.dataByCountry[country] = [...records];
        localStorage.setItem(allCacheKey, JSON.stringify(allCache));

        const countryCacheKey = `ledgerCache_${country}`;
        const countryCache = JSON.parse(localStorage.getItem(countryCacheKey) || '{}');
        countryCache.data = [...records];
        localStorage.setItem(countryCacheKey, JSON.stringify(countryCache));
    } catch (error) {
        console.warn('저장된 거래 캐시를 갱신하지 못했습니다.', error);
    }
};

window.updateCachedLifeRecords = () => {
    try {
        const key = 'ledgerCache_ALL';
        const cache = JSON.parse(localStorage.getItem(key) || '{}');
        cache.dataByCountry = cache.dataByCountry || {
            KR: [...(window.allCountryData.KR || [])],
            CN: [...(window.allCountryData.CN || [])],
        };
        cache.lifeTypes = [...window.lifeTypes];
        cache.lifeRecords = [...window.lifeRecords];
        localStorage.setItem(key, JSON.stringify(cache));
    } catch (error) {
        console.warn('저장된 생활기록 캐시를 갱신하지 못했습니다.', error);
    }
};

window.updateCachedAssetData = () => {
    try {
        const key = 'ledgerCache_ALL';
        const cache = JSON.parse(localStorage.getItem(key) || '{}');
        cache.dataByCountry = cache.dataByCountry || {
            KR: [...(window.allCountryData.KR || [])],
            CN: [...(window.allCountryData.CN || [])],
        };
        cache.deposits = [...(window.globalDeposits || [])];
        cache.dividends = [...(window.globalDividends || [])];
        localStorage.setItem(key, JSON.stringify(cache));
    } catch (error) {
        console.warn('저장된 자산 기록 캐시를 갱신하지 못했습니다.', error);
    }
};

window.selectCountryData = (preferredCountry = currentCountry) => {
    globalData = [...(window.allCountryData[preferredCountry] || [])];
    globalCards = window.allCategories
        .filter((category) => {
            if (preferredCountry === 'KR') return category.Type === 'card' || category.Type === 'card_KR';
            if (preferredCountry === 'CN') return category.Type === 'card_CN';
            return false;
        })
        .sort((a, b) => a.Label.split('|')[0].localeCompare(b.Label.split('|')[0]));
};

window.applyLoadedData = (result, preferredCountry = currentCountry) => {
    if (result.dataByCountry) {
        window.allCountryData = {
            KR: result.dataByCountry.KR || [],
            CN: result.dataByCountry.CN || [],
        };
        window.hasLoadedAllCountryData = true;
    } else {
        window.allCountryData[preferredCountry] = result.data || [];
    }

    window.globalDeposits = result.deposits || [];
    window.globalDividends = result.dividends || [];
    window.lifeTypes = result.lifeTypes || [];
    window.lifeRecords = result.lifeRecords || [];
    window.allCategories = result.categories || window.allCategories;
    globalCategories = window.allCategories.filter((category) => !category.Type.startsWith('card'));
    window.selectCountryData(preferredCountry);
};

window.setSyncStatus = (status) => {
    const icon = document.getElementById('sync-status-icon');
    const text = document.getElementById('sync-status-text');
    const badge = document.getElementById('sync-status');
    if (!icon || !text || !badge) return;

    const states = {
        syncing: { label: '동기화 중', icon: 'sync', color: 'text-amber-200', title: 'Google 스프레드시트와 동기화 중입니다.' },
        synced: { label: '동기화 완료', icon: 'check_circle', color: 'text-emerald-300', title: 'Google 스프레드시트와 동기화되었습니다.' },
        error: { label: '동기화 실패', icon: 'error', color: 'text-red-300', title: '동기화에 실패했습니다. 연결을 확인해 주세요.' },
    };
    const state = states[status] || states.syncing;
    text.textContent = state.label;
    icon.textContent = state.icon;
    icon.className = `material-symbols-outlined text-[13px] ${state.color}${status === 'syncing' ? ' animate-spin' : ''}`;
    badge.title = state.title;
};

window.handleCredentialResponse = (response) => {
    const payload = jwt_decode(response.credential);
    if (ALLOWED_EMAILS.includes(payload.email)) {
        currentUserEmail = payload.email;
        window.googleAuthToken = response.credential; // 👈 신규: 로그인 시 발급받은 마패를 저장!

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
    const rateValue = document.getElementById('ticker-exchange-value');
    const rateContainer = document.getElementById('ticker-exchange-rate');
    const canShowExchangeRate = () =>
        currentCountry === 'CN' && window.currentAppMode === 'LEDGER';
    const showRate = (value, isStale = false, title = '') => {
        if (rateValue) {
            rateValue.innerText = value;
            rateValue.classList.toggle('is-stale', isStale);
            rateValue.title = title;
        }
        rateContainer?.classList.toggle('hidden', !canShowExchangeRate());
        if (typeof window.updateSpendingTicker === 'function') window.updateSpendingTicker();
    };

    try {
        if (!rateValue || !rateContainer) return;
        if (!canShowExchangeRate()) {
            rateContainer.classList.add('hidden');
            if (currentCountry !== 'CN') window._lastRateFetchedCountry = 'KR';
            return;
        }

        if (
            window._lastRateFetchedCountry === 'CN' &&
            rateValue.innerText !== '...'
        ) {
            rateContainer.classList.remove('hidden');
            return;
        }

        window._lastRateFetchedCountry = 'CN';
        const cachedRate = localStorage.getItem('cachedCnyRate');
        const cachedDate = localStorage.getItem('cachedCnyDate');
        showRate(cachedRate ? `${cachedRate}*` : '불러오는 중', Boolean(cachedRate), cachedDate ? `마지막 업데이트: ${cachedDate}` : '');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
            const res = await fetch('https://open.er-api.com/v6/latest/CNY', {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const data = await res.json();
            if (!canShowExchangeRate()) return;

            if (data && data.rates && data.rates.KRW) {
                const rate = data.rates.KRW;
                const formattedRate = rate.toLocaleString('ko-KR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });

                showRate(formattedRate);
                localStorage.setItem('cachedCnyRate', formattedRate);
                localStorage.setItem('cachedCnyDate', new Date().toLocaleDateString());
            }
        } catch (networkError) {
            clearTimeout(timeoutId);
            console.warn('환율 API 통신 지연 또는 실패. 캐시된 데이터를 확인합니다.', networkError);
            if (!canShowExchangeRate()) return;

            if (cachedRate) {
                showRate(`${cachedRate}*`, true, cachedDate ? `마지막 업데이트: ${cachedDate}` : '저장된 환율');
            } else {
                showRate('185.00*', true, '환율을 불러오지 못해 임시 기준값을 표시합니다.');
            }
        }
    } catch (e) {
        console.error('환율 처리 중 치명적 에러:', e);
        if (rateValue && canShowExchangeRate()) {
            const cachedRate = localStorage.getItem('cachedCnyRate');
            showRate(cachedRate ? `${cachedRate}*` : '환율 오류', true);
        }
    }
};

// ==========================================
// 🚀 최적화된 데이터 로드 함수 (SWR 캐싱 패턴 적용)
// ==========================================
window.loadDailyRecords = async (isSilent = false) => {
    const requestedCountry = currentCountry;
    const requestedDataVersions = { ...window.countryDataVersions };
    const cacheKey = 'ledgerCache_ALL';

    // 💡 1. 앱을 켜자마자 로컬 스토리지에 캐시된 어제 데이터가 있다면 즉시 화면에 렌더링!
    if (!isSilent) {
        const cachedString =
            localStorage.getItem(cacheKey) || localStorage.getItem(`ledgerCache_${requestedCountry}`);
        if (cachedString) {
            try {
                const result = JSON.parse(cachedString);
                window.applyLoadedData(result, currentCountry);

                // 캐시 데이터로 즉시 화면 그리기 (0.1초 컷)
                renderDailyList(globalData);
                if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
                updateMonthlyTotals();
                const statsTab = document.getElementById('view-stats');
                if (statsTab && statsTab.classList.contains('active')) renderChart();

                if (
                    window.currentAppMode === 'ASSETS' &&
                    typeof window.renderAssetsList === 'function'
                ) {
                    window.renderAssetsList();
                }
                if (typeof window.renderLifeMode === 'function') window.renderLifeMode();

                // 이미 화면이 떴으므로, 이어지는 백그라운드 동기화는 무음(Silent) 모드로 강제 전환!
                isSilent = true;
            } catch (e) {
                console.warn('캐시 데이터를 읽는 중 오류 발생:', e);
            }
        }
    }

    // 캐시가 아예 없는(앱 첫 실행) 경우에만 로딩 스피너를 띄웁니다.
    if (!isSilent) showLoader();
    window.setSyncStatus('syncing');

    try {
        fetchExchangeRate().catch((e) => console.log('환율 로드 무시됨', e));

        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'sync',
                country: 'ALL',
                token: window.googleAuthToken,
            }),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const result = await res.json();

        if (result.status !== 'success') {
            throw new Error(`서버 데이터 조회 실패: ${JSON.stringify(result).slice(0, 300)}`);
        }
        const dataChangedDuringRequest = ['KR', 'CN'].some(
            (country) => requestedDataVersions[country] !== (window.countryDataVersions[country] || 0)
        );
        if (dataChangedDuringRequest) {
            console.log('[Load] 데이터 변경 중에 시작된 이전 동기화 응답을 무시합니다.');
            return false;
        }
        // 💡 2. 통신에 성공하면 최신 데이터를 로컬 스토리지에 조용히 덮어씌워 둡니다 (다음 접속을 위해)
        localStorage.setItem(cacheKey, JSON.stringify(result));

        window.applyLoadedData(result, currentCountry);

        // 데이터가 변경되었을 수 있으니 화면을 다시 한번 살짝(Silent) 새로고침 합니다.
        renderDailyList(globalData);
        if (
            window.currentWeeklyModalDate &&
            document.getElementById('weekly-modal') &&
            !document.getElementById('weekly-modal').classList.contains('hidden') &&
            typeof window.openWeeklyModal === 'function'
        ) {
            window.openWeeklyModal(window.currentWeeklyModalDate);
        }
        if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
        updateMonthlyTotals();
        const statsTab = document.getElementById('view-stats');
        if (statsTab && statsTab.classList.contains('active')) renderChart();

        if (window.currentAppMode === 'ASSETS' && typeof window.renderAssetsList === 'function') {
            window.renderAssetsList();
        }
        if (typeof window.renderLifeMode === 'function') window.renderLifeMode();

        window.setSyncStatus('synced');
        return true;
    } catch (error) {
        console.error('데이터 로드 중 에러 발생:', error);
        window.setSyncStatus('error');

        if (!isSilent) {
            window.showToast('데이터를 불러오는 중 문제가 발생했습니다. 새로고침 해주세요.');
        }

        return false;
    } finally {
        if (!isSilent) hideLoader();
    }
};

window.forceSyncAllData = async () => {
    const buttons = [...document.querySelectorAll('[data-force-sync]')];
    if (buttons.some((button) => button.disabled)) return;

    buttons.forEach((button) => {
        button.disabled = true;
        const label = button.querySelector('[data-sync-label]');
        const icon = button.querySelector('[data-sync-icon]');
        if (label) label.textContent = '동기화 중...';
        icon?.classList.add('animate-spin');
    });

    try {
        const synced = await window.loadDailyRecords(true);
        if (!synced) throw new Error('데이터를 동기화하지 못했습니다. 연결 상태를 확인해 주세요.');
        window.showToast('모든 모드의 데이터를 동기화했습니다.', 'success');
    } catch (error) {
        console.error('강제 동기화 실패:', error);
        window.showToast(error.message || '동기화에 실패했습니다. 다시 시도해 주세요.');
    } finally {
        buttons.forEach((button) => {
            button.disabled = false;
            const label = button.querySelector('[data-sync-label]');
            const icon = button.querySelector('[data-sync-icon]');
            if (label) label.textContent = '강제 동기화';
            icon?.classList.remove('animate-spin');
        });
    }
};

let saveSuccessToastTimer;
let saveSuccessToastHideTimer;

window.showToast = (message, type = 'info') => {
    const toast = document.getElementById('save-success-toast');
    if (!toast) return;

    const messageEl = document.getElementById('save-success-toast-message');
    const iconEl = document.getElementById('save-success-toast-icon');
    if (messageEl) messageEl.textContent = message;
    toast.classList.toggle('whitespace-nowrap', type === 'success');
    if (iconEl) {
        const isSuccess = type === 'success';
        iconEl.textContent = isSuccess ? 'check_circle' : 'info';
        iconEl.classList.toggle('text-emerald-400', isSuccess);
        iconEl.classList.toggle('text-amber-300', !isSuccess);
    }

    clearTimeout(saveSuccessToastTimer);
    clearTimeout(saveSuccessToastHideTimer);
    toast.classList.remove('invisible', 'opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
    toast.setAttribute('aria-hidden', 'false');

    saveSuccessToastTimer = setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-2');
        toast.setAttribute('aria-hidden', 'true');
        saveSuccessToastHideTimer = setTimeout(() => toast.classList.add('invisible'), 300);
    }, type === 'success' ? 2400 : 4000);
};

window.saveRecord = async (e) => {
    // 폼 제출 시 새로고침 등 기본 이벤트 방지 (필요 시)
    if (e) e.preventDefault();

    const saveBtn = document.getElementById('save-btn');

    // 🛡️ 방어 1단계: 중복 클릭 및 다중 요청 원천 차단
    if (saveBtn && saveBtn.disabled) return;

    const originalBtnText = saveBtn ? saveBtn.innerText : '저장';
    if (saveBtn) {
        saveBtn.disabled = true; // 버튼 잠금
        saveBtn.innerText = '저장 중...';
        saveBtn.classList.add('opacity-50', 'cursor-not-allowed'); // 시각적 비활성화
    }

    // 💡 유효성 검사에 걸리거나 에러 시 버튼을 원래대로 되돌리는 헬퍼 함수
    const restoreButton = () => {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = originalBtnText;
            saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    };

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

    // 💡 유효성 검사 실패 시 버튼 잠금을 꼭 풀어주어야 합니다!
    if (!date || rawAmount === '' || !itemName) {
        restoreButton();
        return window.showToast('필수 항목(날짜, 항목 이름, 금액)을 입력해주세요.');
    }

    const amountStr = document.getElementById('input-amount').value.replace(/,/g, '');
    const amountVal = Number(amountStr);
    const discountVal = Number(rawDiscount) || 0;
    const finalAmount = amountVal - discountVal;

    let paymentMethod = '현금';
    if (type === 'expense' && payType === 'card') {
        paymentMethod = document.getElementById('input-card-select').value;
        if (!paymentMethod) {
            restoreButton(); // 카드 미선택 시에도 잠금 해제
            return window.showToast('카드를 선택해주세요.');
        }
    }

    window.setSyncStatus('syncing');

    const memo = `${itemName}\nPAY:${paymentMethod}\nDISC:${discountVal}\n${memoDetail}`;
    const action = document.getElementById('input-action').value;

    // 임시 ID 생성
    const recordId = document.getElementById('input-id').value || 'temp_' + Date.now();

    const payload = {
        action: action,
        token: window.googleAuthToken,
        id: recordId,
        country: currentCountry,
        date,
        userEmail: currentUserEmail,
        type,
        category,
        amount: finalAmount,
        memo,
    };

    const originalGlobalData = [...globalData];
    const saveCountry = currentCountry;
    window.markCountryDataChanged(saveCountry);

    // 🚀 2단계: 딜레이 제로(0초) 낙관적 업데이트 시작!
    closeAddModal(); // 모달창 즉시 닫기

    const optimisticData = {
        ID: recordId,
        Date: date,
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
            // 백엔드와 동일하게 기존 위치에서 빼서 맨 뒤로 넣습니다. (최신순 상단 노출용)
            globalData.splice(idx, 1);
            globalData.push(optimisticData);
        }
    }

    // 변경된 데이터를 바탕으로 화면 즉시 렌더링
    if (typeof renderDailyList === 'function') renderDailyList(globalData);
    if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
    if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();
    if (
        window.currentWeeklyModalDate &&
        document.getElementById('weekly-modal') &&
        !document.getElementById('weekly-modal').classList.contains('hidden') &&
        typeof window.openWeeklyModal === 'function'
    ) {
        window.openWeeklyModal(window.currentWeeklyModalDate);
    }
    const statsTab = document.getElementById('view-stats');
    if (statsTab && statsTab.classList.contains('active') && typeof renderChart === 'function') {
        renderChart();
    }

    // 🛡️ 3단계: 안전한 백그라운드 동기화 (try...catch...finally 구조 적용)
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log('[Save] HTTP status:', response.status);
        console.log('[Save] Response body:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`서버 응답이 JSON 형식이 아닙니다: ${responseText.slice(0, 300)}`);
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 300)}`);
        }

        if (data.status !== 'success') {
            throw new Error(`서버 저장 실패: ${responseText.slice(0, 500)}`);
        }

        if (action === 'create') {
            optimisticData.ID = data.id;
        }
        window.updateCachedCountryData(saveCountry, globalData);
        window.setSyncStatus('synced');
        window.showToast('저장이 완료되었습니다', 'success');
    } catch (e) {
        console.error('Data sync failed:', e);
        window.markCountryDataChanged(saveCountry);

        // 국가가 바뀌지 않은 경우에만 원본 데이터 복구
        if (currentCountry === saveCountry) {
            globalData = originalGlobalData;

            renderDailyList(globalData);

            if (typeof calendar !== 'undefined' && calendar) {
                renderCalendarEvents();
            }

            if (typeof updateMonthlyTotals === 'function') {
                updateMonthlyTotals();
            }

            const statsTab = document.getElementById('view-stats');
            if (
                statsTab &&
                statsTab.classList.contains('active') &&
                typeof renderChart === 'function'
            ) {
                renderChart();
            }
        }

        window.showToast('저장 결과를 확인할 수 없습니다. 서버 데이터를 다시 확인합니다.');

        // 서버 데이터 재동기화 시도
        const recoverySuccess = await loadDailyRecords(true);

        if (!recoverySuccess) {
            console.error('실패 후 데이터 재동기화도 실패');
            window.showToast('데이터 복구에 실패했습니다. 새로고침 후 서버 기록을 확인해주세요.');
        }
    } finally {
        // 성공하든 실패하든, 통신이 완전히 끝나면 버튼 잠금을 해제합니다.
        // 나중에 모달을 다시 열었을 때 버튼이 눌려있는 상태를 방지합니다.
        restoreButton();
    }
};

window.deleteRecord = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    window.setSyncStatus('syncing');

    const recordId = document.getElementById('input-id').value;
    const originalGlobalData = [...globalData];
    const deleteCountry = currentCountry;
    window.markCountryDataChanged(deleteCountry);

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
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete',
                token: window.googleAuthToken, // 👈 💡 신분증(마패) 추가!
                id: recordId,
                country: deleteCountry,
            }),
        });
        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        window.markCountryDataChanged(deleteCountry);
        const syncSuccess = await loadDailyRecords(true);
        if (syncSuccess) {
            window.showToast('삭제 후 목록을 갱신했습니다', 'success');
        } else {
            window.showToast('항목은 삭제되었지만 목록 갱신에 실패했습니다. 새로고침 후 확인해주세요.');
        }
    } catch (e) {
        console.error('Record deletion failed:', e);
        window.markCountryDataChanged(deleteCountry);

        if (currentCountry === deleteCountry) {
            globalData = originalGlobalData;
            if (typeof renderDailyList === 'function') renderDailyList(globalData);
            if (typeof calendar !== 'undefined' && calendar) renderCalendarEvents();
            if (typeof updateMonthlyTotals === 'function') updateMonthlyTotals();
            const statsTab = document.getElementById('view-stats');
            if (statsTab && statsTab.classList.contains('active') && typeof renderChart === 'function') {
                renderChart();
            }
        }

        window.showToast('삭제 결과를 확인할 수 없습니다. 서버 데이터를 다시 확인합니다.');
        await loadDailyRecords(true);
    }
};

// ==========================================
// 💡 신용카드 추가/수정 로직 (국가별 분리 저장)
// ==========================================
window.addCard = async () => {
    const label = document.getElementById('new-card-label').value.trim();
    const day = document.getElementById('new-card-day').value.trim();
    if (!label || !day) return window.showToast('정보를 정확히 입력하세요.');

    window.setSyncStatus('syncing');
    showLoader();
    try {
        // 👇 현재 국가 코드(KR 또는 CN)를 붙여서 Type을 생성합니다.
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_category',
                token: window.googleAuthToken,
                catType: `card_${currentCountry}`,
                catLabel: `${label}|${day}`,
            }),
        });

        await loadDailyRecords();
        openCardModal(); // 화면을 초기화하고 수정된 리스트를 다시 보여줌
    } catch (e) {
        window.setSyncStatus('error');
        window.showToast('카드 추가 중 에러가 발생했습니다.');
        hideLoader();
    }
};

window.deleteCard = async (catValue) => {
    if (!confirm('카드를 삭제하시겠습니까? (기존 내역 유지)')) return;
    window.setSyncStatus('syncing');
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete_category',
                token: window.googleAuthToken,
                catValue,
            }),
        });
        if ((await res.json()).status === 'success') {
            await loadDailyRecords();
            openCardModal();
        } else {
            window.setSyncStatus('error');
        }
    } catch (e) {
        window.setSyncStatus('error');
        window.showToast('에러');
    }
};

window.addCategory = async () => {
    const type = document.getElementById('new-cat-type').value;
    const label = document.getElementById('new-cat-label').value.trim();
    if (!label) return window.showToast('카테고리 이름을 입력해주세요.');
    window.setSyncStatus('syncing');
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_category',
                token: window.googleAuthToken,
                catType: type,
                catLabel: label,
            }),
        });
        if ((await res.json()).status === 'success') {
            document.getElementById('new-cat-label').value = '';
            await loadDailyRecords();
            openCategoryModal();
        } else {
            window.setSyncStatus('error');
        }
    } catch (e) {
        window.setSyncStatus('error');
        window.showToast('에러');
    }
};

window.deleteCategory = async (catValue) => {
    if (!confirm('카테고리를 삭제하시겠습니까?')) return;
    window.setSyncStatus('syncing');
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete_category',
                token: window.googleAuthToken,
                catValue,
            }),
        });
        if ((await res.json()).status === 'success') {
            await loadDailyRecords();
            openCategoryModal();
        } else {
            window.setSyncStatus('error');
        }
    } catch (e) {
        window.setSyncStatus('error');
        window.showToast('에러');
    }
};

// ==========================================
// 💡 카테고리 & 카드 수정(Edit) 로직
// ==========================================
async function sendCategoryAction(payload) {
    const response = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ ...payload, token: window.googleAuthToken }),
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || '카테고리 저장에 실패했습니다.');
    }
    return result;
}

window.submitEditCategory = async (oldValue) => {
    const type = document.getElementById('new-cat-type').value;
    const label = document.getElementById('new-cat-label').value.trim();
    if (!label) return window.showToast('카테고리 이름을 입력해주세요.');

    window.setSyncStatus('syncing');
    showLoader();
    try {
        // 새 항목 저장에 실패해도 기존 항목을 잃지 않도록 추가 후 기존 항목을 지웁니다.
        await sendCategoryAction({ action: 'add_category', catType: type, catLabel: label });
        await sendCategoryAction({ action: 'delete_category', catValue: oldValue });

        await loadDailyRecords();
        openCategoryModal(); // 화면을 초기화하고 수정된 리스트를 다시 보여줌
    } catch (e) {
        window.setSyncStatus('error');
        window.showToast('수정 중 에러가 발생했습니다.');
        hideLoader();
    }
};

window.submitEditCard = async (oldValue) => {
    const label = document.getElementById('new-card-label').value.trim();
    const day = document.getElementById('new-card-day').value.trim();
    if (!label || !day) return window.showToast('정보를 정확히 입력하세요.');

    window.setSyncStatus('syncing');
    showLoader();
    try {
        await sendCategoryAction({
            action: 'add_category',
            catType: `card_${currentCountry}`,
            catLabel: `${label}|${day}`,
        });
        await sendCategoryAction({ action: 'delete_category', catValue: oldValue });

        await loadDailyRecords();
        openCardModal();
    } catch (e) {
        window.setSyncStatus('error');
        window.showToast('수정 중 에러가 발생했습니다.');
        hideLoader();
    }
};
