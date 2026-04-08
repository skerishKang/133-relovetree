(function () {
    let currentDemoSeedMode = null;
    window.currentDemoSeedMode = currentDemoSeedMode;

    function getDb() {
        return window.getAdminDb();
    }

    function getCurrentAdminUser() {
        return window.getCurrentAdminUser();
    }

    function openDemoSeedModal(mode) {
        currentDemoSeedMode = mode;
        window.currentDemoSeedMode = currentDemoSeedMode;
        const modal = document.getElementById('demoSeedModal');
        const titleEl = document.getElementById('demoSeedTitle');
        const descEl = document.getElementById('demoSeedDescription');
        const inputEl = document.getElementById('demoSeedCount');

        if (!modal || !titleEl || !descEl || !inputEl) return;

        let title = '데모 데이터 생성';
        let desc = '생성할 개수를 입력하세요. 비워두면 기본 개수로 생성됩니다.';

        if (mode === 'users') {
            title = '데모 사용자 생성';
            desc = '대시보드와 사용자 관리 화면에 표시할 데모 사용자를 몇 명까지 생성할지 입력하세요. 비워두면 기본 개수로 생성됩니다.';
        } else if (mode === 'trees') {
            title = '데모 러브트리 생성';
            desc = '홈과 에디터에서 사용할 데모 러브트리를 몇 개까지 생성할지 입력하세요. 비워두면 기본 개수로 생성됩니다.';
        } else if (mode === 'community') {
            title = '커뮤니티 데모 글 생성';
            desc = '커뮤니티 목록에 표시할 데모 글을 몇 개까지 생성할지 입력하세요. 비워두면 기본 개수로 생성됩니다.';
        }

        titleEl.textContent = title;
        descEl.textContent = desc;
        inputEl.value = '';
        modal.classList.remove('hidden');
    }

    function closeDemoSeedModal() {
        const modal = document.getElementById('demoSeedModal');
        if (!modal) return;
        modal.classList.add('hidden');
        currentDemoSeedMode = null;
        window.currentDemoSeedMode = currentDemoSeedMode;
    }

    async function seedDemoUsers(requestCount) {
        const currentUser = getCurrentAdminUser();

        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }

        const templates = [
            {
                uid: 'demo-user-01',
                email: 'demo-army@demo.local',
                displayName: '데모 아미',
                userId: 'demo_army',
                role: 'free',
                isDemo: true
            },
            {
                uid: 'demo-user-02',
                email: 'demo-carat@demo.local',
                displayName: '데모 캐럿',
                userId: 'demo_carat',
                role: 'pro',
                isDemo: true
            },
            {
                uid: 'demo-user-03',
                email: 'demo-stay@demo.local',
                displayName: '데모 스테이',
                userId: 'demo_stay',
                role: 'free',
                isDemo: true
            },
            {
                uid: 'demo-user-04',
                email: 'demo-diver@demo.local',
                displayName: '데모 다이브',
                userId: 'demo_diver',
                role: 'free',
                isDemo: true
            },
            {
                uid: 'ai-user-01',
                email: 'ai-bot@demo.local',
                displayName: 'Relovetree AI',
                userId: 'relovetree_ai',
                role: 'free',
                isDemo: false,
                isAiBot: true
            }
        ];

        const defaultCount = templates.length;
        const maxCount = typeof requestCount === 'number' && requestCount > 0
            ? Math.min(requestCount, templates.length)
            : defaultCount;

        let createdCount = 0;

        try {
            for (let i = 0; i < maxCount; i++) {
                const tpl = templates[i];
                const ref = getDb().collection('users').doc(tpl.uid);
                const snap = await ref.get();

                await ref.set({
                    email: tpl.email,
                    displayName: tpl.displayName,
                    photoURL: '',
                    role: tpl.role,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    isDemo: tpl.isDemo !== undefined ? tpl.isDemo : true,
                    isAiBot: !!tpl.isAiBot,
                    userId: tpl.userId || firebase.firestore.FieldValue.delete()
                }, { merge: true });

                if (!snap.exists) {
                    createdCount++;
                }
            }

            if (createdCount > 0) {
                alert(`데모 사용자 ${createdCount}명을 생성했습니다.`);
                await window.loadStats();
                await window.loadUsers();
            } else {
                alert('새로 생성된 데모 사용자가 없습니다. (이미 같은 ID의 데모 사용자가 있습니다)');
            }
        } catch (e) {
            console.error('데모 사용자 생성 오류:', e);
            alert('데모 사용자 생성 중 오류가 발생했습니다: ' + e.message);
        }
    }

    async function seedDemoTrees(requestCount) {
        const currentUser = getCurrentAdminUser();

        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }

        const owners = [];

        try {
            const demoSnap = await getDb().collection('users').where('isDemo', '==', true).limit(10).get();
            demoSnap.forEach((doc) => {
                const data = doc.data() || {};
                owners.push({ uid: doc.id, name: data.displayName || data.email || doc.id });
            });
        } catch (e) {
        }

        if (!owners.length) {
            owners.push({ uid: currentUser.uid, name: currentUser.displayName || currentUser.email || '관리자' });
        }

        const templates = [
            { id: 'demo-tree-bts', name: '방탄소년단 타임라인 데모', baseTitle: 'BTS 활동 정리' },
            { id: 'demo-tree-svt', name: '세븐틴 투어 히스토리 데모', baseTitle: '세븐틴 투어 기록' },
            { id: 'demo-tree-skz', name: '스트레이 키즈 컴백 타임라인 데모', baseTitle: '스트레이 키즈 컴백 정리' },
            { id: 'demo-tree-newjeans', name: '뉴진스 활동 모먼트 데모', baseTitle: '뉴진스 활동 정리' },
            { id: 'demo-tree-illit', name: '아일릿 성장기 데모', baseTitle: '아일릿 활동 타임라인' },
            { id: 'demo-tree-ive', name: '아이브 모먼트 데모', baseTitle: '아이브 활동 기록' },
            { id: 'demo-tree-leserafim', name: '르세라핌 모먼트 데모', baseTitle: '르세라핌 활동 기록' },
            { id: 'demo-tree-aespa', name: '에스파 모먼트 데모', baseTitle: '에스파 컴백 기록' },
            { id: 'demo-tree-riize', name: '라이즈 모먼트 데모', baseTitle: '라이즈 활동 기록' },
            { id: 'demo-tree-iu', name: '아이유 모먼트 데모', baseTitle: '아이유 활동 기록' }
        ];

        const defaultCount = templates.length;
        const maxCount = typeof requestCount === 'number' && requestCount > 0
            ? Math.min(requestCount, templates.length)
            : defaultCount;

        let createdCount = 0;

        try {
            for (let i = 0; i < maxCount; i++) {
                const tpl = templates[i];
                const ref = getDb().collection('trees').doc(tpl.id);
                const snap = await ref.get();
                if (snap.exists) continue;

                const owner = owners[i % owners.length];
                const now = new Date();
                const nodes = [];
                const edges = [];

                for (let step = 0; step < 4; step++) {
                    const id = step + 1;
                    const d = new Date(now.getTime() - (3 - step) * 30 * 24 * 60 * 60 * 1000);
                    const date = d.toISOString().split('T')[0];
                    nodes.push({
                        id: id,
                        x: 200 + step * 260,
                        y: 200,
                        title: tpl.baseTitle + ' - 단계 ' + (step + 1),
                        date: date,
                        videoId: '',
                        moments: []
                    });
                    if (step > 0) {
                        edges.push({ from: id - 1, to: id });
                    }
                }

                const likeCount = 50 - i * 3;
                const viewCount = 200 + i * 25;
                const shareCount = 20 + i * 2;

                await ref.set({
                    name: tpl.name,
                    ownerId: owner.uid,
                    nodes: nodes,
                    edges: edges,
                    likes: [],
                    likeCount: Math.max(0, likeCount),
                    viewCount: Math.max(0, viewCount),
                    shareCount: Math.max(0, shareCount),
                    nodeCount: nodes.length,
                    comments: [],
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                    isDemo: true
                }, { merge: true });

                createdCount++;
            }

            if (createdCount > 0) {
                alert(`데모 러브트리 ${createdCount}개를 생성했습니다.`);
            } else {
                alert('새로 생성된 데모 러브트리가 없습니다. (이미 같은 ID의 트리가 있습니다)');
            }
        } catch (e) {
            console.error('데모 러브트리 생성 오류:', e);
            alert('데모 러브트리 생성 중 오류가 발생했습니다: ' + e.message);
        }
    }

    async function recalcAllTreesNodeCount() {
        try {
            const snapshot = await getDb().collection('trees').get();

            if (snapshot.empty) {
                alert('재계산할 트리가 없습니다.');
                return;
            }

            let updatedCount = 0;
            const batch = getDb().batch();

            snapshot.forEach((doc) => {
                const data = doc.data() || {};
                const nodes = Array.isArray(data.nodes) ? data.nodes : [];
                const nodeCount = nodes.length;
                batch.update(doc.ref, { nodeCount });
                updatedCount++;
            });

            await batch.commit();
            alert(`총 ${updatedCount}개의 트리에 대해 nodeCount를 재계산했습니다.`);
        } catch (e) {
            console.error('nodeCount 재계산 오류:', e);
            alert('nodeCount 재계산 중 오류가 발생했습니다: ' + e.message);
        }
    }

    async function seedDemoCommunityPosts(requestCount) {
        const currentUser = getCurrentAdminUser();

        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }

        const authorId = currentUser.uid;
        const authorName = currentUser.displayName || currentUser.email || '관리자';
        const templates = [
            {
                title: 'Relovetree로 덕질 기록하는 법',
                content: '처음 오신 분들을 위해 Relovetree를 어떻게 쓰면 좋은지 간단히 정리해봤어요.\n1) 아티스트 러브트리를 만들고\n2) 입덕부터 최신 활동까지 순간들을 노드로 추가해 보세요.'
            },
            {
                title: '내 최애 무대 추천 스레드',
                content: '각자 최애 무대 하나씩만 링크와 함께 추천해 주세요!\n왜 이 무대를 좋아하는지도 한 줄로 적어주면 더 좋아요 :)'
            },
            {
                title: '덕질 루틴 공유해요',
                content: '출근길/등굣길, 퇴근 후, 주말에 어떻게 덕질하는지 루틴을 공유해 봅시다.\n러브트리를 어떻게 활용하고 있는지도 같이 써 주세요.'
            },
            {
                title: '입덕 계기 썰 풀어보기',
                content: '어떤 계기로 지금 최애를 좋아하게 되었나요? 음악, 무대, 예능, 혹은 친구의 추천 등 각자의 입덕 스토리를 자유롭게 공유해 주세요.'
            },
            {
                title: '최애 짤/움짤 자랑방',
                content: '요즘 계속 돌려보는 최애 짤이나 움짤이 있다면 여기에 공유해 주세요. 왜 좋아하는지도 한 줄 코멘트로 남겨주면 더 재밌어요.'
            }
        ];

        try {
            const existingSnap = await getDb().collection('community_posts')
                .where('authorId', '==', authorId)
                .get();

            const existingTitles = new Set();
            existingSnap.forEach((doc) => {
                const data = doc.data() || {};
                if (data.title) existingTitles.add(String(data.title));
            });

            const defaultCount = templates.length;
            const maxCount = typeof requestCount === 'number' && requestCount > 0
                ? Math.min(requestCount, templates.length)
                : defaultCount;

            let createdCount = 0;

            for (let i = 0; i < maxCount; i++) {
                const tpl = templates[i];
                if (existingTitles.has(tpl.title)) continue;

                await getDb().collection('community_posts').add({
                    title: tpl.title,
                    content: tpl.content,
                    authorId,
                    authorDisplayName: authorName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    likeCount: 0,
                    commentCount: 0,
                    isDeleted: false
                });

                createdCount++;
            }

            if (createdCount > 0) {
                alert(`커뮤니티 데모 글 ${createdCount}개를 생성했습니다.`);
            } else {
                alert('새로 생성된 데모 글이 없습니다. (이미 같은 제목의 글이 있습니다)');
            }
        } catch (e) {
            console.error('데모 커뮤니티 글 생성 오류:', e);
            alert('데모 커뮤니티 글 생성 중 오류가 발생했습니다: ' + e.message);
        }
    }

    window.AdminDemo = {
        openDemoSeedModal,
        closeDemoSeedModal,
        seedDemoUsers,
        seedDemoTrees,
        recalcAllTreesNodeCount,
        seedDemoCommunityPosts
    };
    window.openDemoSeedModal = openDemoSeedModal;
    window.closeDemoSeedModal = closeDemoSeedModal;
    window.seedDemoUsers = seedDemoUsers;
    window.seedDemoTrees = seedDemoTrees;
    window.recalcAllTreesNodeCount = recalcAllTreesNodeCount;
    window.seedDemoCommunityPosts = seedDemoCommunityPosts;
})();
