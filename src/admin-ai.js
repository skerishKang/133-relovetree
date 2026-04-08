(function () {
    function getDb() {
        return window.getAdminDb();
    }

    function getCurrentAdminUser() {
        return window.getCurrentAdminUser();
    }

    function getManagedUserData(uid) {
        return window.fetchManagedUserData(uid);
    }

    function buildBotSettingsDescription(settings) {
        if (typeof window.buildBotSettingsDescription === 'function') {
            return window.buildBotSettingsDescription(settings);
        }
        return '';
    }

    async function loadAiLogs() {
        const tbody = document.getElementById('aiLogsTable');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center">로딩 중...</td></tr>';

        try {
            const snapshot = await getDb().collection('ai_logs')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            const formatter = window.AdminAiLogFormatter;
            const buildRow = formatter ? formatter.buildAiLogTableRow : null;
            const formatRow = formatter ? formatter.formatAiLogRow : null;

            const rows = [];
            snapshot.forEach((doc) => {
                const data = doc.data ? doc.data() : {};
                let rowHtml = '';
                
                if (buildRow) {
                    const row = formatRow ? formatRow(data) : data;
                    rowHtml = buildRow(row);
                } else {
                    const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function'
                        ? data.createdAt.toDate().toLocaleString()
                        : '-';
                    const type = data.type || '-';
                    const bot = data.botName || data.botUid || '-';
                    const summary = data.summary || '';
                    rowHtml = `
                        <tr class="hover:bg-slate-50">
                            <td class="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">${createdAt}</td>
                            <td class="px-6 py-3 text-xs font-semibold text-slate-700">${type}</td>
                            <td class="px-6 py-3 text-xs text-slate-700">${bot}</td>
                            <td class="px-6 py-3 text-xs text-slate-600">${summary}</td>
                        </tr>
                    `;
                }
                rows.push(rowHtml);
            });

            if (rows.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-slate-400">아직 기록된 AI 로그가 없습니다.</td></tr>';
            } else {
                tbody.innerHTML = rows.join('');
            }
        } catch (e) {
            console.error('AI 로그 로드 오류:', e);
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">AI 로그 로드 실패</td></tr>';
        }
    }

    async function logAiActivity(entry) {
        try {
            const adminUser = getCurrentAdminUser();
            const payload = {
                type: entry.type || 'unknown',
                botUid: entry.botUid || null,
                botName: entry.botName || null,
                targetType: entry.targetType || null,
                targetId: entry.targetId || null,
                count: typeof entry.count === 'number' ? entry.count : null,
                summary: entry.summary || '',
                meta: entry.meta || null,
                adminUid: adminUser ? adminUser.uid : null,
                adminEmail: adminUser ? adminUser.email : null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await getDb().collection('ai_logs').add(payload);
        } catch (e) {
            console.warn('AI 로그 기록 실패:', e);
        }
    }

    async function createAiDemoTree(uid) {
        const defaultPrompt = '플레이브 활동을 입덕부터 최근까지 4단계로 정리해줘';
        const promptText = window.prompt('이 사용자의 트리를 어떤 주제로 만들까요?', defaultPrompt);
        if (promptText === null) return;

        const count = 4;
        let userName = '';
        let userData = null;

        try {
            userData = await getManagedUserData(uid);
            if (userData) {
                if (userData.displayName) {
                    userName = userData.displayName;
                } else if (userData.email) {
                    userName = userData.email.split('@')[0];
                }
            }
        } catch (e) {
            console.warn('AI 트리용 봇 정보 조회 실패:', e);
        }

        const finalPrompt = window.AdminAiRequest.formatBotPrompt(promptText || defaultPrompt, userData);

        let suggestions = [];
        try {
            const data = await window.AdminAiRequest.executeAiRequest('tree', { prompt: finalPrompt, count: count });
            if (data && Array.isArray(data.result)) {
                suggestions = data.result;
            }
        } catch (e) {
            console.error('AI helper error:', e);
        }

        // Fallback for demo
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
            const now = new Date();
            const base = promptText || 'AI 러브트리';
            suggestions = [];
            for (let i = 0; i < count; i++) {
                const d = new Date(now.getTime() - (count - 1 - i) * 7 * 24 * 60 * 60 * 1000);
                const date = d.toISOString().split('T')[0];
                suggestions.push({
                    title: base + ' - 순간 ' + (i + 1),
                    date: date,
                    description: ''
                });
            }
        }

        const treeId = 'ai-' + uid + '-' + Date.now();
        const treeName = '[AI] ' + (promptText || '데모 트리');
        const dataToSave = window.AdminAiCreator.buildAiTreePayload(uid, treeName, suggestions);

        try {
            await window.AdminAiCreator.saveAiTree(uid, treeId, dataToSave);
            logAiActivity({
                type: 'tree_create',
                botUid: uid,
                botName: userName || null,
                targetType: 'tree',
                targetId: treeId,
                count: count,
                summary: treeName
            });
            const url = '/pages/editor.html?id=' + encodeURIComponent(treeId);
            alert('AI 트리가 생성되었습니다. 에디터에서 확인해 보세요.\n' + url);
            if (window.confirm('지금 바로 에디터에서 열어볼까요?')) {
                window.open(url, '_blank');
            }
        } catch (e) {
            console.error('AI 트리 생성 오류:', e);
            alert('AI 트리 생성 중 오류가 발생했습니다: ' + e.message);
        }
    }

    async function createAiReactions(uid) {
        const countInput = window.prompt('이 사용자가 AI처럼 반응할 트리 개수를 입력하세요. (기본 3)', '3');
        if (countInput === null) return;

        const reactionCount = parseInt(countInput, 10);
        if (!reactionCount || reactionCount <= 0) {
            alert('1 이상의 숫자를 입력해 주세요.');
            return;
        }

        try {
            let userName = '익명';
            let userData = null;
            try {
                userData = await getManagedUserData(uid);
                if (userData) {
                    if (userData.displayName) userName = userData.displayName;
                    else if (userData.email) userName = userData.email.split('@')[0];
                }
            } catch (e) {
                console.warn('AI 반응용 사용자 정보 조회 실패:', e);
            }

            const snapshot = await getDb().collection('trees')
                .orderBy('lastUpdated', 'desc')
                .limit(30)
                .get();

            const candidates = [];
            snapshot.forEach((doc) => {
                const data = doc.data() || {};
                const likes = Array.isArray(data.likes) ? data.likes : [];
                if (likes.includes(uid)) return;
                candidates.push({ id: doc.id, data });
            });

            if (candidates.length === 0) {
                alert('AI가 반응할 수 있는 트리가 없습니다.');
                return;
            }

            const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
            const targets = shuffled.slice(0, Math.min(reactionCount, shuffled.length));
            const reactedTrees = [];

            for (const item of targets) {
                const treeId = item.id;
                const treeData = item.data;
                const treeName = treeData.name || '이 트리';

                let commentText = '';
                const basePrompt = `${treeName} 트리를 본 팬이 남길만한 한 줄 감상평을 한국어로 짧게 써줘. 최대 1문장.`;
                const finalPrompt = window.AdminAiRequest.formatBotPrompt(basePrompt, userData);
                
                try {
                    const data = await window.AdminAiRequest.executeAiRequest('comment', { prompt: finalPrompt, nodeTitle: treeName });
                    if (data && Array.isArray(data.result) && data.result.length > 0) {
                        commentText = String(data.result[0]);
                    }
                } catch (e) {
                    console.warn('AI 반응 생성 중 오류:', e);
                }

                if (!commentText) {
                    commentText = `${treeName}를 보면 다시 입덕하는 느낌이에요.`;
                }

                try {
                    await getDb().collection('trees').doc(treeId).update({
                        likes: firebase.firestore.FieldValue.arrayUnion(uid),
                        likeCount: firebase.firestore.FieldValue.increment(1)
                    });
                    await window.AdminAiCreator.postAiTreeComment(treeId, uid, userName, commentText);
                } catch (e) {
                    console.warn('AI 반응 반영 실패:', e);
                }

                reactedTrees.push(treeName);
            }

            if (reactedTrees.length > 0) {
                logAiActivity({
                    type: 'tree_reactions',
                    botUid: uid,
                    botName: userName || null,
                    targetType: 'tree',
                    count: reactedTrees.length,
                    summary: `트리 ${reactedTrees.length}개에 AI 반응 생성`,
                    meta: { treeNames: reactedTrees }
                });
                alert(`총 ${reactedTrees.length}개의 트리에 AI 반응이 생성되었습니다.`);
            }
        } catch (e) {
            console.error('AI 반응 생성 중 오류:', e);
            alert('AI 반응 생성 중 오류가 발생했습니다: ' + e.message);
        }
    }

    async function createAiCommunityComments(uid) {
        const countInput = window.prompt('이 사용자가 AI처럼 댓글을 남길 커뮤니티 글 개수를 입력하세요. (기본 3)', '3');
        if (countInput === null) return;

        const reactionCount = parseInt(countInput, 10);
        if (!reactionCount || reactionCount <= 0) {
            alert('1 이상의 숫자를 입력해 주세요.');
            return;
        }

        try {
            let userName = '익명';
            let userData = null;
            try {
                userData = await getManagedUserData(uid);
                if (userData) {
                    if (userData.displayName) userName = userData.displayName;
                    else if (userData.email) userName = userData.email.split('@')[0];
                }
            } catch (e) {
                console.warn('AI 커뮤니티 댓글용 사용자 정보 조회 실패:', e);
            }

            const snapshot = await getDb().collection('community_posts')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            const candidates = [];
            snapshot.forEach((doc) => {
                const data = doc.data() || {};
                candidates.push({ id: doc.id, data });
            });

            if (candidates.length === 0) {
                alert('AI가 댓글을 남길 수 있는 커뮤니티 글이 없습니다.');
                return;
            }

            const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
            const targets = shuffled.slice(0, Math.min(reactionCount, shuffled.length));
            const reactedPosts = [];

            for (const item of targets) {
                const postId = item.id;
                const postData = item.data;
                const title = postData.title || '제목 없음';
                const content = postData.content || '';
                const snippet = content.length > 80 ? content.slice(0, 80) + '…' : content;

                let commentText = '';
                const basePrompt = `"${title}"라는 제목의 글과 다음 내용을 읽은 팬이 남길만한 한 줄 댓글을 한국어로 짧게 써줘. 최대 1문장.\n\n내용 요약: ${snippet}`;
                const finalPrompt = window.AdminAiRequest.formatBotPrompt(basePrompt, userData);

                try {
                    const data = await window.AdminAiRequest.executeAiRequest('comment', { prompt: finalPrompt, nodeTitle: title });
                    if (data && Array.isArray(data.result) && data.result.length > 0) {
                        commentText = String(data.result[0]);
                    }
                } catch (e) {
                    console.warn('AI 커뮤니티 댓글 생성 중 오류:', e);
                }

                if (!commentText) {
                    commentText = `${title} 글 너무 공감돼요.`;
                }

                try {
                    await window.AdminAiCreator.postAiCommunityComment(postId, uid, userName, commentText);
                } catch (e) {
                    console.warn('AI 커뮤니티 댓글 쓰기 실패:', e);
                }

                reactedPosts.push(title);
            }

            if (reactedPosts.length > 0) {
                logAiActivity({
                    type: 'community_comments',
                    botUid: uid,
                    botName: userName || null,
                    targetType: 'community_post',
                    count: reactedPosts.length,
                    summary: `커뮤니티 글 ${reactedPosts.length}개에 AI 댓글 생성`,
                    meta: { postTitles: reactedPosts }
                });
                alert(`총 ${reactedPosts.length}개의 글에 AI 커뮤니티 댓글이 생성되었습니다.`);
            }
        } catch (e) {
            console.error('AI 커뮤니티 댓글 생성 중 오류:', e);
            alert('AI 커뮤니티 댓글 생성 중 오류가 발생했습니다: ' + e.message);
        }
    }

    window.AdminAi = {
        loadAiLogs,
        logAiActivity,
        buildBotSettingsDescription,
        createAiDemoTree,
        createAiReactions,
        createAiCommunityComments
    };
    window.loadAiLogs = loadAiLogs;
    window.logAiActivity = logAiActivity;
    window.buildBotSettingsDescription = buildBotSettingsDescription;
    window.createAiDemoTree = createAiDemoTree;
    window.createAiReactions = createAiReactions;
    window.createAiCommunityComments = createAiCommunityComments;
})();
