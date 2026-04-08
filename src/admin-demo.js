(function () {
    function getDb() {
        return window.getAdminDb();
    }

    function getCurrentAdminUser() {
        return window.getCurrentAdminUser();
    }

    function openDemoSeedModal(mode) {
        if (typeof window.AdminDemoModal !== 'undefined') {
            window.AdminDemoModal.openDemoSeedModal(mode);
        }
    }

    function closeDemoSeedModal() {
        if (typeof window.AdminDemoModal !== 'undefined') {
            window.AdminDemoModal.closeDemoSeedModal();
        }
    }

    async function seedDemoUsers(requestCount) {
        const currentUser = getCurrentAdminUser();
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }

        const templates = window.AdminDemoTemplates
            ? window.AdminDemoTemplates.getDemoUserTemplates()
            : null;
        
        if (!templates) {
            alert('데모 템플릿 로드 실패');
            return;
        }

        const maxCount = window.AdminDemoTemplates
            ? window.AdminDemoTemplates.getMaxSeedCount(requestCount, templates)
            : templates.length;

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
                if (typeof window.loadStats === 'function') await window.loadStats();
                if (typeof window.loadUsers === 'function') await window.loadUsers();
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

        const templates = window.AdminDemoTemplates
            ? window.AdminDemoTemplates.getDemoTreeTemplates()
            : null;
        
        if (!templates) {
            alert('데모 트리 템플릿 로드 실패');
            return;
        }

        const maxCount = window.AdminDemoTemplates
            ? window.AdminDemoTemplates.getMaxSeedCount(requestCount, templates)
            : templates.length;

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

        const templates = window.AdminDemoTemplates
            ? window.AdminDemoTemplates.getDemoCommunityTemplates()
            : null;
        
        if (!templates) {
            alert('커뮤니티 템플릿 로드 실패');
            return;
        }

        try {
            const existingSnap = await getDb().collection('community_posts')
                .where('authorId', '==', authorId)
                .get();

            const existingTitles = new Set();
            existingSnap.forEach((doc) => {
                const data = doc.data() || {};
                if (data.title) existingTitles.add(String(data.title));
            });

            const maxCount = window.AdminDemoTemplates
                ? window.AdminDemoTemplates.getMaxSeedCount(requestCount, templates)
                : templates.length;

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