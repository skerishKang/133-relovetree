(function () {
    const Util = window.AdminUsersUtil;

    function renderRecentUsersTable(users) {
        const tbody = document.getElementById('recentUsersTable');
        if (!tbody) return;

        if (!users || !users.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-slate-400">최근 가입한 사용자가 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4 flex items-center gap-3">
                ${Util.getUserAvatarHTML(user, 'sm')}
                <div class="flex flex-col">
                    <span class="font-medium text-slate-900">${Util.getUserDisplayName(user, user.id)}</span>
                    <span class="text-xs text-slate-400">${Util.getUserTypeLabel(user)}</span>
                </div>
            </td>
            <td class="px-6 py-4">${user.email || '—'}</td>
            <td class="px-6 py-4 text-slate-500">${user.createdAt ? Util.formatKoreanDateTime(user.createdAt) : '-'}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs font-bold ${Util.getUserStatusBadgeClass(user)}">
                    ${Util.getUserStatusLabel(user)}
                </span>
            </td>
        </tr>
        `).join('');
    }

    function renderAllUsersTable(users) {
        const tbody = document.getElementById('allUsersTable');
        if (!tbody) return;

        if (!users || !users.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-slate-400">해당 조건에 맞는 사용자가 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        users.forEach((user) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 border-b border-slate-50 last:border-0';
            const category = Util.getUserCategory(user);
            
            const roleOptions = [
                { value: 'free', label: '일반', selected: category === 'free' },
                { value: 'demo', label: '데모', selected: category === 'demo' },
                { value: 'ai', label: 'AI', selected: category === 'ai' },
                { value: 'pro', label: 'Pro', selected: category === 'pro' },
                { value: 'admin', label: '관리자', selected: category === 'admin' }
            ];

            const roleSelectHTML = roleOptions.map(opt => 
                `<option value="${opt.value}" ${opt.selected ? 'selected' : ''}>${opt.label}</option>`
            ).join('');

            tr.innerHTML = `
            <td class="px-6 py-4 flex items-center gap-3">
                ${Util.getUserAvatarHTML(user, 'sm')}
                <div class="flex flex-col">
                    <span class="font-medium text-slate-900">${Util.getUserDisplayName(user, user.id)}</span>
                    <span class="text-xs text-slate-400">${Util.getProfileSubLabel(user, user.id)}</span>
                </div>
            </td>
            <td class="px-6 py-4">${user.email || '—'}</td>
            <td class="px-6 py-4">
                <select onchange="updateUserRole('${user.id}', this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-brand-500">
                    ${roleSelectHTML}
                </select>
            </td>
            <td class="px-6 py-4 text-slate-500">${Util.formatDateOnly(user.lastLogin)}</td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button onclick="editBotProfile('${user.id}')" class="text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        AI 프로필
                    </button>
                    <button onclick="createAiDemoTree('${user.id}')" class="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        AI 트리
                    </button>
                    <button onclick="createAiReactions('${user.id}')" class="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        AI 반응
                    </button>
                    <button onclick="createAiCommunityComments('${user.id}')" class="text-violet-600 hover:text-violet-800 hover:bg-violet-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        AI 커뮤댓글
                    </button>
                    <button onclick="deleteUser('${user.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        삭제
                    </button>
                </div>
            </td>
        `;
            tbody.appendChild(tr);
        });
    }

    function renderLoading(tableId, colspan) {
        const tbody = document.getElementById(tableId);
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="px-6 py-4 text-center">로딩 중...</td></tr>`;
    }

    function renderError(tableId, colspan, message) {
        const tbody = document.getElementById(tableId);
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="px-6 py-4 text-center text-red-500">${message || '데이터 로드 실패'}</td></tr>`;
    }

    window.AdminUsersRender = {
        renderRecentUsersTable,
        renderAllUsersTable,
        renderLoading,
        renderError
    };
})();