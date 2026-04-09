(function () {
    const STORAGE_PREFIX = 'relovetree_data_';

    function normalizeTreeDisplayName(treeId, name) {
        if (!name || typeof name !== 'string') {
            name = '';
        }
        
        const trimmedName = name.trim();
        
        if (!trimmedName) {
            if (treeId && treeId.startsWith('fork-source-')) {
                return '가져온 러브트리';
            }
            if (treeId && treeId.length >= 20) {
                return '나의 러브트리';
            }
            return decodeURIComponent(treeId || '나의 트리');
        }
        
        if (trimmedName === treeId) {
            if (treeId && treeId.startsWith('fork-source-')) {
                return '가져온 러브트리';
            }
            if (treeId && treeId.length >= 20) {
                return '나의 러브트리';
            }
            return '나의 러브트리';
        }
        
        if (treeId && treeId.startsWith('fork-source-') && trimmedName.startsWith('fork-source-')) {
            return '가져온 러브트리';
        }
        
        return trimmedName;
    }

    function loadRecentTreesFromLocalStorage() {
        const myTrees = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                try {
                    const treeId = key.replace(STORAGE_PREFIX, '');
                    const data = JSON.parse(localStorage.getItem(key));

                    if (data && (data.nodes || data.edges)) {
                        const normalizedName = normalizeTreeDisplayName(treeId, data.name);
                        
                        if (data.name && data.name !== normalizedName) {
                            data.name = normalizedName;
                            try {
                                localStorage.setItem(key, JSON.stringify(data));
                            } catch (e) {}
                        }
                        
                        myTrees.push({
                            id: treeId,
                            name: normalizedName,
                            lastUpdated: data.lastUpdated || new Date().toISOString(),
                            nodeCount: (data.nodes || []).length
                        });
                    }
                } catch (e) {
                    console.warn('Failed to parse tree data:', key, e);
                }
            }
        }

        myTrees.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
        return myTrees;
    }

    function buildTreeFromFirestoreDoc(doc, data) {
        let lastUpdated = data.lastUpdated;
        if (lastUpdated && typeof lastUpdated.toDate === 'function') {
            lastUpdated = lastUpdated.toDate().toISOString();
        } else if (!lastUpdated) {
            lastUpdated = new Date().toISOString();
        }

        const nodes = Array.isArray(data.nodes) ? data.nodes : [];
        const nodeCount = typeof data.nodeCount === 'number' ? data.nodeCount : nodes.length;
        const likeCount = typeof data.likeCount === 'number' ? data.likeCount : (Array.isArray(data.likes) ? data.likes.length : 0);
        const viewCount = typeof data.viewCount === 'number' ? data.viewCount : 0;
        const shareCount = typeof data.shareCount === 'number' ? data.shareCount : 0;

        const rawName = data.name || decodeURIComponent(doc.id);
        const normalizedName = normalizeTreeDisplayName(doc.id, rawName);

        return {
            id: doc.id,
            name: normalizedName,
            lastUpdated,
            nodeCount,
            likeCount,
            viewCount,
            shareCount
        };
    }

    async function loadUserTreesFromFirestore(user) {
        if (!user) return null;

if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
  return null;
}

try {
  const db = window.postgresDB;
  const snapshot = await db.collection('trees')
    .where('ownerId', '==', user.uid)
                .limit(100)
                .get();

            const myTrees = [];
            snapshot.forEach((doc) => {
                const data = doc.data() || {};
                myTrees.push(buildTreeFromFirestoreDoc(doc, data));
            });

            myTrees.sort(function (a, b) {
                return new Date(b.lastUpdated) - new Date(a.lastUpdated);
            });

            return myTrees;
        } catch (error) {
            console.error('Failed to load trees from Firestore:', error);
            return null;
        }
    }

async function loadRecentCreatedTreesFromFirestore() {
  if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
    return [];
  }

  try {
    const db = window.postgresDB;
    const snapshot = await db.collection('trees')
      .orderBy('lastUpdated', 'desc')
                .limit(12)
                .get();

            if (snapshot.empty) return [];

            const trees = [];
            snapshot.forEach((doc) => {
                const data = doc.data() || {};
                trees.push(buildTreeFromFirestoreDoc(doc, data));
            });

            return trees;
        } catch (error) {
            console.error('Failed to load recently created trees:', error);
            return [];
        }
    }

    function countLocalOnlyTrees(existingIds) {
        let localOnlyCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                const treeId = key.replace(STORAGE_PREFIX, '');
                if (!existingIds.has(treeId)) {
                    localOnlyCount++;
                }
            }
        }
        return localOnlyCount;
    }

async function migrateLocalTrees(user) {
  if (!user || typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
    return [];
  }

  const db = window.postgresDB;
  const migratedNames = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(STORAGE_PREFIX)) continue;

            const treeId = key.replace(STORAGE_PREFIX, '');
            let data;
            try {
                data = JSON.parse(localStorage.getItem(key));
            } catch (e) {
                continue;
            }

            if (!data || (!data.nodes && !data.edges)) continue;

            try {
                const docRef = db.collection('trees').doc(treeId);
                const snap = await docRef.get();
                if (snap.exists) {
                    const existing = snap.data() || {};
                    if (!existing.ownerId) {
                        const claimedName = existing.name || data.name || decodeURIComponent(treeId);
                        await docRef.set({
                            ownerId: user.uid,
                            lastUpdated: new Date().toISOString()
                        }, { merge: true });
                        migratedNames.push(claimedName);
                    }
                    continue;
                }

                const nodes = Array.isArray(data.nodes) ? data.nodes : [];
                const likes = Array.isArray(data.likes) ? data.likes : [];

                const payload = {
                    name: data.name || decodeURIComponent(treeId),
                    nodes: nodes,
                    edges: data.edges || [],
                    ownerId: user.uid,
                    lastUpdated: new Date().toISOString(),
                    nodeCount: typeof data.nodeCount === 'number' ? data.nodeCount : nodes.length,
                    viewCount: typeof data.viewCount === 'number' ? data.viewCount : 0,
                    shareCount: typeof data.shareCount === 'number' ? data.shareCount : 0,
                    likeCount: typeof data.likeCount === 'number' ? data.likeCount : likes.length
                };

                await docRef.set(payload, { merge: true });
                migratedNames.push(payload.name);
            } catch (e) {
                console.error('Local tree migrate failed:', e);
            }
        }

        return migratedNames;
    }

    window.IndexDataLoader = {
        loadRecentTreesFromLocalStorage,
        loadUserTreesFromFirestore,
        loadRecentCreatedTreesFromFirestore,
        countLocalOnlyTrees,
        migrateLocalTrees,
        buildTreeFromFirestoreDoc,
        normalizeTreeDisplayName
    };
})();