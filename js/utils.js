window.showLoader = () => document.getElementById('global-loader')?.classList.remove('hidden');
window.hideLoader = () => document.getElementById('global-loader')?.classList.add('hidden');

// 화폐 단위 포맷팅
window.formatMoney = (amount) => {
    const num = Number(amount);
    if (isNaN(num)) return currentCountry === 'KR' ? '0원' : '¥0';
    return currentCountry === 'KR'
        ? num.toLocaleString('ko-KR') + '원'
        : '¥' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// 메모 및 결제수단 파싱
window.parseMemo = (rawMemo) => {
    const lines = (rawMemo || '').split('\n');
    let itemName = lines[0] || '내역 없음';
    let payMethod = '현금';
    let discount = 0;
    let detailLines = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('PAY:')) payMethod = line.substring(4).split('|')[0];
        else if (line.startsWith('DISC:')) discount = Number(line.substring(5)) || 0;
        else detailLines.push(line);
    }
    return { itemName, payMethod, discount, detailMemo: detailLines.join('\n') };
};

// 내역을 날짜별로 묶고 현재 목록 정렬 설정을 적용합니다.
window.groupTransactionsByDate = (items, sortOrder = window.listSortOrder) => {
    const grouped = new Map();
    items.forEach((item) => {
        const date = String(item.Date || '').slice(0, 10);
        if (!grouped.has(date)) grouped.set(date, []);
        grouped.get(date).push(item);
    });

    return [...grouped.entries()]
        .sort(([dateA], [dateB]) =>
            sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA)
        )
        .map(([date, dateItems]) => ({
            date,
            items: sortOrder === 'desc' ? [...dateItems].reverse() : dateItems,
        }));
};

// 상세 내역 모달에서 공통 날짜 헤더를 출력합니다.
window.renderTransactionDateHeader = (container, date) => {
    const parsedDate = new Date(`${date}T00:00:00`);
    const displayDate =
        typeof window.formatDateStr === 'function' ? window.formatDateStr(parsedDate) : date;
    container.insertAdjacentHTML(
        'beforeend',
        `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
            <span class="material-symbols-outlined text-[14px]">calendar_today</span>
            ${displayDate}
        </div>`
    );
};

// 상세 내역 모달에서 공통 거래 항목을 출력합니다.
window.renderTransactionRow = (container, item, options = {}) => {
    const parsed = window.parseMemo(item.Memo);
    const categoryLabel =
        options.categoryLabel ??
        (globalCategories.find((category) => category.Value === item.Category)?.Label ||
            item.Category ||
            '미분류');
    const isExpense = item.Type === 'expense';
    const amount = Number(item.Amount);
    const displaySign = amount < 0 ? '-' : '';
    const displayColor = isExpense ? 'text-red-500' : 'text-blue-500';
    const iconColor = isExpense ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
    const iconName = window.getCategoryIcon(categoryLabel);
    const krwValue = window.getKrwEquivalent?.(Math.abs(amount)) || '';
    const detailLabel = options.showPayMethod === false
        ? escapeHTML(categoryLabel)
        : `${escapeHTML(categoryLabel)} • ${escapeHTML(parsed.payMethod)}`;
    const shadowClass = options.shadow === false ? '' : ' shadow-sm';
    const formattedAmount = window.formatMoney(Math.abs(amount));
    const formattedDiscount = window.formatMoney(parsed.discount);

    container.insertAdjacentHTML(
        'beforeend',
        `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition${shadowClass}">
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
                <div class="${iconColor} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-sm">${iconName}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center">
                        <p class="text-sm font-bold text-gray-800 truncate">${escapeHTML(parsed.itemName)}</p>
                        ${item.rankBadge || ''}
                    </div>
                    <p class="text-[10px] text-gray-400 mt-1 truncate">${detailLabel}</p>
                </div>
            </div>
            <div class="text-right shrink-0 ml-3">
                <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${formattedAmount}</p>
                ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${formattedDiscount}</p>` : ''}
            </div>
        </div>`
    );
};

// 스마트 아이콘 매핑
window.getCategoryIcon = (label) => {
    const text = (label || '').replace(/\s+/g, '');
    if (/식비|외식|식재료|마트/.test(text)) return 'restaurant';
    if (/카페|커피|간식|디저트/.test(text)) return 'local_cafe';
    if (/교통|주유|택시|버스|자동차/.test(text)) return 'commute';
    if (/쇼핑|의류|생활|물건|미용/.test(text)) return 'shopping_cart';
    if (/주거|관리비|공과금|통신|인터넷/.test(text)) return 'home';
    if (/병원|의료|약국|건강|운동/.test(text)) return 'medical_services';
    if (/교육|학원|책|도서/.test(text)) return 'school';
    if (/문화|여가|취미|여행|영화/.test(text)) return 'flight';
    if (/경조사|선물|용돈/.test(text)) return 'redeem';
    if (/육아|아이|장난감/.test(text)) return 'child_care';
    if (/월급|급여|수입|부수입/.test(text)) return 'account_balance';
    if (/저축|투자/.test(text)) return 'savings';
    return 'payments';
};
