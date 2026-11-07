// 월별 가계부·자산·생활 데이터를 한 화면에서 읽는 가족 리포트입니다.
window.familyReportMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const reportEscape = (value) =>
    typeof window.escapeHTML === 'function' ? window.escapeHTML(value ?? '') : String(value ?? '');

const reportDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const reportMonthKey = (date) => reportDateKey(date).slice(0, 7);

const reportMoney = (value, country) => {
    const amount = Number(value) || 0;
    return country === 'CN'
        ? `¥${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
        : `${Math.round(amount).toLocaleString('ko-KR')}원`;
};

const reportCnyKrwRate = () => {
    const tickerRate = document.getElementById('ticker-exchange-value')?.innerText || '';
    const cachedRate = localStorage.getItem('cachedCnyRate') || '';
    const rawRate = tickerRate.replace(/[^\d.,]/g, '') || cachedRate;
    const rate = Number(rawRate.replace(/,/g, ''));
    return Number.isFinite(rate) && rate > 0 ? rate : null;
};

const reportKrwHint = (value, country) => {
    if (country !== 'CN') return '';
    const rate = reportCnyKrwRate();
    if (!rate) return '';
    const won = Math.round((Number(value) || 0) * rate).toLocaleString('ko-KR');
    return `<span class="block text-[9px] font-medium text-gray-400">약 ${won}원</span>`;
};

const reportNumber = (value) => (Number(value) || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 });

const reportPeriod = (monthDate) => {
    const now = new Date();
    const isCurrentMonth = reportMonthKey(monthDate) === reportMonthKey(now);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const throughDay = isCurrentMonth ? now.getDate() : monthEnd;
    const start = `${reportMonthKey(monthDate)}-01`;
    const end = `${reportMonthKey(monthDate)}-${String(throughDay).padStart(2, '0')}`;
    const previousMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
    const previousEndOfMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0).getDate();
    const previousThroughDay = isCurrentMonth ? Math.min(throughDay, previousEndOfMonth) : previousEndOfMonth;
    const previousStart = `${reportMonthKey(previousMonth)}-01`;
    const previousEnd = `${reportMonthKey(previousMonth)}-${String(previousThroughDay).padStart(2, '0')}`;
    return { start, end, throughDay, monthEnd, isCurrentMonth, previousStart, previousEnd, previousThroughDay };
};

const reportSectionTitle = (icon, title, subtitle = '') => `
    <div class="flex items-center gap-2 mb-2.5">
        <span class="material-symbols-outlined text-[19px] text-primary">${icon}</span>
        <div class="min-w-0">
            <h3 class="text-sm font-black text-gray-800">${title}</h3>
            ${subtitle ? `<p class="text-[10px] text-gray-400 mt-0.5">${subtitle}</p>` : ''}
        </div>
    </div>`;

const getLedgerReport = (country, start, end, previousStart, previousEnd) => {
    const records = window.allCountryData?.[country] || [];
    const monthTotals = { income: 0, expense: 0, count: 0, categoryTotals: new Map(), dailyExpenses: new Map() };
    const previousTotals = { income: 0, expense: 0 };
    records.forEach((record) => {
        const date = String(record.Date || '').slice(0, 10);
        const amount = Number(record.Amount) || 0;
        if (date >= start && date <= end) {
            if (record.Type === 'income') monthTotals.income += amount;
            if (record.Type === 'expense') {
                monthTotals.expense += amount;
                const categoryId = String(record.Category || '');
                monthTotals.categoryTotals.set(categoryId, (monthTotals.categoryTotals.get(categoryId) || 0) + amount);
                monthTotals.dailyExpenses.set(date, (monthTotals.dailyExpenses.get(date) || 0) + amount);
            }
            monthTotals.count++;
        } else if (date >= previousStart && date <= previousEnd) {
            if (record.Type === 'income') previousTotals.income += amount;
            if (record.Type === 'expense') previousTotals.expense += amount;
        }
    });

    const categories = window.allCategories || [];
    const topCategories = [...monthTotals.categoryTotals.entries()]
        .map(([id, amount]) => ({
            label: categories.find((category) => String(category.Value) === id)?.Label?.split('|')[0] || '미분류',
            amount,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);
    const topDay = [...monthTotals.dailyExpenses.entries()].sort((a, b) => b[1] - a[1])[0] || null;
    return { ...monthTotals, previousTotals, topCategories, topDay };
};

const renderLedgerReportCard = (country, data, isComparablePeriod) => {
    const label = country === 'CN' ? '중국' : '한국';
    const currency = country === 'CN' ? 'CN' : 'KR';
    const incomeDifference = data.income - data.previousTotals.income;
    const expenseDifference = data.expense - data.previousTotals.expense;
    const net = data.income - data.expense;
    const netColor = net >= 0 ? 'text-blue-600' : 'text-red-500';
    const comparison = isComparablePeriod ? '전월 같은 기간 대비' : '전월 전체 대비';
    const categoryContent = data.topCategories.length
        ? data.topCategories.map((item, index) => `
            <div class="flex items-center justify-between gap-2 text-[10px] ${index ? 'mt-1.5' : ''}">
                <span class="text-gray-500 truncate">${index + 1}. ${reportEscape(item.label)}</span>
                <span class="font-bold text-gray-700 min-w-0 text-right">${reportMoney(item.amount, currency)}${reportKrwHint(item.amount, currency)}</span>
            </div>`).join('')
        : '<p class="text-[10px] text-gray-400">지출 기록이 없습니다.</p>';
    const peakDayContent = data.topDay
        ? `${Number(data.topDay[0].slice(8, 10))}일 · ${reportMoney(data.topDay[1], currency)}${reportKrwHint(data.topDay[1], currency)}`
        : '없음';

    return `
        <article class="min-w-0 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <div class="flex items-center justify-between gap-2 mb-2.5">
                <h4 class="text-xs font-black text-gray-800">${country === 'CN' ? '🇨🇳' : '🇰🇷'} ${label} 가계부</h4>
                <span class="text-[9px] text-gray-400">${data.count}건</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div class="rounded-lg bg-blue-50 px-2 py-2 min-w-0">
                    <p class="text-[9px] font-bold text-blue-600">수입</p>
                    <p class="text-xs font-black text-gray-800 truncate mt-0.5">${reportMoney(data.income, currency)}</p>${reportKrwHint(data.income, currency)}
                    <p class="text-[9px] font-semibold ${incomeDifference >= 0 ? 'text-blue-600' : 'text-red-500'} truncate mt-0.5">${comparison} ${incomeDifference > 0 ? '+' : incomeDifference < 0 ? '−' : ''}${reportMoney(Math.abs(incomeDifference), currency)}</p>
                </div>
                <div class="rounded-lg bg-red-50 px-2 py-2 min-w-0">
                    <p class="text-[9px] font-bold text-red-500">지출</p>
                    <p class="text-xs font-black text-gray-800 truncate mt-0.5">${reportMoney(data.expense, currency)}</p>${reportKrwHint(data.expense, currency)}
                    <p class="text-[9px] font-semibold ${expenseDifference <= 0 ? 'text-blue-600' : 'text-red-500'} truncate mt-0.5">${comparison} ${expenseDifference > 0 ? '+' : expenseDifference < 0 ? '−' : ''}${reportMoney(Math.abs(expenseDifference), currency)}</p>
                </div>
            </div>
            <div class="flex items-center justify-between gap-2 border-t border-gray-100 mt-2.5 pt-2 text-[10px]">
                <span class="text-gray-500">수입 − 지출</span>
                <strong class="${netColor} text-right">${reportMoney(net, currency)}${reportKrwHint(net, currency)}</strong>
            </div>
            <div class="border-t border-gray-100 mt-2.5 pt-2">
                <div class="flex justify-between gap-2 text-[9px] mb-1.5"><span class="text-gray-400">지출 많은 날</span><span class="font-bold text-gray-600">${peakDayContent}</span></div>
                ${categoryContent}
            </div>
        </article>`;
};

const renderAssetsReport = (period) => {
    const deposits = window.globalDeposits || [];
    const dividends = window.globalDividends || [];
    const monthDeposits = deposits.filter((deposit) => {
        const date = String(deposit.가입일 || '').slice(0, 10);
        return date >= period.start && date <= period.end;
    });
    const monthMaturities = deposits.filter((deposit) => {
        const date = String(deposit.만기일 || '').slice(0, 10);
        return deposit.상태 !== '중도해지' && date >= period.start && date <= period.end;
    });
    const monthDividends = dividends.filter((dividend) => {
        const date = String(dividend.Date || '').slice(0, 10);
        return date >= period.start && date <= period.end;
    });
    const activePrincipal = deposits.reduce((sum, deposit) => {
        if (deposit.상태 === '중도해지' || deposit.상태 === '만기') return sum;
        return sum + (Number(deposit.원금) || 0);
    }, 0);
    const depositAmount = monthDeposits.reduce((sum, deposit) => sum + (Number(deposit.원금) || 0), 0);
    const maturityAmount = monthMaturities.reduce((sum, deposit) => sum + (Number(deposit.원금) || 0), 0);
    const grossDividends = monthDividends.reduce((sum, dividend) => sum + (Number(dividend.Gross) || 0), 0);
    const netDividends = monthDividends.reduce((sum, dividend) => sum + (Number(dividend.Net) || 0), 0);

    const metrics = [
        { label: '등록된 운용 예치 원금', amount: activePrincipal, detail: `${deposits.filter((deposit) => deposit.상태 !== '중도해지' && deposit.상태 !== '만기').length}건` },
        { label: '이달 가입', amount: depositAmount, detail: `${monthDeposits.length}건` },
        { label: '이달 만기 도래', amount: maturityAmount, detail: `${monthMaturities.length}건` },
        { label: '이달 배당 세후', amount: netDividends, detail: `세전 ${reportMoney(grossDividends, 'KR')} · ${monthDividends.length}회` },
    ];

    return `
        <section>
            ${reportSectionTitle('savings', '자산 기록', '예적금·배당 시트에 등록된 내용 기준 · 원화')}
            <div class="grid grid-cols-2 gap-2">
                ${metrics.map((metric) => `
                    <div class="rounded-xl border border-gray-100 bg-white p-3 shadow-sm min-w-0">
                        <p class="text-[9px] font-bold text-gray-500">${metric.label}</p>
                        <p class="text-sm font-black text-emerald-700 truncate mt-1">${reportMoney(metric.amount, 'KR')}</p>
                        <p class="text-[9px] text-gray-400 mt-0.5">${metric.detail}</p>
                    </div>`).join('')}
            </div>
        </section>`;
};

const renderLifeReport = (period) => {
    const types = window.lifeTypes || [];
    const records = window.lifeRecords || [];
    const cards = types.map((type) => {
        const typeRecords = records
            .filter((record) => String(record.TypeID) === String(type.ID))
            .sort((a, b) => String(a.Date || '').localeCompare(String(b.Date || '')) || String(a.UpdatedAt || '').localeCompare(String(b.UpdatedAt || '')));
        const monthRecords = typeRecords.filter((record) => {
            const date = String(record.Date || '').slice(0, 10);
            return date >= period.start && date <= period.end;
        });
        const isCounter = String(type.Kind || '').toLowerCase() === 'counter';
        if (!monthRecords.length && (!isCounter || !typeRecords.length)) return '';

        let details = '';
        if (isCounter) {
            const charged = monthRecords.reduce((sum, record) => sum + Math.max(0, Number(record.Value) || 0), 0);
            const used = monthRecords.reduce((sum, record) => sum + Math.max(0, -(Number(record.Value) || 0)), 0);
            const balance = typeRecords.reduce((sum, record) => sum + (Number(record.Value) || 0), 0);
            details = `
                <div class="grid grid-cols-3 gap-1.5 mt-2 text-center">
                    <div class="rounded-lg bg-gray-50 px-1.5 py-2"><p class="text-[8px] text-gray-400">충전</p><p class="text-[10px] font-bold text-gray-700 mt-0.5">+${reportNumber(charged)}${reportEscape(type.Unit || '')}</p></div>
                    <div class="rounded-lg bg-gray-50 px-1.5 py-2"><p class="text-[8px] text-gray-400">사용</p><p class="text-[10px] font-bold text-gray-700 mt-0.5">−${reportNumber(used)}${reportEscape(type.Unit || '')}</p></div>
                    <div class="rounded-lg bg-primary-light px-1.5 py-2"><p class="text-[8px] text-gray-500">현재 잔여</p><p class="text-[10px] font-black text-primary mt-0.5">${reportNumber(balance)}${reportEscape(type.Unit || '')}</p></div>
                </div>`;
        } else {
            const byPerson = new Map();
            monthRecords.forEach((record) => {
                const person = String(record.Person || '').trim() || '가족 공용';
                byPerson.set(person, record);
            });
            details = [...byPerson.entries()].map(([person, latest]) => {
                const personKey = (record) => String(record.Person || '').trim() || '가족 공용';
                const previous = [...typeRecords].reverse().find((record) =>
                    personKey(record) === person && String(record.Date || '').slice(0, 10) < period.start
                );
                const value = Number(latest.Value) || 0;
                const change = previous ? value - (Number(previous.Value) || 0) : null;
                const changeLabel = change === null
                    ? '이전 기록 없음'
                    : `이전 기록 대비 ${change > 0 ? '+' : change < 0 ? '−' : ''}${reportNumber(Math.abs(change))}${reportEscape(type.Unit || '')}`;
                return `
                    <div class="flex items-center justify-between gap-2 border-t border-gray-50 py-2 first:border-0">
                        <div class="min-w-0"><p class="text-[10px] font-bold text-gray-700 truncate">${reportEscape(person)}</p><p class="text-[9px] text-gray-400 mt-0.5">${String(latest.Date || '').slice(0, 10)} · ${changeLabel}</p></div>
                        <strong class="text-sm text-gray-800 shrink-0">${reportNumber(value)}${reportEscape(type.Unit || '')}</strong>
                    </div>`;
            }).join('');
        }

        return `
            <article class="rounded-xl border border-gray-100 bg-white p-3 shadow-sm min-w-0">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="text-xs font-black text-gray-800 truncate">${reportEscape(type.Name)}</h4>
                    <span class="text-[9px] text-gray-400 shrink-0">이달 ${monthRecords.length}건</span>
                </div>
                ${details}
            </article>`;
    }).filter(Boolean);

    return `
        <section>
            ${reportSectionTitle('monitoring', '생활 변화', '몸무게 등 측정값과 횟수형 기록')}
            ${cards.length
                ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${cards.join('')}</div>`
                : '<div class="rounded-xl border border-gray-100 bg-white p-4 text-center text-xs text-gray-400">선택한 달에 생활 기록이 없습니다.</div>'}
        </section>`;
};

window.renderMonthlyFamilyReport = () => {
    const content = document.getElementById('family-report-content');
    const periodLabel = document.getElementById('family-report-period');
    if (!content || !periodLabel) return;

    const month = window.familyReportMonth || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const period = reportPeriod(month);
    const monthLabel = `${month.getFullYear()}년 ${month.getMonth() + 1}월`;
    const comparisonLabel = period.isCurrentMonth
        ? `1~${period.throughDay}일 · 전월 1~${period.previousThroughDay}일과 비교`
        : '한 달 전체 · 전월 전체와 비교';
    periodLabel.textContent = `${monthLabel} · ${comparisonLabel}`;

    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const nextButton = document.querySelector('#monthly-family-report button[aria-label="다음 달"]');
    if (nextButton) {
        nextButton.disabled = reportMonthKey(month) >= reportMonthKey(currentMonth);
        nextButton.classList.toggle('opacity-40', nextButton.disabled);
    }

    const kr = getLedgerReport('KR', period.start, period.end, period.previousStart, period.previousEnd);
    const cn = getLedgerReport('CN', period.start, period.end, period.previousStart, period.previousEnd);
    const empty = !kr.count && !cn.count && !(window.globalDeposits || []).length && !(window.globalDividends || []).length && !(window.lifeRecords || []).length;

    content.innerHTML = `
        ${empty ? '<div class="rounded-xl border border-gray-100 bg-white p-4 text-center text-xs text-gray-500">아직 집계할 자료가 없습니다.</div>' : ''}
        <section>
            ${reportSectionTitle('account_balance_wallet', '가계부 흐름', '한국 원화와 중국 위안을 각각 표시합니다')}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${renderLedgerReportCard('KR', kr, period.isCurrentMonth)}
                ${renderLedgerReportCard('CN', cn, period.isCurrentMonth)}
            </div>
        </section>
        ${renderAssetsReport(period)}
        ${renderLifeReport(period)}
        <p class="text-[9px] leading-relaxed text-gray-400 px-1 pb-2">자산은 등록된 예적금·배당 기록, 생활은 기록된 측정값과 횟수만 집계합니다. 주식 시세나 등록되지 않은 계좌 잔액은 포함하지 않습니다.</p>
    `;
};

window.openMonthlyFamilyReport = () => {
    const modal = document.getElementById('monthly-family-report');
    if (!modal) return;
    window.familyReportMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    window.renderMonthlyFamilyReport();
    modal.classList.remove('hidden');
    document.body.classList.add('report-modal-open');
};

window.closeMonthlyFamilyReport = () => {
    document.getElementById('monthly-family-report')?.classList.add('hidden');
    document.body.classList.remove('report-modal-open');
};

window.changeFamilyReportMonth = (offset) => {
    const current = window.familyReportMonth || new Date();
    const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    const now = new Date();
    if (next > new Date(now.getFullYear(), now.getMonth(), 1)) return;
    window.familyReportMonth = next;
    window.renderMonthlyFamilyReport();
};

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') window.closeMonthlyFamilyReport();
});
