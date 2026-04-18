// ==========================================
// 💰 예적금(자산) 탭 전용 렌더링 및 기능 (assets.js)
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

window.currentOwnerStatTab = null;
window.setOwnerStatTab = (owner) => {
    window.currentOwnerStatTab = owner;
    if (typeof renderAssetsList === 'function') renderAssetsList();
};

window.renderAssetsList = () => {
    const listContainer = document.getElementById('assets-list-container');
    const dashboard = document.getElementById('assets-stats-summary-dashboard');
    const alertBox = document.getElementById('maturity-alert-container');
    const totalSummaryBox = document.getElementById('assets-total-summary');
    const ownerSummaryBox = document.getElementById('assets-stats-owner-summary');

    if (!listContainer || !dashboard || !ownerSummaryBox) return;

    listContainer.innerHTML = '';
    dashboard.innerHTML = '';
    alertBox.innerHTML = '';
    if (totalSummaryBox) totalSummaryBox.innerHTML = '';
    ownerSummaryBox.innerHTML = '';

    if (!window.globalDeposits || window.globalDeposits.length === 0) {
        listContainer.innerHTML =
            '<p class="text-center text-gray-400 py-10 text-sm">등록된 예적금이 없습니다.</p>';
        dashboard.innerHTML = '<p class="text-center text-gray-400 text-xs">데이터가 없습니다.</p>';
        return;
    }

    const yearlyStats = {};
    const ownerDetails = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let maturedCount = 0,
        soonCount = 0,
        totalP = 0,
        totalI = 0;

    window.globalDeposits.forEach((d) => {
        const calc = getDepositCalc(d);
        const owner = d.명의자 || '미상';
        const mYear = calc.year;

        if (!yearlyStats[mYear]) yearlyStats[mYear] = {};
        if (!yearlyStats[mYear][owner]) yearlyStats[mYear][owner] = 0;
        yearlyStats[mYear][owner] += calc.preTax;

        if (d.상태 !== '만기' && d.상태 !== '중도해지') {
            const diffDays = Math.round(
                (calc.end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (diffDays <= 0) maturedCount++;
            else if (diffDays > 0 && diffDays <= 3) soonCount++;

            totalP += calc.principal;
            totalI += calc.postTax;

            if (!ownerDetails[owner])
                ownerDetails[owner] = { principal: 0, postTax: 0, yearlyPre: {} };
            ownerDetails[owner].principal += calc.principal;
            ownerDetails[owner].postTax += calc.postTax;
            if (!ownerDetails[owner].yearlyPre[mYear]) ownerDetails[owner].yearlyPre[mYear] = 0;
            ownerDetails[owner].yearlyPre[mYear] += calc.preTax;
        }
    });

    if (totalSummaryBox && totalP > 0) {
        const totalEstimated = totalP + totalI;
        totalSummaryBox.innerHTML = `
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm active:scale-[0.99] transition-transform">
                <p class="text-emerald-700 text-xs font-bold mb-1.5 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">account_balance</span>총 예상 수령액 (원금+세후이자)
                </p>
                <p class="text-3xl font-black text-slate-900 mb-4 tracking-tight">${totalEstimated.toLocaleString('ko-KR')}원</p>
                <div class="flex justify-between text-[11px] bg-white/60 border border-emerald-100 rounded-xl p-3">
                    <div class="flex flex-col gap-0.5">
                        <span class="text-emerald-600/70 font-medium">총 납입원금</span>
                        <span class="font-bold text-slate-700">${totalP.toLocaleString('ko-KR')}원</span>
                    </div>
                    <div class="flex flex-col gap-0.5 text-right">
                        <span class="text-emerald-600/70 font-medium">총 세후이자</span>
                        <span class="font-bold text-emerald-600">+${totalI.toLocaleString('ko-KR')}원</span>
                    </div>
                </div>
            </div>
        `;
    }

    const sortedOwners = Object.entries(ownerDetails).sort(
        (a, b) => b[1].principal + b[1].postTax - (a[1].principal + a[1].postTax)
    );

    if (sortedOwners.length === 0) {
        ownerSummaryBox.innerHTML =
            '<p class="text-xs text-gray-400 text-center py-4 font-medium w-full">운용중인 자산이 없습니다.</p>';
    } else {
        if (!window.currentOwnerStatTab || !ownerDetails[window.currentOwnerStatTab]) {
            window.currentOwnerStatTab = sortedOwners[0][0];
        }

        let tabsHtml = `<div class="flex bg-gray-100 rounded-lg p-1 mb-3">`;
        sortedOwners.forEach(([owner, _]) => {
            const isActive = window.currentOwnerStatTab === owner;
            const activeClass = isActive
                ? 'bg-white text-gray-800 shadow-sm font-bold'
                : 'text-gray-400 hover:text-gray-600 font-medium';
            tabsHtml += `<button onclick="setOwnerStatTab('${owner}')" class="flex-1 py-1.5 text-[11px] rounded-md transition-all ${activeClass}">${owner}</button>`;
        });
        tabsHtml += `</div>`;

        const selectedData = ownerDetails[window.currentOwnerStatTab];
        const allYearsInStats = Object.keys(yearlyStats).map(Number);
        const maxYear =
            allYearsInStats.length > 0 ? Math.max(...allYearsInStats) : new Date().getFullYear();
        const fixedYears = [maxYear, maxYear - 1, maxYear - 2];

        let yearlyHtml = '';
        fixedYears.forEach((y) => {
            const amt = selectedData.yearlyPre[y] || 0;
            const amtText = amt > 0 ? `+${amt.toLocaleString('ko-KR')}` : '0';
            const textColor = amt > 0 ? 'text-indigo-500' : 'text-gray-300 font-normal';

            yearlyHtml += `
                <div class="flex justify-between items-center text-[10px] mt-1">
                    <span class="text-gray-400">${y}년 만기 세전</span>
                    <span class="font-bold ${textColor}">${amtText}원</span>
                </div>`;
        });

        const contentHtml = `
            <div onclick="openOwnerAssetDetail('${window.currentOwnerStatTab}')" class="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition">
                <div class="flex justify-between items-start mb-3 border-b border-gray-200 pb-2">
                    <span class="text-xs font-black text-gray-600 flex items-center gap-1">${window.currentOwnerStatTab} <span class="material-symbols-outlined text-[12px] text-gray-400">arrow_forward_ios</span></span>
                    <span class="text-[14px] font-black text-slate-800">${(selectedData.principal + selectedData.postTax).toLocaleString('ko-KR')}원</span>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-2">
                    <div class="text-[10px] text-gray-400">원금: ${selectedData.principal.toLocaleString('ko-KR')}원</div>
                    <div class="text-[10px] text-indigo-400 text-right font-bold">이자: +${selectedData.postTax.toLocaleString('ko-KR')}원</div>
                </div>
                <div class="bg-white/50 rounded-lg p-2 mt-2">${yearlyHtml}</div>
            </div>
        `;

        ownerSummaryBox.innerHTML = tabsHtml + contentHtml;
    }

    let alertsHtml = '';
    if (window.currentAssetFilter !== 'all') {
        const filterTitle =
            window.currentAssetFilter === 'matured' ? '만기 도래 상품' : '만기 임박 상품';
        alertsHtml += `
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-indigo-500 text-lg">filter_list</span>
                    <p class="text-xs font-bold text-indigo-700">${filterTitle} 모아보기 중</p>
                </div>
                <button onclick="setAssetFilter('all')" class="text-[10px] bg-white border border-indigo-200 px-2 py-1 rounded text-indigo-600 font-bold active:bg-indigo-100 transition shadow-sm">필터 해제</button>
            </div>
        `;
    } else {
        if (maturedCount > 0) {
            alertsHtml += `<div onclick="setAssetFilter('matured')" class="cursor-pointer bg-red-50 border border-red-200 rounded-xl p-3 mb-2 flex items-center justify-between shadow-sm animate-pulse hover:bg-red-100 transition"><div class="flex items-center gap-2"><span class="material-symbols-outlined text-red-500 text-lg">notifications_active</span><p class="text-xs font-bold text-red-700">만기된 상품이 <span class="text-lg">${maturedCount}</span>건 있습니다!</p></div><span class="material-symbols-outlined text-red-400">chevron_right</span></div>`;
        }
        if (soonCount > 0) {
            alertsHtml += `<div onclick="setAssetFilter('soon')" class="cursor-pointer bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm hover:bg-amber-100 transition"><div class="flex items-center gap-2"><span class="material-symbols-outlined text-amber-500 text-lg">schedule</span><p class="text-xs font-bold text-amber-700">3일 내 만기 임박 상품이 <span class="text-lg">${soonCount}</span>건 있습니다.</p></div><span class="material-symbols-outlined text-amber-400">chevron_right</span></div>`;
        }
    }
    alertBox.innerHTML = alertsHtml;

    let depositsToRender = [...window.globalDeposits];
    if (window.currentAssetFilter === 'matured') {
        depositsToRender = depositsToRender.filter((d) => {
            const end = new Date(d.만기일);
            end.setHours(0, 0, 0, 0);
            return (
                d.상태 !== '만기' &&
                d.상태 !== '중도해지' &&
                Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 0
            );
        });
    } else if (window.currentAssetFilter === 'soon') {
        depositsToRender = depositsToRender.filter((d) => {
            const end = new Date(d.만기일);
            end.setHours(0, 0, 0, 0);
            const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return d.상태 !== '만기' && d.상태 !== '중도해지' && diffDays > 0 && diffDays <= 3;
        });
    }

    if (window.currentAssetSort === 'end') {
        depositsToRender.sort((a, b) => new Date(b.만기일) - new Date(a.만기일));
    } else {
        depositsToRender.sort((a, b) => new Date(b.가입일) - new Date(a.가입일));
    }

    let lastYear = null;
    depositsToRender.forEach((d) => {
        const calc = getDepositCalc(d);
        const displayYear =
            window.currentAssetSort === 'end'
                ? new Date(d.만기일).getFullYear()
                : new Date(d.가입일).getFullYear();

        if (lastYear !== displayYear) {
            lastYear = displayYear;
            listContainer.insertAdjacentHTML(
                'beforeend',
                `
                <div class="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-2 px-1 mt-4 first:mt-0">
                    <span class="text-sm font-black text-primary flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">calendar_today</span>${displayYear}년
                    </span>
                </div>
            `
            );
        }

        const isMatured = d.상태 === '만기';
        const isCanceled = d.상태 === '중도해지';
        const cardOpacity = isMatured || isCanceled ? 'opacity-60 grayscale-[50%]' : '';
        let badge = `<span class="bg-green-100 text-green-600 px-1.5 py-0.5 rounded text-[10px] font-black">운용중</span>`;
        if (isMatured)
            badge = `<span class="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-black">만기완료</span>`;
        if (isCanceled)
            badge = `<span class="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-black">중도해지</span>`;

        listContainer.insertAdjacentHTML(
            'beforeend',
            `
            <div onclick="openDepositModal('${d.ID}')" class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2.5 cursor-pointer active:scale-[0.99] transition ${cardOpacity}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-1.5">
                        <span class="text-sm font-black text-gray-800">${d.은행}</span>
                        <span class="text-[11px] text-gray-500 font-medium px-1.5 py-0.5 bg-gray-50 rounded">${d.종류}</span>
                    </div>
                    ${badge}
                </div>
                <div class="flex justify-between items-end">
                    <div class="flex flex-col items-start gap-1">
                        <div class="flex items-center gap-1.5 mb-0.5">
                            <span class="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">${d.명의자}</span>
                            <span class="text-[11px] text-gray-500 font-medium">${calc.months}개월 • 이율 ${Number(d.이율).toFixed(2)}%</span>
                        </div>
                        <p class="text-base font-black text-gray-900">${Number(d.원금).toLocaleString('ko-KR')}원</p>
                    </div>
                    <div class="text-right">
                        <div class="flex items-center justify-end gap-1.5 mb-1">
                            <span class="text-[10px] text-gray-500 font-medium">세전이자</span>
                            <span class="text-xs font-bold text-gray-600">+${Number(d.세전이자 || 0).toLocaleString('ko-KR')}원</span>
                        </div>
                        <div class="flex items-center justify-end gap-1.5">
                            <span class="text-xs text-indigo-500 font-bold">세후이자</span>
                            <span class="text-[15px] font-black text-indigo-600">+${Number(d.세후이자 || 0).toLocaleString('ko-KR')}원</span>
                        </div>
                    </div>
                </div>
                <div class="text-xs text-gray-400 flex items-center justify-between border-t border-gray-50 pt-2 mt-1">
                    <div class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">event</span>${d.가입일} ~ ${d.만기일}
                    </div>
                    <span class="text-[10px] font-medium text-gray-400 px-1 border border-gray-100 rounded">${d.과세여부 || '과세'}</span>
                </div>
            </div>
        `
        );
    });

    const sortedYears = Object.keys(yearlyStats).sort((a, b) => b - a);
    sortedYears.forEach((year, index) => {
        let rowsHtml = '';
        let total = 0;
        const sortedOwners = Object.entries(yearlyStats[year]).sort((a, b) => b[1] - a[1]);

        for (const [owner, amount] of sortedOwners) {
            total += amount;
            rowsHtml += `
                <div class="flex justify-between items-center py-1.5">
                    <span class="text-sm font-bold text-gray-600">${owner}</span>
                    <span class="text-sm font-bold text-indigo-500">+${amount.toLocaleString('ko-KR')}원</span>
                </div>
            `;
        }

        const isHidden = index === 0 ? '' : 'hidden';
        const isRotated = index === 0 ? 'rotate-180' : '';

        dashboard.insertAdjacentHTML(
            'beforeend',
            `
            <div class="pt-2 pb-2 border-b border-gray-100 last:border-0">
                <button onclick="document.getElementById('acc-${year}').classList.toggle('hidden'); document.getElementById('icon-${year}').classList.toggle('rotate-180');" class="w-full flex justify-between items-center focus:outline-none py-1 active:opacity-70 transition">
                    <span class="text-sm font-black text-gray-800">${year}년 만기</span>
                    <div class="flex items-center gap-1">
                        <span class="text-[11px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">총합계: ${total.toLocaleString('ko-KR')}원</span>
                        <span id="icon-${year}" class="material-symbols-outlined text-gray-400 text-[18px] transition-transform duration-200 ${isRotated}">expand_more</span>
                    </div>
                </button>
                <div id="acc-${year}" class="bg-gray-50 p-3 rounded-lg mt-2 transition-all ${isHidden}">
                    ${rowsHtml}
                </div>
            </div>
        `
        );
    });

    if (typeof renderAssetChart === 'function') renderAssetChart(yearlyStats);
};

window.openDepositModal = (id = null) => {
    const form = document.getElementById('deposit-form');
    form.reset();
    document.getElementById('dep-delete-btn').classList.add('hidden');
    document.getElementById('deposit-modal-title').innerText = '새 상품 추가';

    const renderSelect = (elId, type, placeholder) => {
        const el = document.getElementById(elId);
        const orderKey = 'assetOrder_' + type;
        const savedOrder = JSON.parse(localStorage.getItem(orderKey)) || [];

        const options = globalCategories
            .filter((c) => c.Type === type)
            .sort((a, b) => {
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

    renderSelect('dep-input-bank', 'asset_bank', '은행 선택 (설정에서 추가)');
    renderSelect('dep-input-owner', 'asset_owner', '명의자 선택');
    renderSelect('dep-input-type', 'asset_type', '종류 선택');
    renderSelect('dep-input-tax', 'asset_tax', '과세 기준 선택');

    if (id) {
        const d = window.globalDeposits.find((item) => item.ID === id);
        if (d) {
            document.getElementById('deposit-modal-title').innerText = '상품 정보 수정';
            document.getElementById('dep-input-id').value = d.ID;
            document.getElementById('dep-input-start').value = d.가입일;
            document.getElementById('dep-input-end').value = d.만기일;

            document.getElementById('dep-input-principal').value = Number(
                d.원금 || 0
            ).toLocaleString('ko-KR');
            document.getElementById('dep-input-pretax').value = Number(
                d.세전이자 || 0
            ).toLocaleString('ko-KR');
            document.getElementById('dep-input-posttax').value = Number(
                d.세후이자 || 0
            ).toLocaleString('ko-KR');
            document.getElementById('dep-input-rate').value = d.이율
                ? Number(d.이율).toFixed(2)
                : '';

            if (d.은행)
                document.getElementById('dep-input-bank').innerHTML +=
                    `<option value="${d.은행}" selected>${d.은행}</option>`;
            if (d.명의자)
                document.getElementById('dep-input-owner').innerHTML +=
                    `<option value="${d.명의자}" selected>${d.명의자}</option>`;
            if (d.종류)
                document.getElementById('dep-input-type').innerHTML +=
                    `<option value="${d.종류}" selected>${d.종류}</option>`;
            if (d.과세여부)
                document.getElementById('dep-input-tax').innerHTML +=
                    `<option value="${d.과세여부}" selected>${d.과세여부}</option>`;
            if (d.상태) document.getElementById('dep-input-status').value = d.상태;

            document.getElementById('dep-delete-btn').classList.remove('hidden');
        }
    }

    const modal = document.getElementById('deposit-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('deposit-modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.closeDepositModal = () => {
    const modal = document.getElementById('deposit-modal');
    modal.classList.add('opacity-0');
    document.getElementById('deposit-modal-content').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.saveDeposit = () => {
    const id = document.getElementById('dep-input-id').value;
    const payload = {
        action: id ? 'update_deposit' : 'create_deposit',
        id: id || 'temp_' + Date.now(),
        country: 'KR',
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
        !payload.owner ||
        !payload.depType ||
        !payload.taxType
    ) {
        alert('과세여부를 포함한 필수 항목을 모두 선택해 주세요.');
        return;
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

    if (payload.action === 'create_deposit') {
        window.globalDeposits.push(optimisticData);
    } else {
        const idx = window.globalDeposits.findIndex((d) => d.ID === payload.id);
        if (idx > -1) {
            window.globalDeposits.splice(idx, 1);
            window.globalDeposits.push(optimisticData);
        }
    }

    if (typeof renderAssetsList === 'function') renderAssetsList();

    fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === 'success') loadDailyRecords(true);
        })
        .catch((e) => {
            alert('저장 중 네트워크 오류가 발생하여 이전 상태로 복구됩니다.');
            loadDailyRecords(true);
        });
};

window.currentAssetConfigType = '';

window.openAssetConfigModal = (type, title) => {
    window.currentAssetConfigType = type;
    document.getElementById('asset-config-title').innerText = title;
    document.getElementById('new-asset-config-label').value = '';

    const container = document.getElementById('asset-config-list-container');
    container.innerHTML = '';

    const orderKey = 'assetOrder_' + type;
    const savedOrder = JSON.parse(localStorage.getItem(orderKey)) || [];

    const items = [...globalCategories]
        .filter((c) => c.Type === type)
        .sort((a, b) => {
            const idxA = savedOrder.indexOf(a.Value);
            const idxB = savedOrder.indexOf(b.Value);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.Label.localeCompare(b.Label);
        });

    if (items.length === 0) {
        container.innerHTML =
            '<li class="py-4 text-center text-gray-500 text-sm">등록된 항목이 없습니다.</li>';
    } else {
        items.forEach((c) => {
            container.insertAdjacentHTML(
                'beforeend',
                `
                <li class="py-2.5 flex justify-between items-center gap-2 bg-white" data-id="${c.Value}">
                    <div class="flex items-center gap-2 overflow-hidden flex-1">
                        <span class="material-symbols-outlined text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 drag-handle text-[18px] p-1">menu</span>
                        <span class="text-sm font-medium text-gray-800 truncate">${c.Label}</span>
                    </div>
                    <div class="flex gap-1 shrink-0">
                        <button onclick="deleteAssetConfig('${c.Value}')" class="text-gray-400 hover:text-red-500 transition p-1">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </li>
            `
            );
        });
    }

    if (window.assetSortable) window.assetSortable.destroy();
    window.assetSortable = new Sortable(container, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'bg-gray-50',
        onEnd: function () {
            const newOrder = Array.from(container.children).map((li) => li.getAttribute('data-id'));
            localStorage.setItem(orderKey, JSON.stringify(newOrder));
        },
    });

    const modal = document.getElementById('asset-config-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
};

window.closeAssetConfigModal = () =>
    document.getElementById('asset-config-modal').classList.add('hidden');

window.addAssetConfig = async () => {
    const label = document.getElementById('new-asset-config-label').value.trim();
    if (!label) return alert('이름을 입력해주세요.');
    showLoader();
    try {
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_category',
                catType: window.currentAssetConfigType,
                catLabel: label,
            }),
        });
        await loadDailyRecords();
        openAssetConfigModal(
            window.currentAssetConfigType,
            document.getElementById('asset-config-title').innerText
        );
    } catch (e) {
        alert('에러');
    } finally {
        hideLoader();
    }
};

window.deleteAssetConfig = async (catValue) => {
    if (!confirm('삭제하시겠습니까?')) return;
    showLoader();
    try {
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_category', catValue }),
        });
        await loadDailyRecords();
        openAssetConfigModal(
            window.currentAssetConfigType,
            document.getElementById('asset-config-title').innerText
        );
    } catch (e) {
        alert('에러');
    } finally {
        hideLoader();
    }
};

window.deleteDeposit = () => {
    if (!confirm('이 상품을 삭제하시겠습니까?')) return;
    const id = document.getElementById('dep-input-id').value;

    closeDepositModal();

    window.globalDeposits = window.globalDeposits.filter((d) => d.ID !== id);
    if (typeof renderAssetsList === 'function') renderAssetsList();

    fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_deposit', id: id }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === 'success') loadDailyRecords(true);
        })
        .catch((e) => {
            alert('삭제 중 통신 오류가 발생하여 원상복구 되었습니다.');
            loadDailyRecords(true);
        });
};

window.currentAssetSort = 'end';

window.setAssetSort = (type) => {
    window.currentAssetSort = type;
    const btnEnd = document.getElementById('btn-sort-end');
    const btnStart = document.getElementById('btn-sort-start');

    if (type === 'end') {
        if (btnEnd)
            btnEnd.className =
                'px-2 py-1 text-[10px] font-bold bg-white text-gray-800 rounded-md shadow-sm transition-all';
        if (btnStart)
            btnStart.className =
                'px-2 py-1 text-[10px] font-bold text-gray-400 rounded-md transition-all';
    } else {
        if (btnStart)
            btnStart.className =
                'px-2 py-1 text-[10px] font-bold bg-white text-gray-800 rounded-md shadow-sm transition-all';
        if (btnEnd)
            btnEnd.className =
                'px-2 py-1 text-[10px] font-bold text-gray-400 rounded-md transition-all';
    }

    if (typeof renderAssetsList === 'function') renderAssetsList();
};

window.currentAssetFilter = 'all';

window.setAssetFilter = (filterType) => {
    window.currentAssetFilter = filterType;
    if (typeof renderAssetsList === 'function') renderAssetsList();
};

window.assetChartInstance = null;

window.renderAssetChart = (summary) => {
    const ctx = document.getElementById('assetInterestChart');
    if (!ctx) return;

    if (window.assetChartInstance) window.assetChartInstance.destroy();

    const years = Object.keys(summary).sort();
    const owners = [...new Set(years.flatMap((y) => Object.keys(summary[y])))];

    const colorPalette = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

    const datasets = owners.map((owner, idx) => ({
        label: owner,
        data: years.map((year) => summary[year][owner] || 0),
        backgroundColor: colorPalette[idx % colorPalette.length],
        borderRadius: 4,
    }));

    window.assetChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: years, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: false },
                y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => (v / 10000).toLocaleString() + '만' },
                },
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 10, weight: 'bold' } },
                },
            },
        },
    });
};

window.currentOwnerAssetSort = 'end';

window.setOwnerAssetSort = (owner, type) => {
    window.currentOwnerAssetSort = type;
    window.openOwnerAssetDetail(owner);
};

window.openOwnerAssetDetail = (owner) => {
    const container = document.getElementById('owner-detail-list-container');
    const title = document.getElementById('owner-detail-title');
    const summaryBar = document.getElementById('owner-detail-stat-bar');
    if (!container || !title) return;

    title.innerText = `${owner} 님의 자산 현황`;
    container.innerHTML = '';

    const btnEnd = document.getElementById('btn-owner-sort-end');
    const btnStart = document.getElementById('btn-owner-sort-start');
    if (btnEnd && btnStart) {
        const activeClass = 'bg-white text-gray-800 shadow-sm';
        const inactiveClass = 'text-gray-400';

        btnEnd.className = `px-2 py-1 text-[9px] font-bold rounded-md transition-all ${window.currentOwnerAssetSort === 'end' ? activeClass : inactiveClass}`;
        btnStart.className = `px-2 py-1 text-[9px] font-bold rounded-md transition-all ${window.currentOwnerAssetSort === 'start' ? activeClass : inactiveClass}`;

        btnEnd.onclick = () => window.setOwnerAssetSort(owner, 'end');
        btnStart.onclick = () => window.setOwnerAssetSort(owner, 'start');
    }

    const filtered = window.globalDeposits.filter(
        (d) => d.명의자 === owner && d.상태 !== '만기' && d.상태 !== '중도해지'
    );

    let pSum = 0,
        iSum = 0;

    if (filtered.length === 0) {
        container.innerHTML =
            '<p class="text-center text-gray-400 py-20 text-sm">운용중인 자산이 없습니다.</p>';
        summaryBar.innerHTML = '';
    } else {
        if (window.currentOwnerAssetSort === 'end') {
            filtered.sort((a, b) => new Date(b.만기일) - new Date(a.만기일));
        } else {
            filtered.sort((a, b) => new Date(b.가입일) - new Date(a.가입일));
        }

        let lastYear = null;

        filtered.forEach((d) => {
            const calc = getDepositCalc(d);
            pSum += Number(d.원금);
            iSum += Number(d.세후이자);

            const displayYear =
                window.currentOwnerAssetSort === 'end'
                    ? new Date(d.만기일).getFullYear()
                    : new Date(d.가입일).getFullYear();

            if (lastYear !== displayYear) {
                lastYear = displayYear;
                container.insertAdjacentHTML(
                    'beforeend',
                    `
                    <div class="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 px-1 mt-4 first:mt-0">
                        <span class="text-xs font-black text-primary flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">calendar_today</span>${displayYear}년
                        </span>
                    </div>
                `
                );
            }

            container.insertAdjacentHTML(
                'beforeend',
                `
                <div onclick="openDepositModal('${d.ID}')" class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-2 transition active:scale-[0.99]">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-black text-gray-800">${d.은행}</span>
                        <span class="text-[10px] text-green-600 font-black bg-green-50 px-1.5 py-0.5 rounded">운용중</span>
                    </div>
                    <div class="flex justify-between items-end">
                        <div class="text-xs text-gray-500">
                            ${d.종류} • ${calc.months}개월 • ${Number(d.이율).toFixed(2)}%
                            <p class="text-base font-black text-slate-800 mt-1">${Number(d.원금).toLocaleString('ko-KR')}원</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-indigo-500 font-bold">세후이자</p>
                            <p class="text-sm font-black text-indigo-600">+${Number(d.세후이자).toLocaleString('ko-KR')}원</p>
                        </div>
                    </div>
                    <div class="text-[11px] text-gray-400 pt-2 border-t border-gray-100 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[13px]">event</span>${d.가입일} ~ ${d.만기일}
                    </div>
                </div>
            `
            );
        });

        summaryBar.innerHTML = `
            <div class="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[11px] font-bold opacity-80 text-white/90">총 운용 자산</span>
                    <span class="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">${filtered.length}건</span>
                </div>
                <div class="text-xl font-black mb-3 tracking-tight">${(pSum + iSum).toLocaleString('ko-KR')}원</div>
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                    <div class="bg-black/10 rounded-lg p-2">
                        <span class="opacity-70 block mb-0.5 text-white/90">총 원금</span>
                        <span class="font-bold text-white">${pSum.toLocaleString('ko-KR')}원</span>
                    </div>
                    <div class="bg-black/10 rounded-lg p-2">
                        <span class="opacity-70 block mb-0.5 text-white/90">총 세후이자</span>
                        <span class="font-bold text-indigo-200">+${iSum.toLocaleString('ko-KR')}원</span>
                    </div>
                </div>
            </div>
        `;
    }

    const modal = document.getElementById('asset-owner-detail-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document
            .getElementById('asset-owner-detail-modal-content')
            .classList.remove('translate-y-full');
    }, 10);
};

window.closeOwnerAssetDetail = () => {
    const modal = document.getElementById('asset-owner-detail-modal');
    modal.classList.add('opacity-0');
    document.getElementById('asset-owner-detail-modal-content').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

// ==========================================
// 📊 배당금(Dividends) 탭 전용 렌더링 및 기능 (영어 헤더 지원판)
// ==========================================
window.globalDividends = window.globalDividends || [];

window.renderDividendsList = () => {
    const summaryContainer = document.getElementById('dividends-summary-container');
    const listContainer = document.getElementById('dividends-list-container');
    const yearSelect = document.getElementById('dividend-year-select');
    if (!summaryContainer || !listContainer || !yearSelect) return;

    // 1. 연도 셀렉터 구성
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

    // 2. 명의자별 세전(Gross)/세후(Net) 합계 계산
    const ownerTotals = {};
    yearData.forEach((d) => {
        const owner = d.Owner || '미상';
        if (!ownerTotals[owner]) ownerTotals[owner] = { preTax: 0, postTax: 0 };
        ownerTotals[owner].preTax += Number(d.Gross) || 0;
        ownerTotals[owner].postTax += Number(d.Net) || 0;
    });

    summaryContainer.innerHTML = '';
    listContainer.innerHTML = '';

    if (Object.keys(ownerTotals).length === 0) {
        summaryContainer.innerHTML = `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center text-sm text-gray-400">이번 연도 배당 내역이 없습니다.</div>`;
    } else {
        for (const [owner, totals] of Object.entries(ownerTotals)) {
            summaryContainer.insertAdjacentHTML(
                'beforeend',
                `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 transition hover:shadow-md mb-2">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-bold text-gray-800 flex items-center gap-1">
                            <span class="material-symbols-outlined text-[16px] text-gray-400">person</span>${owner}
                        </span>
                        <div class="text-right">
                            <span class="text-[10px] text-gray-500 mr-1">세전 합계:</span>
                            <span class="text-xs font-black text-indigo-600">+${totals.preTax.toLocaleString('ko-KR')}원</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                        <span class="text-[10px] text-gray-400 font-medium">세후 실수령액</span>
                        <span class="text-sm font-black text-gray-800">+${totals.postTax.toLocaleString('ko-KR')}원</span>
                    </div>
                </div>
            `
            );
        }
    }

    // 💡 3. 날짜 정렬 검토 및 보강 (안전한 Date 객체 변환 후 내림차순 정렬)
    yearData.sort((a, b) => {
        const dateA = new Date(a.Date).getTime();
        const dateB = new Date(b.Date).getTime();
        return dateB - dateA; // 최신날짜가 위로 오도록
    });

    yearData.forEach((d) => {
        listContainer.insertAdjacentHTML(
            'beforeend',
            `
            <div onclick="openDividendModal('${d.ID}')" class="bg-white px-3 py-2.5 rounded-xl border border-gray-100 flex justify-between items-center cursor-pointer active:scale-[0.99] transition shadow-sm hover:bg-gray-50 mb-2">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-1">
                        <span class="text-sm font-black text-gray-800 truncate">${d.Stock}</span>
                        <span class="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">${d.Owner}</span>
                    </div>
                    <div class="text-[10px] text-gray-400 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[11px]">calendar_today</span>${d.Date} • ${d.Broker}
                    </div>
                </div>
                <div class="text-right shrink-0 ml-3">
                    <p class="text-[10px] text-gray-500 font-medium mb-0.5">세전 +${Number(d.Gross).toLocaleString('ko-KR')}원</p>
                    <p class="text-sm font-black text-indigo-600 leading-none">세후 +${Number(d.Net).toLocaleString('ko-KR')}원</p>
                </div>
            </div>
        `
        );
    });
};

// 💡 배당금 모달 열기 및 데이터 매핑 (버그 수정 및 스마트 추출 기능 포함)
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

    // 💡 수정된 렌더링 함수: 전역 변수 참조 오류 해결 & 명의자 자동 추출!
    const safeRenderSelect = (elId, type, placeholder) => {
        const el = document.getElementById(elId);
        if (!el) return;

        const orderKey = 'assetOrder_' + type;
        const savedOrder = JSON.parse(localStorage.getItem(orderKey)) || [];

        // 1. 설정(Settings)에서 등록한 카테고리 정상적으로 불러오기 (window. 제거)
        let baseCategories = [];
        if (typeof globalCategories !== 'undefined') {
            baseCategories = globalCategories.filter((c) => c.Type === type);
        }

        // 2. 명의자의 경우, 기존 예적금 및 배당금 시트에 있는 이름들을 긁어와서 자동 추가!
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
                // 설정에 등록 안 된 이름만 드롭다운에 임시로 쏙 추가해줍니다.
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

    // 증권사와 명의자 드롭다운에 데이터 주입
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
    modal.classList.add('opacity-0');
    document.getElementById('dividend-modal-content').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

// 💡 배당금 저장/삭제 통신 함수
window.saveDividend = () => {
    const idInput = document.getElementById('div-input-id').value;
    const payload = {
        action: idInput ? 'update_dividend' : 'create_dividend',
        id: idInput || 'div_' + Date.now(),
        date: document.getElementById('div-input-date').value,
        stock: document.getElementById('div-input-stock').value,
        broker: document.getElementById('div-input-broker').value,
        owner: document.getElementById('div-input-owner').value,
        gross: document.getElementById('div-input-pretax').value.replace(/,/g, ''),
        net: document.getElementById('div-input-posttax').value.replace(/,/g, ''),
    };

    if (
        !payload.date ||
        !payload.stock ||
        !payload.broker ||
        !payload.owner ||
        !payload.gross ||
        !payload.net
    ) {
        return alert('항목을 모두 입력해주세요.');
    }

    closeDividendModal();

    // 임시로 화면에 먼저 그리기 (딜레이 방지)
    const optimisticData = {
        ID: payload.id,
        Date: payload.date,
        Stock: payload.stock,
        Broker: payload.broker,
        Owner: payload.owner,
        Gross: payload.gross,
        Net: payload.net,
    };

    if (payload.action === 'create_dividend') {
        window.globalDividends.push(optimisticData);
    } else {
        const idx = window.globalDividends.findIndex((d) => d.ID === payload.id);
        if (idx > -1) window.globalDividends[idx] = optimisticData;
    }
    renderDividendsList();

    // 백엔드로 데이터 전송
    fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === 'success' && typeof loadDailyRecords === 'function') {
                loadDailyRecords(true);
            }
        })
        .catch((e) => {
            alert('저장 중 통신 오류가 발생했습니다. 원상 복구됩니다.');
            if (typeof loadDailyRecords === 'function') loadDailyRecords(true);
        });
};

window.deleteDividend = () => {
    if (!confirm('이 배당금 내역을 삭제하시겠습니까?')) return;
    const id = document.getElementById('div-input-id').value;

    closeDividendModal();

    window.globalDividends = window.globalDividends.filter((d) => d.ID !== id);
    renderDividendsList();

    fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_dividend', id: id }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === 'success' && typeof loadDailyRecords === 'function') {
                loadDailyRecords(true);
            }
        })
        .catch((e) => {
            alert('삭제 중 통신 오류가 발생했습니다. 원상 복구됩니다.');
            if (typeof loadDailyRecords === 'function') loadDailyRecords(true);
        });
};
