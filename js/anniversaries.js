// 가족 공유 기념일 설정 및 달력 표시
window.anniversaries = window.anniversaries || [];

const anniversaryEscape = (value) =>
    typeof window.escapeHTML === 'function' ? window.escapeHTML(value) : String(value ?? '');

window.getAnniversariesForDate = (date) =>
    (window.anniversaries || []).filter((item) => {
        const day = Number(item.Day);
        const year = date.getFullYear();
        if (String(item.Repeat).toLowerCase() === 'monthly') {
            const monthLastDay = new Date(year, date.getMonth() + 1, 0).getDate();
            if (!Number.isInteger(day) || day > monthLastDay) return false;
            const observed = new Date(year, date.getMonth(), day);
            if (item.WeekendRule === 'previous_friday') {
                if (observed.getDay() === 6) observed.setDate(observed.getDate() - 1);
                else if (observed.getDay() === 0) observed.setDate(observed.getDate() - 2);
            }
            return observed.getFullYear() === year &&
                observed.getMonth() === date.getMonth() &&
                observed.getDate() === date.getDate();
        }

        return Number(item.Month) === date.getMonth() + 1 && day === date.getDate();
    });

window.renderCalendarAnniversaryMarker = (cell, date) => {
    const dayNumber = cell?.querySelector('.fc-daygrid-day-number');
    if (!dayNumber) return;
    dayNumber.querySelectorAll('.calendar-anniversary-marker').forEach((marker) => marker.remove());
    window.getAnniversariesForDate(date).forEach((item) => {
        const marker = document.createElement('span');
        marker.className = 'calendar-anniversary-marker';
        marker.textContent = item.Icon || '🎉';
        marker.setAttribute('aria-label', item.Name || '기념일');
        marker.title = item.Name || '기념일';
        dayNumber.appendChild(marker);
    });
};

window.renderCalendarAnniversaryMarkers = () => {
    document.querySelectorAll('#calendar .fc-daygrid-day[data-date]').forEach((cell) => {
        const [year, month, day] = cell.dataset.date.split('-').map(Number);
        window.renderCalendarAnniversaryMarker(cell, new Date(year, month - 1, day));
    });
};

window.renderAnniversaryList = () => {
    const list = document.getElementById('anniversary-list');
    if (!list) return;
    const items = [...(window.anniversaries || [])].sort((a, b) => {
        const repeatOrder = String(a.Repeat).localeCompare(String(b.Repeat));
        return repeatOrder || Number(a.Month || 0) - Number(b.Month || 0) || Number(a.Day) - Number(b.Day);
    });

    if (!items.length) {
        list.innerHTML = '<p class="rounded-lg bg-white/80 px-3 py-3 text-center text-[10px] text-gray-400">등록된 기념일이 없습니다.</p>';
        window.renderCalendarAnniversaryMarkers();
        return;
    }

    list.innerHTML = items.map((item) => {
        const isMonthly = String(item.Repeat).toLowerCase() === 'monthly';
        const dateLabel = isMonthly
            ? `매월 ${Number(item.Day)}일${item.WeekendRule === 'previous_friday' ? ' · 주말은 금요일' : ''}`
            : `매년 ${Number(item.Month)}월 ${Number(item.Day)}일`;
        const id = anniversaryEscape(item.ID);
        return `
            <div class="flex items-center gap-2 rounded-xl border border-amber-100/80 bg-white px-3 py-2.5">
                <span class="text-base" aria-hidden="true">${anniversaryEscape(item.Icon || '🎉')}</span>
                <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs font-bold text-gray-800">${anniversaryEscape(item.Name)}</span>
                    <span class="mt-0.5 block truncate text-[9px] text-gray-400">${dateLabel}</span>
                </span>
                <button type="button" onclick="openAnniversaryModal('${id}')" class="rounded-md p-1.5 text-gray-400 hover:text-amber-600" aria-label="${anniversaryEscape(item.Name)} 수정">
                    <span class="material-symbols-outlined text-[17px]">edit</span>
                </button>
                <button type="button" onclick="deleteAnniversary('${id}')" class="rounded-md p-1.5 text-gray-400 hover:text-red-500" aria-label="${anniversaryEscape(item.Name)} 삭제">
                    <span class="material-symbols-outlined text-[17px]">delete</span>
                </button>
            </div>`;
    }).join('');
    window.renderCalendarAnniversaryMarkers();
};

window.openAnniversaryModal = (id = '') => {
    const modal = document.getElementById('anniversary-modal');
    const form = document.getElementById('anniversary-form');
    const existing = id
        ? window.anniversaries.find((item) => String(item.ID) === String(id))
        : null;
    if (!modal || !form || (id && !existing)) return;

    form.reset();
    const today = new Date();
    document.getElementById('anniversary-id').value = existing?.ID || '';
    document.getElementById('anniversary-name').value = existing?.Name || '';
    document.getElementById('anniversary-repeat').value = existing?.Repeat || 'yearly';
    document.getElementById('anniversary-month').value = String(existing?.Month || today.getMonth() + 1);
    document.getElementById('anniversary-day').value = String(existing?.Day || today.getDate());
    document.getElementById('anniversary-icon').value = existing?.Icon || '🎂';
    document.getElementById('anniversary-weekend-rule').checked = existing?.WeekendRule === 'previous_friday';
    document.getElementById('anniversary-modal-title').textContent = existing ? '기념일 수정' : '기념일 추가';
    const saveButton = document.getElementById('anniversary-save-button');
    saveButton.disabled = false;
    saveButton.textContent = '저장하기';
    window.updateAnniversaryForm();

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('anniversary-modal-content').classList.remove('translate-y-full');
    }, 10);
};

window.updateAnniversaryForm = () => {
    const isMonthly = document.getElementById('anniversary-repeat')?.value === 'monthly';
    document.getElementById('anniversary-month-wrap')?.classList.toggle('hidden', isMonthly);
    document.getElementById('anniversary-weekend-wrap')?.classList.toggle('hidden', !isMonthly);
};

window.closeAnniversaryModal = () => {
    const modal = document.getElementById('anniversary-modal');
    const content = document.getElementById('anniversary-modal-content');
    if (!modal || !content) return;
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 250);
};

window.saveAnniversary = async () => {
    const button = document.getElementById('anniversary-save-button');
    if (button.disabled) return;
    const id = document.getElementById('anniversary-id').value;
    const repeat = document.getElementById('anniversary-repeat').value;
    const name = document.getElementById('anniversary-name').value.trim();
    const day = Number(document.getElementById('anniversary-day').value);
    const month = Number(document.getElementById('anniversary-month').value);
    const maxDay = repeat === 'yearly' ? new Date(2024, month, 0).getDate() : 31;
    if (!name || !Number.isInteger(day) || day < 1 || day > maxDay) {
        window.showToast('이름과 날짜를 확인해 주세요.');
        return;
    }

    const saveCountry = currentCountry;
    const payload = {
        action: id ? 'update_anniversary' : 'create_anniversary',
        token: window.googleAuthToken,
        id,
        name,
        repeat,
        month: repeat === 'yearly' ? month : '',
        day,
        icon: document.getElementById('anniversary-icon').value,
        weekendRule: repeat === 'monthly' && document.getElementById('anniversary-weekend-rule').checked
            ? 'previous_friday'
            : 'none',
    };

    button.disabled = true;
    button.textContent = '저장 중...';
    window.setSyncStatus('syncing');
    window.markCountryDataChanged?.(saveCountry);
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            throw new Error(result.message || '기념일 저장에 실패했습니다.');
        }
        window.markCountryDataChanged?.(saveCountry);
        window.closeAnniversaryModal();
        const synced = await window.loadDailyRecords(true);
        if (synced) window.showToast('기념일을 저장했습니다.', 'success');
        else window.showToast('저장은 완료했지만 목록을 새로고침하지 못했습니다.');
    } catch (error) {
        console.error('기념일 저장 실패:', error);
        window.setSyncStatus('error');
        window.showToast(error.message || '기념일 저장에 실패했습니다.');
    } finally {
        button.disabled = false;
        button.textContent = '저장하기';
    }
};

window.deleteAnniversary = async (id) => {
    const item = window.anniversaries.find((entry) => String(entry.ID) === String(id));
    if (!item || !confirm(`'${item.Name}' 기념일을 삭제할까요?`)) return;
    const saveCountry = currentCountry;
    window.markCountryDataChanged?.(saveCountry);
    window.setSyncStatus('syncing');
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete_anniversary',
                token: window.googleAuthToken,
                id,
            }),
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            throw new Error(result.message || '기념일 삭제에 실패했습니다.');
        }
        window.markCountryDataChanged?.(saveCountry);
        const synced = await window.loadDailyRecords(true);
        if (synced) window.showToast('기념일을 삭제했습니다.', 'success');
        else window.showToast('삭제는 완료했지만 목록을 새로고침하지 못했습니다.');
    } catch (error) {
        console.error('기념일 삭제 실패:', error);
        window.markCountryDataChanged?.(saveCountry);
        window.setSyncStatus('error');
        window.showToast(error.message || '기념일 삭제에 실패했습니다.');
        await window.loadDailyRecords(true);
    }
};
