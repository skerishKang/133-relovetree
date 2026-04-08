(function () {
    function createNodeElement(runtime, node) {
        const el = document.createElement('div');
        const state = runtime.state;

        el.className = 'node ' + (state.selectedNode === node.id ? 'selected' : '');
        el.style.left = node.x + 'px';
        el.style.top = node.y + 'px';
        el.dataset.nodeId = String(node.id);

        const hasVideo = !!node.videoId;
        const thumbUrl = hasVideo && typeof window.getYouTubeThumb === 'function'
            ? window.getYouTubeThumb(node.videoId, 'hqdefault')
            : '';

        el.innerHTML = `
            <div class="h-40 bg-black relative group overflow-hidden">
                ${hasVideo
                ? `<div class="w-full h-full relative overflow-hidden">
                            <img src="${thumbUrl}" alt="YouTube thumbnail" class="w-full h-full object-cover" />
                            <div class="absolute inset-0 bg-black/25"></div>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                    <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"></path>
                                    </svg>
                                </div>
                            </div>
                       </div>`
                : (node.imageUrl
                    ? `<div class="w-full h-full relative overflow-hidden">
                        <img src="${node.imageUrl}" alt="Node Image" class="w-full h-full object-cover" />
                       </div>`
                    : `<div class="w-full h-full flex items-center justify-center bg-slate-800 text-slate-300 text-xs">No Media</div>`
                )
            }
                <div class="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur">
                    ${node.moments.length} Moments
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-slate-800 text-lg leading-tight line-clamp-1 mb-1">${node.title}</h3>
                <p class="text-xs text-slate-400 font-medium">${node.date || ''}</p>
            </div>
            <div class="absolute top-1/2 -left-3 w-6 h-6 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center cursor-crosshair hover:border-brand-500 text-slate-400 hover:text-brand-500 z-30 connection-handle connection-handle-left" title="이전 노드와 연결">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
            </div>
            <div class="absolute top-1/2 -right-3 w-6 h-6 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center cursor-crosshair hover:border-brand-500 text-slate-400 hover:text-brand-500 z-30 connection-handle connection-handle-right" title="다음 노드와 연결">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
            </div>
        `;

        const leftHandle = el.querySelector('.connection-handle-left');
        if (leftHandle) {
            leftHandle.addEventListener('click', function (event) {
                event.stopPropagation();
                window.onConnectionHandleClick(node.id, 'left');
            });
        }

        const rightHandle = el.querySelector('.connection-handle-right');
        if (rightHandle) {
            rightHandle.addEventListener('click', function (event) {
                event.stopPropagation();
                window.onConnectionHandleClick(node.id, 'right');
            });
        }

        el.onmousedown = function (e) {
            window.startDragNode(e, node);
        };
        el.ontouchstart = function (e) {
            window.startDragNode(e, node);
        };

        el.onclick = function (e) {
            const pointerEndAt = window.EditorPointerHelpers.getLastPointerInteractionEndAt();
            const justInteracted = (Date.now() - pointerEndAt) < 350;
            if (!state.isDragging && !justInteracted) {
                e.stopPropagation();
                window.openDetailModal(node);
            }
        };

        return el;
    }

    function drawConnection(runtime, from, to) {
        const connections = document.getElementById('connections');
        if (!connections) return;

        const fromEl = document.querySelector('.node[data-node-id="' + from.id + '"]');
        const toEl = document.querySelector('.node[data-node-id="' + to.id + '"]');
        if (!fromEl || !toEl) return;

        const fromHandle = fromEl.querySelector('.connection-handle-right');
        const toHandle = toEl.querySelector('.connection-handle-left');
        if (!fromHandle || !toHandle) return;

        const startX = fromEl.offsetLeft + fromHandle.offsetLeft + fromHandle.offsetWidth / 2;
        const startY = fromEl.offsetTop + fromHandle.offsetTop + fromHandle.offsetHeight / 2;
        const endX = toEl.offsetLeft + toHandle.offsetLeft + toHandle.offsetWidth / 2;
        const endY = toEl.offsetTop + toHandle.offsetTop + toHandle.offsetHeight / 2;

        const cp1X = startX + (endX - startX) * 0.5;
        const cp1Y = startY;
        const cp2X = endX - (endX - startX) * 0.5;
        const cp2Y = endY;
        const d = 'M ' + startX + ' ' + startY + ' C ' + cp1X + ' ' + cp1Y + ', ' + cp2X + ' ' + cp2Y + ', ' + endX + ' ' + endY;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#cbd5e1');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        connections.appendChild(path);
    }

    window.EditorTreeViewHelpers = {
        createNodeElement: createNodeElement,
        drawConnection: drawConnection
    };
})();
