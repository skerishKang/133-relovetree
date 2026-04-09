(function () {
    function normalizeTreeItem(doc) {
        const data = doc && typeof doc.data === 'function' ? (doc.data() || {}) : {};

        let lastUpdated = data.lastUpdated;
        if (lastUpdated && typeof lastUpdated.toDate === 'function') {
            lastUpdated = lastUpdated.toDate().toISOString();
        } else if (!lastUpdated) {
            lastUpdated = new Date().toISOString();
        }

        const nodes = Array.isArray(data.nodes) ? data.nodes : [];
        const nodeCount = typeof data.nodeCount === 'number' ? data.nodeCount : nodes.length;
        const likeCount = typeof data.likeCount === 'number'
            ? data.likeCount
            : (Array.isArray(data.likes) ? data.likes.length : 0);
        const viewCount = typeof data.viewCount === 'number' ? data.viewCount : 0;
        const shareCount = typeof data.shareCount === 'number' ? data.shareCount : 0;

        return {
            id: doc && doc.id ? doc.id : '',
            name: data.name || (doc && doc.id ? decodeURIComponent(doc.id) : ''),
            ownerId: data.ownerId || null,
            forkedFrom: (data && typeof data.forkedFrom === 'object' && data.forkedFrom) ? data.forkedFrom : null,
            lastUpdated: lastUpdated,
            nodeCount: nodeCount,
            likeCount: likeCount,
            viewCount: viewCount,
            shareCount: shareCount
        };
    }

    function normalizeToIsoString(value) {
        try {
            if (!value) return '';
            if (value && typeof value.toDate === 'function') {
                return value.toDate().toISOString();
            }
            const d = new Date(value);
            if (isNaN(d.getTime())) return String(value);
            return d.toISOString();
        } catch (e) {
            return value ? String(value) : '';
        }
    }

async function fetchTreeDoc(treeId) {
  if (!treeId) return null;
  if (!window.postgresDB) return null;
  const db = window.postgresDB;
        const snap = await db.collection('trees').doc(treeId).get();
        if (!snap.exists) return null;
        return snap.data() || null;
    }

    async function checkForkUpdateStatus(myTreeId, treeCache) {
        const item = Array.isArray(treeCache) ? treeCache.find(function (t) { return t.id === myTreeId; }) : null;
        if (!item || !item.forkedFrom || !item.forkedFrom.treeId) {
            return { ok: false, error: '포크 정보가 없습니다.' };
        }

        const sourceTreeId = String(item.forkedFrom.treeId || '');
        const source = await fetchTreeDoc(sourceTreeId);
        if (!source) {
            return { ok: false, error: '원본 트리를 찾을 수 없습니다.' };
        }

        const sourceLastUpdated = normalizeToIsoString(source.lastUpdated);
        const sourceSaved = normalizeToIsoString(item.forkedFrom.sourceLastUpdated);
        const hasUpdate = !!sourceLastUpdated && !!sourceSaved
            ? (sourceLastUpdated !== sourceSaved)
            : !!sourceLastUpdated;

        return {
            ok: true,
            hasUpdate: hasUpdate,
            sourceTreeId: sourceTreeId,
            sourceLastUpdated: sourceLastUpdated,
            sourceNodeCount: Array.isArray(source.nodes) ? source.nodes.length : (typeof source.nodeCount === 'number' ? source.nodeCount : 0),
            sourceData: source
        };
    }

    async function forkCheck(options) {
        if (!options.ownerUser) return;
        try {
            options.showToast('업데이트 확인 중...');
            const res = await checkForkUpdateStatus(options.treeId, options.ownerTreesCache);
            if (!res.ok) {
                options.showToast('확인 실패');
                return;
            }

            options.ownerForkStatusCache[options.treeId] = {
                checkedAt: new Date().toISOString(),
                hasUpdate: !!res.hasUpdate,
                sourceLastUpdated: res.sourceLastUpdated || ''
            };

            options.saveForkStatusCache();
            options.showToast(res.hasUpdate ? '원본이 업데이트되었습니다' : '최신 상태입니다');
            options.renderOwnerTrees();
        } catch (e) {
            console.error('forkCheck failed:', e);
            options.showToast('확인 실패');
        }
    }

    async function forkSync(options) {
        if (!options.ownerUser) return;
        try {
            const res = await checkForkUpdateStatus(options.treeId, options.ownerTreesCache);
            if (!res.ok) {
                options.showToast('동기화 실패');
                return;
            }

            if (!res.hasUpdate) {
                options.showToast('이미 최신 상태입니다');
                return;
            }

            const ok = confirm('원본 트리의 최신 내용을 내 트리에 덮어쓸까요? (내 트리의 현재 내용은 변경됩니다)');
            if (!ok) return;

            const source = res.sourceData || {};
            const nodes = Array.isArray(source.nodes) ? source.nodes : [];
            const edges = Array.isArray(source.edges) ? source.edges : [];
            const nowIso = new Date().toISOString();

const db = window.postgresDB;
  await db.collection('trees').doc(options.treeId).set({
                nodes: nodes,
                edges: edges,
                nodeCount: nodes.length,
                lastUpdated: nowIso,
                forkedFrom: {
                    treeId: res.sourceTreeId,
                    ownerId: source && source.ownerId ? source.ownerId : options.getFallbackForkOwnerId(options.treeId),
                    sourceLastUpdated: res.sourceLastUpdated || '',
                    syncedAt: nowIso
                }
            }, { merge: true });

            options.ownerForkStatusCache[options.treeId] = {
                checkedAt: nowIso,
                hasUpdate: false,
                sourceLastUpdated: res.sourceLastUpdated || ''
            };

            options.saveForkStatusCache();
            options.showToast('동기화 완료');
            await options.loadOwnerTrees();
        } catch (e) {
            console.error('forkSync failed:', e);
            options.showToast('동기화 실패');
        }
    }

    async function loadOwnerTrees(options) {
        const tbody = document.getElementById('owner-tree-tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-6 text-center text-slate-400 text-sm">불러오는 중...</td></tr>';

        if (!options.ownerUser) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-6 text-center text-slate-400 text-sm">로그인 후 이용해 주세요.</td></tr>';
            options.updateResultsSummary(0, 0);
            options.updatePagination(0);
            options.updateCreateUi();
            options.scheduleSaveOwnerUiState();
            options.updateForkCheckAllButtonUi();
            return;
        }

try {
    const db = window.postgresDB;
    const snapshot = await db.collection('trees')
                .where('ownerId', '==', options.ownerUser.uid)
                .limit(100)
                .get();

            const items = [];
            snapshot.forEach(function (doc) {
                items.push(normalizeTreeItem(doc));
            });

            items.sort(function (a, b) { return new Date(b.lastUpdated) - new Date(a.lastUpdated); });
            options.setOwnerTreesCache(items);
            options.renderOwnerTrees();
        } catch (e) {
            console.error('loadOwnerTrees failed:', e);
            tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-6 text-center text-red-500 text-sm">불러오기 실패</td></tr>';
            options.updateResultsSummary(0, 0);
            options.updatePagination(0);
        }
    }

    window.OwnerApiClient = {
        normalizeTreeItem: normalizeTreeItem,
        normalizeToIsoString: normalizeToIsoString,
        fetchTreeDoc: fetchTreeDoc,
        checkForkUpdateStatus: checkForkUpdateStatus,
        forkCheck: forkCheck,
        forkSync: forkSync,
        loadOwnerTrees: loadOwnerTrees
    };
})();
