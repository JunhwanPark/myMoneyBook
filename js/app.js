document.addEventListener('DOMContentLoaded', () => {
    // 1. 금액 입력 시 실시간 콤마(,) 자동 생성
    ['input-amount', 'input-discount'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', (e) => {
            let val = e.target.value.replace(/[^0-9.]/g, '');
            if (currentCountry === 'KR') {
                val = val.replace(/\./g, '');
                e.target.value = val ? Number(val).toLocaleString('ko-KR') : '';
            } else {
                const parts = val.split('.');
                parts[0] = parts[0] ? Number(parts[0]).toLocaleString('en-US') : '';
                e.target.value = parts.join('.');
            }
        });
    });

    // 2. 수입/지출 선택 변경 시 화면 변환
    document.querySelectorAll('input[name="type"]').forEach((radio) => {
        radio.addEventListener('change', function () {
            renderCategoryDropdown(this.value);
            const isIncome = this.value === 'income';

            // 수입을 선택하면 결제수단 영역을 숨김
            document.getElementById('payment-section').classList.toggle('hidden', isIncome);
            if (isIncome) {
                document.querySelector('input[name="pay_type"][value="cash"]').checked = true;
                toggleCardSelect();
            }
        });
    });
});
