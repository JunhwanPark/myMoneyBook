// 가족 생활기록: 측정값과 누적형 횟수 기록
window.lifeTypes = window.lifeTypes || [];
window.lifeRecords = window.lifeRecords || [];
window.lifeTrendChart = null;

const lifeEscape = (value) =>
    typeof window.escapeHTML === 'function' ? window.escapeHTML(value) : String(value ?? '');

const lifeIsActive = (type) =>
    type.Active === true || String(type.Active).toUpperCase() === 'TRUE' || type.Active === 1;

const lifeToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const lifeTypeById = (id) => window.lifeTypes.find((type) => String(type.ID) === String(id));

const lifePersonKey = (record) => String(record.Person || '').trim() || '가족 공용';

const lifeSortAscending = (records) =>
    [...records].sort((a, b) => {
        const dateOrder = String(a.Date || '').localeCompare(String(b.Date || ''));
        if (dateOrder) return dateOrder;
        return String(a.UpdatedAt || '').localeCompare(String(b.UpdatedAt || ''));
    });

const lifeBalances = (records) => {
    const balancesByType = new Map();
    const balanceAtRecord = new Map();

    lifeSortAscending(records).forEach((record) => {
        const type = lifeTypeById(record.TypeID);
        if (!type || String(type.Kind).toLowerCase() !== 'counter') return;
        const key = String(record.TypeID);
        const nextBalance = (balancesByType.get(key) || 0) + (Number(record.Value) || 0);
        balancesByType.set(key, nextBalance);
        balanceAtRecord.set(String(record.ID), nextBalance);
    });

    return { balancesByType, balanceAtRecord };
};

const lifeFormatValue = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value ?? '0');
    return number.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
};

const lifeFormatDate = (dateString) => {
    const [year, month, day] = String(dateString || '').split('-').map(Number);
    if (!year || !month || !day) return String(dateString || '날짜 미정');
    const date = new Date(year, month - 1, day);
    return typeof window.formatDateStr === 'function'
        ? window.formatDateStr(date)
        : `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

window.renderLifeRecords = () => {
    const list = document.getElementById('life-record-list');
    const filter = document.getElementById('life-record-type-filter');
    const balanceSummary = document.getElementById('life-balance-summary');
    if (!list || !filter || !balanceSummary) return;

    const activeTypes = window.lifeTypes.filter(lifeIsActive);
    const previousFilter = filter.value || 'all';
    filter.innerHTML = '<option value="all">모든 기록</option>';
    activeTypes.forEach((type) => {
        filter.insertAdjacentHTML(
            'beforeend',
            `<option value="${lifeEscape(type.ID)}">${lifeEscape(type.Name)}</option>`
        );
    });
    filter.value = previousFilter === 'all' || activeTypes.some((type) => String(type.ID) === previousFilter)
        ? previousFilter
        : 'all';

    const { balancesByType } = lifeBalances(window.lifeRecords);
    const counterTypes = activeTypes.filter((type) => String(type.Kind).toLowerCase() === 'counter');
    const balanceCards = [];
    counterTypes.forEach((type) => {
        const typeRecords = window.lifeRecords.filter((record) => String(record.TypeID) === String(type.ID));
        if (!typeRecords.length) return;
        const total = balancesByType.get(String(type.ID)) || 0;
        const usageByPerson = new Map();
        typeRecords.forEach((record) => {
            const value = Number(record.Value) || 0;
            if (value >= 0) return;
            const person = lifePersonKey(record);
            usageByPerson.set(person, (usageByPerson.get(person) || 0) + Math.abs(value));
        });
        const usageSummary = [...usageByPerson.entries()]
            .map(([person, value]) => `${lifeEscape(person)} 사용 ${lifeFormatValue(value)}${lifeEscape(type.Unit)}`)
            .join(' · ');
        balanceCards.push(`
            <div class="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2 min-w-0">
                <p class="text-[9px] font-bold text-teal-700 truncate">${lifeEscape(type.Name)} 잔여</p>
                <p class="text-sm font-black text-teal-800 truncate">${lifeFormatValue(total)}${lifeEscape(type.Unit)}</p>
                <p class="text-[8px] text-teal-700/70 truncate">${usageSummary || '아직 사용 기록이 없습니다.'}</p>
            </div>
        `);
    });
    balanceSummary.innerHTML = balanceCards.slice(0, 4).join('');
    balanceSummary.classList.toggle('hidden', balanceCards.length === 0);

    const selectedType = filter.value;
    const records = window.lifeRecords
        .filter((record) => selectedType === 'all' || String(record.TypeID) === selectedType)
        .filter((record) => lifeTypeById(record.TypeID))
        .sort((a, b) => String(b.Date || '').localeCompare(String(a.Date || '')) || String(b.UpdatedAt || '').localeCompare(String(a.UpdatedAt || '')));

    if (!records.length) {
        list.innerHTML = `
            <div class="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
                <span class="material-symbols-outlined text-3xl text-teal-300">edit_note</span>
                <p class="text-sm font-bold text-gray-600 mt-2">${activeTypes.length ? '아직 기록이 없습니다.' : '기록 종류를 먼저 추가해 주세요.'}</p>
                <p class="text-xs text-gray-400 mt-1">가운데 + 버튼으로 날짜별 기록을 남길 수 있어요.</p>
                ${activeTypes.length ? '' : '<button type="button" onclick="openLifeTypeModal()" class="mt-3 bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold">기록 종류 추가</button>'}
            </div>`;
        return;
    }

    const { balanceAtRecord } = lifeBalances(window.lifeRecords);
    list.innerHTML = '';
    let previousDate = '';
    records.forEach((record) => {
        const date = String(record.Date || '').slice(0, 10);
        if (date !== previousDate) {
            list.insertAdjacentHTML(
                'beforeend',
                `<div class="mt-4 mb-2 border-b border-gray-100 px-1 pb-1 text-xs font-bold text-gray-500 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">calendar_today</span>${lifeEscape(lifeFormatDate(date))}</div>`
            );
            previousDate = date;
        }

        const type = lifeTypeById(record.TypeID);
        const isCounter = String(type.Kind).toLowerCase() === 'counter';
        const value = Number(record.Value) || 0;
        const valueLabel = isCounter
            ? `${value < 0 ? '사용' : '충전'} ${value > 0 ? '+' : ''}${lifeFormatValue(value)}${lifeEscape(type.Unit)}`
            : `${lifeFormatValue(value)}${lifeEscape(type.Unit)}`;
        const balance = balanceAtRecord.get(String(record.ID));
        const person = String(record.Person || '').trim();
        const memo = String(record.Memo || '').trim();

        list.insertAdjacentHTML(
            'beforeend',
            `<button type="button" onclick="openLifeRecordModal('${lifeEscape(record.ID)}')" class="w-full text-left bg-white px-3 py-2 rounded-xl mb-1.5 flex justify-between items-center gap-2 border border-gray-100 shadow-sm active:bg-gray-50 transition">
                <span class="flex-1 min-w-0">
                    <span class="flex items-center gap-1.5 min-w-0">
                        <span class="text-sm font-bold text-gray-800 truncate">${lifeEscape(type.Name)}</span>
                        ${person ? `<span class="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded shrink-0">${lifeEscape(person)}</span>` : ''}
                    </span>
                    <span class="block text-[10px] text-gray-400 mt-0.5 truncate">${memo ? lifeEscape(memo) : isCounter ? `${value < 0 ? '이용' : '추가'} 기록` : '측정 기록'}</span>
                </span>
                <span class="text-right shrink-0">
                    <span class="block ${isCounter ? 'text-teal-700' : 'text-gray-800'} text-sm font-black">${valueLabel}</span>
                    ${isCounter ? `<span class="block text-[9px] text-gray-400 mt-0.5">잔여 ${lifeFormatValue(balance ?? 0)}${lifeEscape(type.Unit)}</span>` : ''}
                </span>
            </button>`
        );
    });
};

window.renderLifeTypes = () => {
    const list = document.getElementById('life-types-list');
    if (!list) return;
    if (!window.lifeTypes.length) {
        list.innerHTML = '<p class="bg-white rounded-xl border border-gray-100 p-5 text-center text-xs text-gray-400">등록된 기록 종류가 없습니다.</p>';
        return;
    }

    list.innerHTML = [...window.lifeTypes]
        .sort((a, b) => Number(lifeIsActive(b)) - Number(lifeIsActive(a)) || String(a.Name).localeCompare(String(b.Name)))
        .map((type) => {
            const active = lifeIsActive(type);
            const isCounter = String(type.Kind).toLowerCase() === 'counter';
            return `<div class="bg-white border border-gray-100 rounded-xl px-3 py-2.5 flex items-center gap-3 shadow-sm ${active ? '' : 'opacity-60'}">
                <span class="${isCounter ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'} w-9 h-9 rounded-full flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[19px]">${isCounter ? 'exposure' : 'monitoring'}</span></span>
                <span class="flex-1 min-w-0"><span class="block text-sm font-bold text-gray-800 truncate">${lifeEscape(type.Name)}</span><span class="block text-[10px] text-gray-400 mt-0.5">${isCounter ? '횟수·잔여량 누적' : '날짜별 측정값'} · ${lifeEscape(type.Unit)}</span></span>
                <button type="button" onclick="setLifeTypeActive('${lifeEscape(type.ID)}', ${!active})" class="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${active ? 'bg-gray-100 text-gray-500' : 'bg-teal-50 text-teal-700'}">${active ? '보관' : '다시 사용'}</button>
            </div>`;
        })
        .join('');
};

window.renderLifeMode = () => {
    if (window.currentAppMode !== 'LIFE') return;
    const activeViewId = document.querySelector('.tab-content.active')?.id;
    if (activeViewId === 'view-life-records') window.renderLifeRecords();
    else if (activeViewId === 'view-life-trends') window.renderLifeTrend();
    else if (activeViewId === 'view-life-types') window.renderLifeTypes();
};

window.renderLifeTrend = () => {
    const typeSelect = document.getElementById('life-trend-type-select');
    const canvas = document.getElementById('life-trend-chart');
    const empty = document.getElementById('life-trend-empty');
    const summary = document.getElementById('life-trend-summary');
    if (!typeSelect || !canvas || !empty || !summary) return;

    const activeTypes = window.lifeTypes.filter(lifeIsActive);
    const selectedTypeId = typeSelect.value;
    typeSelect.innerHTML = activeTypes
        .map((type) => `<option value="${lifeEscape(type.ID)}">${lifeEscape(type.Name)}</option>`)
        .join('');
    if (activeTypes.some((type) => String(type.ID) === selectedTypeId)) typeSelect.value = selectedTypeId;
    const type = activeTypes.find((item) => String(item.ID) === typeSelect.value) || activeTypes[0];

    if (window.lifeTrendChart) {
        window.lifeTrendChart.destroy();
        window.lifeTrendChart = null;
    }
    summary.innerHTML = '';
    if (!type) {
        canvas.classList.add('hidden');
        empty.classList.remove('hidden');
        empty.textContent = '먼저 기록 종류를 추가해 주세요.';
        return;
    }

    const records = lifeSortAscending(
        window.lifeRecords.filter((record) => String(record.TypeID) === String(type.ID))
    );
    if (!records.length) {
        canvas.classList.add('hidden');
        empty.classList.remove('hidden');
        empty.textContent = '표시할 기록이 아직 없습니다.';
        return;
    }

    canvas.classList.remove('hidden');
    empty.classList.add('hidden');
    const isCounter = String(type.Kind).toLowerCase() === 'counter';
    const dateLabels = [...new Set(records.map((record) => String(record.Date || '').slice(0, 10)))].filter(Boolean);
    const people = isCounter ? ['가족 전체'] : [...new Set(records.map(lifePersonKey))];
    const colors = ['#0f766e', '#6366f1', '#e11d48', '#d97706', '#2563eb'];
    const valueByPersonAndDate = new Map(people.map((person) => [person, new Map()]));
    const latestValues = new Map();

    if (isCounter) {
        let balance = 0;
        records.forEach((record) => {
            const date = String(record.Date).slice(0, 10);
            balance += Number(record.Value) || 0;
            valueByPersonAndDate.get('가족 전체').set(date, balance);
        });
        latestValues.set('가족 전체', balance);
    } else {
        records.forEach((record) => {
            const person = lifePersonKey(record);
            const date = String(record.Date).slice(0, 10);
            const value = Number(record.Value);
            valueByPersonAndDate.get(person).set(date, value);
            latestValues.set(person, value);
        });
    }

    summary.innerHTML = [...latestValues.entries()]
        .map(([person, value]) => `<span class="inline-flex items-center gap-1 bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 mr-1.5 mb-1.5 text-[10px]"><span class="font-bold text-gray-500">${lifeEscape(person)}</span><span class="font-black text-teal-700">${lifeFormatValue(value)}${lifeEscape(type.Unit)}</span></span>`)
        .join('');

    if (typeof Chart !== 'function') {
        canvas.classList.add('hidden');
        empty.textContent = '그래프를 불러올 수 없습니다.';
        empty.classList.remove('hidden');
        return;
    }

    window.lifeTrendChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: dateLabels,
            datasets: people.map((person, index) => ({
                label: person,
                data: dateLabels.map((date) => valueByPersonAndDate.get(person).get(date) ?? null),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length],
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.25,
                spanGaps: false,
            })),
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { display: people.length > 1, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
                tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${lifeFormatValue(context.parsed.y)}${type.Unit}` } },
            },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 7, maxRotation: 0, font: { size: 9 } } },
                y: { ticks: { font: { size: 9 }, callback: (value) => `${value}${type.Unit}` } },
            },
        },
    });
};

window.openLifeRecordModal = (id = null) => {
    const form = document.getElementById('life-record-form');
    const modal = document.getElementById('life-record-modal');
    if (!form || !modal) return;
    form.reset();
    document.getElementById('life-record-id').value = '';
    document.getElementById('life-record-date').value = lifeToday();
    document.getElementById('life-record-modal-title').textContent = id ? '생활기록 수정' : '생활기록 추가';
    document.getElementById('life-record-delete').classList.toggle('hidden', !id);

    const typeSelect = document.getElementById('life-record-type');
    const existingRecord = id
        ? window.lifeRecords.find((item) => String(item.ID) === String(id))
        : null;
    if (id && !existingRecord) {
        window.showToast('생활기록을 찾을 수 없습니다.');
        return;
    }
    const availableTypes = window.lifeTypes.filter(
        (type) => lifeIsActive(type) || String(type.ID) === String(existingRecord?.TypeID)
    );
    typeSelect.innerHTML = availableTypes
        .map((type) => `<option value="${lifeEscape(type.ID)}">${lifeEscape(type.Name)}</option>`)
        .join('');
    if (!availableTypes.length) {
        modal.classList.add('hidden');
        window.showToast('먼저 기록 종류를 추가해 주세요.');
        window.switchTab('life-types', '기록 종류', document.getElementById('nav-btn-stats'));
        return;
    }

    const people = new Set();
    (globalCategories || []).filter((item) => item.Type === 'asset_owner').forEach((item) => people.add(item.Label));
    window.lifeRecords.forEach((record) => { if (record.Person) people.add(record.Person); });
    document.getElementById('life-person-options').innerHTML = [...people]
        .map((person) => `<option value="${lifeEscape(person)}"></option>`)
        .join('');

    if (existingRecord) {
        const record = existingRecord;
        document.getElementById('life-record-id').value = record.ID;
        document.getElementById('life-record-type').value = record.TypeID;
        document.getElementById('life-record-date').value = String(record.Date).slice(0, 10);
        document.getElementById('life-record-person').value = record.Person || '';
        document.getElementById('life-record-memo').value = record.Memo || '';
        const type = lifeTypeById(record.TypeID);
        if (type && String(type.Kind).toLowerCase() === 'counter') {
            document.getElementById('life-record-counter-action').value = Number(record.Value) < 0 ? 'decrease' : 'increase';
            document.getElementById('life-record-value').value = Math.abs(Number(record.Value));
        } else {
            document.getElementById('life-record-value').value = record.Value;
        }
    }
    window.updateLifeRecordForm();
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('life-record-modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.updateLifeRecordForm = () => {
    const type = lifeTypeById(document.getElementById('life-record-type')?.value);
    if (!type) return;
    const isCounter = String(type.Kind).toLowerCase() === 'counter';
    document.getElementById('life-record-counter-action-wrap').classList.toggle('hidden', !isCounter);
    document.getElementById('life-record-unit').textContent = type.Unit || '';
    document.getElementById('life-record-value-label').textContent = isCounter ? '횟수 / 수량' : '측정값';
    document.getElementById('life-record-value').step = isCounter ? '1' : 'any';
    document.getElementById('life-record-value').min = isCounter ? '1' : '';
    document.getElementById('life-record-value').placeholder = isCounter ? '변화량 입력' : '측정값 입력';
    document.getElementById('life-record-modal-subtitle').textContent = isCounter
        ? '충전은 증가, 방문이나 사용은 감소로 기록합니다.'
        : `날짜와 사람별 ${type.Unit || '측정값'}을 남깁니다.`;
};

window.closeLifeRecordModal = () => {
    const modal = document.getElementById('life-record-modal');
    const content = document.getElementById('life-record-modal-content');
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 250);
};

window.saveLifeRecord = async () => {
    const saveButton = document.getElementById('life-record-save');
    if (saveButton.disabled) return;
    const type = lifeTypeById(document.getElementById('life-record-type').value);
    const rawValue = document.getElementById('life-record-value').value;
    const date = document.getElementById('life-record-date').value;
    if (
        !type ||
        !date ||
        rawValue === '' ||
        !Number.isFinite(Number(rawValue)) ||
        (String(type.Kind).toLowerCase() === 'counter' && Number(rawValue) <= 0)
    ) {
        return window.showToast('날짜와 올바른 기록값을 입력해 주세요.');
    }

    const isCounter = String(type.Kind).toLowerCase() === 'counter';
    const action = document.getElementById('life-record-id').value ? 'update_life_record' : 'create_life_record';
    const direction = document.getElementById('life-record-counter-action').value;
    const value = Number(rawValue) * (isCounter && direction === 'decrease' ? -1 : 1);
    const payload = {
        action,
        token: window.googleAuthToken,
        id: document.getElementById('life-record-id').value,
        typeId: type.ID,
        date,
        person: document.getElementById('life-record-person').value.trim(),
        value,
        memo: document.getElementById('life-record-memo').value.trim(),
    };

    saveButton.disabled = true;
    saveButton.textContent = '저장 중...';
    window.setSyncStatus('syncing');
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') throw new Error(result.message || '저장에 실패했습니다.');
        window.closeLifeRecordModal();
        const synced = await window.loadDailyRecords(true);
        if (!synced) throw new Error('저장 후 새 기록을 불러오지 못했습니다.');
        window.showToast('생활기록을 저장했습니다.', 'success');
    } catch (error) {
        console.error('생활기록 저장 실패:', error);
        window.setSyncStatus('error');
        window.showToast(error.message || '생활기록 저장에 실패했습니다.');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = '저장하기';
    }
};

window.deleteLifeRecord = async () => {
    const id = document.getElementById('life-record-id').value;
    if (!id || !confirm('이 생활기록을 삭제할까요?')) return;
    const button = document.getElementById('life-record-delete');
    button.disabled = true;
    window.setSyncStatus('syncing');
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_life_record', token: window.googleAuthToken, id }),
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') throw new Error(result.message || '삭제에 실패했습니다.');
        window.closeLifeRecordModal();
        const synced = await window.loadDailyRecords(true);
        if (!synced) throw new Error('삭제 후 최신 내용을 불러오지 못했습니다.');
        window.showToast('생활기록을 삭제했습니다.', 'success');
    } catch (error) {
        console.error('생활기록 삭제 실패:', error);
        window.setSyncStatus('error');
        window.showToast(error.message || '생활기록 삭제에 실패했습니다.');
    } finally {
        button.disabled = false;
    }
};

window.openLifeTypeModal = () => {
    const modal = document.getElementById('life-type-modal');
    document.getElementById('life-type-form').reset();
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('life-type-modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.closeLifeTypeModal = () => {
    const modal = document.getElementById('life-type-modal');
    const content = document.getElementById('life-type-modal-content');
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 250);
};

window.saveLifeType = async () => {
    const name = document.getElementById('life-type-name').value.trim();
    const kind = document.getElementById('life-type-kind').value;
    const unit = document.getElementById('life-type-unit').value.trim();
    if (!name || !unit) return window.showToast('이름과 단위를 입력해 주세요.');
    if (window.lifeTypes.some((type) => String(type.Name).trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
        return window.showToast('이미 같은 이름의 기록 종류가 있습니다.');
    }

    window.setSyncStatus('syncing');
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'create_life_type', token: window.googleAuthToken, name, kind, unit }),
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') throw new Error(result.message || '기록 종류 저장에 실패했습니다.');
        window.closeLifeTypeModal();
        const synced = await window.loadDailyRecords(true);
        if (!synced) throw new Error('저장 후 데이터를 불러오지 못했습니다.');
        window.showToast('기록 종류를 추가했습니다.', 'success');
    } catch (error) {
        console.error('기록 종류 저장 실패:', error);
        window.setSyncStatus('error');
        window.showToast(error.message || '기록 종류 저장에 실패했습니다.');
    }
};

window.setLifeTypeActive = async (id, active) => {
    window.setSyncStatus('syncing');
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'update_life_type', token: window.googleAuthToken, id, active }),
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') throw new Error(result.message || '변경에 실패했습니다.');
        const synced = await window.loadDailyRecords(true);
        if (!synced) throw new Error('변경 후 최신 목록을 불러오지 못했습니다.');
        window.showToast(active ? '기록 종류를 다시 사용합니다.' : '기록 종류를 보관했습니다.', 'success');
    } catch (error) {
        console.error('기록 종류 변경 실패:', error);
        window.setSyncStatus('error');
        window.showToast(error.message || '기록 종류 변경에 실패했습니다.');
    }
};
