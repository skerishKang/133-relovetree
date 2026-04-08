(function () {
    const Util = window.AdminUsersUtil;

    function filterUsers(users, query, filterType) {
        let filtered = Array.isArray(users) ? users.slice() : [];

        if (query) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter((user) => {
                const name = Util.getUserDisplayName(user, user.id || '');
                const email = (user.email || '').toLowerCase();
                const lowerName = name.toLowerCase();
                return lowerName.includes(lowerQuery) || email.includes(lowerQuery);
            });
        }

        if (filterType && filterType !== 'all') {
            filtered = filtered.filter((user) => {
                const type = Util.getUserType(user);
                if (filterType === 'normal') return type === 'normal';
                if (filterType === 'demo') return type === 'demo';
                if (filterType === 'ai') return type === 'ai';
                if (filterType === 'admin') return user.role === 'admin';
                if (filterType === 'pro') return user.role === 'pro';
                return true;
            });
        }

        return filtered;
    }

    function getFilterInputs() {
        return {
            search: document.getElementById('userSearch'),
            filter: document.getElementById('userFilter')
        };
    }

    function bindFilterEvents(onFilterChange) {
        const inputs = getFilterInputs();
        
        if (inputs.search && !inputs.search.dataset.adminUsersBound) {
            inputs.search.dataset.adminUsersBound = '1';
            inputs.search.addEventListener('input', onFilterChange);
        }

        if (inputs.filter && !inputs.filter.dataset.adminUsersBound) {
            inputs.filter.dataset.adminUsersBound = '1';
            inputs.filter.addEventListener('change', onFilterChange);
        }
    }

    function getCurrentFilterValues() {
        const inputs = getFilterInputs();
        const searchQuery = inputs.search ? inputs.search.value.trim().toLowerCase() : '';
        const filterType = inputs.filter ? inputs.filter.value : 'all';
        return { query: searchQuery, filterType };
    }

    window.AdminUsersFilter = {
        filterUsers,
        getFilterInputs,
        bindFilterEvents,
        getCurrentFilterValues
    };
})();