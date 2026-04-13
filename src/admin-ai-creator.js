/**
 * Admin AI Tree & Comment Creation Helper
 */
(function () {
    function getDb() {
        return window.getAdminDb();
    }

    /**
     * Create tree data structure for PostgreSQL
     */
    function buildAiTreePayload(uid, name, suggestions) {
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

        return {
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
    }

    /**
     * Save AI tree to PostgreSQL
     */
    async function saveAiTree(uid, treeId, payload) {
        try {
            await getDb().collection('trees').doc(treeId).set(payload, { merge: true });
            return true;
        } catch (e) {
            console.error('saveAiTree failed:', e);
            throw e;
        }
    }

    /**
     * Build AI comment for a tree
     */
    async function postAiTreeComment(treeId, uid, userName, text) {
        try {
            await getDb().collection('trees').doc(treeId).collection('comments').add({
                text: text,
                userId: uid,
                userName: userName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isAiBot: true
            });
            return true;
        } catch (e) {
            console.error('postAiTreeComment failed:', e);
            throw e;
        }
    }

    /**
     * Build AI comment for a community post
     */
    async function postAiCommunityComment(postId, uid, userName, text) {
        try {
            await getDb().collection('community_posts').doc(postId).collection('comments').add({
                content: text,
                authorId: uid,
                authorDisplayName: userName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isDeleted: false,
                isAiBot: true
            });
            await getDb().collection('community_posts').doc(postId).update({
                commentCount: firebase.firestore.FieldValue.increment(1)
            });
            return true;
        } catch (e) {
            console.error('postAiCommunityComment failed:', e);
            throw e;
        }
    }

    window.AdminAiCreator = {
        buildAiTreePayload,
        saveAiTree,
        postAiTreeComment,
        postAiCommunityComment
    };
})();
