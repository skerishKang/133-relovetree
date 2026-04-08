(function () {
    let pendingConnectionFrom = null;

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

    function updateStats(runtime) {
        if (runtime && typeof runtime.updateTreeStatsBanner === 'function') {
            runtime.updateTreeStatsBanner();
            return;
        }
        if (typeof window.updateTreeStatsBanner === 'function') {
            window.updateTreeStatsBanner();
        }
    }

    function getIsKorean(runtime) {
        if (runtime && typeof runtime.isKorean === 'boolean') {
            return runtime.isKorean;
        }
        if (typeof window.isKorean === 'boolean') {
            return window.isKorean;
        }
        return true;
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

    function shareTree(runtime) {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(async function () {
            showToast(runtime, '링크가 복사되었습니다! 친구에게 공유하세요.');

            try {
                if (runtime.db && typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
                    await runtime.db.collection('trees').doc(runtime.treeId).update({
                        shareCount: firebase.firestore.FieldValue.increment(1)
                    });
                }
            } catch (e) {
                console.warn('shareCount increment failed:', e);
            }

            if (!window.treeStats) {
                window.treeStats = { viewCount: 0, shareCount: 0 };
            }
            if (typeof window.treeStats.shareCount !== 'number') {
                window.treeStats.shareCount = 0;
            }
            window.treeStats.shareCount += 1;
            updateStats(runtime);
        }).catch(function (err) {
            console.error('Async: Could not copy text: ', err);
            prompt('이 링크를 복사해서 공유하세요:', url);
        });
    }

    function updateLikeUI(runtime) {
        const btn = document.getElementById('like-btn');
        const countEl = document.getElementById('like-count');
        if (!btn || !countEl) return;

        countEl.innerText = runtime.state.likes.length;

        if (runtime.currentUser && runtime.state.likes.includes(runtime.currentUser.uid)) {
            btn.classList.add('text-pink-500', 'bg-pink-50');
            btn.classList.remove('text-slate-400', 'bg-white');
        } else {
            btn.classList.remove('text-pink-500', 'bg-pink-50');
            btn.classList.add('text-slate-400', 'bg-white');
        }

        updateStats(runtime);
    }

    async function toggleLike(runtime) {
        if (!runtime.currentUser) {
            showToast(runtime, '로그인이 필요합니다.');
            return;
        }

        const uid = runtime.currentUser.uid;
        const index = runtime.state.likes.indexOf(uid);
        const newLikes = runtime.state.likes.slice();

        if (index === -1) {
            newLikes.push(uid);
        } else {
            newLikes.splice(index, 1);
        }

        runtime.state.likes = newLikes;
        updateLikeUI(runtime);

        try {
            await runtime.db.collection('trees').doc(runtime.treeId).update({
                likes: newLikes,
                likeCount: Array.isArray(newLikes) ? newLikes.length : 0
            });
        } catch (error) {
            console.error('Error updating likes:', error);
            showToast(runtime, '좋아요 업데이트 실패');
            if (index === -1) runtime.state.likes.pop();
            else runtime.state.likes.push(uid);
            updateLikeUI(runtime);
        }
    }

    function zoomIn(runtime) {
        runtime.state.transform.k *= 1.2;
        render(runtime);
    }

    function zoomOut(runtime) {
        runtime.state.transform.k *= 0.8;
        render(runtime);
    }

    function onConnectionHandleClick(runtime, nodeId, side) {
        if (runtime.isReadOnly) {
            showToast(runtime, '읽기 전용 모드입니다.');
            return;
        }

        if (side === 'right') {
            pendingConnectionFrom = nodeId;
            showToast(runtime, '연결할 다음 노드를 선택하세요. (왼쪽 핸들 클릭)');
            return;
        }

        if (side === 'left') {
            if (!pendingConnectionFrom || pendingConnectionFrom === nodeId) {
                pendingConnectionFrom = null;
                return;
            }

            const fromId = pendingConnectionFrom;
            const toId = nodeId;
            const exists = runtime.state.edges.some(function (edge) {
                return edge.from === fromId && edge.to === toId;
            });

            if (!exists) {
                runtime.state.edges.push({ from: fromId, to: toId });
                saveDebounced(runtime);
                render(runtime);
            }

            pendingConnectionFrom = null;
        }
    }

    function autoConnectTimeline(runtime) {
        if (runtime.isReadOnly) {
            showToast(runtime, '읽기 전용 모드입니다.');
            return;
        }

        if (!Array.isArray(runtime.state.nodes) || runtime.state.nodes.length < 2) {
            showToast(runtime, '연결할 노드가 충분하지 않습니다.');
            return;
        }

        const nodes = runtime.state.nodes.slice();
        nodes.sort(function (a, b) {
            const ad = a.date || '';
            const bd = b.date || '';
            if (ad === bd) {
                return (a.id || 0) - (b.id || 0);
            }
            return ad < bd ? -1 : 1;
        });

        const newEdges = [];
        for (let i = 0; i < nodes.length - 1; i += 1) {
            const fromId = nodes[i].id;
            const toId = nodes[i + 1].id;
            if (fromId != null && toId != null) {
                newEdges.push({ from: fromId, to: toId });
            }
        }

        runtime.state.edges = newEdges;
        saveDebounced(runtime);
        render(runtime);
        showToast(runtime, '날짜 순으로 자동 연결되었습니다.');
    }

    function clearAllConnections(runtime) {
        if (runtime.isReadOnly) {
            showToast(runtime, '읽기 전용 모드입니다.');
            return;
        }

        if (!Array.isArray(runtime.state.edges) || runtime.state.edges.length === 0) {
            showToast(runtime, '삭제할 연결선이 없습니다.');
            return;
        }

        if (!confirm('모든 연결선을 삭제하시겠습니까?')) {
            return;
        }

        runtime.state.edges = [];
        render(runtime);
        saveImmediate(runtime, false) || saveDebounced(runtime);
        showToast(runtime, '모든 연결선이 삭제되었습니다.');
    }

    function resetLayout(runtime) {
        const message = getIsKorean(runtime)
            ? '모든 노드의 위치를 초기화하시겠습니까? (저장된 데이터도 초기화됩니다)'
            : 'Reset all node positions? (Saved data will be reset)';

        if (!confirm(message)) {
            return;
        }

        runtime.state.nodes = JSON.parse(JSON.stringify(runtime.originalNodes));
        runtime.state.transform = { x: 0, y: 0, k: 1 };
        localStorage.removeItem(runtime.STORAGE_KEY);

        if (runtime.db) {
            runtime.db.collection('trees').doc(runtime.treeId).delete().then(function () {
                console.log('Firebase document deleted');
            }).catch(function (error) {
                console.error('Error removing document: ', error);
            });
        }

        render(runtime);
    }

    window.EditorActionHelpers = {
        shareTree: shareTree,
        updateLikeUI: updateLikeUI,
        toggleLike: toggleLike,
        zoomIn: zoomIn,
        zoomOut: zoomOut,
        onConnectionHandleClick: onConnectionHandleClick,
        autoConnectTimeline: autoConnectTimeline,
        clearAllConnections: clearAllConnections,
        resetLayout: resetLayout
    };
})();
