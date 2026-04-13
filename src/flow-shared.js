/**
 * ⚠️ OFFICIAL CLIENT ENTRY - Auth: Firebase / Data: Neon Postgres via compat layer
 * Lovetree Flow A Shared Utilities
 * 
 * Uses: window.postgresDB (official browser entry point)
 * 
 * For new code:
 *   - Use window.postgresDB for all data operations
 *   - Data goes to Neon PostgreSQL, NOT Firestore
 *   - Firebase is only for Auth (login/session)
 */
(function () {
    var EMOTION_TAGS = [
        { id: 'love', label: '설렘', emoji: '💕' },
        { id: 'tear', label: '감동', emoji: '🥹' },
        { id: 'happy', label: '행복', emoji: '😊' },
        { id: 'fan', label: '입덕', emoji: '🌟' },
        { id: 'shock', label: '소름', emoji: '😱' },
        { id: 'funny', label: '웃김', emoji: '😂' },
        { id: 'nostalgia', label: '추억', emoji: '🍂' },
        { id: 'pride', label: '자랑', emoji: '🏆' }
    ];

    var FEELING_TO_TAG_MAP = {
        love: '설렘',
        tear: '감동',
        happy: '행복',
        fan: '입덕',
        shock: '소름',
        funny: '웃김',
        nostalgia: '추억',
        pride: '자랑'
    };

    function getEmotionTags() {
        return EMOTION_TAGS.slice();
    }

    function getEmotionLabel(id) {
        var tag = EMOTION_TAGS.find(function (t) { return t.id === id; });
        return tag ? tag.label : id;
    }

    function getEmotionEmoji(id) {
        var tag = EMOTION_TAGS.find(function (t) { return t.id === id; });
        return tag ? tag.emoji : '';
    }

    function feelingToTag(feeling) {
        return FEELING_TO_TAG_MAP[feeling] || feeling;
    }

    function getQueryParam(name) {
        var params = new URLSearchParams(window.location.search);
        return params.get(name) || '';
    }

    /**
     * Firebase Auth Session Check
     * @param {Function} callback - Success callback with user object
     */
    function requireAuth(callback) {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            window.location.href = '/pages/login.html';
            return;
        }
        firebase.auth().onAuthStateChanged(function (user) {
            if (!user) {
                window.location.href = '/pages/login.html';
                return;
            }
            if (typeof window.onAuthReady === 'function') {
                window.onAuthReady(user);
            }
            callback(user);
        });
    }

/**
 * Returns the Postgres-backed database proxy
 * Note: Uses official postgres-client-browser.js entry point
 *       which provides PostgreSQL-compatible API
 */
    function getDb() {
        return window.postgresDB;
    }

    function createTree(user, name) {
        var db = getDb();
        if (!db || !user) return Promise.reject(new Error('Not initialized'));

        var treeData = {
            name: name || '나의 러브트리',
            nodes: [],
            edges: [],
            likes: [],
            comments: [],
            ownerId: user.uid,
            nodeCount: 0,
            lastUpdated: new Date().toISOString(),
            // serverTimestamp() is handled by the Postgres compat layer
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        return db.collection('trees').add(treeData);
    }

    function loadTree(treeId) {
        var db = getDb();
        if (!db) return Promise.reject(new Error('Not initialized'));
        return db.collection('trees').doc(treeId).get().then(function (doc) {
            if (!doc.exists) return null;
            return Object.assign({ _id: doc.id }, doc.data());
        });
    }

    function loadUserTrees(user) {
        var db = getDb();
        if (!db || !user) return Promise.resolve([]);
        return db.collection('trees')
            .where('ownerId', '==', user.uid)
            .orderBy('lastUpdated', 'desc')
            .get()
            .then(function (snap) {
                var trees = [];
                snap.forEach(function (doc) {
                    trees.push(Object.assign({ _id: doc.id }, doc.data()));
                });
                return trees;
            })
            .catch(function (err) {
                console.warn('loadUserTrees failed, trying without orderBy:', err);
                return db.collection('trees')
                    .where('ownerId', '==', user.uid)
                    .get()
                    .then(function (snap) {
                        var trees = [];
                        snap.forEach(function (doc) {
                            trees.push(Object.assign({ _id: doc.id }, doc.data()));
                        });
                        trees.sort(function (a, b) {
                            var ta = a.lastUpdated || a.updatedAt || '';
                            var tb = b.lastUpdated || b.updatedAt || '';
                            return tb.localeCompare(ta);
                        });
                        return trees;
                    });
            });
    }

    function loadPublicTrees(sortBy) {
        var db = getDb();
        if (!db) return Promise.resolve([]);

        return db.collection('trees')
            .where('isPublic', '==', true)
            .get()
            .then(function (snap) {
                var trees = [];
                snap.forEach(function (doc) {
                    trees.push(Object.assign({ _id: doc.id }, doc.data()));
                });
                if (sortBy === 'latest') {
                    trees.sort(function (a, b) {
                        var ta = a.createdAt || a.lastUpdated || '';
                        var tb = b.createdAt || b.lastUpdated || '';
                        return tb.localeCompare(ta);
                    });
                } else {
                    trees.sort(function (a, b) {
                        var va = a.likeCount || 0;
                        var vb = b.likeCount || 0;
                        return vb - va;
                    });
                }
                return trees;
            })
            .catch(function (err) {
                console.warn('loadPublicTrees failed:', err);
                return Promise.reject(err);
            });
    }

    function addMemoryToTree(treeId, treeData, parentId, memoryData) {
        var db = getDb();
        if (!db) return Promise.reject(new Error('Not initialized'));

        var nodes = treeData.nodes || [];
        var edges = treeData.edges || [];

        var newNode = {
            id: Date.now(),
            x: 400,
            y: 300,
            title: memoryData.title || '새 순간',
            date: memoryData.date || new Date().toISOString().split('T')[0],
            videoId: memoryData.videoId || '',
            sourceUrl: memoryData.sourceUrl || '',
            moments: [],
            description: memoryData.memo || ''
        };

        if (memoryData.timestamp) {
            newNode.moments.push({
                time: memoryData.timestamp,
                text: memoryData.memo || '',
                feeling: memoryData.emotionTag || 'love'
            });
        }

        if (memoryData.emotionTag && !memoryData.timestamp) {
            newNode.moments.push({
                time: '',
                text: memoryData.memo || '',
                feeling: memoryData.emotionTag
            });
        }

        nodes.push(newNode);

        if (parentId) {
            edges.push({ from: parentId, to: newNode.id });
        }

        treeData.nodes = nodes;
        treeData.edges = edges;
        treeData.nodeCount = nodes.length;
        treeData.lastUpdated = new Date().toISOString();

        return db.collection('trees').doc(treeId).set(
            Object.assign({}, treeData, {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }),
            { merge: true }
        ).then(function () {
            return newNode;
        });
    }

    function getRootNode(treeData) {
        var nodes = treeData.nodes || [];
        var edges = treeData.edges || [];
        if (nodes.length === 0) return null;

        var childIds = new Set(edges.map(function (e) { return e.to; }));
        var roots = nodes.filter(function (n) { return !childIds.has(n.id); });
        return roots.length > 0 ? roots[0] : nodes[0];
    }

    function getChildrenOf(treeData, nodeId) {
        var edges = treeData.edges || [];
        var nodes = treeData.nodes || [];
        var childIds = edges
            .filter(function (e) { return e.from === nodeId; })
            .map(function (e) { return e.to; });
        return nodes.filter(function (n) { return childIds.indexOf(n.id) !== -1; });
    }

    function getConnectedNodes(treeData, nodeId) {
        var edges = treeData.edges || [];
        var nodes = treeData.nodes || [];
        var connectedIds = [];
        edges.forEach(function (e) {
            if (e.from === nodeId) connectedIds.push(e.to);
            if (e.to === nodeId) connectedIds.push(e.from);
        });
        return nodes.filter(function (n) { return connectedIds.indexOf(n.id) !== -1; });
    }

    function formatKoreanDate(dateStr) {
        if (!dateStr) return '';
        try {
            var d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.getFullYear() + '.' +
                String(d.getMonth() + 1).padStart(2, '0') + '.' +
                String(d.getDate()).padStart(2, '0');
        } catch (e) {
            return dateStr;
        }
    }

    function parseYouTubeId(url) {
        if (!url || typeof url !== 'string') return '';
        var patterns = [
            /(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^"&?\/\s]{11})/,
            /youtube\.com\/embed\/([^"&?\/\s]{11})/
        ];
        for (var i = 0; i < patterns.length; i++) {
            var match = url.match(patterns[i]);
            if (match) return match[1];
        }
        return '';
    }

    function getYouTubeThumb(videoId) {
        if (!videoId) return '/assets/img/default-thumb.svg';
        return 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';
    }

    if (typeof window !== 'undefined') {
        window.FlowShared = {
            getEmotionTags: getEmotionTags,
            getEmotionLabel: getEmotionLabel,
            getEmotionEmoji: getEmotionEmoji,
            feelingToTag: feelingToTag,
            getQueryParam: getQueryParam,
            requireAuth: requireAuth,
            getDb: getDb,
            createTree: createTree,
            loadTree: loadTree,
            loadUserTrees: loadUserTrees,
            loadPublicTrees: loadPublicTrees,
            addMemoryToTree: addMemoryToTree,
            getRootNode: getRootNode,
            getChildrenOf: getChildrenOf,
            getConnectedNodes: getConnectedNodes,
            formatKoreanDate: formatKoreanDate,
            parseYouTubeId: parseYouTubeId,
            getYouTubeThumb: getYouTubeThumb
        };
    }
})();
