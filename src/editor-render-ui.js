(function () {
    function getRenderRefs() {
        return {
            canvas: document.getElementById('canvas'),
            connections: document.getElementById('connections'),
            timeline: document.getElementById('timeline')
        };
    }

    function showTimelineView(runtime, refs) {
        const canvas = refs && refs.canvas ? refs.canvas : document.getElementById('canvas');
        const connections = refs && refs.connections ? refs.connections : document.getElementById('connections');
        const timeline = refs && refs.timeline ? refs.timeline : document.getElementById('timeline');

        if (canvas) canvas.classList.add('hidden');
        if (connections) connections.innerHTML = '';
        if (timeline) timeline.classList.remove('hidden');

        if (typeof window.updateTreeStatsBanner === 'function') {
            window.updateTreeStatsBanner();
        }
    }

    function showTreeView(runtime, refs) {
        const canvas = refs && refs.canvas ? refs.canvas : document.getElementById('canvas');
        const timeline = refs && refs.timeline ? refs.timeline : document.getElementById('timeline');

        if (timeline) timeline.classList.add('hidden');
        if (canvas) canvas.classList.remove('hidden');
    }

    function updateZoomLabel(runtime) {
        const zoomLevel = document.getElementById('zoom-level');
        if (!zoomLevel || !runtime || !runtime.state || !runtime.state.transform) return;
        zoomLevel.innerText = Math.round(runtime.state.transform.k * 100) + '%';
    }

    function resetRenderedCanvas(refs) {
        const connections = refs && refs.connections ? refs.connections : document.getElementById('connections');
        if (connections) {
            connections.innerHTML = '';
        }

        document.querySelectorAll('.node').forEach(function (el) {
            el.remove();
        });
    }

    function finalizeRender(runtime) {
        if (typeof window.updateMinimap === 'function') {
            window.updateMinimap();
        }

        if (typeof window.updateTreeStatsBanner === 'function') {
            window.updateTreeStatsBanner();
        }
    }

    function renderNodeElements(runtime, refs) {
        const canvas = refs && refs.canvas ? refs.canvas : document.getElementById('canvas');
        if (!canvas || !runtime || !Array.isArray(runtime.state.nodes)) return;

        runtime.state.nodes.forEach(function (node) {
            const el = window.EditorTreeViewHelpers.createNodeElement(runtime, node);
            canvas.appendChild(el);
        });
    }

    function renderEdgeConnections(runtime) {
        if (!runtime || !Array.isArray(runtime.state.edges) || !Array.isArray(runtime.state.nodes)) return;

        runtime.state.edges.forEach(function (edge) {
            const from = runtime.state.nodes.find(function (n) { return n.id === edge.from; });
            const to = runtime.state.nodes.find(function (n) { return n.id === edge.to; });
            if (from && to && typeof window.drawConnection === 'function') {
                window.drawConnection(from, to);
            }
        });
    }

    function applyCanvasTransform(runtime, refs) {
        const canvas = refs && refs.canvas ? refs.canvas : document.getElementById('canvas');
        if (!canvas || !runtime || !runtime.state || !runtime.state.transform) return;
        canvas.style.transform = 'translate(' + runtime.state.transform.x + 'px, ' + runtime.state.transform.y + 'px) scale(' + runtime.state.transform.k + ')';
    }

    window.EditorRenderUiHelpers = {
        getRenderRefs: getRenderRefs,
        showTimelineView: showTimelineView,
        showTreeView: showTreeView,
        updateZoomLabel: updateZoomLabel,
        resetRenderedCanvas: resetRenderedCanvas,
        finalizeRender: finalizeRender,
        renderNodeElements: renderNodeElements,
        renderEdgeConnections: renderEdgeConnections,
        applyCanvasTransform: applyCanvasTransform
    };
})();
