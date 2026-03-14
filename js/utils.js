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
