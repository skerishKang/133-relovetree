(function () {
    function renderTimelineBranch(runtime, refs) {
        window.EditorRenderUiHelpers.showTimelineView(runtime, refs);
        window.renderTimeline();
    }

    function renderTreeBranch(runtime, refs) {
        window.EditorRenderUiHelpers.showTreeView(runtime, refs);
        window.EditorRenderUiHelpers.applyCanvasTransform(runtime, refs);
        window.EditorRenderUiHelpers.updateZoomLabel(runtime);
        window.EditorRenderUiHelpers.resetRenderedCanvas(refs);
        window.EditorRenderUiHelpers.renderNodeElements(runtime, refs);
        window.EditorRenderUiHelpers.renderEdgeConnections(runtime);
        window.EditorRenderUiHelpers.finalizeRender(runtime);
    }

    window.EditorRenderMainHelpers = {
        renderTimelineBranch: renderTimelineBranch,
        renderTreeBranch: renderTreeBranch
    };
})();
