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
        if (!settings) return '';
        const parts = [];

        if (settings.tone) {
            if (settings.tone === 'over_reactive') parts.push('- 톤: 과몰입 (감탄사와 리액션이 큰 스타일)');
            else if (settings.tone === 'friendly') parts.push('- 톤: 친근 (팬들끼리 편하게 대화하는 느낌)');
            else if (settings.tone === 'calm') parts.push('- 톤: 차분 (설명 위주, 담백한 스타일)');
            else if (settings.tone === 'formal') parts.push('- 톤: 공식 (존댓말, 공지문 같은 느낌)');
        }

        if (settings.fanType) {
            if (settings.fanType === 'fresh') parts.push('- 팬 타입: 입덕러 (최근에 좋아하게 된 팬)');
            else if (settings.fanType === 'core') parts.push('- 팬 타입: 고인물 (활동/정보를 잘 아는 오래된 팬)');
            else if (settings.fanType === 'light') parts.push('- 팬 타입: 라이트팬 (편하게 즐기는 가벼운 팬)');
        }

        if (settings.length) {
            if (settings.length === 'short') parts.push('- 문장 길이: 짧게 (한 문장 정도)');
            else if (settings.length === 'medium') parts.push('- 문장 길이: 보통 (두세 문장 이내)');
            else if (settings.length === 'long') parts.push('- 문장 길이: 길게 (조금 더 자세하게)');
        }

        if (settings.emoji) {
            if (settings.emoji === 'few') parts.push('- 이모지: 거의 사용하지 않음');
            else if (settings.emoji === 'normal') parts.push('- 이모지: 적당히 사용');
            else if (settings.emoji === 'many') parts.push('- 이모지: 자주 사용');
        }

        if (settings.extraNote) {
            parts.push('- 추가 설명: ' + String(settings.extraNote));
        }

        if (!parts.length) return '';

        return '\n\n[봇 설정]\n' + parts.join('\n');
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

            const rows = [];
            snapshot.forEach((doc) => {
                const data = doc.data() || {};
                const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function'
                    ? data.createdAt.toDate().toLocaleString()
                    : '-';
                const type = data.type || '-';
                const bot = data.botName || data.botUid || '-';
                const summary = data.summary || '';

                rows.push(`
                <tr class="hover:bg-slate-50">
                    <td class="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">${createdAt}</td>
                    <td class="px-6 py-3 text-xs font-semibold text-slate-700">${type}</td>
                    <td class="px-6 py-3 text-xs text-slate-700">${bot}</td>
                    <td class="px-6 py-3 text-xs text-slate-600">${summary}</td>
                </tr>
            `);
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
        let botProfileSuffix = '';
        let botSettingsSuffix = '';
        try {
            const u = await getManagedUserData(uid);
            if (u) {
                if (u.botProfile) {
                    botProfileSuffix = '\n\n[봇 프로필]\n' + String(u.botProfile);
                }
                if (u.botSettings) {
                    botSettingsSuffix = buildBotSettingsDescription(u.botSettings);
                }
                if (u.displayName) {
                    userName = u.displayName;
                } else if (u.email) {
                    userName = u.email.split('@')[0];
                }
            }
        } catch (e) {
            console.warn('AI 트리용 봇 프로필 조회 실패:', e);
        }

        const finalPrompt = (promptText || defaultPrompt) + botProfileSuffix + botSettingsSuffix;

        let suggestions = [];
        try {
            const res = await fetch(window.AI_HELPER_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'tree', payload: { prompt: finalPrompt, count: count } })
            });
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.result)) {
                    suggestions = data.result;
                }
            }
        } catch (e) {
            console.error('AI helper error:', e);
        }

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

        const nodes = [];
        const edges = [];
        suggestions.forEach((item, index) => {
            const id = index + 1;
            const title = item && item.title ? item.title : '새 순간';
            const date = item && item.date ? item.date : new Date().toISOString().split('T')[0];
            const description = item && item.description ? String(item.description).trim() : '';
            const baseMomentText = description || `${title}에 대한 첫 순간을 여기에 기록해 보세요.`;
            const nodeMoments = [
                {
                    time: '0:00',
                    text: baseMomentText,
                    feeling: 'love'
                }
            ];

            nodes.push({
                id: id,
                x: 200 + index * 320,
                y: 200,
                title: title,
                date: date,
                videoId: item && item.videoId ? item.videoId : '',
                moments: nodeMoments
            });
            if (index > 0) {
                edges.push({ from: id - 1, to: id });
            }
        });

        const treeId = 'ai-' + uid + '-' + Date.now();
        const name = '[AI] ' + (promptText || '데모 트리');
        const dataToSave = {
            name: name,
            nodes: nodes,
            edges: edges,
            likes: [],
            likeCount: 0,
            comments: [],
            ownerId: uid,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            nodeCount: nodes.length,
            viewCount: 0,
            shareCount: 0
        };

        try {
            await getDb().collection('trees').doc(treeId).set(dataToSave, { merge: true });
            logAiActivity({
                type: 'tree_create',
                botUid: uid,
                botName: userName || null,
                targetType: 'tree',
                targetId: treeId,
                count: nodes.length,
                summary: name
            });
            const url = 'editor.html?id=' + encodeURIComponent(treeId);
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
            let botProfile = '';
            let botSettingsSuffix = '';
            try {
                const u = await getManagedUserData(uid);
                if (u) {
                    if (u.displayName) userName = u.displayName;
                    else if (u.email) userName = u.email.split('@')[0];
                    if (u.botProfile) botProfile = String(u.botProfile);
                    if (u.botSettings) botSettingsSuffix = buildBotSettingsDescription(u.botSettings);
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
                alert('AI가 반응할 수 있는 트리가 없습니다. (이미 좋아요를 눌렀거나 트리가 없습니다)');
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
                let basePrompt = `${treeName} 트리를 본 팬이 남길만한 한 줄 감상평을 한국어로 짧게 써줘. 최대 1문장.`;
                if (botProfile) {
                    basePrompt += `\n\n이 계정의 말투: ${botProfile}`;
                }
                if (botSettingsSuffix) {
                    basePrompt += botSettingsSuffix;
                }
                try {
                    const res = await fetch(window.AI_HELPER_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mode: 'comment',
                            payload: {
                                prompt: basePrompt,
                                nodeTitle: treeName
                            }
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data && Array.isArray(data.result) && data.result.length > 0) {
                            commentText = String(data.result[0]);
                        }
                    }
                } catch (e) {
                    console.warn('AI 반응 생성 중 오류:', e);
                }

                if (!commentText) {
                    commentText = `${treeName}를 보면 다시 입덕하는 느낌이에요.`;
                }

                try {
                    const likesArray = Array.isArray(treeData.likes) ? treeData.likes : [];
                    const newLikeCount = likesArray.length + 1;

                    await getDb().collection('trees').doc(treeId).update({
                        likes: firebase.firestore.FieldValue.arrayUnion(uid),
                        likeCount: newLikeCount
                    });
                } catch (e) {
                    console.warn('AI 좋아요 업데이트 실패:', e);
                }

                try {
                    await getDb().collection('trees').doc(treeId).collection('comments').add({
                        text: commentText,
                        userId: uid,
                        userName: userName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        isAiBot: true
                    });
                } catch (e) {
                    console.warn('AI 댓글 생성 실패:', e);
                }

                reactedTrees.push(treeName);
            }

            if (reactedTrees.length > 0) {
                logAiActivity({
                    type: 'tree_reactions',
                    botUid: uid,
                    botName: userName || null,
                    targetType: 'tree',
                    targetId: null,
                    count: reactedTrees.length,
                    summary: `트리 ${reactedTrees.length}개에 AI 반응 생성`,
                    meta: { treeNames: reactedTrees }
                });
                alert(`총 ${reactedTrees.length}개의 트리에 AI 반응이 생성되었습니다.\n\n- ` + reactedTrees.join('\n- '));
            } else {
                alert('실제로 반응이 생성된 트리가 없습니다. (모든 시도가 실패했습니다)');
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
            let botProfile = '';
            let botSettingsSuffix = '';
            try {
                const u = await getManagedUserData(uid);
                if (u) {
                    if (u.displayName) userName = u.displayName;
                    else if (u.email) userName = u.email.split('@')[0];
                    if (u.botProfile) botProfile = String(u.botProfile);
                    if (u.botSettings) botSettingsSuffix = buildBotSettingsDescription(u.botSettings);
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
                let basePrompt = `"${title}"라는 제목의 글과 다음 내용을 읽은 팬이 남길만한 한 줄 댓글을 한국어로 짧게 써줘. 최대 1문장.\n\n내용 요약: ${snippet}`;
                if (botProfile) {
                    basePrompt += `\n\n이 계정의 말투: ${botProfile}`;
                }
                if (botSettingsSuffix) {
                    basePrompt += botSettingsSuffix;
                }

                try {
                    const res = await fetch(window.AI_HELPER_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mode: 'comment',
                            payload: {
                                prompt: basePrompt,
                                nodeTitle: title
                            }
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data && Array.isArray(data.result) && data.result.length > 0) {
                            commentText = String(data.result[0]);
                        }
                    }
                } catch (e) {
                    console.warn('AI 커뮤니티 댓글 생성 중 오류:', e);
                }

                if (!commentText) {
                    commentText = `${title} 글 너무 공감돼요.`;
                }

                try {
                    await getDb().collection('community_posts').doc(postId).collection('comments').add({
                        content: commentText,
                        authorId: uid,
                        authorDisplayName: userName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        isDeleted: false,
                        isAiBot: true
                    });

                    await getDb().collection('community_posts').doc(postId).update({
                        commentCount: firebase.firestore.FieldValue.increment(1)
                    });
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
                    targetId: null,
                    count: reactedPosts.length,
                    summary: `커뮤니티 글 ${reactedPosts.length}개에 AI 댓글 생성`,
                    meta: { postTitles: reactedPosts }
                });
                alert(`총 ${reactedPosts.length}개의 글에 AI 커뮤니티 댓글이 생성되었습니다.\n\n- ` + reactedPosts.join('\n- '));
            } else {
                alert('실제로 댓글이 생성된 글이 없습니다. (모든 시도가 실패했습니다)');
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
