(function () {
    function updateMinimap(runtime) {
        const minimapEl = document.getElementById('minimap');
        const canvasEl = document.getElementById('minimap-canvas');
        const viewportEl = document.getElementById('minimap-viewport');

        if (!minimapEl || !canvasEl || !viewportEl) return;
        if (!Array.isArray(runtime.state.nodes) || runtime.state.nodes.length === 0) {
            minimapEl.classList.add('hidden');
            return;
        }

        minimapEl.classList.remove('hidden');
        minimapEl.classList.add('md:block');

        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;

        const rect = canvasEl.getBoundingClientRect();
        canvasEl.width = rect.width * 2;
        canvasEl.height = rect.height * 2;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(2, 2);

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        const nodeWidth = 280;
        const nodeHeight = 200;

        runtime.state.nodes.forEach(function (node) {
            if (node.x < minX) minX = node.x;
            if (node.y < minY) minY = node.y;
            if (node.x + nodeWidth > maxX) maxX = node.x + nodeWidth;
            if (node.y + nodeHeight > maxY) maxY = node.y + nodeHeight;
        });

        const padding = 100;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        const worldWidth = maxX - minX;
        const worldHeight = maxY - minY;
        const scaleX = rect.width / worldWidth;
        const scaleY = rect.height / worldHeight;
        const scale = Math.min(scaleX, scaleY);

        ctx.clearRect(0, 0, rect.width, rect.height);

        runtime.state.nodes.forEach(function (node) {
            const x = (node.x - minX) * scale;
            const y = (node.y - minY) * scale;
            const w = nodeWidth * scale;
            const h = nodeHeight * scale;

            ctx.fillStyle = runtime.state.selectedNode === node.id ? '#f43f5e' : 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.roundRect(x, y, Math.max(w, 3), Math.max(h, 2), 1);
            ctx.fill();
        });

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.5;
        runtime.state.edges.forEach(function (edge) {
            const from = runtime.state.nodes.find(function (node) { return node.id === edge.from; });
            const to = runtime.state.nodes.find(function (node) { return node.id === edge.to; });
            if (!from || !to) return;

            const x1 = (from.x - minX + nodeWidth) * scale;
            const y1 = (from.y - minY + nodeHeight / 2) * scale;
            const x2 = (to.x - minX) * scale;
            const y2 = (to.y - minY + nodeHeight / 2) * scale;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });

        const vpX = (-runtime.state.transform.x / runtime.state.transform.k - minX) * scale;
        const vpY = (-runtime.state.transform.y / runtime.state.transform.k - minY) * scale;
        const vpW = (window.innerWidth / runtime.state.transform.k) * scale;
        const vpH = (window.innerHeight / runtime.state.transform.k) * scale;

        viewportEl.style.left = vpX + 'px';
        viewportEl.style.top = vpY + 'px';
        viewportEl.style.width = Math.max(vpW, 10) + 'px';
        viewportEl.style.height = Math.max(vpH, 10) + 'px';

        minimapEl.dataset.minX = minX;
        minimapEl.dataset.minY = minY;
        minimapEl.dataset.scale = scale;
    }

    function bindMinimap(runtime) {
        const minimapEl = document.getElementById('minimap');
        if (!minimapEl || minimapEl.dataset.bound) return;

        minimapEl.addEventListener('click', function (e) {
            const rect = minimapEl.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            const minX = parseFloat(minimapEl.dataset.minX) || 0;
            const minY = parseFloat(minimapEl.dataset.minY) || 0;
            const scale = parseFloat(minimapEl.dataset.scale) || 1;

            const worldX = clickX / scale + minX;
            const worldY = clickY / scale + minY;

            runtime.state.transform.x = -(worldX - window.innerWidth / 2 / runtime.state.transform.k) * runtime.state.transform.k;
            runtime.state.transform.y = -(worldY - window.innerHeight / 2 / runtime.state.transform.k) * runtime.state.transform.k;

            if (typeof runtime.render === 'function') {
                runtime.render();
            }
        });

        minimapEl.dataset.bound = '1';
    }

    window.EditorMinimapHelpers = {
        updateMinimap: updateMinimap,
        bindMinimap: bindMinimap
    };
})();
