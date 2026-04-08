(function () {
    function renderLoadingMessage(message) {
        return message || '데이터를 불러오는 중...';
    }

    function renderErrorMessage(message) {
        return message || '데이터 로드 실패';
    }

    function renderEmptyMessage(message) {
        return message || '데이터가 없습니다';
    }

    function renderStatCard(elementId, value, formatter) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.textContent = formatter ? formatter(value) : (typeof value === 'number' ? value.toLocaleString() : value);
    }

    function showElement(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.classList.remove('is-hidden');
    }

    function hideElement(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.classList.add('is-hidden');
    }

    window.AdminStatsDisplay = {
        renderLoadingMessage,
        renderErrorMessage,
        renderEmptyMessage,
        renderStatCard,
        showElement,
        hideElement
    };
})();