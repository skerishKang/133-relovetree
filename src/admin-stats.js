(function () {
    const Format = window.AdminStatsFormat;
    const Display = window.AdminStatsDisplay;

    async function loadStats() {
        const db = window.getAdminDb();
        
        try {
            const snapshot = await db.collection('users').get();
            const total = snapshot.size;

            let active = 0;
            let pro = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const recentUsers = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                const lastLogin = data.lastLogin ? data.lastLogin.toDate() : new Date(0);

                if (lastLogin >= today) active++;
                if (data.role === 'pro') pro++;

                recentUsers.push({ id: doc.id, ...data });
            });

            Display.renderStatCard('totalUsers', total, Format.formatNumber);
            Display.renderStatCard('activeUsers', active, Format.formatNumber);
            Display.renderStatCard('proUsers', pro, Format.formatNumber);

            recentUsers.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
            if (typeof window.renderRecentUsers === 'function') {
                window.renderRecentUsers(recentUsers.slice(0, 5));
            }
        } catch (e) {
            console.error('Stats error:', e);
        }
    }

    window.AdminStats = {
        loadStats
    };
    window.loadStats = loadStats;
})();