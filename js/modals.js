// ==========================================
// 🗔 모달(팝업) 및 드롭다운 전용 로직 (modals.js)
// ==========================================

window.renderCardDropdown = () => {
    const select = document.getElementById('input-card-select');
    if (!select) return;
    select.innerHTML = '<option value="">카드 선택</option>';
    globalCards.forEach((c) => {
        const name = c.Label.split('|')[0];
        select.insertAdjacentHTML(
            'beforeend',
            `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`
        );
    });
};

window.renderCategoryDropdown = (type) => {
    const select = document.getElementById('input-category');
    if (!select) return;
    select.innerHTML = '<option value="">카테고리 선택</option>';

    const savedOrder = JSON.parse(localStorage.getItem('categoryOrder')) || [];

    globalCategories
        .filter((c) => c.Type === type)
        .sort((a, b) => {
            const idxA = savedOrder.indexOf(a.Value);
            const idxB = savedOrder.indexOf(b.Value);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.Label.localeCompare(b.Label);
        })
        .forEach((c) =>
            select.insertAdjacentHTML('beforeend', `<option value="${c.Value}">${c.Label}</option>`)
        );
};

window.toggleCardSelect = () => {
    const isCard = document.querySelector('input[name="pay_type"]:checked')?.value === 'card';
    document.getElementById('input-card-select')?.classList.toggle('hidden', !isCard);
    document.getElementById('discount-area')?.classList.toggle('hidden', !isCard);
    if (!isCard) document.getElementById('input-discount').value = '';
};

// 💡 새 내역 추가 모달
window.openAddModal = () => {
    document.getElementById('modal-title').innerText = '새 내역 추가';
    document.getElementById('add-form').reset();
    document.getElementById('input-id').value = '';
    document.getElementById('input-action').value = 'create';

    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    document.getElementById('input-date').value = localDate;

    document.getElementById('save-btn').innerText = '저장하기';
    document.getElementById('delete-btn').classList.add('hidden');
    document.getElementById('payment-section').classList.remove('hidden');

    renderCardDropdown();
    toggleCardSelect();
    renderCategoryDropdown('expense');

    const modal = document.getElementById('add-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('modal-content').classList.remove('translate-y-full');
    }, 10);

    const amountInput = document.getElementById('input-amount');
    if (!document.getElementById('krw-guide-text')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative flex items-center w-full';
        amountInput.parentNode.insertBefore(wrapper, amountInput);
        wrapper.appendChild(amountInput);
        amountInput.classList.add('pr-[80px]');

        const guide = document.createElement('span');
        guide.id = 'krw-guide-text';
        guide.className =
            'absolute right-3 text-[12px] text-blue-500 font-bold hidden pointer-events-none bg-transparent text-right truncate';
        wrapper.appendChild(guide);
        amountInput.addEventListener('input', window.updateKrwGuide);
    }
    if (typeof window.updateKrwGuide === 'function') window.updateKrwGuide();
};

// 💡 기존 내역 수정 모달
window.openEditModal = (id) => {
    const item = globalData.find((d) => d.ID === id);
    if (!item) return;
    document.getElementById('modal-title').innerText = '내역 수정';
    document.getElementById('input-id').value = item.ID;
    document.getElementById('input-action').value = 'update';
    document.querySelector(`input[name="type"][value="${item.Type}"]`).checked = true;
    renderCategoryDropdown(item.Type);
    document.getElementById('input-date').value = item.Date.substring(0, 10);
    document.getElementById('input-category').value = item.Category;

    const parsed =
        typeof parseMemo === 'function'
            ? parseMemo(item.Memo)
            : { itemName: item.Memo, discount: 0, payMethod: '현금', detailMemo: '' };
    const originalPrice = Number(item.Amount) + parsed.discount;

    document.getElementById('input-amount').value = originalPrice.toLocaleString('ko-KR');
    document.getElementById('input-discount').value =
        parsed.discount > 0 ? parsed.discount.toLocaleString('ko-KR') : '';
    document.getElementById('input-item-name').value = parsed.itemName;
    document.getElementById('input-memo-detail').value = parsed.detailMemo;

    const paySection = document.getElementById('payment-section');
    if (item.Type === 'income') {
        paySection.classList.add('hidden');
    } else {
        paySection.classList.remove('hidden');
        renderCardDropdown();
        if (parsed.payMethod === '현금') {
            document.querySelector('input[name="pay_type"][value="cash"]').checked = true;
        } else {
            document.querySelector('input[name="pay_type"][value="card"]').checked = true;
            document.getElementById('input-card-select').value = parsed.payMethod;
        }
        toggleCardSelect();
    }
    document.getElementById('save-btn').innerText = '수정하기';
    document.getElementById('delete-btn').classList.remove('hidden');

    const modal = document.getElementById('add-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('modal-content').classList.remove('translate-y-full');
    }, 10);

    const amountInput = document.getElementById('input-amount');
    if (!document.getElementById('krw-guide-text')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative flex items-center w-full';
        amountInput.parentNode.insertBefore(wrapper, amountInput);
        wrapper.appendChild(amountInput);
        amountInput.classList.add('pr-[80px]');

        const guide = document.createElement('span');
        guide.id = 'krw-guide-text';
        guide.className =
            'absolute right-3 text-[12px] text-blue-500 font-bold hidden pointer-events-none bg-transparent text-right truncate';
        wrapper.appendChild(guide);
        amountInput.addEventListener('input', window.updateKrwGuide);
    }
    if (typeof window.updateKrwGuide === 'function') window.updateKrwGuide();
};

window.closeAddModal = () => {
    const modal = document.getElementById('add-modal');
    modal.classList.add('opacity-0');
    document.getElementById('modal-content').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

// 💡 신용카드 관리 모달
window.openCardModal = () => {
    const btnCard = document.getElementById('btn-add-card');
    if (btnCard) {
        btnCard.innerText = '추가';
        btnCard.className =
            'bg-primary text-white px-3 py-2 text-sm rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors';
        btnCard.onclick = typeof addCard === 'function' ? addCard : null;
    }
    document.getElementById('new-card-label').value = '';
    document.getElementById('new-card-day').value = '';

    const container = document.getElementById('card-list-container');
    container.innerHTML = globalCards.length
        ? ''
        : '<li class="py-4 text-center text-gray-500 text-sm">카드가 없습니다.</li>';

    globalCards.forEach((c) => {
        const [name, dayStr] = c.Label.split('|');
        const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';
        const displayDay = isEnd ? '말일' : `${dayStr}일`;

        container.insertAdjacentHTML(
            'beforeend',
            `<li class="py-1.5 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-800">${escapeHTML(name)}</span>
                    <span class="text-[10px] text-gray-400">기준: ${displayDay}</span>
                </div>
                <div class="flex gap-1 shrink-0">
                    <button onclick="prepareEditCard('${c.Value}', '${escapeHTML(name)}', '${dayStr}')" class="text-gray-400 hover:text-blue-500 transition p-1">
                        <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onclick="if(typeof deleteCard === 'function') deleteCard('${c.Value}')" class="text-gray-400 hover:text-red-500 transition p-1">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            </li>`
        );
    });

    document.getElementById('card-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('card-modal').classList.remove('opacity-0');
        document.getElementById('card-modal-content').classList.remove('scale-95');
    }, 10);
};

window.prepareEditCard = (val, name, dayStr) => {
    document.getElementById('new-card-label').value = name;
    document.getElementById('new-card-day').value =
        dayStr === '말' || dayStr === '말일' || dayStr === '31' ? '말' : dayStr;

    const btn = document.getElementById('btn-add-card');
    btn.innerText = '수정';
    btn.className =
        'bg-blue-500 text-white px-3 py-2 text-sm rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors shadow-md';
    btn.onclick = () => {
        if (typeof submitEditCard === 'function') submitEditCard(val);
    };
};

window.closeCardModal = () => {
    document.getElementById('card-modal').classList.add('opacity-0');
    setTimeout(() => document.getElementById('card-modal').classList.add('hidden'), 300);
};

// 💡 카테고리 관리 모달
window.openCategoryModal = () => {
    const btnCat = document.getElementById('btn-add-cat');
    if (btnCat) {
        btnCat.innerText = '추가';
        btnCat.className =
            'bg-primary text-white px-3 py-2 text-sm rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors';
        btnCat.onclick = typeof addCategory === 'function' ? addCategory : null;
    }
    document.getElementById('new-cat-label').value = '';

    const container = document.getElementById('category-list-container');
    container.innerHTML = '';

    const savedOrder = JSON.parse(localStorage.getItem('categoryOrder')) || [];
    const sortedCategories = [...globalCategories].sort((a, b) => {
        const idxA = savedOrder.indexOf(a.Value);
        const idxB = savedOrder.indexOf(b.Value);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        if (a.Type !== b.Type) return a.Type === 'income' ? -1 : 1;
        return a.Label.localeCompare(b.Label);
    });

    if (sortedCategories.length === 0) {
        container.innerHTML =
            '<li class="py-4 text-center text-gray-500 text-sm">카테고리가 없습니다.</li>';
    } else {
        sortedCategories.forEach((c) => {
            const typeBadge =
                c.Type === 'expense'
                    ? '<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">지출</span>'
                    : '<span class="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">수입</span>';

            container.insertAdjacentHTML(
                'beforeend',
                `<li class="py-2 flex justify-between items-center gap-2 bg-white" data-id="${c.Value}">
                    <div class="flex items-center gap-2 overflow-hidden flex-1">
                        <span class="material-symbols-outlined text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 drag-handle text-[18px] p-1">menu</span>
                        ${typeBadge}
                        <span class="text-sm font-medium text-gray-800 truncate">${c.Label}</span>
                    </div>
                    <div class="flex gap-1 shrink-0">
                        <button onclick="prepareEditCategory('${c.Value}', '${c.Label}', '${c.Type}')" class="text-gray-400 hover:text-blue-500 transition p-1">
                            <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onclick="if(typeof deleteCategory === 'function') deleteCategory('${c.Value}')" class="text-gray-400 hover:text-red-500 transition p-1">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </li>`
            );
        });
    }

    if (window.categorySortable) {
        window.categorySortable.destroy();
    }
    if (typeof Sortable !== 'undefined') {
        window.categorySortable = new Sortable(container, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'bg-gray-50',
            onEnd: function () {
                const newOrder = Array.from(container.children).map((li) =>
                    li.getAttribute('data-id')
                );
                localStorage.setItem('categoryOrder', JSON.stringify(newOrder));
            },
        });
    }

    document.getElementById('category-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('category-modal').classList.remove('opacity-0'), 10);
};

window.prepareEditCategory = (val, label, type) => {
    document.getElementById('new-cat-type').value = type;
    document.getElementById('new-cat-label').value = label;
    const btn = document.getElementById('btn-add-cat');
    btn.innerText = '수정';
    btn.className =
        'bg-blue-500 text-white px-3 py-2 text-sm rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors shadow-md';
    btn.onclick = () => {
        if (typeof submitEditCategory === 'function') submitEditCategory(val);
    };
};

window.closeCategoryModal = () => document.getElementById('category-modal').classList.add('hidden');

// 💡 날짜별 상세 내역 (일간 상세 모달)
window.openWeeklyModal = function (clickedDateStr) {
    const targetDate = clickedDateStr.substring(0, 10);
    const d = new Date(targetDate);
    const displayDate =
        typeof window.formatDateStr === 'function' ? window.formatDateStr(d) : targetDate;

    const modal = document.getElementById('weekly-modal');
    const titleEl = modal.querySelector('h3');
    if (titleEl) titleEl.innerText = '일간 상세 내역';

    document.getElementById('weekly-date-range').innerHTML = `
        <div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
            <span class="material-symbols-outlined text-[14px]">calendar_today</span>
            ${displayDate}
        </div>
    `;

    const dailyData = globalData.filter((item) => item.Date.substring(0, 10) === targetDate);
    const container = document.getElementById('weekly-list-container');
    container.innerHTML = '';

    if (dailyData.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16">
                <span class="material-symbols-outlined text-gray-300 text-5xl mb-3">receipt_long</span>
                <p class="text-center text-gray-400 text-sm font-medium">이 날은 내역이 없습니다.</p>
            </div>`;
    } else {
        if (typeof applyTopRanks === 'function') applyTopRanks(dailyData);

        let itemsToRender = dailyData;
        if (window.listSortOrder === 'desc') {
            itemsToRender = [...dailyData].reverse();
        }

        itemsToRender.forEach((item) => {
            const isExp = item.Type === 'expense';
            let catLabel = '미분류';
            if (item.Category) {
                const foundCat = globalCategories.find((c) => c.Value === item.Category);
                catLabel = foundCat ? foundCat.Label : item.Category;
            }
            const parsed =
                typeof parseMemo === 'function'
                    ? parseMemo(item.Memo)
                    : { itemName: item.Memo, payMethod: '', discount: 0 };
            const iconName =
                typeof getCategoryIcon === 'function' ? getCategoryIcon(catLabel) : 'payments';
            const amountNum = Number(item.Amount);
            const displayColor = isExp ? 'text-red-500' : 'text-blue-500';
            const iconBg = isExp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
            const displaySign = amountNum < 0 ? '-' : '';

            let krwValue = '';
            if (typeof getKrwEquivalent === 'function')
                krwValue = getKrwEquivalent(Math.abs(amountNum));

            container.insertAdjacentHTML(
                'beforeend',
                `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                    <div class="flex items-center gap-2.5 flex-1 min-w-0">
                        <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm">${iconName}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center">
                                <p class="text-sm font-bold text-gray-800 truncate">${escapeHTML(parsed.itemName)}</p>
                                ${item.rankBadge || ''}
                            </div>
                            <p class="text-[10px] text-gray-400 mt-1 truncate">${escapeHTML(catLabel)} • ${escapeHTML(parsed.payMethod)}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0 ml-3">
                        <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${typeof formatMoney === 'function' ? formatMoney(Math.abs(amountNum)) : Math.abs(amountNum)}</p>
                        ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                        ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${typeof formatMoney === 'function' ? formatMoney(parsed.discount) : parsed.discount}</p>` : ''}
                    </div>
                </div>`
            );
        });
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('weekly-modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.closeWeeklyModal = function () {
    const modal = document.getElementById('weekly-modal');
    modal.classList.add('opacity-0');
    document.getElementById('weekly-modal-content').classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// 💡 카드 상세 내역 모달
window.openCardDetailModal = function (cardName, prefix, mode = 'calendar') {
    const cardDef = globalCards.find((c) => c.Label.split('|')[0] === cardName);
    if (!cardDef) return;

    const dayStr = cardDef.Label.split('|')[1] || '31';
    const isEnd = dayStr === '말' || dayStr === '말일' || dayStr === '31';
    const isBilling = mode === 'billing';

    const [targetY, targetMStr] = prefix.split('-');
    const year = parseInt(targetY);
    const month = parseInt(targetMStr) - 1;

    let start, end;
    if (isBilling) {
        if (isEnd) {
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0);
        } else {
            const closingDay = parseInt(dayStr);
            end = new Date(year, month, closingDay);
            start = new Date(year, month - 1, closingDay + 1);
        }
    } else {
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
    }

    document.getElementById('card-detail-title').innerText = `${cardName} 결제 내역`;
    document.getElementById('card-detail-date-range').innerText =
        `${start.toLocaleDateString()} ~ ${end.toLocaleDateString()} ${!isBilling ? '(달력 기준)' : ''}`;

    const filteredData = globalData.filter((item) => {
        if (item.Type !== 'expense') return false;
        const parsed =
            typeof parseMemo === 'function' ? parseMemo(item.Memo) : { payMethod: item.Memo };
        if (parsed.payMethod !== cardName) return false;

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
            return `${y}-${String(m + 1).padStart(2, '0')}` === prefix;
        } else {
            return item.Date.startsWith(prefix);
        }
    });

    const container = document.getElementById('card-detail-list-container');
    container.innerHTML = '';

    if (filteredData.length === 0) {
        container.innerHTML =
            '<p class="text-center text-gray-500 py-10 text-sm">결제 내역이 없습니다.</p>';
    } else {
        if (typeof applyTopRanks === 'function') applyTopRanks(filteredData);

        const groupedByDate = {};
        filteredData.forEach((item) => {
            const dateStr = item.Date.substring(0, 10);
            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
            groupedByDate[dateStr].push(item);
        });

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
            return window.listSortOrder === 'asc'
                ? new Date(a) - new Date(b)
                : new Date(b) - new Date(a);
        });

        const sortText =
            window.listSortOrder === 'asc' ? '과거순 (1일 ➔ 말일)' : '최신순 (말일 ➔ 1일)';
        container.insertAdjacentHTML(
            'beforeend',
            `
            <div class="flex justify-end mb-3 px-1">
                <button onclick="window.listSortOrder = window.listSortOrder === 'asc' ? 'desc' : 'asc'; localStorage.setItem('listSortOrder', window.listSortOrder); openCardDetailModal('${cardName}', '${prefix}', '${mode}');" class="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 font-bold bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm transition-all active:scale-95">
                    <span class="material-symbols-outlined text-[14px]">swap_vert</span>
                    ${sortText}
                </button>
            </div>
        `
        );

        sortedDates.forEach((dateStr) => {
            const d = new Date(dateStr);
            const displayDate =
                typeof window.formatDateStr === 'function' ? window.formatDateStr(d) : dateStr;

            container.insertAdjacentHTML(
                'beforeend',
                `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
                    <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                    ${displayDate}
                </div>`
            );

            let itemsForDate = groupedByDate[dateStr];
            if (window.listSortOrder === 'desc') {
                itemsForDate = [...itemsForDate].reverse();
            }

            itemsForDate.forEach((item) => {
                const parsed =
                    typeof parseMemo === 'function'
                        ? parseMemo(item.Memo)
                        : { itemName: item.Memo, discount: 0 };
                const catLabel =
                    globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
                const iconName =
                    typeof getCategoryIcon === 'function' ? getCategoryIcon(catLabel) : 'payments';
                const amountNum = Number(item.Amount);
                const displaySign = amountNum < 0 ? '-' : '';

                let krwValue = '';
                if (typeof getKrwEquivalent === 'function')
                    krwValue = getKrwEquivalent(Math.abs(amountNum));

                container.insertAdjacentHTML(
                    'beforeend',
                    `
                    <div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition">
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                            <div class="bg-red-100 text-red-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-sm">${iconName}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center">
                                    <p class="text-sm font-bold text-gray-800 truncate">${escapeHTML(parsed.itemName)}</p>
                                    ${item.rankBadge || ''}
                                </div>
                                <p class="text-[10px] text-gray-400 mt-1 truncate">${catLabel}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0 ml-3">
                            <p class="text-red-500 font-bold text-sm leading-none">${displaySign}${typeof formatMoney === 'function' ? formatMoney(Math.abs(amountNum)) : Math.abs(amountNum)}</p>
                            ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                            ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${typeof formatMoney === 'function' ? formatMoney(parsed.discount) : parsed.discount}</p>` : ''}
                        </div>
                    </div>
                `
                );
            });
        });
    }

    const modal = document.getElementById('card-detail-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('card-detail-modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.closeCardDetailModal = function () {
    const modal = document.getElementById('card-detail-modal');
    modal.classList.add('opacity-0');
    document.getElementById('card-detail-modal-content').classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// 💡 월간 수입/지출 클릭 시 전체 내역 모달
window.openMonthlyModal = function (type) {
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    const typeName = type === 'income' ? '수입' : '지출';
    const modal = document.getElementById('weekly-modal');
    const titleEl = modal.querySelector('h3');
    if (titleEl) titleEl.innerText = `${month}월 ${typeName} 상세 내역`;
    document.getElementById('weekly-date-range').innerText = `${year}년 ${month}월 전체`;

    const monthlyData = globalData.filter((item) => {
        return item.Date.startsWith(prefix) && item.Type === type;
    });

    const container = document.getElementById('weekly-list-container');
    container.innerHTML = '';

    if (monthlyData.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16">
                <span class="material-symbols-outlined text-gray-300 text-5xl mb-3">receipt_long</span>
                <p class="text-center text-gray-400 text-sm font-medium">이번달 ${typeName} 내역이 없습니다.</p>
            </div>`;
    } else {
        if (typeof applyTopRanks === 'function') applyTopRanks(monthlyData);

        const groupedByDate = {};
        monthlyData.forEach((item) => {
            const dateStr = item.Date.substring(0, 10);
            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
            groupedByDate[dateStr].push(item);
        });

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
            return window.listSortOrder === 'asc'
                ? new Date(a) - new Date(b)
                : new Date(b) - new Date(a);
        });

        const sortText =
            window.listSortOrder === 'asc' ? '과거순 (1일 ➔ 말일)' : '최신순 (말일 ➔ 1일)';
        container.insertAdjacentHTML(
            'beforeend',
            `
            <div class="flex justify-end mb-2 px-1">
                <button onclick="window.listSortOrder = window.listSortOrder === 'asc' ? 'desc' : 'asc'; localStorage.setItem('listSortOrder', window.listSortOrder); openMonthlyModal('${type}');" class="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 font-bold bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm transition-all active:scale-95">
                    <span class="material-symbols-outlined text-[14px]">swap_vert</span>
                    ${sortText}
                </button>
            </div>
        `
        );

        sortedDates.forEach((dateStr) => {
            const d = new Date(dateStr);
            const displayDate =
                typeof window.formatDateStr === 'function' ? window.formatDateStr(d) : dateStr;

            container.insertAdjacentHTML(
                'beforeend',
                `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
                    <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                    ${displayDate}
                </div>`
            );

            let itemsForDate = groupedByDate[dateStr];
            if (window.listSortOrder === 'desc') {
                itemsForDate = [...itemsForDate].reverse();
            }

            itemsForDate.forEach((item) => {
                const isExp = item.Type === 'expense';
                let catLabel = '미분류';
                if (item.Category) {
                    const foundCat = globalCategories.find((c) => c.Value === item.Category);
                    catLabel = foundCat ? foundCat.Label : item.Category;
                }
                const parsed =
                    typeof parseMemo === 'function'
                        ? parseMemo(item.Memo)
                        : { itemName: item.Memo, payMethod: '', discount: 0 };
                const iconName =
                    typeof getCategoryIcon === 'function' ? getCategoryIcon(catLabel) : 'payments';
                const amountNum = Number(item.Amount);
                const displayColor = isExp ? 'text-red-500' : 'text-blue-500';
                const iconBg = isExp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
                const displaySign = amountNum < 0 ? '-' : '';

                let krwValue = '';
                if (typeof getKrwEquivalent === 'function')
                    krwValue = getKrwEquivalent(Math.abs(amountNum));

                container.insertAdjacentHTML(
                    'beforeend',
                    `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                            <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-sm">${iconName}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center">
                                    <p class="text-sm font-bold text-gray-800 truncate">${escapeHTML(parsed.itemName)}</p>
                                    ${item.rankBadge || ''}
                                </div>
                                <p class="text-[10px] text-gray-400 mt-1 truncate">${escapeHTML(catLabel)} • ${escapeHTML(parsed.payMethod)}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0 ml-3">
                            <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${typeof formatMoney === 'function' ? formatMoney(Math.abs(amountNum)) : Math.abs(amountNum)}</p>
                            ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                            ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${typeof formatMoney === 'function' ? formatMoney(parsed.discount) : parsed.discount}</p>` : ''}
                        </div>
                    </div>`
                );
            });
        });
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('weekly-modal-content').classList.remove('translate-y-full');
    }, 10);
};

// 💡 도넛 차트 카테고리 클릭 시 상세 내역 모달
window.openCategoryDetailModal = function (categoryLabel, type, prefix) {
    const typeName = type === 'income' ? '수입' : '지출';
    const modal = document.getElementById('weekly-modal');
    const titleEl = modal.querySelector('h3');

    if (titleEl) titleEl.innerText = `${categoryLabel} 상세 내역`;

    const [year, month] = prefix.split('-');
    document.getElementById('weekly-date-range').innerText =
        `${year}년 ${parseInt(month)}월 ${typeName}`;

    const catData = globalData.filter((item) => {
        if (!item.Date.startsWith(prefix) || item.Type !== type) return false;
        const itemCatLabel =
            globalCategories.find((c) => c.Value === item.Category)?.Label || '미분류';
        return itemCatLabel === categoryLabel;
    });

    const container = document.getElementById('weekly-list-container');
    container.innerHTML = '';

    if (catData.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16">
                <span class="material-symbols-outlined text-gray-300 text-5xl mb-3">receipt_long</span>
                <p class="text-center text-gray-400 text-sm font-medium">내역이 없습니다.</p>
            </div>`;
    } else {
        if (typeof applyTopRanks === 'function') applyTopRanks(catData);

        const groupedByDate = {};
        catData.forEach((item) => {
            const dateStr = item.Date.substring(0, 10);
            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
            groupedByDate[dateStr].push(item);
        });

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
            return window.listSortOrder === 'asc'
                ? new Date(a) - new Date(b)
                : new Date(b) - new Date(a);
        });

        const sortText =
            window.listSortOrder === 'asc' ? '과거순 (1일 ➔ 말일)' : '최신순 (말일 ➔ 1일)';
        container.insertAdjacentHTML(
            'beforeend',
            `
            <div class="flex justify-end mb-2 px-1">
                <button onclick="window.listSortOrder = window.listSortOrder === 'asc' ? 'desc' : 'asc'; localStorage.setItem('listSortOrder', window.listSortOrder); openCategoryDetailModal('${categoryLabel}', '${type}', '${prefix}');" class="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 font-bold bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-sm transition-all active:scale-95">
                    <span class="material-symbols-outlined text-[14px]">swap_vert</span>
                    ${sortText}
                </button>
            </div>
        `
        );

        sortedDates.forEach((dateStr) => {
            const d = new Date(dateStr);
            const displayDate =
                typeof window.formatDateStr === 'function' ? window.formatDateStr(d) : dateStr;

            container.insertAdjacentHTML(
                'beforeend',
                `<div class="mt-5 mb-2 px-1 text-xs font-bold text-gray-500 flex items-center gap-1 border-b border-gray-100 pb-1">
                    <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                    ${displayDate}
                </div>`
            );

            let itemsForDate = groupedByDate[dateStr];
            if (window.listSortOrder === 'desc') {
                itemsForDate = [...itemsForDate].reverse();
            }

            itemsForDate.forEach((item) => {
                const parsed =
                    typeof parseMemo === 'function'
                        ? parseMemo(item.Memo)
                        : { itemName: item.Memo, payMethod: '', discount: 0 };
                const isExp = item.Type === 'expense';
                const iconName =
                    typeof getCategoryIcon === 'function'
                        ? getCategoryIcon(categoryLabel)
                        : 'payments';
                const amountNum = Number(item.Amount);
                const displayColor = isExp ? 'text-red-500' : 'text-blue-500';
                const iconBg = isExp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
                const displaySign = amountNum < 0 ? '-' : '';

                let krwValue = '';
                if (typeof getKrwEquivalent === 'function')
                    krwValue = getKrwEquivalent(Math.abs(amountNum));

                container.insertAdjacentHTML(
                    'beforeend',
                    `<div onclick="openEditModal('${item.ID}')" class="bg-gray-50 px-3 py-2 rounded-xl mb-2 flex justify-between items-center border border-gray-100 cursor-pointer hover:bg-gray-100 transition shadow-sm">
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                            <div class="${iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-sm">${iconName}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center">
                                    <p class="text-sm font-bold text-gray-800 truncate">${escapeHTML(parsed.itemName)}</p>
                                    ${item.rankBadge || ''}
                                </div>
                                <p class="text-[10px] text-gray-400 mt-1 truncate">${escapeHTML(categoryLabel)} • ${escapeHTML(parsed.payMethod)}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0 ml-3">
                            <p class="${displayColor} font-bold text-sm leading-none">${displaySign}${typeof formatMoney === 'function' ? formatMoney(Math.abs(amountNum)) : Math.abs(amountNum)}</p>
                            ${krwValue ? `<p class="text-[9px] text-gray-400 mt-0.5 font-medium">(약 ${krwValue})</p>` : ''}
                            ${parsed.discount > 0 ? `<p class="text-[9px] text-blue-500 mt-1 font-semibold">할인 ${typeof formatMoney === 'function' ? formatMoney(parsed.discount) : parsed.discount}</p>` : ''}
                        </div>
                    </div>`
                );
            });
        });
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('weekly-modal-content').classList.remove('translate-y-full');
    }, 10);
};
