let ownerUser = null;
let ownerTreesCache = [];
let ownerForkStatusCache = {};

let ownerForkCheckAllInflight = false;
const OWNER_FORK_STATUS_CACHE_STORAGE_KEY_PREFIX = 'relovetree_owner_fork_status_cache_v1_';

let ownerForkAutoCheckInflight = {};
let ownerForkAutoCheckTimer = null;
const OWNER_FORK_AUTO_CHECK_TTL_MS = 5 * 60 * 1000;
const OWNER_FORK_AUTO_CHECK_BATCH_SIZE = 8;
const OWNER_FORK_AUTO_CHECK_CONCURRENCY = 3;

let ownerUiState = {
    pageIndex: 0,
    pageSize: 20,
    sortKey: 'updated_desc',
    query: ''
};

let renameTargetTreeId = '';
let deleteTargetTreeId = '';

const OWNER_UI_STATE_STORAGE_KEY = 'relovetree_owner_console_ui_state_v1';
let ownerUiStateSaveTimer = null;

const OWNER_URL_KEYS = {
    query: 'q',
    sortKey: 'sort',
    pageSize: 'size',
    pageIndex: 'page'
};

Object.defineProperty(window, 'OWNER_TREES_CACHE', {
    configurable: true,
    get: function () {
        return ownerTreesCache;
    },
    set: function (value) {
        ownerTreesCache = Array.isArray(value) ? value : [];
    }
});

Object.defineProperty(window, 'OWNER_UI_STATE', {
    configurable: true,
    get: function () {
        return ownerUiState;
    },
    set: function (value) {
        if (value && typeof value === 'object') {
            ownerUiState = value;
        }
    }
});

function parseOwnerUiStateFromUrl() {
    return window.OwnerUiStateHelpers.parseOwnerUiStateFromUrl(OWNER_URL_KEYS);
}

function applyOwnerUiStatePatch(patch) {
    window.OwnerUiStateHelpers.applyOwnerUiStatePatch(ownerUiState, patch);
}

function buildOwnerViewUrlFromState() {
    return window.OwnerUiStateHelpers.buildOwnerViewUrlFromState(ownerUiState, OWNER_URL_KEYS);
}

function updateOwnerUrlFromState() {
    window.OwnerUiStateHelpers.updateOwnerUrlFromState(ownerUiState, OWNER_URL_KEYS);
}

function loadOwnerForkStatusCacheFromStorage() {
    ownerForkStatusCache = window.OwnerForkCacheHelpers.loadOwnerForkStatusCacheFromStorage({
        ownerUser: ownerUser,
        storageKeyPrefix: OWNER_FORK_STATUS_CACHE_STORAGE_KEY_PREFIX,
        ttlMs: OWNER_FORK_AUTO_CHECK_TTL_MS
    });
}

function saveOwnerForkStatusCacheToStorage() {
    return window.OwnerForkCacheHelpers.saveOwnerForkStatusCacheToStorage({
        ownerUser: ownerUser,
        storageKeyPrefix: OWNER_FORK_STATUS_CACHE_STORAGE_KEY_PREFIX,
        ownerForkStatusCache: ownerForkStatusCache
    });
}

function updateForkCheckAllButtonUi() {
    return window.OwnerForkAutoCheck.updateForkCheckAllButtonUi({
        ownerUser: ownerUser,
        ownerTreesCache: ownerTreesCache,
        ownerForkCheckAllInflight: ownerForkCheckAllInflight
    });
}

async function forkCheckAll() {
    return window.OwnerForkAutoCheck.forkCheckAll({
        ownerUser: ownerUser,
        ownerTreesCache: ownerTreesCache,
        ownerForkStatusCache: ownerForkStatusCache,
        ownerForkAutoCheckInflight: ownerForkAutoCheckInflight,
        getForkCheckAllInflight: function () { return ownerForkCheckAllInflight; },
        setForkCheckAllInflight: function (value) { ownerForkCheckAllInflight = !!value; },
        batchSizeDefault: OWNER_FORK_AUTO_CHECK_BATCH_SIZE,
        concurrencyDefault: OWNER_FORK_AUTO_CHECK_CONCURRENCY,
        ttlMs: OWNER_FORK_AUTO_CHECK_TTL_MS,
        checkForkUpdateStatus: checkForkUpdateStatus,
        saveForkStatusCache: saveOwnerForkStatusCacheToStorage,
        renderOwnerTrees: renderOwnerTrees,
        showToast: ownerShowToast
    });
}

function scheduleOwnerForkAutoCheck(treeIds) {
    return window.OwnerForkAutoCheck.scheduleOwnerForkAutoCheck({
        ownerUser: ownerUser,
        ownerTreesCache: ownerTreesCache,
        ownerForkStatusCache: ownerForkStatusCache,
        ownerForkAutoCheckInflight: ownerForkAutoCheckInflight,
        treeIds: treeIds,
        batchSizeDefault: OWNER_FORK_AUTO_CHECK_BATCH_SIZE,
        concurrencyDefault: OWNER_FORK_AUTO_CHECK_CONCURRENCY,
        ttlMs: OWNER_FORK_AUTO_CHECK_TTL_MS,
        checkForkUpdateStatus: checkForkUpdateStatus,
        saveForkStatusCache: saveOwnerForkStatusCacheToStorage,
        renderOwnerTrees: renderOwnerTrees,
        getTimer: function () { return ownerForkAutoCheckTimer; },
        setTimer: function (value) { ownerForkAutoCheckTimer = value; }
    });
}

function loadOwnerUiStateFromStorage() {
    window.OwnerUiStateHelpers.loadOwnerUiStateFromStorage(ownerUiState, OWNER_UI_STATE_STORAGE_KEY);
}

function applyOwnerUiStateToControls() {
    window.OwnerUiStateHelpers.applyOwnerUiStateToControls(ownerUiState);
}

function scheduleSaveOwnerUiState() {
    window.OwnerUiStateHelpers.scheduleSaveOwnerUiState({
        state: ownerUiState,
        storageKey: OWNER_UI_STATE_STORAGE_KEY,
        urlKeys: OWNER_URL_KEYS,
        getTimer: function () { return ownerUiStateSaveTimer; },
        setTimer: function (timerId) { ownerUiStateSaveTimer = timerId; }
    });
}

function ownerShowToast(message) {
    if (typeof window.showToast === 'function') {
        return window.showToast(message);
    }
}

function setOwnerAuthUi(user) {
    return window.OwnerUiStateHelpers.setOwnerAuthUi(user);
}

async function checkForkUpdateStatus(myTreeId) {
    return window.OwnerApiClient.checkForkUpdateStatus(myTreeId, ownerTreesCache);
}

async function forkCheck(myTreeId) {
    return window.OwnerApiClient.forkCheck({
        treeId: myTreeId,
        ownerUser: ownerUser,
        ownerTreesCache: ownerTreesCache,
        ownerForkStatusCache: ownerForkStatusCache,
        saveForkStatusCache: saveOwnerForkStatusCacheToStorage,
        showToast: ownerShowToast,
        renderOwnerTrees: renderOwnerTrees
    });
}

async function forkSync(myTreeId) {
    return window.OwnerApiClient.forkSync({
        treeId: myTreeId,
        ownerUser: ownerUser,
        ownerTreesCache: ownerTreesCache,
        ownerForkStatusCache: ownerForkStatusCache,
        saveForkStatusCache: saveOwnerForkStatusCacheToStorage,
        showToast: ownerShowToast,
        loadOwnerTrees: loadOwnerTrees,
        getFallbackForkOwnerId: function (treeId) {
            const item = ownerTreesCache.find((t) => t.id === treeId);
            return item && item.forkedFrom ? item.forkedFrom.ownerId || null : null;
        }
    });
}

async function loadOwnerTrees() {
    return window.OwnerApiClient.loadOwnerTrees({
        ownerUser: ownerUser,
        setOwnerTreesCache: function (items) { ownerTreesCache = items; },
        renderOwnerTrees: renderOwnerTrees,
        updateResultsSummary: updateResultsSummary,
        updatePagination: updatePagination,
        updateCreateUi: updateCreateUi,
        scheduleSaveOwnerUiState: scheduleSaveOwnerUiState,
        updateForkCheckAllButtonUi: updateForkCheckAllButtonUi
    });
}

function renderOwnerTrees() {
    const tbody = document.getElementById('owner-tree-tbody');
    if (!tbody) return;

    const searchInput = document.getElementById('tree-search');
    const qRaw = searchInput ? String(searchInput.value || '').trim() : '';
    const q = qRaw.toLowerCase();
    ownerUiState.query = qRaw;

    const sortSelect = document.getElementById('sort-select');
    const sortKey = sortSelect ? String(sortSelect.value || 'updated_desc') : 'updated_desc';
    ownerUiState.sortKey = sortKey;

    const pageSizeSelect = document.getElementById('page-size');
    const parsedPageSize = pageSizeSelect ? parseInt(String(pageSizeSelect.value || '20'), 10) : 20;
    ownerUiState.pageSize = (!isNaN(parsedPageSize) && parsedPageSize > 0) ? parsedPageSize : 20;

    const renderSlice = window.OwnerRenderHelpers.computeOwnerRenderSlice({
        items: ownerTreesCache,
        query: qRaw,
        sortKey: sortKey,
        pageSize: ownerUiState.pageSize,
        pageIndex: ownerUiState.pageIndex
    });
    const totalCount = renderSlice.totalCount;
    const filteredCount = renderSlice.filteredCount;
    ownerUiState.pageIndex = renderSlice.pageIndex;
    const pageItems = renderSlice.pageItems;

    tbody.innerHTML = '';

    if (!pageItems.length) {
        window.OwnerListUi.renderOwnerEmptyState({
            tbody: tbody,
            message: '표시할 트리가 없습니다.'
        });
        window.OwnerListUi.finalizeOwnerTreeRender({
            ownerUser: ownerUser,
            ownerUiState: ownerUiState,
            totalCount: totalCount,
            filteredCount: filteredCount,
            scheduleSaveOwnerUiState: scheduleSaveOwnerUiState,
            updateForkCheckAllButtonUi: updateForkCheckAllButtonUi,
            visibleForkIds: []
        });
        return;
    }

    pageItems.forEach((t) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = window.OwnerRenderHelpers.buildOwnerTreeRowHtml({
            tree: t,
            forkStatus: ownerForkStatusCache[t.id] || null,
            normalizeToIsoString: window.OwnerApiClient.normalizeToIsoString
        });

        tbody.appendChild(tr);
    });

    const visibleForkIds = pageItems
        .filter((t) => t && t.forkedFrom && t.forkedFrom.treeId)
        .map((t) => t.id);
    window.OwnerListUi.finalizeOwnerTreeRender({
        ownerUser: ownerUser,
        ownerUiState: ownerUiState,
        totalCount: totalCount,
        filteredCount: filteredCount,
        scheduleSaveOwnerUiState: scheduleSaveOwnerUiState,
        updateForkCheckAllButtonUi: updateForkCheckAllButtonUi,
        scheduleOwnerForkAutoCheck: scheduleOwnerForkAutoCheck,
        visibleForkIds: visibleForkIds
    });
}

function updateResultsSummary(totalCount, filteredCount) {
    return window.OwnerListUi.updateResultsSummary({
        ownerUser: ownerUser,
        ownerUiState: ownerUiState,
        totalCount: totalCount,
        filteredCount: filteredCount
    });
}

function updatePagination(filteredCount) {
    return window.OwnerListUi.updatePagination({
        ownerUser: ownerUser,
        ownerUiState: ownerUiState,
        filteredCount: filteredCount
    });
}

function openRenameDialog(treeId) {
    return window.OwnerDialogs.openRenameDialog({
        ownerUser: ownerUser,
        treeId: treeId,
        findTree: function (id) { return ownerTreesCache.find((t) => t.id === id); },
        setRenameTargetTreeId: function (value) { renameTargetTreeId = value; }
    });
}

async function saveRenameDialog() {
    return window.OwnerDialogs.saveRenameDialog({
        ownerUser: ownerUser,
        getRenameTargetTreeId: function () { return renameTargetTreeId; },
        setRenameTargetTreeId: function (value) { renameTargetTreeId = value; },
        showToast: ownerShowToast,
        loadOwnerTrees: loadOwnerTrees
    });
}

function closeRenameDialog() {
    return window.OwnerDialogs.closeRenameDialog(function (value) { renameTargetTreeId = value; });
}

function openDeleteDialog(treeId) {
    return window.OwnerDialogs.openDeleteDialog({
        ownerUser: ownerUser,
        treeId: treeId,
        findTree: function (id) { return ownerTreesCache.find((t) => t.id === id); },
        setDeleteTargetTreeId: function (value) { deleteTargetTreeId = value; }
    });
}

function closeDeleteDialog() {
    return window.OwnerDialogs.closeDeleteDialog(function (value) { deleteTargetTreeId = value; });
}

function updateDeleteConfirmUi() {
    return window.OwnerDialogs.updateDeleteConfirmUi(deleteTargetTreeId);
}

async function confirmDeleteDialog() {
    return window.OwnerDialogs.confirmDeleteDialog({
        ownerUser: ownerUser,
        getDeleteTargetTreeId: function () { return deleteTargetTreeId; },
        setDeleteTargetTreeId: function (value) { deleteTargetTreeId = value; },
        ownerForkStatusCache: ownerForkStatusCache,
        saveForkStatusCache: saveOwnerForkStatusCacheToStorage,
        showToast: ownerShowToast,
        loadOwnerTrees: loadOwnerTrees
    });
}

function updateCreateUi() {
    return window.OwnerListUi.updateCreateUi({
        ownerUser: ownerUser
    });
}

function bindOwnerEvents() {
    const runtime = window.OwnerRuntimeHelpers.createOwnerRuntime({
        ownerUiStateStorageKey: OWNER_UI_STATE_STORAGE_KEY,
        getOwnerUser: function () { return ownerUser; },
        getOwnerUiState: function () { return ownerUiState; },
        getOwnerTreesCache: function () { return ownerTreesCache; },
        getOwnerForkStatusCache: function () { return ownerForkStatusCache; },
        setPageIndex: function (value) { ownerUiState.pageIndex = value; },
        resetOwnerUiState: function () {
            ownerUiState = {
                pageIndex: 0,
                pageSize: 20,
                sortKey: 'updated_desc',
                query: ''
            };
        },
        loadOwnerTrees: loadOwnerTrees,
        forkCheckAll: forkCheckAll,
        buildOwnerViewUrlFromState: buildOwnerViewUrlFromState,
        copyTextToClipboard: window.copyTextToClipboard,
        ownerShowToast: ownerShowToast,
        applyOwnerUiStateToControls: applyOwnerUiStateToControls,
        renderOwnerTrees: renderOwnerTrees,
        updateCreateUi: updateCreateUi,
        forkCheck: forkCheck,
        forkSync: forkSync,
        openRenameDialog: openRenameDialog,
        openDeleteDialog: openDeleteDialog,
        closeRenameDialog: closeRenameDialog,
        saveRenameDialog: saveRenameDialog,
        closeDeleteDialog: closeDeleteDialog,
        confirmDeleteDialog: confirmDeleteDialog,
        updateDeleteConfirmUi: updateDeleteConfirmUi
    });
    return window.OwnerBindings.bindOwnerEvents(runtime);
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlState = parseOwnerUiStateFromUrl();
    if (urlState && urlState.hasAny) {
        loadOwnerUiStateFromStorage();
        applyOwnerUiStatePatch(urlState.state);
    } else {
        loadOwnerUiStateFromStorage();
    }
    applyOwnerUiStateToControls();

    bindOwnerEvents();

    try {
        ownerUser = await (typeof waitForAuth === 'function' ? waitForAuth() : Promise.resolve(null));
    } catch (e) {
        ownerUser = null;
    }

    setOwnerAuthUi(ownerUser);
    loadOwnerForkStatusCacheFromStorage();
    await loadOwnerTrees();
    updateCreateUi();

    updateOwnerUrlFromState();

    if (firebase && firebase.auth && firebase.auth()) {
        firebase.auth().onAuthStateChanged(async (user) => {
            ownerUser = user;
            ownerForkStatusCache = {};
            ownerForkAutoCheckInflight = {};
            loadOwnerForkStatusCacheFromStorage();
            setOwnerAuthUi(ownerUser);
            await loadOwnerTrees();
            updateCreateUi();
        });
    }
});
