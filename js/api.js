window.handleCredentialResponse = (response) => {
    const payload = jwt_decode(response.credential);
    if (ALLOWED_EMAILS.includes(payload.email)) {
        currentUserEmail = payload.email;
        document.getElementById('settings-user-email').innerText = currentUserEmail;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        loadDailyRecords();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
};

window.loadDailyRecords = async () => {
    showLoader();
    try {
        const res = await fetch(`${GAS_URL}?country=${currentCountry}`);
        const result = await res.json();
        if (result.status === 'success') {
            globalData = result.data || [];
            globalCategories = (result.categories || []).filter((c) => c.Type !== 'card');
            globalCards = (result.categories || []).filter((c) => c.Type === 'card');

            renderDailyList(globalData);
            if (calendar) renderCalendarEvents();
            updateMonthlyTotals();
            if (document.getElementById('view-stats').classList.contains('active')) renderChart();
        }
    } finally {
        hideLoader();
    }
};

window.saveRecord = async () => {
    const type = document.querySelector('input[name="type"]:checked').value;
    const date = document.getElementById('input-date').value;
    const category = document.getElementById('input-category').value;
    const amountVal = Number(document.getElementById('input-amount').value.replace(/,/g, '')) || 0;
    const discountVal =
        Number(document.getElementById('input-discount').value.replace(/,/g, '')) || 0;
    const finalAmount = amountVal - discountVal;
    const itemName = document.getElementById('input-item-name').value;
    const memoDetail = document.getElementById('input-memo-detail').value;
    const payType = document.querySelector('input[name="pay_type"]:checked').value;

    let paymentMethod = '현금';
    if (type === 'expense' && payType === 'card') {
        paymentMethod = document.getElementById('input-card-select').value;
        if (!paymentMethod) return alert('카드를 선택해주세요.');
    }

    if (!date || !amountVal || !itemName) return alert('필수 항목을 입력해주세요.');

    const memo = `${itemName}\nPAY:${paymentMethod}\nDISC:${discountVal}\n${memoDetail}`;
    const payload = {
        action: document.getElementById('input-action').value,
        id: document.getElementById('input-id').value,
        country: currentCountry,
        date,
        userEmail: currentUserEmail,
        type,
        category,
        amount: finalAmount,
        memo,
    };

    const btn = document.getElementById('save-btn');
    btn.innerText = '저장 중...';
    btn.disabled = true;

    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        if ((await res.json()).status === 'success') {
            closeAddModal();
            loadDailyRecords();
        }
    } finally {
        btn.innerText = '저장하기';
        btn.disabled = false;
    }
};

window.deleteRecord = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete',
                id: document.getElementById('input-id').value,
                country: currentCountry,
            }),
        });
        if ((await res.json()).status === 'success') {
            closeAddModal();
            loadDailyRecords();
        }
    } catch (e) {
        alert('통신 오류');
    }
};

window.addCard = async () => {
    const label = document.getElementById('new-card-label').value.trim();
    const day = document.getElementById('new-card-day').value;
    if (!label || !day) return alert('정보를 정확히 입력하세요.');
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add_category',
                catType: 'card',
                catLabel: `${label}|${day}`,
            }),
        });
        if ((await res.json()).status === 'success') {
            document.getElementById('new-card-label').value = '';
            document.getElementById('new-card-day').value = '';
            await loadDailyRecords();
            openCardModal();
        }
    } catch (e) {
        alert('에러');
    }
};

window.deleteCard = async (catValue) => {
    if (!confirm('카드를 삭제하시겠습니까? (기존 내역 유지)')) return;
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_category', catValue }),
        });
        if ((await res.json()).status === 'success') {
            await loadDailyRecords();
            openCardModal();
        }
    } catch (e) {
        alert('에러');
    }
};

window.addCategory = async () => {
    const type = document.getElementById('new-cat-type').value;
    const label = document.getElementById('new-cat-label').value.trim();
    if (!label) return alert('카테고리 이름을 입력해주세요.');
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'add_category', catType: type, catLabel: label }),
        });
        if ((await res.json()).status === 'success') {
            document.getElementById('new-cat-label').value = '';
            await loadDailyRecords();
            openCategoryModal();
        }
    } catch (e) {
        alert('에러');
    }
};

window.deleteCategory = async (catValue) => {
    if (!confirm('카테고리를 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_category', catValue }),
        });
        if ((await res.json()).status === 'success') {
            await loadDailyRecords();
            openCategoryModal();
        }
    } catch (e) {
        alert('에러');
    }
};
