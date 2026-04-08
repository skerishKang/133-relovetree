(function () {
    function createRuntime(accessors) {
        return {
            get treeId() { return accessors.getTreeId(); },
            get STORAGE_KEY() { return accessors.getStorageKey(); },
            get BG_STORAGE_KEY() { return accessors.getBackgroundStorageKey(); },
            get dummyData() { return accessors.getDummyData(); },
            get db() { return accessors.getDb(); },
            set db(value) { accessors.setDb(value); },
            get auth() { return accessors.getAuth(); },
            set auth(value) { accessors.setAuth(value); },
            get storage() { return accessors.getStorage(); },
            set storage(value) { accessors.setStorage(value); },
            get currentUser() { return accessors.getCurrentUser(); },
            set currentUser(value) { accessors.setCurrentUser(value); },
            get isReadOnly() { return accessors.getIsReadOnly(); },
            set isReadOnly(value) { accessors.setIsReadOnly(value); },
            get currentTreeDocData() { return accessors.getCurrentTreeDocData(); },
            set currentTreeDocData(value) { accessors.setCurrentTreeDocData(value); },
            get originalNodes() { return accessors.getOriginalNodes(); },
            set originalNodes(value) { accessors.setOriginalNodes(value); },
            get editorMode() { return accessors.getEditorMode(); },
            set editorMode(value) { accessors.setEditorMode(value); },
            get isKorean() { return accessors.getIsKorean(); },
            set isKorean(value) { accessors.setIsKorean(value); },
            get orientationMode() { return accessors.getOrientationMode(); },
            set orientationMode(value) { accessors.setOrientationMode(value); },
            get commentsUnsubscribe() { return accessors.getCommentsUnsubscribe(); },
            set commentsUnsubscribe(value) { accessors.setCommentsUnsubscribe(value); },
            get state() { return accessors.getState(); },
            get firebase() { return accessors.getFirebase(); },
            get showToast() { return accessors.getShowToast(); },
            get render() { return accessors.getRender(); },
            get initState() { return accessors.getInitState(); },
            get updateTreeStatsBanner() { return accessors.getUpdateTreeStatsBanner(); },
            get saveData() { return accessors.getSaveData(); },
            get saveDataImmediate() { return accessors.getSaveDataImmediate(); }
        };
    }

    window.EditorRuntimeHelpers = {
        createRuntime: createRuntime
    };
})();
