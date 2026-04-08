(function () {
    function formatNumber(num) {
        if (typeof num !== 'number') return '0';
        return num.toLocaleString('ko-KR');
    }

    function formatPercentage(value, total) {
        if (typeof value !== 'number' || typeof total !== 'number' || total === 0) return '0%';
        const percent = (value / total) * 100;
        return percent.toFixed(1) + '%';
    }

    function calculateChange(current, previous) {
        if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return null;
        const change = ((current - previous) / previous) * 100;
        return {
            value: change.toFixed(1),
            isPositive: change >= 0
        };
    }

    function renderCardValue(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = formatNumber(value);
    }

    function renderCardValues(cards) {
        cards.forEach(card => {
            renderCardValue(card.id, card.value);
        });
    }

    window.AdminStatsFormat = {
        formatNumber,
        formatPercentage,
        calculateChange,
        renderCardValue,
        renderCardValues
    };
})();