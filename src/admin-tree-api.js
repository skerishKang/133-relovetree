(function () {
    const TREE_ADMIN_API_BASE = '/api/admin/trees';
    const TREE_AI_API_PATH = '/api/admin/tree-ai';

    let treeListCache = [];
    let currentTreeDetail = null;
    let currentTreeNodeIndex = null;

    async function callTreeAdminApi(path, options = {}) {
        const user = window.getCurrentAdminUser();
        if (!user) {
            throw new Error('로그인이 필요합니다.');
        }

        const token = await user.getIdToken();
        const headers = options.headers ? { ...options.headers } : {};
        headers['Authorization'] = 'Bearer ' + token;
        if (!headers['Content-Type'] && options.method && options.method !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(path, { ...options, headers });
        if (!response.ok) {
            const text = await response.text();
            console.error('TreeAdmin API 오류:', response.status, text);
            throw new Error('TreeAdmin API 오류: ' + response.status);
        }

        if (response.status === 204) return null;
        return response.json();
    }

    function getTreeListCache() {
        return treeListCache;
    }

    function setTreeListCache(items) {
        treeListCache = items || [];
    }

    function getCurrentTreeDetail() {
        return currentTreeDetail;
    }

    function setCurrentTreeDetail(tree) {
        currentTreeDetail = tree;
    }

    function getCurrentTreeNodeIndex() {
        return currentTreeNodeIndex;
    }

    function setCurrentTreeNodeIndex(index) {
        currentTreeNodeIndex = index;
    }

    function getTreeAdminApiBase() {
        return TREE_ADMIN_API_BASE;
    }

    function getTreeAiApiPath() {
        return TREE_AI_API_PATH;
    }

    window.AdminTreeApi = {
        callTreeAdminApi,
        getTreeListCache,
        setTreeListCache,
        getCurrentTreeDetail,
        setCurrentTreeDetail,
        getCurrentTreeNodeIndex,
        setCurrentTreeNodeIndex,
        getTreeAdminApiBase,
        getTreeAiApiPath
    };
})();