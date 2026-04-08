(function () {
    function debounce(func, wait) {
        let timeout;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                func.apply(context, args);
            }, wait);
        };
    }

    async function loadData(runtime) {
        const currentTreeId = runtime.treeId;
        let loadedData = null;

        if (runtime.db) {
            try {
                const docRef = runtime.db.collection('trees').doc(runtime.treeId);
                const docSnap = await docRef.get();

                if (docSnap.exists) {
                    const data = docSnap.data();
                    console.log('Document data from Firebase:', data);
                    runtime.currentTreeDocData = data;

                    const baseView = typeof data.viewCount === 'number' ? data.viewCount : 0;
                    const baseShare = typeof data.shareCount === 'number' ? data.shareCount : 0;
                    window.treeStats = {
                        viewCount: baseView + 1,
                        shareCount: baseShare
                    };

                    try {
                        if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
                            await docRef.update({
                                viewCount: firebase.firestore.FieldValue.increment(1),
                                lastOpened: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    } catch (e) {
                        console.warn('viewCount/lastOpened update failed:', e);
                    }

                    if (runtime.currentUser && data.ownerId && data.ownerId !== runtime.currentUser.uid) {
                        runtime.isReadOnly = true;
                        runtime.showToast('읽기 전용 모드입니다.');
                    } else if (!runtime.currentUser && data.ownerId) {
                        runtime.isReadOnly = true;
                        runtime.showToast('로그인이 필요합니다. (읽기 전용)');
                    }

                    if (data.nodes && data.nodes.length > 0) {
                        loadedData = data;
                    }
                }
            } catch (error) {
                console.error('Error getting document from Firebase:', error);
            }
        }

        if (!loadedData) {
            const localData = localStorage.getItem(runtime.STORAGE_KEY);
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    if (parsed.nodes && parsed.edges) {
                        console.log('Loaded from LocalStorage');
                        loadedData = parsed;
                    }
                } catch (e) {
                    console.error('LocalStorage parse error', e);
                }
            }
        }

        if (!loadedData && runtime.dummyData[runtime.treeId]) {
            console.log('Loaded from Dummy Data');
            loadedData = runtime.dummyData[runtime.treeId];
            runtime.isReadOnly = true;
        }

        if (!loadedData) {
            console.log('New tree created for ID:', runtime.treeId);
            loadedData = {
                name: currentTreeId ? decodeURIComponent(currentTreeId) : 'My Tree',
                nodes: [
                    {
                        id: 1,
                        x: window.innerWidth / 2 - 140,
                        y: window.innerHeight / 2 - 100,
                        title: '여정의 시작',
                        date: new Date().toISOString().split('T')[0],
                        videoId: '',
                        moments: [],
                        details: '여기를 클릭하여 첫 번째 순간을 기록해보세요.'
                    }
                ],
                edges: [],
                likes: [],
                comments: []
            };

            try {
                const initialNodeCount = Array.isArray(loadedData.nodes) ? loadedData.nodes.length : 0;
                const initialDataForIndex = {
                    name: loadedData.name,
                    nodes: loadedData.nodes,
                    edges: loadedData.edges,
                    lastUpdated: new Date().toISOString(),
                    ownerId: runtime.currentUser ? runtime.currentUser.uid : null,
                    nodeCount: initialNodeCount,
                    viewCount: 0,
                    shareCount: 0,
                    likeCount: Array.isArray(loadedData.likes) ? loadedData.likes.length : 0
                };

                window.treeStats = {
                    viewCount: 0,
                    shareCount: 0
                };

                localStorage.setItem(runtime.STORAGE_KEY, JSON.stringify(initialDataForIndex));

                if (runtime.db && runtime.currentUser) {
                    await runtime.db.collection('trees').doc(runtime.treeId).set(initialDataForIndex, { merge: true });
                }
            } catch (e) {
                console.error('Initial save failed', e);
            }
        }

        if (loadedData) {
            runtime.initState(loadedData);
            if (window.EditorHeaderHelpers && typeof window.EditorHeaderHelpers.setTreeTitle === 'function') {
                window.EditorHeaderHelpers.setTreeTitle(runtime, loadedData.name || 'My Tree');
                window.EditorHeaderHelpers.syncReadOnlyState(runtime);
            } else {
                document.getElementById('tree-title').innerText = loadedData.name || 'My Tree';
            }
            runtime.render();
            runtime.updateTreeStatsBanner();
        }

        return loadedData;
    }

    function updateUIForReadOnly(runtime) {
        if (runtime.isReadOnly) {
            const fab = document.querySelector('button[onclick="createNewNode()"]');
            if (fab) fab.classList.add('hidden');

            const resetBtn = document.getElementById('btn-reset');
            if (resetBtn) resetBtn.classList.add('hidden');

            const autoBtn = document.getElementById('btn-auto-connect');
            if (autoBtn) autoBtn.classList.add('hidden');

            const clearBtn = document.getElementById('btn-clear-connections');
            if (clearBtn) clearBtn.classList.add('hidden');
        }

        if (window.EditorHeaderHelpers && typeof window.EditorHeaderHelpers.syncReadOnlyState === 'function') {
            window.EditorHeaderHelpers.syncReadOnlyState(runtime);
        } else if (runtime.isReadOnly) {
            document.getElementById('tree-title').contentEditable = 'false';
        }

        const forkBtn = document.getElementById('fork-btn');
        if (forkBtn) {
            const canFork = !!runtime.currentUser &&
                !!runtime.db &&
                !!runtime.currentTreeDocData &&
                !!runtime.currentTreeDocData.ownerId &&
                runtime.currentTreeDocData.ownerId !== runtime.currentUser.uid;
            if (canFork) {
                forkBtn.classList.remove('hidden');
            } else {
                forkBtn.classList.add('hidden');
            }
        }
    }

    async function forkTreeToMyAccount(runtime) {
        try {
            if (!runtime.currentUser) {
                runtime.showToast('로그인이 필요합니다.');
                return;
            }

            if (!runtime.db) {
                runtime.showToast('클라우드 기능을 사용할 수 없습니다.');
                return;
            }

            const sourceTreeId = runtime.treeId || 'bts';

            if (!runtime.currentTreeDocData ||
                !runtime.currentTreeDocData.ownerId ||
                runtime.currentTreeDocData.ownerId === runtime.currentUser.uid) {
                runtime.showToast('가져올 수 있는 트리가 아닙니다.');
                return;
            }

            const ok = confirm('이 트리를 내 트리로 가져올까요? 가져온 뒤에는 내 트리에서 자유롭게 수정할 수 있습니다.');
            if (!ok) return;

            runtime.showToast('내 트리로 가져오는 중...');

            let sourceLastUpdated = runtime.currentTreeDocData.lastUpdated;
            if (sourceLastUpdated && typeof sourceLastUpdated.toDate === 'function') {
                sourceLastUpdated = sourceLastUpdated.toDate().toISOString();
            } else if (sourceLastUpdated) {
                try {
                    sourceLastUpdated = new Date(sourceLastUpdated).toISOString();
                } catch (e) {
                    sourceLastUpdated = String(sourceLastUpdated);
                }
            } else {
                sourceLastUpdated = '';
            }

            const sourceName = runtime.currentTreeDocData.name || decodeURIComponent(sourceTreeId);
            const nodes = Array.isArray(runtime.currentTreeDocData.nodes)
                ? runtime.currentTreeDocData.nodes
                : (Array.isArray(runtime.state.nodes) ? runtime.state.nodes : []);
            const edges = Array.isArray(runtime.currentTreeDocData.edges)
                ? runtime.currentTreeDocData.edges
                : (Array.isArray(runtime.state.edges) ? runtime.state.edges : []);

            const newDocRef = runtime.db.collection('trees').doc();
            const newTreeId = newDocRef.id;
            const nowIso = new Date().toISOString();

            await newDocRef.set({
                name: sourceName,
                ownerId: runtime.currentUser.uid,
                nodes: nodes,
                edges: edges,
                nodeCount: nodes.length,
                lastUpdated: nowIso,
                forkedFrom: {
                    treeId: sourceTreeId,
                    ownerId: runtime.currentTreeDocData.ownerId,
                    sourceLastUpdated: sourceLastUpdated,
                    forkedAt: nowIso
                }
            }, { merge: true });

            window.location.href = 'editor.html?id=' + encodeURIComponent(newTreeId);
        } catch (e) {
            console.error('forkTreeToMyAccount failed:', e);
            runtime.showToast('가져오기 실패');
        }
    }

    function initState(runtime, data) {
        const nodesSource = data.nodes.length > 0 ? data.nodes : [{
            id: 1,
            x: window.innerWidth / 2 - 140,
            y: window.innerHeight / 2 - 100,
            title: '여정의 시작',
            date: new Date().toISOString().split('T')[0],
            videoId: '',
            moments: []
        }];

        runtime.originalNodes = JSON.parse(JSON.stringify(nodesSource));
        runtime.state.nodes = JSON.parse(JSON.stringify(runtime.originalNodes));
        runtime.state.edges = data.edges || [];
        runtime.state.likes = data.likes || [];
        runtime.state.comments = data.comments || [];
        runtime.state.transform = { x: 0, y: 0, k: 1 };
    }

    async function saveDataImmediate(runtime, showToastOnSuccess) {
        const shouldToast = showToastOnSuccess !== false;
        if (runtime.isReadOnly) {
            console.log('Read-only mode. Save skipped.');
            return;
        }

        const nodeCount = Array.isArray(runtime.state.nodes) ? runtime.state.nodes.length : 0;
        const treeTitle = window.EditorHeaderHelpers && typeof window.EditorHeaderHelpers.getTreeTitle === 'function'
            ? window.EditorHeaderHelpers.getTreeTitle(runtime)
            : document.getElementById('tree-title').innerText;
        const dataToSave = {
            name: treeTitle,
            nodes: runtime.state.nodes,
            edges: runtime.state.edges,
            lastUpdated: new Date().toISOString(),
            ownerId: runtime.currentUser ? runtime.currentUser.uid : null,
            nodeCount: nodeCount
        };

        try {
            localStorage.setItem(runtime.STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Local save failed', e);
        }

        if (runtime.db) {
            if (!runtime.currentUser) {
                return;
            }

            try {
                await runtime.db.collection('trees').doc(runtime.treeId).set(dataToSave, { merge: true });
                console.log('Data saved to Firebase');
                if (shouldToast) {
                    runtime.showToast('저장되었습니다');
                }
            } catch (e) {
                console.error('Firebase save failed', e);
                if (shouldToast) {
                    runtime.showToast('클라우드 저장 실패 (로컬에만 저장됨)');
                }
            }
        }
    }

    window.EditorDataHelpers = {
        debounce: debounce,
        loadData: loadData,
        updateUIForReadOnly: updateUIForReadOnly,
        forkTreeToMyAccount: forkTreeToMyAccount,
        initState: initState,
        saveDataImmediate: saveDataImmediate
    };
})();
