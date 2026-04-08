(function () {
    function getUserAvatarHTML(user, size) {
        const baseName = user.displayName || user.email || 'U';
        const initial = String(baseName).charAt(0).toUpperCase();
        const dimClass = size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';

        if (user.photoURL) {
            return `<img src="${user.photoURL}" alt="avatar" class="${dimClass} rounded-full object-cover">`;
        }

        return `
        <div class="${dimClass} rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
            ${initial}
        </div>
    `;
    }

    function getUserDisplayName(user, uid) {
        if (user.displayName) return user.displayName;
        if (user.email) return String(user.email).split('@')[0];
        const shortId = uid ? String(uid).slice(0, 6) : '';
        return shortId ? `익명 사용자 (${shortId})` : '익명 사용자';
    }

    function getUserType(user) {
        if (user.isAiBot) return 'ai';
        if (user.isDemo || !user.email || (user.email && String(user.email).endsWith('@demo.local'))) return 'demo';
        return 'normal';
    }

    function getUserTypeLabel(user) {
        const type = getUserType(user);
        if (type === 'ai') return 'AI 유저';
        if (type === 'demo') return '데모 유저';
        return '일반 유저';
    }

    function getUserCategory(user) {
        const type = getUserType(user);
        if (type === 'ai') return 'ai';
        if (type === 'demo') return 'demo';
        if (user.role === 'admin') return 'admin';
        if (user.role === 'pro') return 'pro';
        return 'free';
    }

    function getUserIdForDisplay(user, uid) {
        if (user.userId) return String(user.userId);
        if (user.email) return String(user.email).split('@')[0];
        if (uid) return String(uid).slice(0, 8);
        return '';
    }

    function getProfileSubLabel(user, uid) {
        const idLabel = getUserIdForDisplay(user, uid);
        const typeLabel = getUserTypeLabel(user);
        if (idLabel && typeLabel) return `${idLabel} · ${typeLabel}`;
        if (idLabel) return idLabel;
        return typeLabel;
    }

    function getUserStatusBadgeClass(user) {
        if (user.isAiBot) return 'bg-cyan-100 text-cyan-700';
        if (user.isDemo) return 'bg-amber-100 text-amber-700';
        if (user.role === 'admin') return 'bg-rose-100 text-rose-700';
        if (user.role === 'pro') return 'bg-purple-100 text-purple-700';
        return 'bg-slate-100 text-slate-600';
    }

    function getUserStatusLabel(user) {
        if (user.isAiBot) return 'AI';
        if (user.isDemo) return 'DEMO';
        return (user.role || 'free').toUpperCase();
    }

    function formatKoreanDateTime(ts) {
        if (!ts || typeof ts.toDate !== 'function') return '-';
        const d = ts.toDate();
        const formatted = d.toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        return formatted + ' (KST)';
    }

    function formatDateOnly(ts) {
        if (!ts || typeof ts.toDate !== 'function') return '-';
        return ts.toDate().toLocaleDateString();
    }

    window.AdminUsersUtil = {
        getUserAvatarHTML,
        getUserDisplayName,
        getUserType,
        getUserTypeLabel,
        getUserCategory,
        getUserIdForDisplay,
        getProfileSubLabel,
        getUserStatusBadgeClass,
        getUserStatusLabel,
        formatKoreanDateTime,
        formatDateOnly
    };
})();