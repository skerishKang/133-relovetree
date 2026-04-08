(function () {
    let allUsersCache = [];

    function getDb() {
        return window.getAdminDb();
    }

    function getManagedUserData(uid) {
        return window.fetchManagedUserData(uid);
    }

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

    function renderRecentUsers(users) {
        const tbody = document.getElementById('recentUsersTable');
        if (!tbody) return;
        tbody.innerHTML = users.map(user => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4 flex items-center gap-3">
                ${getUserAvatarHTML(user, 'sm')}
                <div class="flex flex-col">
                    <span class="font-medium text-slate-900">${getUserDisplayName(user, user.id)}</span>
                    <span class="text-xs text-slate-400">${getUserTypeLabel(user)}</span>
                </div>
            </td>
            <td class="px-6 py-4">${user.email || '—'}</td>
            <td class="px-6 py-4 text-slate-500">${user.createdAt ? formatKoreanDateTime(user.createdAt) : '-'}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs font-bold ${getUserStatusBadgeClass(user)}">
                    ${getUserStatusLabel(user)}
                </span>
            </td>
        </tr>
    `).join('');
    }

    async function loadUsers() {
        const tbody = document.getElementById('allUsersTable');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center">로딩 중...</td></tr>';

        try {
            const snapshot = await getDb().collection('users').orderBy('lastLogin', 'desc').get();

            allUsersCache = [];
            snapshot.forEach(doc => {
                const data = doc.data() || {};
                allUsersCache.push({ id: doc.id, ...data });
            });

            applyUserFiltersAndRender();
        } catch (e) {
            console.error('Load users error:', e);
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">데이터 로드 실패</td></tr>';
        }
    }

    function applyUserFiltersAndRender() {
        const tbody = document.getElementById('allUsersTable');
        if (!tbody) return;

        const searchInput = document.getElementById('userSearch');
        const filterSelect = document.getElementById('userFilter');
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const filter = filterSelect ? filterSelect.value : 'all';

        let users = Array.isArray(allUsersCache) ? allUsersCache.slice() : [];

        if (query) {
            users = users.filter((user) => {
                const name = getUserDisplayName(user, user.id || '');
                const email = (user.email || '').toLowerCase();
                const lowerName = name.toLowerCase();
                return lowerName.includes(query) || email.includes(query);
            });
        }

        if (filter && filter !== 'all') {
            users = users.filter((user) => {
                const type = getUserType(user);
                if (filter === 'normal') return type === 'normal';
                if (filter === 'demo') return type === 'demo';
                if (filter === 'ai') return type === 'ai';
                if (filter === 'admin') return user.role === 'admin';
                if (filter === 'pro') return user.role === 'pro';
                return true;
            });
        }

        tbody.innerHTML = '';

        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-slate-400">해당 조건에 맞는 사용자가 없습니다.</td></tr>';
            return;
        }

        users.forEach((user) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 border-b border-slate-50 last:border-0';
            const category = getUserCategory(user);
            tr.innerHTML = `
            <td class="px-6 py-4 flex items-center gap-3">
                ${getUserAvatarHTML(user, 'sm')}
                <div class="flex flex-col">
                    <span class="font-medium text-slate-900">${getUserDisplayName(user, user.id)}</span>
                    <span class="text-xs text-slate-400">${getProfileSubLabel(user, user.id)}</span>
                </div>
            </td>
            <td class="px-6 py-4">${user.email || '—'}</td>
            <td class="px-6 py-4">
                <select onchange="updateUserRole('${user.id}', this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-brand-500">
                    <option value="free" ${category === 'free' ? 'selected' : ''}>일반</option>
                    <option value="demo" ${category === 'demo' ? 'selected' : ''}>데모</option>
                    <option value="ai" ${category === 'ai' ? 'selected' : ''}>AI</option>
                    <option value="pro" ${category === 'pro' ? 'selected' : ''}>Pro</option>
                    <option value="admin" ${category === 'admin' ? 'selected' : ''}>관리자</option>
                </select>
            </td>
            <td class="px-6 py-4 text-slate-500">${user.lastLogin && typeof user.lastLogin.toDate === 'function' ? user.lastLogin.toDate().toLocaleDateString() : '-'}</td>
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

    function bindUserControls() {
        const userSearchInput = document.getElementById('userSearch');
        if (userSearchInput && !userSearchInput.dataset.adminUsersBound) {
            userSearchInput.dataset.adminUsersBound = '1';
            userSearchInput.addEventListener('input', () => {
                applyUserFiltersAndRender();
            });
        }

        const userFilterSelect = document.getElementById('userFilter');
        if (userFilterSelect && !userFilterSelect.dataset.adminUsersBound) {
            userFilterSelect.dataset.adminUsersBound = '1';
            userFilterSelect.addEventListener('change', () => {
                applyUserFiltersAndRender();
            });
        }
    }

    async function editBotProfile(uid) {
        try {
            const data = await getManagedUserData(uid) || {};

            let currentProfile = '';
            if (data.botProfile) {
                currentProfile = String(data.botProfile);
            }

            const settings = data.botSettings || {};
            let tone = settings.tone || '';
            let fanType = settings.fanType || '';
            let length = settings.length || '';
            let emoji = settings.emoji || '';
            let extraNote = settings.extraNote || '';

            const profileInput = window.prompt('이 사용자를 AI 봇으로 사용할 때의 전체적인 말투/설명을 입력하세요.\n예: 과몰입 여돌 덕후, 항상 감탄사 많이 씀', currentProfile);
            if (profileInput === null) return;
            const profileTrimmed = profileInput.trim();

            if (window.confirm('톤, 팬 타입, 문장 길이, 이모지 사용량 같은 고급 설정도 함께 편집할까요?')) {
                const toneLabel = tone === 'over_reactive' ? '과몰입' :
                    tone === 'friendly' ? '친근' :
                        tone === 'calm' ? '차분' :
                            tone === 'formal' ? '공식' : '';
                const toneInput = window.prompt('톤을 선택해 주세요. (숫자 또는 한글)\n1) 과몰입\n2) 친근\n3) 차분\n4) 공식', toneLabel);
                if (toneInput !== null) {
                    const v = toneInput.trim();
                    if (v === '1' || v === '과몰입') tone = 'over_reactive';
                    else if (v === '2' || v === '친근') tone = 'friendly';
                    else if (v === '3' || v === '차분') tone = 'calm';
                    else if (v === '4' || v === '공식') tone = 'formal';
                }

                const fanLabel = fanType === 'fresh' ? '입덕러' :
                    fanType === 'core' ? '고인물' :
                        fanType === 'light' ? '라이트팬' : '';
                const fanInput = window.prompt('팬 타입을 선택해 주세요.\n1) 입덕러\n2) 고인물\n3) 라이트팬', fanLabel);
                if (fanInput !== null) {
                    const v = fanInput.trim();
                    if (v === '1' || v === '입덕러') fanType = 'fresh';
                    else if (v === '2' || v === '고인물') fanType = 'core';
                    else if (v === '3' || v === '라이트팬') fanType = 'light';
                }

                const lengthLabel = length === 'short' ? '짧게' :
                    length === 'medium' ? '보통' :
                        length === 'long' ? '길게' : '';
                const lengthInput = window.prompt('문장 길이를 선택해 주세요.\n1) 짧게\n2) 보통\n3) 길게', lengthLabel);
                if (lengthInput !== null) {
                    const v = lengthInput.trim();
                    if (v === '1' || v === '짧게') length = 'short';
                    else if (v === '2' || v === '보통') length = 'medium';
                    else if (v === '3' || v === '길게') length = 'long';
                }

                const emojiLabel = emoji === 'few' ? '거의 안씀' :
                    emoji === 'normal' ? '적당히' :
                        emoji === 'many' ? '많이' : '';
                const emojiInput = window.prompt('이모지 사용량을 선택해 주세요.\n1) 거의 안씀\n2) 적당히\n3) 많이', emojiLabel);
                if (emojiInput !== null) {
                    const v = emojiInput.trim();
                    if (v === '1' || v === '거의 안씀') emoji = 'few';
                    else if (v === '2' || v === '적당히') emoji = 'normal';
                    else if (v === '3' || v === '많이') emoji = 'many';
                }

                const extraInput = window.prompt('추가 설명이 있다면 입력해 주세요. (선택 사항)', extraNote);
                if (extraInput !== null) {
                    extraNote = extraInput.trim();
                }
            }

            const updatePayload = {};
            if (profileTrimmed) {
                updatePayload.botProfile = profileTrimmed;
            } else {
                updatePayload.botProfile = firebase.firestore.FieldValue.delete();
            }

            const hasSettings = tone || fanType || length || emoji || extraNote;
            if (hasSettings) {
                updatePayload.botSettings = { tone, fanType, length, emoji, extraNote };
            } else {
                updatePayload.botSettings = firebase.firestore.FieldValue.delete();
            }

            await getDb().collection('users').doc(uid).update(updatePayload);
            alert('AI 프로필이 업데이트되었습니다.');
        } catch (e) {
            alert('AI 프로필 업데이트 중 오류: ' + e.message);
        }
    }

    async function updateUserRole(uid, category) {
        const labelMap = {
            free: '일반',
            demo: '데모',
            ai: 'AI',
            pro: 'Pro',
            admin: '관리자'
        };
        const label = labelMap[category] || category;

        if (!confirm(`등급을 ${label}(으)로 변경하시겠습니까?`)) {
            loadUsers();
            return;
        }

        try {
            const updates = {};

            if (category === 'demo') {
                updates.isDemo = true;
                updates.isAiBot = false;
                updates.role = 'free';
            } else if (category === 'ai') {
                updates.isAiBot = true;
                updates.isDemo = false;
                updates.role = 'free';
            } else if (category === 'pro') {
                updates.role = 'pro';
                updates.isDemo = false;
                updates.isAiBot = false;
            } else if (category === 'admin') {
                updates.role = 'admin';
                updates.isDemo = false;
                updates.isAiBot = false;
            } else {
                updates.role = 'free';
                updates.isDemo = false;
                updates.isAiBot = false;
            }

            await getDb().collection('users').doc(uid).update(updates);
            alert('등급이 변경되었습니다.');
            await loadUsers();
        } catch (e) {
            alert('오류: ' + e.message);
        }
    }

    async function deleteUser(uid) {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await getDb().collection('users').doc(uid).delete();
            alert('삭제되었습니다.');
            loadUsers();
        } catch (e) {
            alert('오류: ' + e.message);
        }
    }

    const api = {
        bindUserControls,
        renderRecentUsers,
        loadUsers,
        applyUserFiltersAndRender,
        updateUserRole,
        deleteUser,
        editBotProfile
    };

    window.AdminUsers = api;
    window.renderRecentUsers = renderRecentUsers;
    window.loadUsers = loadUsers;
    window.applyUserFiltersAndRender = applyUserFiltersAndRender;
    window.updateUserRole = updateUserRole;
    window.deleteUser = deleteUser;
    window.editBotProfile = editBotProfile;
})();
