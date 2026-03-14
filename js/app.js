document.addEventListener('DOMContentLoaded', () => {
    // 1. 금액 입력 시 실시간 콤마(,) 자동 생성 및 마이너스(-) 지원
    ['input-amount', 'input-discount'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', (e) => {
            let val = e.target.value;
            // 맨 앞에 마이너스(-)가 있는지 확인
            const isNegative = val.startsWith('-');

            // 숫자와 소수점만 남기고 모두 제거
            val = val.replace(/[^0-9.]/g, '');

            if (currentCountry === 'KR') {
                val = val.replace(/\./g, '');
                val = val ? Number(val).toLocaleString('ko-KR') : '';
            } else {
                const parts = val.split('.');
                parts[0] = parts[0] ? Number(parts[0]).toLocaleString('en-US') : '';
                val = parts.join('.');
            }

            // 마이너스 기호 복구
            if (isNegative && val) {
                e.target.value = '-' + val;
            } else if (isNegative && !val) {
                e.target.value = '-';
            } else {
                e.target.value = val;
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
