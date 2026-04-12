(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const treeId = urlParams.get('id') || 'bts';

    const dummyData = {
        'bts': {
            name: '방탄소년단 (BTS)',
            nodes: [
                {
                    id: 1, x: 100, y: 100, title: '데뷔 무대 (No More Dream)', date: '2013-06-13', videoId: 'rBG5L7UsUxA',
                    moments: [{ time: '0:10', text: '전설의 시작', feeling: 'love' }]
                },
                {
                    id: 2, x: 500, y: 300, title: '첫 1위 (I Need U)', date: '2015-05-05', videoId: 'NMdTd9e-LEI',
                    moments: [{ time: '2:30', text: '감동적인 순간', feeling: 'tear' }]
                },
                {
                    id: 3, x: 900, y: 100, title: '빌보드 1위 (Dynamite)', date: '2020-08-21', videoId: 'gdZLi9oWNZg',
                    moments: [{ time: '1:00', text: '역사적인 기록', feeling: 'shock' }]
                },
                {
                    id: 4, x: 500, y: -100, title: '화양연화 (Photo)', date: '2015-04-29', videoId: '', imageUrl: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2070&auto=format&fit=crop',
                    moments: [{ time: '0:00', text: '아름다운 컨셉 포토', feeling: 'love' }]
                }
            ],
            edges: [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 2, to: 4 }
            ]
        },
        'newbie_fan': {
            name: '신입 팬 (Newbie)',
            nodes: [
                {
                    id: 1, x: 400, y: 300, title: '입덕 부정기 끝', date: '2024-01-01', videoId: '',
                    moments: [{ time: '0:00', text: '이제 인정합니다. 저는 팬입니다.', feeling: 'shock' }]
                }
            ],
            edges: []
        },
        'heavy_uploader': {
            name: '기록광 (Heavy User)',
            nodes: [
                { id: 1, x: 100, y: 100, title: 'Day 1', date: '2024-01-01', videoId: '', moments: [] },
                { id: 2, x: 300, y: 100, title: 'Day 2', date: '2024-01-02', videoId: '', moments: [] },
                { id: 3, x: 500, y: 100, title: 'Day 3', date: '2024-01-03', videoId: '', moments: [] },
                { id: 4, x: 100, y: 300, title: 'Day 4', date: '2024-01-04', videoId: '', moments: [] },
                { id: 5, x: 300, y: 300, title: 'Day 5', date: '2024-01-05', videoId: '', moments: [] }
            ],
            edges: [
                { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }
            ]
        },
        'seventeen': {
            name: '세븐틴 (Seventeen)',
            nodes: [
                {
                    id: 1, x: 100, y: 100, title: '손오공 (Super)', date: '2023-04-24', videoId: 'Y6cGBh_TSIc',
                    moments: [{ time: '2:45', text: '칼군무 미쳤다', feeling: 'shock' }]
                },
                {
                    id: 2, x: 500, y: 300, title: 'MAESTRO 컴백', date: '2024-04-29', videoId: 'ThI0pBAbFnk',
                    moments: [{ time: '3:00', text: '지휘하는 안무 대박', feeling: 'love' }]
                }
            ],
            edges: [{ from: 1, to: 2 }]
        },
        'straykids': {
            name: '스키즈 (Stray Kids)',
            nodes: [
                {
                    id: 1, x: 100, y: 100, title: '神메뉴 (God\'s Menu)', date: '2020-06-17', videoId: 'TQTlCHxyuu8',
                    moments: [{ time: '1:20', text: '네 손님~', feeling: 'love' }]
                },
                {
                    id: 2, x: 500, y: 300, title: '락 (LALALALA)', date: '2023-11-10', videoId: 'DTAQd-qA8Q4',
                    moments: [{ time: '2:10', text: '에너지 폭발', feeling: 'shock' }]
                }
            ],
            edges: [{ from: 1, to: 2 }]
        },
        'leejunyoung': {
            name: '이준영 (Lee Jun-young)',
            nodes: [
                {
                    id: 1, x: 100, y: 100, title: '궁금해 (Curious About U)', date: '2019-12-05', videoId: 'K4y_y2BfSgI',
                    moments: [{ time: '0:00', text: '솔로 가수 이준영!', feeling: 'love' }]
                },
                {
                    id: 2, x: 500, y: 300, title: '너의 밤이 되어줄게 (연기)', date: '2021-11-07', videoId: 'B-e_nK8Q3-M',
                    moments: [{ time: '0:00', text: '연기 천재 만재', feeling: 'love' }]
                }
            ],
            edges: [{ from: 1, to: 2 }]
        },
        'hearts2hearts': {
            name: '하츠투하츠 (Hearts2Hearts)',
            nodes: [
                {
                    id: 1, x: 100, y: 100, title: 'The Chase (Debut)', date: '2025-02-24', videoId: 'kxUA2wwYiME',
                    moments: [{ time: '0:05', text: '비주얼 쇼크...', feeling: 'shock' }]
                },
                {
                    id: 2, x: 500, y: 300, title: '첫 음악방송 1위', date: '2025-03-15', videoId: 'kxUA2wwYiME',
                    moments: [{ time: '3:20', text: '눈물바다 ㅠㅠ', feeling: 'tear' }]
                }
            ],
            edges: [{ from: 1, to: 2 }]
        },
        'illit': {
            name: '아일릿 (ILLIT)',
            nodes: [
                {
                    id: 1, x: 100, y: 100, title: 'Magnetic 데뷔', date: '2024-03-25', videoId: 'Vk5-c_v4gMU',
                    moments: [{ time: '0:30', text: '슈퍼 이끌림~', feeling: 'love' }]
                },
                {
                    id: 2, x: 500, y: 200, title: 'Lucky Girl Syndrome', date: '2024-04-10', videoId: 'UCmgGZbfjmk',
                    moments: [{ time: '1:10', text: '안무 너무 귀여워', feeling: 'love' }]
                }
            ],
            edges: [{ from: 1, to: 2 }]
        }
    };

    const STORAGE_KEY = `relovetree_data_${treeId}`;
    const BG_STORAGE_KEY = 'relovetree_background';

    let db;
    let auth;
    let storage;

    const state = {
        isKorean: true,
        currentUser: null,
        isReadOnly: false,
        currentTreeDocData: null,
        originalNodes: [],
        orientationMode: 'portrait',
        editorMode: 'tree',
        commentsUnsubscribe: null,
        nodes: [],
        edges: [],
        transform: { x: 0, y: 0, k: 1 },
        isDragging: false,
        isPanning: false,
        selectedNode: null,
        dragStart: { x: 0, y: 0 },
        activeNodeId: null,
        likes: [],
        comments: []
    };

    const saveData = window.debounce(() => {
        window.saveDataImmediate(true);
    }, 1000);

    function render() {
        const refs = window.EditorRenderUiHelpers.getRenderRefs();

        if (state.editorMode === 'timeline') {
            window.EditorRenderMainHelpers.renderTimelineBranch(window.__editorRuntime, refs);
            return;
        }

        window.EditorRenderMainHelpers.renderTreeBranch(window.__editorRuntime, refs);
    }

    window.__editorRuntime = window.EditorRuntimeHelpers.createRuntime({
        getTreeId: () => treeId,
        getStorageKey: () => STORAGE_KEY,
        getBackgroundStorageKey: () => BG_STORAGE_KEY,
        getDummyData: () => dummyData,
        getDb: () => db,
        setDb: (value) => { db = value; },
        getAuth: () => auth,
        setAuth: (value) => { auth = value; },
        getStorage: () => storage,
        setStorage: (value) => { storage = value; },
        getCurrentUser: () => state.currentUser,
        setCurrentUser: (value) => { state.currentUser = value; },
        getIsReadOnly: () => state.isReadOnly,
        setIsReadOnly: (value) => { state.isReadOnly = value; },
        getCurrentTreeDocData: () => state.currentTreeDocData,
        setCurrentTreeDocData: (value) => { state.currentTreeDocData = value; },
        getOriginalNodes: () => state.originalNodes,
        setOriginalNodes: (value) => { state.originalNodes = value; },
        getEditorMode: () => state.editorMode,
        setEditorMode: (value) => { state.editorMode = value; },
        getIsKorean: () => state.isKorean,
        setIsKorean: (value) => { state.isKorean = !!value; },
        getOrientationMode: () => state.orientationMode,
        setOrientationMode: (value) => { state.orientationMode = value; },
        getCommentsUnsubscribe: () => state.commentsUnsubscribe,
        setCommentsUnsubscribe: (value) => { state.commentsUnsubscribe = value; },
        getState: () => state,
        getFirebase: () => firebase,
        getShowToast: () => window.showToast,
        getRender: () => render,
        getInitState: () => window.initState,
        getUpdateTreeStatsBanner: () => window.updateTreeStatsBanner,
        getSaveData: () => saveData,
        getSaveDataImmediate: () => window.saveDataImmediate
    });

    window.state = state;
    window.render = render;
    window.saveData = saveData;

    window.isKorean = state.isKorean;
    
    // Bridge for read-only state
    Object.defineProperty(window, 'isReadOnly', {
        get: () => state.isReadOnly,
        set: (v) => { state.isReadOnly = v; }
    });

    if (window.EditorHeaderHelpers && typeof window.EditorHeaderHelpers.syncHeaderState === 'function') {
        window.EditorHeaderHelpers.syncHeaderState(window.__editorRuntime);
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await window.EditorBootstrapHelpers.initApp(window.__editorRuntime);
    });

    window.EditorBootstrapHelpers.finalizeBootstrap(window.__editorRuntime);
})();
