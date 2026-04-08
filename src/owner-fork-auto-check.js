(function () {
    function parseTimeMs(value) {
        try {
            if (!value) return 0;
            const t = Date.parse(String(value));
            return isNaN(t) ? 0 : t;
        } catch (e) {
            return 0;
        }
    }

    function updateForkCheckAllButtonUi(options) {
        try {
            const btn = document.getElementById('fork-check-all-btn');
            if (!btn) return;
            const hasFork = !!options.ownerUser && Array.isArray(options.ownerTreesCache)
                ? options.ownerTreesCache.some(function (t) { return t && t.forkedFrom && t.forkedFrom.treeId; })
                : false;
            btn.disabled = !options.ownerUser || !hasFork || options.ownerForkCheckAllInflight;
        } catch (e) {
        }
    }

    async function runOwnerForkAutoCheck(options) {
        try {
            if (!options.ownerUser) return;
            if (!Array.isArray(options.treeIds) || options.treeIds.length === 0) return;

            const force = !!options.force;
            const requestedBatchSize = typeof options.batchSize === 'number' ? options.batchSize : options.batchSizeDefault;
            const batchSize = requestedBatchSize > 0 ? requestedBatchSize : options.treeIds.length;
            const concurrency = typeof options.concurrency === 'number' && options.concurrency > 0
                ? options.concurrency
                : options.concurrencyDefault;

            const now = Date.now();
            const candidates = [];
            options.treeIds.forEach(function (id) {
                if (!id) return;
                const item = options.ownerTreesCache.find(function (t) { return t.id === id; });
                if (!item || !item.forkedFrom || !item.forkedFrom.treeId) return;

                const cached = options.ownerForkStatusCache[id] || null;
                const checkedAt = cached ? parseTimeMs(cached.checkedAt) : 0;
                const isFresh = checkedAt && (now - checkedAt) < options.ttlMs;
                if (!force && isFresh) return;
                if (options.ownerForkAutoCheckInflight[id]) return;
                candidates.push(id);
            });

            const batch = candidates.slice(0, batchSize);
            if (!batch.length) return;

            batch.forEach(function (id) {
                options.ownerForkAutoCheckInflight[id] = true;
            });

            let didUpdate = false;

            const worker = async function () {
                while (batch.length) {
                    const id = batch.shift();
                    if (!id) continue;
                    try {
                        const res = await options.checkForkUpdateStatus(id);
                        if (res && res.ok) {
                            options.ownerForkStatusCache[id] = {
                                checkedAt: new Date().toISOString(),
                                hasUpdate: !!res.hasUpdate,
                                sourceLastUpdated: res.sourceLastUpdated || ''
                            };
                            didUpdate = true;
                        }
                    } catch (e) {
                    } finally {
                        delete options.ownerForkAutoCheckInflight[id];
                    }
                }
            };

            const workers = [];
            const n = Math.min(concurrency, batch.length || concurrency);
            for (let i = 0; i < n; i++) {
                workers.push(worker());
            }

            await Promise.allSettled(workers);
            if (didUpdate) {
                options.saveForkStatusCache();
                options.renderOwnerTrees();
            }
        } catch (e) {
        }
    }

    async function forkCheckAll(options) {
        if (!options.ownerUser) return;
        if (options.getForkCheckAllInflight()) return;

        const forkIds = Array.isArray(options.ownerTreesCache)
            ? options.ownerTreesCache.filter(function (t) { return t && t.forkedFrom && t.forkedFrom.treeId; }).map(function (t) { return t.id; })
            : [];

        if (!forkIds.length) {
            options.showToast('포크된 트리가 없습니다');
            return;
        }

        const ok = confirm('포크된 트리 전체에 대해 업데이트를 확인할까요?');
        if (!ok) return;

        options.setForkCheckAllInflight(true);
        updateForkCheckAllButtonUi(options);

        try {
            options.showToast('전체 업데이트 확인 중...');
            await runOwnerForkAutoCheck({
                ownerUser: options.ownerUser,
                ownerTreesCache: options.ownerTreesCache,
                ownerForkStatusCache: options.ownerForkStatusCache,
                ownerForkAutoCheckInflight: options.ownerForkAutoCheckInflight,
                treeIds: forkIds,
                force: true,
                batchSize: forkIds.length,
                batchSizeDefault: options.batchSizeDefault,
                concurrencyDefault: options.concurrencyDefault,
                ttlMs: options.ttlMs,
                checkForkUpdateStatus: options.checkForkUpdateStatus,
                saveForkStatusCache: options.saveForkStatusCache,
                renderOwnerTrees: options.renderOwnerTrees
            });
            options.showToast('전체 업데이트 확인 완료');
        } catch (e) {
            console.error('forkCheckAll failed:', e);
            options.showToast('확인 실패');
        } finally {
            options.setForkCheckAllInflight(false);
            updateForkCheckAllButtonUi(options);
        }
    }

    function scheduleOwnerForkAutoCheck(options) {
        try {
            if (!options.ownerUser) return;
            if (!Array.isArray(options.treeIds) || options.treeIds.length === 0) return;

            const timer = options.getTimer();
            if (timer) clearTimeout(timer);

            options.setTimer(setTimeout(function () {
                options.setTimer(null);
                runOwnerForkAutoCheck({
                    ownerUser: options.ownerUser,
                    ownerTreesCache: options.ownerTreesCache,
                    ownerForkStatusCache: options.ownerForkStatusCache,
                    ownerForkAutoCheckInflight: options.ownerForkAutoCheckInflight,
                    treeIds: options.treeIds,
                    force: false,
                    batchSizeDefault: options.batchSizeDefault,
                    concurrencyDefault: options.concurrencyDefault,
                    ttlMs: options.ttlMs,
                    checkForkUpdateStatus: options.checkForkUpdateStatus,
                    saveForkStatusCache: options.saveForkStatusCache,
                    renderOwnerTrees: options.renderOwnerTrees
                });
            }, 250));
        } catch (e) {
        }
    }

    window.OwnerForkAutoCheck = {
        updateForkCheckAllButtonUi: updateForkCheckAllButtonUi,
        runOwnerForkAutoCheck: runOwnerForkAutoCheck,
        forkCheckAll: forkCheckAll,
        scheduleOwnerForkAutoCheck: scheduleOwnerForkAutoCheck
    };
})();
