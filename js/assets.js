// ==========================================
// 💰 1. 예적금 관련 서버 통신 (보안 토큰 적용)
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

    // Optimistic UI: 화면에 먼저 반영
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
        body: JSON.stringify({
            action: 'delete_deposit',
            token: window.googleAuthToken, // 👈 🛡️ 보안 마패 추가
            id: id,
        }),
    }).then(() => loadDailyRecords(true));
};

// ==========================================
// 📊 2. 배당금(Dividends) 탭 렌더링 및 통신
// ==========================================
window.renderDividendsList = () => {
    const summaryContainer = document.getElementById('dividends-summary-container');
    const listContainer = document.getElementById('dividends-list-container');
    const yearSelect = document.getElementById('dividend-year-select');
    if (!summaryContainer || !listContainer || !yearSelect) return;

    // 연도별 필터링
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

    // 명의자별 요약 (간소화 버전)
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

    // 상세 리스트 (날짜 정렬 및 + 기호 적용)
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
    // Optimistic UI 업데이트 로직 (생략, 기존과 동일)
    fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) }).then(() =>
        loadDailyRecords(true)
    );
};

window.deleteDividend = () => {
    if (!confirm('삭제하시겠습니까?')) return;
    const id = document.getElementById('div-input-id').value;
    closeDividendModal();
    fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'delete_dividend',
            token: window.googleAuthToken, // 👈 🛡️ 보안 마패 추가
            id: id,
        }),
    }).then(() => loadDailyRecords(true));
};

// ==========================================
// 📈 3. 통합 금융소득 통계 (2x2 그리드 & 클릭 상세)
// ==========================================
window.renderCombinedAssetsStats = () => {
    const limitContainer = document.getElementById('combined-owner-limit-container');
    const yearSelect = document.getElementById('combined-stats-year-select');
    if (!limitContainer || !yearSelect) return;

    limitContainer.className = 'grid grid-cols-2 gap-3 mb-6';
    const selectedYear = parseInt(yearSelect.value) || new Date().getFullYear();
    const TAX_LIMIT = 20000000;

    // 데이터 합산 로직
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

    // 금액 높은 순서대로 정렬 (소팅 적용)
    const sortedOwners = Object.keys(combinedStats).sort((a, b) => {
        return (
            combinedStats[b].deposit +
            combinedStats[b].dividend -
            (combinedStats[a].deposit + combinedStats[a].dividend)
        );
    });

    limitContainer.innerHTML = '';
    sortedOwners.forEach((owner) => {
        const stat = combinedStats[owner];
        const total = stat.deposit + stat.dividend;
        const percent = Math.min((total / TAX_LIMIT) * 100, 100).toFixed(1);
        const isWarning = percent >= 80;

        limitContainer.insertAdjacentHTML(
            'beforeend',
            `
            <div onclick="openCombinedOwnerDetail('${owner}', ${selectedYear})" class="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 relative cursor-pointer active:scale-[0.98] transition">
                <div class="flex items-center gap-1 mb-2">
                    <span class="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]">P</span>
                    <span class="font-black text-gray-800 text-[11px] truncate">${owner}</span>
                </div>
                <p class="text-[14px] font-black ${isWarning ? 'text-red-500' : 'text-emerald-500'} tracking-tighter mb-2">${total.toLocaleString()}원</p>
                <div class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-1">
                    <div class="${isWarning ? 'bg-red-500' : 'bg-emerald-500'} h-full" style="width: ${percent}%"></div>
                </div>
                <div class="flex justify-between text-[8px] font-bold text-gray-400"><span>${percent}%</span><span>2천만 한도</span></div>
            </div>
        `
        );
    });
};
