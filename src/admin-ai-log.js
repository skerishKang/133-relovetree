(function () {
    function formatAiLogTimestamp(timestamp) {
        if (!timestamp) return '-';
        if (typeof timestamp.toDate === 'function') {
            return timestamp.toDate().toLocaleString();
        }
        if (timestamp instanceof Date) {
            return timestamp.toLocaleString();
        }
        return String(timestamp);
    }

    function formatAiLogRow(data) {
        const createdAt = formatAiLogTimestamp(data.createdAt);
        const type = data.type || '-';
        const bot = data.botName || data.botUid || '-';
        const summary = data.summary || '';
        
        return {
            createdAt,
            type,
            bot,
            summary
        };
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function buildAiLogTableRow(row) {
        return `
            <tr class="hover:bg-slate-50">
                <td class="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">${escapeHtml(row.createdAt)}</td>
                <td class="px-6 py-3 text-xs font-semibold text-slate-700">${escapeHtml(row.type)}</td>
                <td class="px-6 py-3 text-xs text-slate-700">${escapeHtml(row.bot)}</td>
                <td class="px-6 py-3 text-xs text-slate-600">${escapeHtml(row.summary)}</td>
            </tr>
        `;
    }

    function normalizeAiLogDocument(doc) {
        const data = doc.data ? doc.data() : doc;
        return formatAiLogRow(data || {});
    }

    window.AdminAiLogFormatter = {
        formatAiLogTimestamp,
        formatAiLogRow,
        escapeHtml,
        buildAiLogTableRow,
        normalizeAiLogDocument
    };
})();