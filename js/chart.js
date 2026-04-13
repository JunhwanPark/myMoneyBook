// ==========================================
// 📈 통계 및 차트 전용 로직 (chart.js)
// ==========================================

// 💡 지출/수입 차트 토글 함수
window.setChartMode = (mode) => {
    window.chartStatMode = mode;
    if (typeof renderChart === 'function') renderChart();
};

// 💡 카드 통계 기준 토글 함수 (기준일 <-> 달력월)
window.setCardStatMode = (mode) => {
    window.cardStatMode = mode;
    if (typeof renderChart === 'function') renderChart();
};

// 📈 누적추이 차트 수입 포함 여부 상태 관리
window.showCumulativeIncome = false;

window.toggleCumIncome = (checked) => {
    window.showCumulativeIncome = checked;
    if (typeof renderChart === 'function') renderChart();
};

// ==========================================
// 1. 통계 화면 메인 렌더링 (도넛 차트 / 누적 선형 차트 / 카드 정산)
// ==========================================
window.renderChart = function () {
    if (typeof updateMonthTitles === 'function') updateMonthTitles();
    const targetY = currentDisplayDate.getFullYear();
    const targetM = currentDisplayDate.getMonth();
    const prefix = `${targetY}-${String(targetM + 1).padStart(2, '0')}`;

    window.chartStatMode = window.chartStatMode || 'expense';
    const mode = window.chartStatMode;

    const btnExp = document.getElementById('btn-tab-expense');
    const btnInc = document.getElementById('btn-tab-income');
    const btnCum = document.getElementById('btn-tab-cum');
    const btnClassOn = 'bg-white text-gray-800 shadow-sm rounded-md px-3 py-1 transition-all';
    const btnClassOff = 'text-gray-400 hover:text-gray-600 px-3 py-1 transition-all';

    if (btnExp && btnInc && btnCum) {
        btnExp.className = mode === 'expense' ? btnClassOn : btnClassOff;
        btnInc.className = mode === 'income' ? btnClassOn : btnClassOff;
        btnCum.className = mode === 'cumulative' ? btnClassOn : btnClassOff;
    }

    const chartEl = document.getElementById('mainChart');
    const noDataEl = document.getElementById('no-chart-data');
    const totalAmountEl = document.getElementById('chart-total-amount');
    const chartWrapper = document.getElementById('chart-wrapper');

    const existingChart = Chart.getChart(chartEl);
    if (existingChart) existingChart.destroy();

    if (mode === 'cumulative') {
        if (totalAmountEl) {
            const titleText = window.showCumulativeIncome
                ? '지난달 vs 이번달 (수입/지출)'
                : '지난달 vs 이번달 (지출)';
            const titleColor = window.showCumulativeIncome ? 'text-gray-600' : 'text-red-500';
            totalAmountEl.innerHTML = `<span class="text-sm font-bold ${titleColor} truncate">${titleText}</span>`;
            totalAmountEl.className = 'flex-1 mb-1 flex justify-end items-center min-w-0 pl-2';
        }

        if (chartWrapper) {
            chartWrapper.classList.add('relative');
            const oldToggle = document.getElementById('chart-income-toggle');
            if (oldToggle) oldToggle.remove();

            const isChecked = window.showCumulativeIncome ? 'checked' : '';
            chartWrapper.insertAdjacentHTML(
                'beforeend',
                `
                <label id="chart-income-toggle" class="absolute top-2 left-2 z-10 flex items-center gap-1.5 cursor-pointer bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-md border border-gray-200 shadow-sm transition active:scale-95">
                    <input type="checkbox" ${isChecked} onchange="window.toggleCumIncome(this.checked)" class="w-3.5 h-3.5 text-blue-500 rounded border-gray-300 focus:ring-blue-500 cursor-pointer">
                    <span class="text-[10px] ${window.showCumulativeIncome ? 'text-blue-600 font-bold' : 'text-gray-500 font-medium'} leading-none mt-px whitespace-nowrap">수입 포함</span>
                </label>
            `
            );
        }

        let prevY = targetY;
        let prevM = targetM - 1;
        if (prevM < 0) {
            prevM = 11;
            prevY--;
        }
        const prevPrefix = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;

        const daysInMonth = new Date(targetY, targetM + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const currentExpenses = globalData.filter(
            (d) => d.Type === 'expense' && d.Date?.startsWith(prefix)
        );
        const prevExpenses = globalData.filter(
            (d) => d.Type === 'expense' && d.Date?.startsWith(prevPrefix)
        );
        const currentIncomes = globalData.filter(
            (d) => d.Type === 'income' && d.Date?.startsWith(prefix)
        );
        const prevIncomes = globalData.filter(
            (d) => d.Type === 'income' && d.Date?.startsWith(prevPrefix)
        );

        const currentCum = new Array(daysInMonth).fill(null);
        const prevCum = new Array(daysInMonth).fill(null);
        const currentIncCum = new Array(daysInMonth).fill(null);
        const prevIncCum = new Array(daysInMonth).fill(null);

        let currentSum = 0,
            prevSum = 0,
            currentIncSum = 0,
            prevIncSum = 0;
        const today = new Date();
        const isActualCurrentMonth =
            targetY === today.getFullYear() && targetM === today.getMonth();
        const todayDate = today.getDate();
        const daysInPrevMonth = new Date(prevY, prevM + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            if (i <= daysInPrevMonth) {
                const pDayStr = String(i).padStart(2, '0');
                prevSum += prevExpenses
                    .filter((d) => d.Date.substring(8, 10) === pDayStr)
                    .reduce((a, b) => a + Number(b.Amount), 0);
                prevIncSum += prevIncomes
                    .filter((d) => d.Date.substring(8, 10) === pDayStr)
                    .reduce((a, b) => a + Number(b.Amount), 0);
            }
            prevCum[i - 1] = prevSum;
            prevIncCum[i - 1] = prevIncSum;

            if (!(isActualCurrentMonth && i > todayDate)) {
                const cDayStr = String(i).padStart(2, '0');
                currentSum += currentExpenses
                    .filter((d) => d.Date.substring(8, 10) === cDayStr)
                    .reduce((a, b) => a + Number(b.Amount), 0);
                currentIncSum += currentIncomes
                    .filter((d) => d.Date.substring(8, 10) === cDayStr)
                    .reduce((a, b) => a + Number(b.Amount), 0);
                currentCum[i - 1] = currentSum;
                currentIncCum[i - 1] = currentIncSum;
            }
        }

        if (chartWrapper) chartWrapper.style.display = 'flex';
        if (noDataEl) noDataEl.classList.add('hidden');

        const chartDatasets = [];

        if (window.showCumulativeIncome) {
            chartDatasets.push({
                label: '지난달 수입',
                data: prevIncCum,
                borderColor: '#93c5fd',
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderDash: [3, 3],
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.3,
                hidden: true,
            });
            chartDatasets.push({
                label: '이번달 수입',
                data: currentIncCum,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.3,
            });
        }

        chartDatasets.push({
            label: '지난달 지출',
            data: prevCum,
            borderColor: '#d1d5db',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
        });
        chartDatasets.push({
            label: '이번달 지출',
            data: currentCum,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderWidth: 2.5,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.3,
        });

        new Chart(chartEl.getContext('2d'), {
            type: 'line',
            plugins: [ChartDataLabels],
            data: { labels: labels, datasets: chartDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 20, bottom: 0, left: 10, right: 10 } },
                interaction: { mode: 'index', intersect: false },
                elements: { point: { radius: 0, hitRadius: 10, hoverRadius: 5 } },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 8,
                            usePointStyle: true,
                            font: { size: 9, family: "'Pretendard', sans-serif" },
                        },
                    },
                    datalabels: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 11 },
                        bodyFont: { size: 11, weight: 'bold' },
                        padding: 10,
                        callbacks: {
                            title: (items) => `${items[0].label}일 누적액`,
                            label: (context) => {
                                if (context.parsed.y !== null && context.parsed.y > 0) {
                                    return ` ${context.dataset.label}: ${typeof formatMoney === 'function' ? formatMoney(context.parsed.y) : context.parsed.y.toLocaleString()}`;
                                }
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 7, font: { size: 9 }, color: '#9ca3af' },
                    },
                    y: { display: false, min: 0 },
                },
            },
        });
    } else {
        const oldToggle = document.getElementById('chart-income-toggle');
        if (oldToggle) oldToggle.remove();

        const isExpense = mode === 'expense';
        const filteredData = globalData.filter(
            (d) => d.Type === mode && d.Date?.startsWith(prefix)
        );

        let sum = 0;
        const catTotals = {};
        filteredData.forEach((item) => {
            const cat = globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
            catTotals[cat] = (catTotals[cat] || 0) + Number(item.Amount);
            sum += Number(item.Amount);
        });

        if (totalAmountEl) {
            const textColor = isExpense ? 'text-red-500' : 'text-blue-500';
            totalAmountEl.innerHTML = `<span class="text-sm font-bold ${textColor} truncate">총 ${typeof formatMoney === 'function' ? formatMoney(sum) : sum.toLocaleString()}</span>`;
            totalAmountEl.className = 'flex-1 mb-1 flex justify-end items-center min-w-0 pl-2';
        }

        if (!filteredData.length) {
            if (chartWrapper) chartWrapper.style.display = 'none';
            if (noDataEl) {
                noDataEl.innerText = isExpense ? '지출 내역이 없습니다.' : '수입 내역이 없습니다.';
                noDataEl.classList.remove('hidden');
            }
        } else {
            if (chartWrapper) chartWrapper.style.display = 'flex';
            if (noDataEl) noDataEl.classList.add('hidden');

            const sortedCategories = [];
            for (const [cat, val] of Object.entries(catTotals)) {
                if (val > 0) sortedCategories.push({ label: cat, value: val });
            }
            sortedCategories.sort((a, b) => b.value - a.value);

            const chartLabels = sortedCategories.map((item) => item.label);
            const chartData = sortedCategories.map((item) => item.value);

            const colorsExpense = [
                '#ef4444',
                '#f59e0b',
                '#3b82f6',
                '#10b981',
                '#8b5cf6',
                '#6366f1',
                '#ec4899',
            ];
            const colorsIncome = [
                '#3b82f6',
                '#10b981',
                '#0ea5e9',
                '#6366f1',
                '#8b5cf6',
                '#d946ef',
                '#f43f5e',
            ];

            new Chart(chartEl.getContext('2d'), {
                type: 'doughnut',
                plugins: [ChartDataLabels],
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            data: chartData,
                            backgroundColor: isExpense ? colorsExpense : colorsIncome,
                            borderWidth: 2,
                            borderColor: '#ffffff',
                            hoverOffset: 4,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 20, bottom: 20, left: 35, right: 10 } },
                    onClick: (event, elements, chart) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const categoryLabel = chart.data.labels[index];
                            if (typeof openCategoryDetailModal === 'function')
                                openCategoryDetailModal(categoryLabel, mode, prefix);
                        }
                    },
                    onHover: (event, elements) => {
                        event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
                    },
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 8,
                                padding: 12,
                                font: { size: 9, family: "'Pretendard', sans-serif" },
                            },
                        },
                        datalabels: {
                            color: '#4b5563',
                            anchor: 'end',
                            align: 'end',
                            offset: 4,
                            font: { weight: 'bold', size: 10, family: "'Pretendard', sans-serif" },
                            formatter: (value, ctx) => {
                                let totalSum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                let percentage = ((value * 100) / totalSum).toFixed(0) + '%';
                                if ((value * 100) / totalSum <= 4) return null;
                                return percentage;
                            },
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    let label = context.label || '';
                                    if (label) label += ': ';
                                    if (context.parsed !== null)
                                        label +=
                                            typeof formatMoney === 'function'
                                                ? formatMoney(context.parsed)
                                                : context.parsed.toLocaleString();
                                    return label;
                                },
                            },
                        },
                    },
                },
            });
        }
    }

    // ==========================================
    // 💳 하단 카드별 정산 리스트 렌더링
    // ==========================================
    try {
        const container = document.getElementById('card-stats-container');
        if (!container) return;

        window.cardStatMode = window.cardStatMode || 'calendar';
        const isBilling = window.cardStatMode === 'billing';

        const btnClassOn = 'bg-white text-gray-800 shadow-sm rounded-md px-2 py-1 transition-all';
        const btnClassOff = 'text-gray-400 hover:text-gray-600 px-2 py-1 transition-all';

        container.innerHTML = `
            <div class="flex justify-between items-end mb-3 mt-6">
                <h3 class="text-xs font-bold text-gray-500">카드별 결제액</h3>
                <div class="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button onclick="setCardStatMode('calendar')" class="${!isBilling ? btnClassOn : btnClassOff}">1일~말일</button>
                    <button onclick="setCardStatMode('billing')" class="${isBilling ? btnClassOn : btnClassOff}">기준일</button>
                </div>
            </div>`;

        const cardSums = {};
        const cardDiscounts = {};

        globalData.forEach((item) => {
            if (item.Type !== 'expense') return;
            const parsed =
                typeof parseMemo === 'function'
                    ? parseMemo(item.Memo)
                    : { payMethod: item.Memo, discount: 0 };
            const cardDef = globalCards.find((c) => c.Label.split('|')[0] === parsed.payMethod);
            if (!cardDef) return;

            const dayStr = cardDef.Label.split('|')[1] || '31';
            const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';
            let isTargetMonth = false;

            if (isBilling) {
                const d = new Date(item.Date);
                let y = d.getFullYear(),
                    m = d.getMonth();
                if (!isEnd && d.getDate() > parseInt(dayStr)) {
                    m++;
                    if (m > 11) {
                        m = 0;
                        y++;
                    }
                }
                if (`${y}-${String(m + 1).padStart(2, '0')}` === prefix) {
                    isTargetMonth = true;
                }
            } else {
                if (item.Date.startsWith(prefix)) {
                    isTargetMonth = true;
                }
            }

            if (isTargetMonth) {
                cardSums[parsed.payMethod] =
                    (cardSums[parsed.payMethod] || 0) + Number(item.Amount);
                cardDiscounts[parsed.payMethod] =
                    (cardDiscounts[parsed.payMethod] || 0) + (parsed.discount || 0);
            }
        });

        const cardStatsList = [];

        globalCards.forEach((card) => {
            const [name, dayStr] = card.Label.split('|');
            const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';

            let start, end;
            if (isBilling) {
                if (isEnd) {
                    start = new Date(targetY, targetM, 1);
                    end = new Date(targetY, targetM + 1, 0);
                } else {
                    const closingDay = parseInt(dayStr);
                    end = new Date(targetY, targetM, closingDay);
                    start = new Date(targetY, targetM - 1, closingDay + 1);
                }
            } else {
                start = new Date(targetY, targetM, 1);
                end = new Date(targetY, targetM + 1, 0);
            }

            const displayDay = isBilling ? (isEnd ? '말일' : `${dayStr}일`) : '1일~말일';
            const amount = cardSums[name] || 0;
            const discount = cardDiscounts[name] || 0;

            if (amount > 0) {
                cardStatsList.push({ name, displayDay, start, end, amount, discount });
            }
        });

        cardStatsList.sort((a, b) => {
            if (b.amount !== a.amount) return b.amount - a.amount;
            return a.name.localeCompare(b.name);
        });

        cardStatsList.forEach((stat) => {
            container.insertAdjacentHTML(
                'beforeend',
                `<div onclick="if(typeof openCardDetailModal === 'function') openCardDetailModal('${stat.name}', '${prefix}', '${window.cardStatMode}')" class="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 mb-2 shadow-sm cursor-pointer hover:bg-gray-200 active:scale-[0.99] transition flex justify-between items-center">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center mb-1">
                            <span class="text-sm font-extrabold text-gray-800 leading-none truncate">${stat.name}</span>
                            <span class="text-[10px] text-indigo-500 font-bold ml-1 shrink-0">기준: ${stat.displayDay}</span>
                        </div>
                        <div class="text-[10px] text-gray-400 flex items-center gap-1">
                            <span class="material-symbols-outlined text-[12px]">calendar_today</span>
                            ${stat.start.toLocaleDateString()} ~ ${stat.end.toLocaleDateString()}
                        </div>
                    </div>
                    <div class="text-right shrink-0 ml-3">
                        <p class="text-sm font-black text-gray-900 leading-none">${typeof formatMoney === 'function' ? formatMoney(stat.amount) : stat.amount.toLocaleString()}</p>
                        ${stat.discount > 0 ? `<p class="text-[10px] text-blue-500 mt-1 font-bold tracking-tight">할인 ${typeof formatMoney === 'function' ? formatMoney(stat.discount) : stat.discount.toLocaleString()}</p>` : ''}
                    </div>
                </div>`
            );
        });

        if (cardStatsList.length === 0) {
            container.insertAdjacentHTML(
                'beforeend',
                '<p class="text-center text-gray-400 text-sm py-4 font-medium">이번달 정산될 카드 내역이 없습니다.</p>'
            );
        }
    } catch (e) {
        console.error('카드 리스트 렌더링 중 에러 발생:', e);
    }
};

// ==========================================
// 📈 환율 미니 차트 (Sparkline) 팝업 기능
// ==========================================
window.exchangeMiniChartInstance = null;

window.toggleExchangeRateChart = () => {
    const popup = document.getElementById('exchange-chart-popup');
    if (!popup) return;

    if (popup.classList.contains('hidden')) {
        popup.classList.remove('hidden');
        if (typeof renderExchangeMiniChart === 'function') renderExchangeMiniChart();
    } else {
        popup.classList.add('hidden');
    }
};

window.renderExchangeMiniChart = async () => {
    const canvas = document.getElementById('exchangeMiniChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (window.exchangeMiniChartInstance) {
        window.exchangeMiniChartInstance.destroy();
        window.exchangeMiniChartInstance = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 11px 'Pretendard', sans-serif";
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('실제 환율 데이터를 불러오는 중...', 10, 40);

    try {
        const labels = [];
        const data = [];
        const fetchPromises = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);

            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateString = `${yyyy}-${mm}-${dd}`;

            labels.push(`${d.getMonth() + 1}/${d.getDate()}`);

            const apiUrl =
                i === 0
                    ? 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json'
                    : `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateString}/v1/currencies/cny.json`;

            fetchPromises.push(
                fetch(apiUrl)
                    .then((res) => res.json())
                    .then((json) => json.cny.krw)
                    .catch((err) => null)
            );
        }

        const results = await Promise.all(fetchPromises);

        const currentRateEl = document.getElementById('cny-rate-value');
        let fallbackRate = 185.0;
        if (currentRateEl && currentRateEl.innerText !== '...') {
            fallbackRate = parseFloat(currentRateEl.innerText.replace(/,/g, ''));
        }

        results.forEach((rate) => {
            data.push(rate ? +rate.toFixed(1) : fallbackRate);
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        window.exchangeMiniChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#4f46e5',
                        fill: true,
                        tension: 0.4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        display: true,
                        align: 'top',
                        anchor: 'end',
                        offset: 3,
                        color: '#4f46e5',
                        font: { size: 9, weight: '900' },
                        formatter: function (value) {
                            return value.toFixed(1);
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.parsed.y + '원';
                            },
                        },
                        displayColors: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { size: 10 },
                        bodyFont: { size: 11, weight: 'bold' },
                        padding: 8,
                    },
                },
                scales: {
                    x: { ticks: { font: { size: 9 }, color: '#9ca3af' }, grid: { display: false } },
                    y: {
                        display: false,
                        suggestedMin: Math.min(...data) - 1,
                        suggestedMax: Math.max(...data) + 2,
                    },
                },
                layout: { padding: { top: 15, bottom: 0, left: 10, right: 10 } },
            },
        });
    } catch (error) {
        console.error('환율 데이터 로드 실패:', error);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillText('데이터를 불러오지 못했습니다.', 10, 40);
    }
};

document.addEventListener('click', (e) => {
    const popup = document.getElementById('exchange-chart-popup');
    const badge = document.getElementById('exchange-rate-badge');

    if (popup && badge && !popup.classList.contains('hidden')) {
        if (!badge.contains(e.target) && !popup.contains(e.target)) {
            popup.classList.add('hidden');
        }
    }
});
