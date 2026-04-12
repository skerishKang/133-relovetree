(function () {
    function runtime() {
        return window.__editorRuntime;
    }

    function drawConnection(from, to) {
        return window.EditorTreeViewHelpers.drawConnection(runtime(), from, to);
    }

    function onConnectionHandleClick(nodeId, side) {
        return window.EditorActionHelpers.onConnectionHandleClick(runtime(), nodeId, side);
    }

    function autoConnectTimeline() {
        return window.EditorActionHelpers.autoConnectTimeline(runtime());
    }

    function clearAllConnections() {
        return window.EditorActionHelpers.clearAllConnections(runtime());
    }

    function renderTimeline() {
        return window.EditorTimelineHelpers.renderTimeline(runtime());
    }

    function openDetailFromTimeline(nodeId) {
        return window.EditorTimelineHelpers.openDetailFromTimeline(runtime(), nodeId);
    }

    function toggleQuickEdit(nodeId) {
        return window.EditorTimelineHelpers.toggleQuickEdit(runtime(), nodeId);
    }

    function saveQuickEdit(e, nodeId) {
        return window.EditorTimelineHelpers.saveQuickEdit(runtime(), e, nodeId);
    }

    function addQuickFeeling(nodeId, feeling) {
        return window.EditorTimelineHelpers.addQuickFeeling(runtime(), nodeId, feeling);
    }

    function startDragNode(e, node) {
        return window.EditorPointerHelpers.startDragNode(runtime(), e, node);
    }

    function zoomIn() {
        return window.EditorActionHelpers.zoomIn(runtime());
    }

    function zoomOut() {
        return window.EditorActionHelpers.zoomOut(runtime());
    }

    function resetLayout() {
        return window.EditorActionHelpers.resetLayout(runtime());
    }

    function onYouTubeIframeAPIReady() {
        return window.EditorDetailHelpers.setYouTubeApiReady(runtime());
    }

    function startVideo(videoId, startSeconds) {
        return window.EditorDetailHelpers.startVideo(runtime(), videoId, startSeconds);
    }

    function setCurrentMomentTime() {
        return window.EditorDetailHelpers.setCurrentMomentTime(runtime());
    }

    function openDetailModal(node) {
        return window.EditorDetailHelpers.openDetailModal(runtime(), node);
    }

    function openDetailModalForAiTreeSuggestion(index, draftNode) {
        return window.EditorDetailHelpers.openDetailModalForAiTreeSuggestion(runtime(), index, draftNode);
    }

    function resetAiTreeDraftDetail() {
        return window.EditorDetailHelpers.resetAiTreeDraftDetail(runtime());
    }

    function renderMomentsList(moments) {
        return window.EditorDetailHelpers.renderMomentsList(runtime(), moments);
    }

    function getFeelingEmoji(feeling) {
        return window.EditorDetailHelpers.getFeelingEmoji(feeling);
    }

    function seekVideo(timeStr) {
        return window.EditorDetailHelpers.seekVideo(runtime(), timeStr);
    }

    function addMomentFromDetail(e) {
        return window.EditorDetailHelpers.addMomentFromDetail(runtime(), e);
    }

    function enableEditMode() {
        return window.EditorDetailHelpers.enableEditMode(runtime());
    }

    function disableEditMode() {
        return window.EditorDetailHelpers.disableEditMode(runtime());
    }

    function saveNodeDetails(e) {
        return window.EditorDetailHelpers.saveNodeDetails(runtime(), e);
    }

    function applyAiTreeDraftFromDetail() {
        return window.EditorDetailHelpers.applyAiTreeDraftFromDetail(runtime());
    }

    function clearDetailVideoInput() {
        return window.EditorDetailHelpers.clearDetailVideoInput(runtime());
    }

    function updateDetailVideoEditorUi() {
        return window.EditorDetailHelpers.updateDetailVideoEditorUi(runtime());
    }

    function renderDetailYouTubeSearchResults(list) {
        return window.EditorDetailHelpers.renderDetailYouTubeSearchResults(runtime(), list);
    }

    function searchYouTubeForDetail() {
        return window.EditorDetailHelpers.searchYouTubeForDetail(runtime());
    }

    function recommendYouTubeForDetail() {
        return window.EditorDetailHelpers.recommendYouTubeForDetail(runtime());
    }

    function setupDetailVideoEditor() {
        return window.EditorDetailHelpers.setupDetailVideoEditor(runtime());
    }

    function removeImage() {
        return window.EditorDetailHelpers.removeImage(runtime());
    }

    function updateDetailMedia(node) {
        return window.EditorDetailHelpers.updateDetailMedia(runtime(), node);
    }

    function createNewNode() {
        return window.EditorDetailHelpers.createNewNode(runtime());
    }

    function deleteNode() {
        return window.EditorDetailHelpers.deleteNode(runtime());
    }

    function startMomentEdit(index) {
        return window.EditorDetailHelpers.startMomentEdit(runtime(), index);
    }

    function cancelMomentEdit() {
        return window.EditorDetailHelpers.cancelMomentEdit(runtime());
    }

    function saveMomentEdit(index) {
        return window.EditorDetailHelpers.saveMomentEdit(runtime(), index);
    }

    function deleteMoment(index) {
        return window.EditorDetailHelpers.deleteMoment(runtime(), index);
    }

    function closeModal(id) {
        return window.EditorDetailHelpers.closeModal(runtime(), id);
    }

    function updateMinimap() {
        return window.EditorMinimapHelpers.updateMinimap(runtime());
    }

    function openAiHelper(mode) {
        if (typeof window.EditorAiUiHelpers !== 'undefined' && typeof window.EditorAiUiHelpers.openAiHelper === 'function') {
            return window.EditorAiUiHelpers.openAiHelper(runtime(), mode);
        }
        if (typeof window.openAiHelper === 'function') {
            return window.openAiHelper(mode);
        }
    }

    function closeAiHelper() {
        if (typeof window.EditorAiUiHelpers !== 'undefined' && typeof window.EditorAiUiHelpers.closeAiHelper === 'function') {
            return window.EditorAiUiHelpers.closeAiHelper(runtime());
        }
        const modal = document.getElementById('ai-helper-modal');
        if (modal && typeof modal.close === 'function') modal.close();
    }

    function openMomentAiHelper() {
        if (typeof window.openMomentAiHelper === 'function') {
            return window.openMomentAiHelper();
        }
    }

    function openNodeAiHelperFromDetail() {
        const node = runtime().state.nodes.find(n => n.id === runtime().state.activeNodeId);
        if (node && typeof window.openAiHelper === 'function') {
            window.openAiHelper('node');
            if (typeof window.prepareNodeAiContext === 'function') {
                window.prepareNodeAiContext(node);
            }
        }
    }

    window.drawConnection = drawConnection;
    window.onConnectionHandleClick = onConnectionHandleClick;
    window.autoConnectTimeline = autoConnectTimeline;
    window.clearAllConnections = clearAllConnections;
    window.renderTimeline = renderTimeline;
    window.openDetailFromTimeline = openDetailFromTimeline;
    window.toggleQuickEdit = toggleQuickEdit;
    window.saveQuickEdit = saveQuickEdit;
    window.addQuickFeeling = addQuickFeeling;
    window.startDragNode = startDragNode;
    window.zoomIn = zoomIn;
    window.zoomOut = zoomOut;
    window.resetLayout = resetLayout;
    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    window.startVideo = startVideo;
    window.setCurrentMomentTime = setCurrentMomentTime;
    window.openDetailModal = openDetailModal;
    window.openDetailModalForAiTreeSuggestion = openDetailModalForAiTreeSuggestion;
    window.resetAiTreeDraftDetail = resetAiTreeDraftDetail;
    window.renderMomentsList = renderMomentsList;
    window.getFeelingEmoji = getFeelingEmoji;
    window.seekVideo = seekVideo;
    window.addMomentFromDetail = addMomentFromDetail;
    window.enableEditMode = enableEditMode;
    window.disableEditMode = disableEditMode;
    window.saveNodeDetails = saveNodeDetails;
    window.applyAiTreeDraftFromDetail = applyAiTreeDraftFromDetail;
    window.clearDetailVideoInput = clearDetailVideoInput;
    window.updateDetailVideoEditorUi = updateDetailVideoEditorUi;
    window.renderDetailYouTubeSearchResults = renderDetailYouTubeSearchResults;
    window.searchYouTubeForDetail = searchYouTubeForDetail;
    window.recommendYouTubeForDetail = recommendYouTubeForDetail;
    window.setupDetailVideoEditor = setupDetailVideoEditor;
    window.removeImage = removeImage;
    window.updateDetailMedia = updateDetailMedia;
    window.createNewNode = createNewNode;
    window.deleteNode = deleteNode;
    window.startMomentEdit = startMomentEdit;
    window.cancelMomentEdit = cancelMomentEdit;
    window.saveMomentEdit = saveMomentEdit;
    window.deleteMoment = deleteMoment;
    window.closeModal = closeModal;
    window.updateMinimap = updateMinimap;
    window.openAiHelper = openAiHelper;
    window.closeAiHelper = closeAiHelper;
    window.openMomentAiHelper = openMomentAiHelper;
    window.openNodeAiHelperFromDetail = openNodeAiHelperFromDetail;
})();
