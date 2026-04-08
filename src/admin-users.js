(function () {
    const Util = window.AdminUsersUtil;
    const Render = window.AdminUsersRender;
    const Filter = window.AdminUsersFilter;

    let allUsersCache = [];

    function getDb() {
        return window.getAdminDb();
    }

    function getManagedUserData(uid) {
        return window.fetchManagedUserData(uid);
    }

    function getUsersCache() {
        return allUsersCache;
    }

    function setUsersCache(users) {
        allUsersCache = users || [];
    }

    function getUserCount() {
        return allUsersCache.length;
    }

    async function loadUsers() {
        Render.renderLoading('allUsersTable', 5);

        try {
            const snapshot = await getDb().collection('users').orderBy('lastLogin', 'desc').get();

            const users = [];
            snapshot.forEach(doc => {
                const data = doc.data() || {};
                users.push({ id: doc.id, ...data });
            });

            setUsersCache(users);
            applyUserFiltersAndRender();
        } catch (e) {
            console.error('Load users error:', e);
            Render.renderError('allUsersTable', 5, '데이터 로드 실패');
        }
    }

    function applyUserFiltersAndRender() {
        const { query, filterType } = Filter.getCurrentFilterValues();
        const filtered = Filter.filterUsers(getUsersCache(), query, filterType);
        Render.renderAllUsersTable(filtered);
    }

    function bindUserControls() {
        Filter.bindFilterEvents(applyUserFiltersAndRender);
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

                const emojiLabel = emoji === 'few' ? '거의 안즘' :
                    emoji === 'normal' ? '적당히' :
                        emoji === 'many' ? '많이' : '';
                const emojiInput = window.prompt('이모지 사용량을 선택해 주세요.\n1) 거의 안즘\n2) 적당히\n3) 많이', emojiLabel);
                if (emojiInput !== null) {
                    const v = emojiInput.trim();
                    if (v === '1' || v === '거의 안즘') emoji = 'few';
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

    window.AdminUsers = {
        bindUserControls,
        renderRecentUsers: Render.renderRecentUsersTable,
        loadUsers,
        applyUserFiltersAndRender,
        updateUserRole,
        deleteUser,
        editBotProfile,
        getUsersCache,
        setUsersCache,
        getUserCount
    };

    window.renderRecentUsers = Render.renderRecentUsersTable;
    window.loadUsers = loadUsers;
    window.applyUserFiltersAndRender = applyUserFiltersAndRender;
    window.updateUserRole = updateUserRole;
    window.deleteUser = deleteUser;
    window.editBotProfile = editBotProfile;
})();