(function () {
    function bindRuntime(callback) {
        return function () {
            const args = Array.prototype.slice.call(arguments);
            return callback.apply(null, [window.__editorRuntime].concat(args));
        };
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

    window.EditorBootstrapHelpers = {
        initApp: initApp,
        finalizeBootstrap: finalizeBootstrap
    };

    window.loadData = bindRuntime(window.EditorDataHelpers.loadData);
    window.updateUIForReadOnly = bindRuntime(window.EditorDataHelpers.updateUIForReadOnly);
    window.forkTreeToMyAccount = bindRuntime(window.EditorDataHelpers.forkTreeToMyAccount);
    window.shareTree = bindRuntime(window.EditorActionHelpers.shareTree);
    window.updateLikeUI = bindRuntime(window.EditorActionHelpers.updateLikeUI);
    window.toggleLike = bindRuntime(window.EditorActionHelpers.toggleLike);
    window.loadComments = bindRuntime(window.EditorCommentHelpers.loadComments);
    window.updateCommentUI = bindRuntime(window.EditorCommentHelpers.updateCommentUI);
    window.openCommentsModal = bindRuntime(window.EditorCommentHelpers.openCommentsModal);
    window.addComment = bindRuntime(window.EditorCommentHelpers.addComment);
})();
