// ==========================================
// 💰 1. 예적금 관련 화면 렌더링 및 모달
// ==========================================
window.getDepositCalc = (d) => {
    const start = new Date(d.가입일);
    const end = new Date(d.만기일);
    let months =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) months--;
    if (months <= 0) months = 0;

    const principal = Number(d.원금) || 0;
    const rate = Number(d.이율) || 0;
    const preTax = Number(d.세전이자) || 0;
    const postTax = Number(d.세후이자) || 0;

    return { months, preTax, postTax, principal, rate, start, end, year: end.getFullYear() };
};

window.assetSortMode = window.assetSortMode || 'end';
window.setAssetSort = (mode) => {
    window.assetSortMode = mode;
    const btnEnd = document.getElementById('btn-sort-end');
    const btnStart = document.getElementById('btn-sort-start');
    if (btnEnd && btnStart) {
        if (mode === 'end') {
            btnEnd.className =
                'px-2 py-1 text-[10px] font-bold bg-white text-gray-800 rounded-md shadow-sm transition-all';
            btnStart.className =
                'px-2 py-1 text-[10px] font-bold text-gray-400 rounded-md transition-all';
        } else {
            btnStart.className =
                'px-2 py-1 text-[10px] font-bold bg-white text-gray-800 rounded-md shadow-sm transition-all';
            btnEnd.className =
                'px-2 py-1 text-[10px] font-bold text-gray-400 rounded-md transition-all';
        }
    }
    renderAssetsList();
};

window.renderAssetsList = () => {
    const listContainer = document.getElementById('assets-list-container');
    const alertBox = document.getElementById('maturity-alert-container');
    const totalSummary = document.getElementById('assets-total-summary');

    if (!listContainer) return;

    const deposits = window.globalDeposits || [];
    listContainer.innerHTML = '';
    if (alertBox) alertBox.innerHTML = '';

    if (deposits.length === 0) {
        listContainer.innerHTML =
            '<p class="text-center text-gray-400 py-10 text-sm">등록된 예적금이 없습니다.</p>';
        if (totalSummary) totalSummary.innerHTML = '';
        return;
    }

    // 총 예치 원금 및 예상 이자 요약
    let totalPrincipal = 0;
    let totalPostTax = 0;
    deposits.forEach((d) => {
        // 💡 수정됨: '중도해지'뿐만 아니라 '만기' 상태인 항목도 제외하고 오직 운용중인 자산만 합산합니다.
        if (d.상태 !== '중도해지' && d.상태 !== '만기') {
            totalPrincipal += Number(d.원금) || 0;
            totalPostTax += Number(d.세후이자) || 0;
        }
    });

    if (totalSummary) {
        totalSummary.innerHTML = `
            <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md">
                <p class="text-xs font-medium text-emerald-100 mb-1">총 예치 원금</p>
                <p class="text-2xl font-black tracking-tight mb-3">${totalPrincipal.toLocaleString()}원</p>
                <div class="flex justify-between items-center bg-white/20 px-3 py-2 rounded-lg">
                    <span class="text-[11px] font-bold">만기 시 예상 실수령 이자</span>
                    <span class="text-[13px] font-black">+${totalPostTax.toLocaleString()}원</span>
                </div>
            </div>
        `;
    }

    // 💡 정렬 적용: 최신 날짜가 위로 오도록(내림차순) 정렬
    const sorted = [...deposits].sort((a, b) => {
        if (window.assetSortMode === 'end') {
            return new Date(b.만기일).getTime() - new Date(a.만기일).getTime();
        }
        return new Date(b.가입일).getTime() - new Date(a.가입일).getTime();
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 💡 연도별 그룹핑을 위한 변수 추가
    let currentYearGroup = null;

    sorted.forEach((d) => {
        const calc = getDepositCalc(d);
        const isMatured = calc.end <= today && d.상태 !== '중도해지' && d.상태 !== '만기';
        const isCanceled = d.상태 === '중도해지';

        let statusBadge = '';
        let opacityClass = '';

        if (isCanceled) {
            statusBadge = `<span class="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-200">중도해지</span>`;
            opacityClass = 'opacity-60 grayscale-[0.5]';
        } else if (d.상태 === '만기') {
            statusBadge = `<span class="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-300">만기수령</span>`;
            opacityClass = 'opacity-70';
        } else if (isMatured) {
            statusBadge = `<span class="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-amber-200 animate-pulse">만기 도래!</span>`;
        }

        // 💡 1. 대표 연도 추출 및 구분선 삽입 (정렬 기준에 따라 다름)
        const repDate = window.assetSortMode === 'end' ? d.만기일 : d.가입일;
        const itemYear = new Date(repDate).getFullYear();

        // 새로운 연도의 아이템이 나타나면 헤더(구분선)를 추가합니다.
        if (currentYearGroup !== itemYear) {
            const headerText = window.assetSortMode === 'end' ? '만기' : '가입';
            listContainer.insertAdjacentHTML(
                'beforeend',
                `
                <div class="flex items-center gap-3 mt-5 mb-3 px-1">
                    <span class="text-[13px] font-black text-gray-800 bg-gray-100 px-2 py-1 rounded-md tracking-tight">${itemYear}년 ${headerText}</span>
                    <div class="h-px bg-gray-200 flex-1"></div>
                </div>
            `
            );
            currentYearGroup = itemYear; // 현재 렌더링 중인 연도 업데이트
        }

        // 💡 2. 카드 내부에 '가입일'과 '만기일'을 나란히 배치
        listContainer.insertAdjacentHTML(
            'beforeend',
            `
            <div onclick="openDepositModal('${d.ID}')" class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition mb-3 ${opacityClass}">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-[16px]">account_balance</span>
                        </span>
                        <div>
                            <p class="text-xs font-black text-gray-800 flex items-center gap-1.5">${d.은행} <span class="text-[10px] font-medium text-gray-500">${d.종류}</span></p>
                            <div class="flex items-center gap-1 mt-0.5">
                                <span class="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">${d.명의자}</span>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>

                    <div class="text-right shrink-0">
                        <p class="text-[10px] text-gray-400 font-bold mb-1.5">이율 <span class="text-emerald-600">${Number(d.이율).toFixed(2)}%</span></p>
                        <p class="text-[9px] text-gray-400 leading-tight mb-0.5">${d.가입일} 가입</p>
                        <p class="text-[9px] font-bold text-gray-700 leading-tight">${d.만기일} 만기</p>
                    </div>
                </div>
                <div class="bg-gray-50 rounded-lg p-2.5 flex justify-between items-center">
                    <div>
                        <p class="text-[9px] text-gray-400 font-bold mb-0.5">원금</p>
                        <p class="text-sm font-black text-gray-800">${calc.principal.toLocaleString()}원</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[9px] text-gray-400 font-bold mb-0.5">예상 세후 이자</p>
                        <p class="text-sm font-black text-emerald-600 tracking-tighter">+${calc.postTax.toLocaleString()}원</p>
                    </div>
                </div>
            </div>
        `
        );
    });
};

window.openDepositModal = (id = null) => {
    const modal = document.getElementById('deposit-modal');
    const form = document.getElementById('deposit-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('dep-delete-btn').classList.add('hidden');
    document.getElementById('deposit-modal-title').innerText = '예적금 추가';

    // 💡 수정된 렌더링 함수: window. 제거 및 스마트 명의자 추출 추가
    const safeRenderSelect = (elId, type, placeholder) => {
        const el = document.getElementById(elId);
        if (!el) return;

        const orderKey = 'assetOrder_' + type;
        const savedOrder = JSON.parse(localStorage.getItem(orderKey)) || [];

        // 1. 설정에서 등록한 카테고리 불러오기
        let baseCategories = [];
        if (typeof globalCategories !== 'undefined') {
            baseCategories = globalCategories.filter((c) => c.Type === type);
        }

        // 2. 명의자 자동 추출 기능 (예적금/배당금 내역에서 이름을 긁어옵니다)
        if (type === 'asset_owner') {
            const existingOwners = new Set();
            if (typeof window.globalDeposits !== 'undefined') {
                window.globalDeposits.forEach((d) => {
                    if (d.명의자) existingOwners.add(d.명의자);
                });
            }
            if (typeof window.globalDividends !== 'undefined') {
                window.globalDividends.forEach((d) => {
                    if (d.Owner) existingOwners.add(d.Owner);
                });
            }
            existingOwners.forEach((owner) => {
                if (!baseCategories.find((c) => c.Label === owner)) {
                    baseCategories.push({ Type: 'asset_owner', Value: owner, Label: owner });
                }
            });
        }

        const options = baseCategories.sort((a, b) => {
            const idxA = savedOrder.indexOf(a.Value);
            const idxB = savedOrder.indexOf(b.Value);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.Label.localeCompare(b.Label);
        });

        el.innerHTML = `<option value="">${placeholder}</option>`;
        options.forEach((c) =>
            el.insertAdjacentHTML('beforeend', `<option value="${c.Label}">${c.Label}</option>`)
        );
    };

    safeRenderSelect('dep-input-bank', 'asset_bank', '은행 선택');
    safeRenderSelect('dep-input-owner', 'asset_owner', '명의자 선택');
    safeRenderSelect('dep-input-type', 'asset_type', '종류 선택');
    safeRenderSelect('dep-input-tax', 'asset_tax', '과세 기준 선택');

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    document.getElementById('dep-input-start').value = dateStr;
    const nextYear = new Date(today.setFullYear(today.getFullYear() + 1));
    const nextYearStr = `${nextYear.getFullYear()}-${String(nextYear.getMonth() + 1).padStart(2, '0')}-${String(nextYear.getDate()).padStart(2, '0')}`;
    document.getElementById('dep-input-end').value = nextYearStr;

    if (id) {
        const d = (window.globalDeposits || []).find((item) => item.ID === id);
        if (d) {
            document.getElementById('deposit-modal-title').innerText = '예적금 수정';
            document.getElementById('dep-input-id').value = d.ID;
            document.getElementById('dep-input-bank').value = d.은행;
            document.getElementById('dep-input-owner').value = d.명의자;
            document.getElementById('dep-input-start').value = d.가입일;
            document.getElementById('dep-input-end').value = d.만기일;
            document.getElementById('dep-input-type').value = d.종류;
            document.getElementById('dep-input-rate').value = d.이율;
            document.getElementById('dep-input-tax').value = d.과세여부;
            document.getElementById('dep-input-principal').value = Number(
                d.원금 || 0
            ).toLocaleString('ko-KR');
            document.getElementById('dep-input-pretax').value = Number(
                d.세전이자 || 0
            ).toLocaleString('ko-KR');
            document.getElementById('dep-input-posttax').value = Number(
                d.세후이자 || 0
            ).toLocaleString('ko-KR');
            document.getElementById('dep-input-status').value = d.상태 || '';
            document.getElementById('dep-delete-btn').classList.remove('hidden');
        }
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        const content = document.getElementById('deposit-modal-content');
        if (content) content.classList.remove('translate-y-full');
    }, 50);
};

window.closeDepositModal = () => {
    const modal = document.getElementById('deposit-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    const content = document.getElementById('deposit-modal-content');
    if (content) content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

// ==========================================
// 🚀 2. 예적금 관련 서버 통신 (보안 토큰 적용)
// ==========================================
window.saveDeposit = () => {
    const id = document.getElementById('dep-input-id').value;
    const payload = {
        action: id ? 'update_deposit' : 'create_deposit',
        token: window.googleAuthToken, // 👈 🛡️ 보안 마패 추가
        id: id || 'dep_' + Date.now(),
        startDate: document.getElementById('dep-input-start').value,
        endDate: document.getElementById('dep-input-end').value,
        depType: document.getElementById('dep-input-type').value,
        principal: document.getElementById('dep-input-principal').value.replace(/,/g, ''),
        rate: document.getElementById('dep-input-rate').value,
        taxType: document.getElementById('dep-input-tax').value,
        preTax: document.getElementById('dep-input-pretax').value.replace(/,/g, ''),
        postTax: document.getElementById('dep-input-posttax').value.replace(/,/g, ''),
        owner: document.getElementById('dep-input-owner').value,
        bank: document.getElementById('dep-input-bank').value,
        status: document.getElementById('dep-input-status').value,
    };

    if (
        !payload.startDate ||
        !payload.endDate ||
        !payload.principal ||
        !payload.bank ||
        !payload.owner
    ) {
        return alert('필수 항목을 모두 입력해 주세요.');
    }

    closeDepositModal();

    const optimisticData = {
        ID: payload.id,
        가입일: payload.startDate,
        만기일: payload.endDate,
        종류: payload.depType,
        원금: payload.principal,
        이율: payload.rate,
        과세여부: payload.taxType,
        세전이자: payload.preTax,
        세후이자: payload.postTax,
        명의자: payload.owner,
        은행: payload.bank,
        상태: payload.status,
    };

    const idx = window.globalDeposits.findIndex((d) => d.ID === payload.id);
    if (idx > -1) window.globalDeposits[idx] = optimisticData;
    else window.globalDeposits.push(optimisticData);

    renderAssetsList();

    fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === 'success') loadDailyRecords(true);
        })
        .catch(() => loadDailyRecords(true));
};

window.deleteDeposit = () => {
    if (!confirm('이 상품을 삭제하시겠습니까?')) return;
    const id = document.getElementById('dep-input-id').value;
    closeDepositModal();

    window.globalDeposits = window.globalDeposits.filter((d) => d.ID !== id);
    renderAssetsList();

    fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_deposit', token: window.googleAuthToken, id: id }),
    }).then(() => loadDailyRecords(true));
};

// ==========================================
// 📊 3. 배당금(Dividends) 탭 화면 및 통신
// ==========================================
window.renderDividendsList = () => {
    const summaryContainer = document.getElementById('dividends-summary-container');
    const listContainer = document.getElementById('dividends-list-container');
    const yearSelect = document.getElementById('dividend-year-select');
    if (!summaryContainer || !listContainer || !yearSelect) return;

    const years = [
        ...new Set(window.globalDividends.map((d) => new Date(d.Date).getFullYear())),
    ].sort((a, b) => b - a);
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) years.unshift(currentYear);
    const selectedYear = parseInt(yearSelect.value) || currentYear;
    yearSelect.innerHTML = years
        .map((y) => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}년</option>`)
        .join('');

    const yearData = window.globalDividends.filter(
        (d) => d.Date && new Date(d.Date).getFullYear() === selectedYear
    );

    const ownerTotals = {};
    yearData.forEach((d) => {
        const owner = d.Owner || '미상';
        if (!ownerTotals[owner]) ownerTotals[owner] = { pre: 0, net: 0 };
        ownerTotals[owner].pre += Number(d.Gross) || 0;
        ownerTotals[owner].net += Number(d.Net) || 0;
    });

    summaryContainer.innerHTML = '';
    for (const [owner, totals] of Object.entries(ownerTotals)) {
        summaryContainer.insertAdjacentHTML(
            'beforeend',
            `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-2">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-bold text-gray-800 flex items-center gap-1"><span class="material-symbols-outlined text-[16px] text-gray-400">person</span>${owner}</span>
                    <span class="text-xs font-black text-indigo-600">+${totals.pre.toLocaleString()}원</span>
                </div>
                <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-50 text-[10px]">
                    <span class="text-gray-400 font-medium">세후 실수령액</span>
                    <span class="font-black text-gray-800">+${totals.net.toLocaleString()}원</span>
                </div>
            </div>
        `
        );
    }

    listContainer.innerHTML = '';
    yearData.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    yearData.forEach((d) => {
        listContainer.insertAdjacentHTML(
            'beforeend',
            `
            <div onclick="openDividendModal('${d.ID}')" class="bg-white px-3 py-2.5 rounded-xl border border-gray-100 flex justify-between items-center cursor-pointer mb-2 active:scale-[0.99] transition">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-1">
                        <span class="text-sm font-black text-gray-800 truncate">${d.Stock}</span>
                        <span class="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">${d.Owner}</span>
                    </div>
                    <div class="text-[10px] text-gray-400 font-medium">${d.Date} • ${d.Broker}</div>
                </div>
                <div class="text-right shrink-0 ml-3">
                    <p class="text-[10px] text-gray-500 font-bold mb-0.5">세전 +${Number(d.Gross).toLocaleString()}원</p>
                    <p class="text-sm font-black text-indigo-600 leading-none">세후 +${Number(d.Net).toLocaleString()}원</p>
                </div>
            </div>
        `
        );
    });
};

window.openDividendModal = (id = null) => {
    const modal = document.getElementById('dividend-modal');
    const form = document.getElementById('dividend-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('div-delete-btn').classList.add('hidden');
    document.getElementById('dividend-modal-title').innerText = '배당금 추가';

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    document.getElementById('div-input-date').value = dateStr;

    const safeRenderSelect = (elId, type, placeholder) => {
        const el = document.getElementById(elId);
        if (!el) return;

        const orderKey = 'assetOrder_' + type;
        const savedOrder = JSON.parse(localStorage.getItem(orderKey)) || [];

        let baseCategories = [];
        if (typeof globalCategories !== 'undefined') {
            baseCategories = globalCategories.filter((c) => c.Type === type);
        }

        // 명의자 자동 추출
        if (type === 'asset_owner') {
            const existingOwners = new Set();
            if (typeof window.globalDeposits !== 'undefined') {
                window.globalDeposits.forEach((d) => {
                    if (d.명의자) existingOwners.add(d.명의자);
                });
            }
            if (typeof window.globalDividends !== 'undefined') {
                window.globalDividends.forEach((d) => {
                    if (d.Owner) existingOwners.add(d.Owner);
                });
            }
            existingOwners.forEach((owner) => {
                if (!baseCategories.find((c) => c.Label === owner)) {
                    baseCategories.push({ Type: 'asset_owner', Value: owner, Label: owner });
                }
            });
        }

        const options = baseCategories.sort((a, b) => {
            const idxA = savedOrder.indexOf(a.Value);
            const idxB = savedOrder.indexOf(b.Value);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.Label.localeCompare(b.Label);
        });

        el.innerHTML = `<option value="">${placeholder}</option>`;
        options.forEach((c) =>
            el.insertAdjacentHTML('beforeend', `<option value="${c.Label}">${c.Label}</option>`)
        );
    };

    safeRenderSelect('div-input-owner', 'asset_owner', '명의자 선택');
    safeRenderSelect('div-input-broker', 'asset_broker', '증권사 선택 (설정에서 추가)');

    if (id) {
        const d = (window.globalDividends || []).find((item) => item.ID === id);
        if (d) {
            document.getElementById('dividend-modal-title').innerText = '배당금 수정';
            document.getElementById('div-input-id').value = d.ID;
            document.getElementById('div-input-date').value = d.Date;
            document.getElementById('div-input-stock').value = d.Stock;
            if (d.Owner) document.getElementById('div-input-owner').value = d.Owner;
            if (d.Broker) document.getElementById('div-input-broker').value = d.Broker;
            document.getElementById('div-input-pretax').value = Number(d.Gross || 0).toLocaleString(
                'ko-KR'
            );
            document.getElementById('div-input-posttax').value = Number(d.Net || 0).toLocaleString(
                'ko-KR'
            );
            document.getElementById('div-delete-btn').classList.remove('hidden');
        }
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        const content = document.getElementById('dividend-modal-content');
        if (content) content.classList.remove('translate-y-full');
    }, 50);
};

window.closeDividendModal = () => {
    const modal = document.getElementById('dividend-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    const content = document.getElementById('dividend-modal-content');
    if (content) content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.saveDividend = () => {
    const idInput = document.getElementById('div-input-id').value;
    const payload = {
        action: idInput ? 'update_dividend' : 'create_dividend',
        token: window.googleAuthToken, // 👈 🛡️ 보안 마패 추가
        id: idInput || 'div_' + Date.now(),
        date: document.getElementById('div-input-date').value,
        stock: document.getElementById('div-input-stock').value,
        broker: document.getElementById('div-input-broker').value,
        owner: document.getElementById('div-input-owner').value,
        gross: document.getElementById('div-input-pretax').value.replace(/,/g, ''),
        net: document.getElementById('div-input-posttax').value.replace(/,/g, ''),
    };

    if (!payload.date || !payload.stock || !payload.broker || !payload.owner)
        return alert('모두 입력해 주세요.');

    closeDividendModal();

    const optimisticData = {
        ID: payload.id,
        Date: payload.date,
        Stock: payload.stock,
        Broker: payload.broker,
        Owner: payload.owner,
        Gross: payload.gross,
        Net: payload.net,
    };

    const idx = window.globalDividends.findIndex((d) => d.ID === payload.id);
    if (idx > -1) window.globalDividends[idx] = optimisticData;
    else window.globalDividends.push(optimisticData);

    renderDividendsList();

    fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) }).then(() =>
        loadDailyRecords(true)
    );
};

window.deleteDividend = () => {
    if (!confirm('삭제하시겠습니까?')) return;
    const id = document.getElementById('div-input-id').value;
    closeDividendModal();

    window.globalDividends = window.globalDividends.filter((d) => d.ID !== id);
    renderDividendsList();

    fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_dividend', token: window.googleAuthToken, id: id }),
    }).then(() => loadDailyRecords(true));
};

// ==========================================
// 📈 4. 통합 금융소득 통계 (2x2 그리드 & 클릭 상세)
// ==========================================
window.renderCombinedAssetsStats = () => {
    const limitContainer = document.getElementById('combined-owner-limit-container');
    const yearSelect = document.getElementById('combined-stats-year-select');
    if (!limitContainer || !yearSelect) return;

    // 💡 1. 누락되었던 연도 추출 및 드롭다운 생성 로직 복구
    const allYears = new Set();
    (window.globalDeposits || []).forEach((d) => {
        if (d.상태 !== '중도해지' && d.만기일) allYears.add(new Date(d.만기일).getFullYear());
    });
    (window.globalDividends || []).forEach((d) => {
        if (d.Date) allYears.add(new Date(d.Date).getFullYear());
    });

    const years = [...allYears].sort((a, b) => b - a);
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) years.unshift(currentYear);

    // 현재 선택된 연도 파악 후 옵션 렌더링
    const selectedYear = parseInt(yearSelect.value) || currentYear;
    yearSelect.innerHTML = years
        .map((y) => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}년</option>`)
        .join('');

    // 💡 2. 2x2 그리드 설정 및 한도 변수
    limitContainer.className = 'grid grid-cols-2 gap-3 mb-6';
    const TAX_LIMIT = 20000000;

    // 💡 3. 데이터 합산 로직
    const combinedStats = {};
    (window.globalDeposits || []).forEach((d) => {
        if (new Date(d.만기일).getFullYear() === selectedYear && d.상태 !== '중도해지') {
            const owner = d.명의자 || '미상';
            if (!combinedStats[owner]) combinedStats[owner] = { deposit: 0, dividend: 0 };
            combinedStats[owner].deposit += Number(d.세전이자) || 0;
        }
    });
    (window.globalDividends || []).forEach((d) => {
        if (new Date(d.Date).getFullYear() === selectedYear) {
            const owner = d.Owner || '미상';
            if (!combinedStats[owner]) combinedStats[owner] = { deposit: 0, dividend: 0 };
            combinedStats[owner].dividend += Number(d.Gross) || 0;
        }
    });

    // 💡 4. 금액 높은 순서대로 정렬
    const sortedOwners = Object.keys(combinedStats).sort((a, b) => {
        return (
            combinedStats[b].deposit +
            combinedStats[b].dividend -
            (combinedStats[a].deposit + combinedStats[a].dividend)
        );
    });

    limitContainer.innerHTML = '';

    if (sortedOwners.length === 0) {
        limitContainer.className = 'mb-6';
        limitContainer.innerHTML = `<p class="text-center py-10 text-gray-400 text-sm">해당 연도의 데이터가 없습니다.</p>`;
    } else {
        sortedOwners.forEach((owner) => {
            const stat = combinedStats[owner];
            const total = stat.deposit + stat.dividend;
            const percent = Math.min((total / TAX_LIMIT) * 100, 100).toFixed(1);
            const isWarning = percent >= 80;

            limitContainer.insertAdjacentHTML(
                'beforeend',
                `
                <div onclick="openCombinedOwnerDetail('${owner}', ${selectedYear})" class="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 relative cursor-pointer active:scale-[0.98] transition hover:bg-gray-50">
                    ${isWarning ? `<div class="absolute top-0 right-0 w-7 h-7 bg-red-50 text-red-500 rounded-bl-xl flex items-center justify-center shadow-sm"><span class="material-symbols-outlined text-[14px] font-black">priority_high</span></div>` : ''}
                    <div class="flex items-center gap-1 mb-1.5">
                        <span class="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-gray-400 text-[11px]">person</span>
                        </span>
                        <span class="font-black text-gray-800 text-[11px] truncate pr-4">${owner}</span>
                    </div>
                    <div class="mb-2">
                        <p class="text-[14px] font-black ${isWarning ? 'text-red-500' : 'text-emerald-500'} tracking-tighter leading-none">
                            ${total.toLocaleString()}<span class="text-[9px] font-bold text-gray-400 ml-0.5">원</span>
                        </p>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5 mb-1 overflow-hidden">
                        <div class="${isWarning ? 'bg-red-500' : 'bg-emerald-500'} h-full transition-all duration-700" style="width: ${percent}%"></div>
                    </div>
                    <div class="flex justify-between text-[8.5px] font-bold text-gray-400 mb-2.5">
                        <span>${percent}%</span><span>2천만</span>
                    </div>
                    <div class="space-y-1">
                        <div class="flex justify-between items-center bg-gray-50 px-1.5 py-1 rounded-md">
                            <span class="text-[9px] text-gray-500 font-bold">예적금</span>
                            <span class="text-[9px] font-black text-gray-700 tracking-tighter">+${stat.deposit.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between items-center bg-gray-50 px-1.5 py-1 rounded-md">
                            <span class="text-[9px] text-gray-500 font-bold">배당금</span>
                            <span class="text-[9px] font-black text-indigo-500 tracking-tighter">+${stat.dividend.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `
            );
        });
    }

    if (typeof updateCombinedAssetChart === 'function') updateCombinedAssetChart();
};

window.openCombinedOwnerDetail = (owner, year) => {
    const modal = document.getElementById('combined-owner-detail-modal');
    const title = document.getElementById('combined-owner-detail-title');
    const subtitle = document.getElementById('combined-owner-detail-subtitle');
    const container = document.getElementById('combined-owner-detail-list-container');
    if (!modal || !container) return;

    title.innerText = `${owner} 님의 금융소득`;
    subtitle.innerText = `${year}년 상세 내역`;
    container.innerHTML = '';

    const deposits = (window.globalDeposits || [])
        .filter(
            (d) =>
                d.명의자 === owner &&
                d.상태 !== '중도해지' &&
                new Date(d.만기일).getFullYear() === year
        )
        .map((d) => ({
            id: d.ID,
            type: 'deposit',
            date: d.만기일,
            title: d.은행,
            subtitle: d.종류,
            amount: Number(d.세전이자) || 0,
            amountNet: Number(d.세후이자) || 0,
            badge: '예적금 이자',
            badgeColor: 'text-gray-600 bg-gray-100 border-gray-200',
        }));

    const dividends = (window.globalDividends || [])
        .filter((d) => d.Owner === owner && new Date(d.Date).getFullYear() === year)
        .map((d) => ({
            id: d.ID,
            type: 'dividend',
            date: d.Date,
            title: d.Stock,
            subtitle: d.Broker,
            amount: Number(d.Gross) || 0,
            amountNet: Number(d.Net) || 0,
            badge: '배당금 수익',
            badgeColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        }));

    const combinedList = [...deposits, ...dividends].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    if (combinedList.length === 0) {
        container.innerHTML =
            '<p class="text-center text-gray-400 py-10 text-sm">상세 내역이 없습니다.</p>';
    } else {
        combinedList.forEach((item) => {
            const clickAction =
                item.type === 'deposit'
                    ? `openDepositModal('${item.id}')`
                    : `openDividendModal('${item.id}')`;
            container.insertAdjacentHTML(
                'beforeend',
                `
                <div onclick="${clickAction}" class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-2 transition active:scale-[0.99] cursor-pointer hover:bg-gray-100">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-black text-gray-800">${item.title}</span>
                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.badgeColor}">${item.badge}</span>
                    </div>
                    <div class="flex justify-between items-end">
                        <div class="text-xs text-gray-500">
                            <span class="material-symbols-outlined text-[11px] align-middle mr-0.5">calendar_today</span>${item.date}
                            <p class="mt-1 font-medium pl-4">${item.subtitle}</p>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="text-[10px] text-gray-500 font-bold">세전 +${item.amount.toLocaleString('ko-KR')}원</p>
                            <p class="text-[14px] font-black text-indigo-600 mt-0.5 tracking-tighter">세후 +${item.amountNet.toLocaleString('ko-KR')}원</p>
                        </div>
                    </div>
                </div>
            `
            );
        });
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document
            .getElementById('combined-owner-detail-modal-content')
            .classList.remove('translate-y-full');
    }, 10);
};

window.closeCombinedOwnerDetail = () => {
    const modal = document.getElementById('combined-owner-detail-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    document
        .getElementById('combined-owner-detail-modal-content')
        .classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

// ==========================================
// 📊 5. 통합 금융소득 차트
// ==========================================
window.combinedChartInstance = null;

window.updateCombinedAssetChart = () => {
    const ctx = document.getElementById('combinedAssetChart');
    if (!ctx) return;

    const summary = {};
    (window.globalDeposits || []).forEach((d) => {
        if (d.상태 === '중도해지') return;
        const year = new Date(d.만기일).getFullYear();
        const owner = d.명의자 || '미상';
        if (!summary[year]) summary[year] = {};
        if (!summary[year][owner]) summary[year][owner] = 0;
        summary[year][owner] += Number(d.세전이자) || 0;
    });

    (window.globalDividends || []).forEach((d) => {
        const year = new Date(d.Date).getFullYear();
        const owner = d.Owner || '미상';
        if (!summary[year]) summary[year] = {};
        if (!summary[year][owner]) summary[year][owner] = 0;
        summary[year][owner] += Number(d.Gross) || 0;
    });

    const years = Object.keys(summary).sort();
    const owners = [...new Set(years.flatMap((y) => Object.keys(summary[y])))].sort();

    const colorPalette = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b'];

    const datasets = owners.map((owner, idx) => ({
        label: owner,
        data: years.map((year) => summary[year][owner] || 0),
        backgroundColor: colorPalette[idx % colorPalette.length],
        borderRadius: 4,
    }));

    if (window.combinedChartInstance) window.combinedChartInstance.destroy();

    window.combinedChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: years, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: {
                    stacked: true,
                    border: { display: false },
                    ticks: { callback: (v) => (v / 10000).toLocaleString() + '만' },
                },
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        font: { size: 10, family: "'Pretendard', sans-serif" },
                    },
                },
            },
        },
    });
};
