(function () {
    let dragStartX = 0;
    let dragStartY = 0;
    let isDraggingNode = false;
    let panLastX = 0;
    let panLastY = 0;
    let lastPointerInteractionEndAt = 0;
    let interactionsBound = false;

    function getClientPoint(e) {
        if (e && e.touches && e.touches.length) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e && e.changedTouches && e.changedTouches.length) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function showToast(runtime, message) {
        if (runtime && typeof runtime.showToast === 'function') {
            runtime.showToast(message);
            return;
        }
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        }
    }

    function render(runtime) {
        if (runtime && typeof runtime.render === 'function') {
            runtime.render();
        }
    }

    function saveImmediate(runtime, showToastOnSuccess) {
        if (runtime && typeof runtime.saveDataImmediate === 'function') {
            return runtime.saveDataImmediate(showToastOnSuccess);
        }
        if (typeof window.saveDataImmediate === 'function') {
            return window.saveDataImmediate(showToastOnSuccess);
        }
        return null;
    }

    function saveDebounced(runtime) {
        if (runtime && typeof runtime.saveData === 'function') {
            return runtime.saveData();
        }
        if (typeof window.saveData === 'function') {
            return window.saveData();
        }
        return null;
    }

    function createDroppedNode(runtime, videoId) {
        const state = runtime.state;
        const transform = state.transform || { x: 0, y: 0, k: 1 };
        const zoom = transform.k || 1;
        return {
            id: Date.now(),
            x: -transform.x / zoom + window.innerWidth / 2 / zoom - 140,
            y: -transform.y / zoom + window.innerHeight / 2 / zoom - 100,
            title: 'New Moment',
            date: new Date().toISOString().split('T')[0],
            videoId: videoId,
            moments: []
        };
    }

    function startDragNode(runtime, e, node) {
        if (!runtime || runtime.isReadOnly || !node) return;
        if (e.target && e.target.closest && e.target.closest('.connection-handle')) return;

        e.stopPropagation();
        isDraggingNode = true;
        runtime.state.selectedNode = node.id;

        const point = getClientPoint(e);
        dragStartX = point.x;
        dragStartY = point.y;

        const transform = runtime.state.transform || { x: 0, y: 0, k: 1 };
        const zoom = transform.k || 1;
        const offsetX = typeof transform.x === 'number' ? transform.x : 0;
        const offsetY = typeof transform.y === 'number' ? transform.y : 0;

        runtime.state.dragStart = {
            x: (point.x - offsetX) / zoom - node.x,
            y: (point.y - offsetY) / zoom - node.y
        };
    }

    function handlePointerMove(runtime, e) {
        if (!runtime) return;

        const point = getClientPoint(e);
        const state = runtime.state;

        if (isDraggingNode && state.selectedNode) {
            const dist = Math.hypot(point.x - dragStartX, point.y - dragStartY);
            if (dist > 5) {
                state.isDragging = true;
            }

            if (state.isDragging && e && e.cancelable) {
                e.preventDefault();
            }

            if (state.isDragging) {
                const node = state.nodes.find(function (item) {
                    return item.id === state.selectedNode;
                });
                if (node) {
                    const transform = state.transform || { x: 0, y: 0, k: 1 };
                    const zoom = transform.k || 1;
                    const offsetX = typeof transform.x === 'number' ? transform.x : 0;
                    const offsetY = typeof transform.y === 'number' ? transform.y : 0;

                    node.x = (point.x - offsetX) / zoom - state.dragStart.x;
                    node.y = (point.y - offsetY) / zoom - state.dragStart.y;
                    render(runtime);
                }
            }
            return;
        }

        if (state.isPanning) {
            if (e && e.cancelable) {
                e.preventDefault();
            }

            const dx = point.x - panLastX;
            const dy = point.y - panLastY;
            panLastX = point.x;
            panLastY = point.y;
            state.transform.x += dx;
            state.transform.y += dy;
            render(runtime);
        }
    }

    function endPointerInteraction(runtime) {
        if (!runtime) return lastPointerInteractionEndAt;

        const state = runtime.state;
        const wasDragging = !!state.isDragging;
        const wasPanning = !!state.isPanning;

        if (wasDragging || wasPanning) {
            lastPointerInteractionEndAt = Date.now();
        }

        setTimeout(function () {
            if (state.isDragging) {
                saveImmediate(runtime, false) || saveDebounced(runtime);
            }
            isDraggingNode = false;
            state.isDragging = false;
            state.isPanning = false;
        }, 0);

        return lastPointerInteractionEndAt;
    }

    function beginPan(runtime, e) {
        if (!runtime || runtime.editorMode !== 'tree') return;

        const target = e.target;
        if (target && target.closest && target.closest('.node')) return;
        if (target && target.closest && target.closest('#timeline')) return;

        const hitCanvas = (target && target.id === 'wrapper') || (target && target.closest && target.closest('#canvas'));
        if (!hitCanvas) return;

        const point = getClientPoint(e);
        panLastX = point.x;
        panLastY = point.y;
        runtime.state.isPanning = true;
        runtime.state.selectedNode = null;
        render(runtime);
    }

    function handleWheel(runtime, e) {
        if (!runtime || runtime.editorMode !== 'tree') return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        runtime.state.transform.k = Math.max(0.1, Math.min(3, runtime.state.transform.k * delta));
        render(runtime);
    }

    function bindDropTargets(runtime) {
        const wrapperEl = document.getElementById('wrapper');
        if (wrapperEl && !wrapperEl.dataset.pointerDropBound) {
            wrapperEl.addEventListener('dragover', function (e) {
                e.preventDefault();
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'copy';
                }
            });

            wrapperEl.addEventListener('drop', function (e) {
                e.preventDefault();

                if (runtime.isReadOnly) {
                    showToast(runtime, '읽기 전용 모드입니다.');
                    return;
                }

                const dataTransfer = e.dataTransfer;
                if (!dataTransfer) return;

                const url = dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain');
                if (!url || typeof window.validateYouTubeUrl !== 'function') return;

                const videoId = window.validateYouTubeUrl(url);
                if (!videoId) {
                    showToast(runtime, '유튜브 주소를 인식하지 못했습니다.');
                    return;
                }

                let targetNode = null;
                if (runtime.state.selectedNode) {
                    targetNode = runtime.state.nodes.find(function (node) {
                        return node.id === runtime.state.selectedNode;
                    }) || null;
                }

                if (!targetNode) {
                    targetNode = createDroppedNode(runtime, videoId);
                    runtime.state.nodes.push(targetNode);
                } else {
                    targetNode.videoId = videoId;
                }

                render(runtime);
                saveDebounced(runtime);
                showToast(runtime, '유튜브 영상이 추가되었습니다');
            });

            wrapperEl.dataset.pointerDropBound = '1';
        }

        const detailModalEl = document.getElementById('detail-modal');
        if (detailModalEl && !detailModalEl.dataset.pointerDropBound) {
            detailModalEl.addEventListener('dragover', function (e) {
                e.preventDefault();
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'copy';
                }
            });

            detailModalEl.addEventListener('drop', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (runtime.isReadOnly) {
                    showToast(runtime, '읽기 전용 모드입니다.');
                    return;
                }

                const dataTransfer = e.dataTransfer;
                if (!dataTransfer) return;

                const url = dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain');
                if (!url || typeof window.validateYouTubeUrl !== 'function') return;

                const videoId = window.validateYouTubeUrl(url);
                if (!videoId) {
                    showToast(runtime, '유튜브 주소를 인식하지 못했습니다.');
                    return;
                }

                const node = runtime.state.nodes.find(function (item) {
                    return item.id === runtime.state.activeNodeId;
                });
                if (!node) return;

                node.videoId = videoId;
                render(runtime);
                if (typeof window.openDetailModal === 'function') {
                    window.openDetailModal(node);
                }
                saveDebounced(runtime);
                showToast(runtime, '유튜브 영상이 추가되었습니다');
            });

            detailModalEl.dataset.pointerDropBound = '1';
        }
    }

    function bindInteractions(runtime) {
        if (!runtime || interactionsBound) {
            bindDropTargets(runtime);
            return;
        }

        window.onmousemove = function (e) {
            handlePointerMove(runtime, e);
        };
        window.addEventListener('touchmove', function (e) {
            handlePointerMove(runtime, e);
        }, { passive: false });

        window.onmouseup = function () {
            endPointerInteraction(runtime);
        };
        window.addEventListener('touchend', function () {
            endPointerInteraction(runtime);
        });
        window.addEventListener('touchcancel', function () {
            endPointerInteraction(runtime);
        });

        const wrapperEl = document.getElementById('wrapper');
        if (wrapperEl) {
            wrapperEl.onmousedown = function (e) {
                beginPan(runtime, e);
            };
            wrapperEl.ontouchstart = function (e) {
                beginPan(runtime, e);
            };
            wrapperEl.onwheel = function (e) {
                handleWheel(runtime, e);
            };
        }

        interactionsBound = true;
        bindDropTargets(runtime);
    }

    function getLastPointerInteractionEndAt() {
        return lastPointerInteractionEndAt;
    }

    window.EditorPointerHelpers = {
        bindInteractions: bindInteractions,
        startDragNode: startDragNode,
        handlePointerMove: handlePointerMove,
        endPointerInteraction: endPointerInteraction,
        getLastPointerInteractionEndAt: getLastPointerInteractionEndAt
    };
})();
