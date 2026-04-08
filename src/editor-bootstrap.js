(function () {
    function getRuntime() {
        return window.__editorRuntime;
    }

    async function initApp(runtime) {
        runtime.currentUser = await waitForAuth();
        console.log("Current User:", runtime.currentUser ? runtime.currentUser.email : "Guest");

        if (!runtime.currentUser) {
            runtime.isReadOnly = true;
        }

        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            runtime.db = firebase.firestore();
            runtime.auth = firebase.auth();
            runtime.storage = firebase.storage();
        }

        await window.EditorDataHelpers.loadData(runtime);
        window.EditorDataHelpers.updateUIForReadOnly(runtime);
    }

    function finalizeBootstrap(runtime) {
        window.EditorUiHelpers.loadBackgroundPreference(runtime);
        window.EditorDetailHelpers.setupDetailVideoEditor(runtime);
        window.EditorDetailHelpers.bindDetailModalDismiss(runtime);
        window.EditorPointerHelpers.bindInteractions(runtime);
        window.EditorMinimapHelpers.bindMinimap(runtime);

        if (typeof setupAiHelperDropZone === 'function') {
            setupAiHelperDropZone();
        }

        if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
            window.EditorUiHelpers.setEditorMode(runtime, 'timeline');
        }
    }

    function shareTree(runtime) {
        return window.EditorActionHelpers.shareTree(runtime);
    }

    function updateLikeUI(runtime) {
        return window.EditorActionHelpers.updateLikeUI(runtime);
    }

    function toggleLike(runtime) {
        return window.EditorActionHelpers.toggleLike(runtime);
    }

    function forkTreeToMyAccount(runtime) {
        return window.EditorDataHelpers.forkTreeToMyAccount(runtime);
    }

    function loadComments(runtime) {
        return window.EditorCommentHelpers.loadComments(runtime);
    }

    function updateCommentUI(runtime) {
        return window.EditorCommentHelpers.updateCommentUI(runtime);
    }

    function openCommentsModal(runtime) {
        return window.EditorCommentHelpers.openCommentsModal(runtime);
    }

    function addComment(runtime, e) {
        return window.EditorCommentHelpers.addComment(runtime, e);
    }

    function loadData() {
        return window.EditorDataHelpers.loadData(getRuntime());
    }

    function updateUIForReadOnly() {
        return window.EditorDataHelpers.updateUIForReadOnly(getRuntime());
    }

    function forkTreeToMyAccountGlobal() {
        return forkTreeToMyAccount(getRuntime());
    }

    function shareTreeGlobal() {
        return shareTree(getRuntime());
    }

    function updateLikeUIGlobal() {
        return updateLikeUI(getRuntime());
    }

    function toggleLikeGlobal() {
        return toggleLike(getRuntime());
    }

    function loadCommentsGlobal() {
        return loadComments(getRuntime());
    }

    function updateCommentUIGlobal() {
        return updateCommentUI(getRuntime());
    }

    function openCommentsModalGlobal() {
        return openCommentsModal(getRuntime());
    }

    function addCommentGlobal(e) {
        return addComment(getRuntime(), e);
    }

    window.EditorBootstrapHelpers = {
        initApp: initApp,
        finalizeBootstrap: finalizeBootstrap,
        loadData: loadData,
        updateUIForReadOnly: updateUIForReadOnly,
        shareTree: shareTree,
        updateLikeUI: updateLikeUI,
        toggleLike: toggleLike,
        forkTreeToMyAccount: forkTreeToMyAccount,
        loadComments: loadComments,
        updateCommentUI: updateCommentUI,
        openCommentsModal: openCommentsModal,
        addComment: addComment
    };
    window.loadData = loadData;
    window.updateUIForReadOnly = updateUIForReadOnly;
    window.forkTreeToMyAccount = forkTreeToMyAccountGlobal;
    window.shareTree = shareTreeGlobal;
    window.updateLikeUI = updateLikeUIGlobal;
    window.toggleLike = toggleLikeGlobal;
    window.loadComments = loadCommentsGlobal;
    window.updateCommentUI = updateCommentUIGlobal;
    window.openCommentsModal = openCommentsModalGlobal;
    window.addComment = addCommentGlobal;
})();
