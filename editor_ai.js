let aiHelperMode = 'tree';
let aiTreeSuggestions = [];
let aiCommentSuggestions = [];
let aiHelperLoading = false;
let momentAiSuggestions = [];
let commentAiSuggestions = [];
let aiNodeSuggestion = null;
let aiHelperAbortController = null;
let aiHelperRequestSeq = 0;
let aiHelperActiveRequestSeq = 0;
let aiHelperLastNodeId = null;

let aiHelperStartedAt = 0;
let aiHelperEstimatedTotalMs = 0;
let aiHelperProgressTimer = null;
let aiHelperProgressMode = '';
let aiHelperProgressCount = 0;

let aiTreeEditIndex = null;

let aiTreeDraftIndex = null;
let aiTreeDraftNode = null;

// YouTube & Utility functions moved to src/editor-ai-utils.js


function openAiHelper(initialMode) {
    const modal = document.getElementById('ai-helper-modal');
    if (!modal) return;

    const resultEl = document.getElementById('ai-result');
    const hasResult = !!(resultEl && String(resultEl.innerHTML || '').trim());
    const shouldReset = !aiHelperLoading && !hasResult;

    const treePrompt = document.getElementById('ai-tree-prompt');
    const titleEl = document.getElementById('tree-title');
    if (treePrompt && titleEl && !treePrompt.value) {
        const base = titleEl.innerText || '';
        if (base) {
            treePrompt.value = base + ' 활동을 단계별로 정리해줘';
        }
    }

    const commentPrompt = document.getElementById('ai-comment-prompt');
    if (commentPrompt && shouldReset) commentPrompt.value = '';

    const nodePrompt = document.getElementById('ai-node-prompt');
    if (nodePrompt && shouldReset) nodePrompt.value = '';

    const ctxEl = document.getElementById('ai-node-context');
    if (ctxEl && shouldReset) ctxEl.textContent = '';

    if (resultEl && shouldReset) resultEl.innerHTML = '';

    const nextMode = initialMode || aiHelperMode || 'tree';
    setAiHelperMode(nextMode);
    if (typeof modal.showModal === 'function') {
        modal.showModal();
    } else {
        modal.setAttribute('open', 'open');
    }
}

// prepareNodeAiContext moved to src/editor-ai-logic.js


function openNodeAiHelperFromDetail() {
    if (typeof state === 'undefined' || !state || !Array.isArray(state.nodes)) {
        if (typeof showToast === 'function') showToast('먼저 노드를 선택해 주세요.');
        return;
    }
    const node = state.nodes.find(function (n) { return n.id === state.activeNodeId; });
    if (!node) {
        if (typeof showToast === 'function') showToast('먼저 노드를 선택해 주세요.');
        return;
    }

    const modal = document.getElementById('ai-helper-modal');
    if (!modal) return;

    if (aiHelperLastNodeId !== node.id && !aiHelperLoading) {
        const resultEl = document.getElementById('ai-result');
        if (resultEl) resultEl.innerHTML = '';
        aiNodeSuggestion = null;
    }

    aiHelperLastNodeId = node.id;
    prepareNodeAiContext(node);
    setAiHelperMode('node');

    if (typeof modal.showModal === 'function') {
        modal.showModal();
    } else {
        modal.setAttribute('open', 'open');
    }
}

function closeAiHelper() {
    const modal = document.getElementById('ai-helper-modal');
    if (!modal) return;
    modal.close();
}

function clearAiHelperLoadingInterval() {
    if (window._aiLoadingInterval) {
        clearInterval(window._aiLoadingInterval);
        window._aiLoadingInterval = null;
    }
}

// Progress & UI management functions moved to src/editor-ai-ui.js


function onAiHelperSubmit(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    if (aiHelperLoading) return;

    aiHelperRequestSeq += 1;
    const requestSeq = aiHelperRequestSeq;
    aiHelperActiveRequestSeq = requestSeq;

    if (aiHelperAbortController) {
        try {
            aiHelperAbortController.abort();
        } catch (e) {
        }
    }
    aiHelperAbortController = (typeof AbortController !== 'undefined') ? new AbortController() : null;

    setAiHelperLoading(true);

    // 결과 영역에 진행 메시지 표시
    const resultEl = document.getElementById('ai-result');
    if (resultEl) {
        let loadingMessages = [];
        if (aiHelperMode === 'qa') {
            loadingMessages = [
                'AI가 질문을 읽고 있습니다...',
                '답변을 정리하고 있습니다...',
                '표현을 다듬고 있습니다...'
            ];
        } else if (aiHelperMode === 'node') {
            loadingMessages = [
                'AI가 노드를 분석하고 있습니다...',
                '제목과 설명을 다듬고 있습니다...',
                '추천 영상을 찾고 있습니다...'
            ];
        } else {
            loadingMessages = [
                'AI가 아티스트 정보를 검색하고 있습니다...',
                '관련 무대와 영상을 찾고 있습니다...',
                '타임라인을 구성하고 있습니다...'
            ];
        }
        let msgIndex = 0;
        resultEl.innerHTML = '<div class="flex flex-col items-center py-8 gap-2">' +
            '<div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>' +
            '<p id="ai-loading-msg" class="text-xs text-slate-500">' + loadingMessages[0] + '</p>' +
            '<p id="ai-loading-stage" class="text-[11px] text-slate-400">요청을 준비하고 있습니다...</p>' +
            '<p id="ai-loading-eta" class="text-[11px] text-slate-400"></p>' +
            '</div>';

        // 메시지 순환 표시
        clearAiHelperLoadingInterval();
        window._aiLoadingInterval = setInterval(function () {
            msgIndex = (msgIndex + 1) % loadingMessages.length;
            const msgEl = document.getElementById('ai-loading-msg');
            if (msgEl) {
                msgEl.textContent = loadingMessages[msgIndex];
            }
        }, 2000);
    }

    const countEl = document.getElementById('ai-tree-count');
    let count = 0;
    if (aiHelperMode === 'tree' && countEl) {
        const n = parseInt(countEl.value, 10);
        if (!isNaN(n) && n > 0 && n <= 12) count = n;
    }
    startAiHelperProgress(aiHelperMode, count);
    setAiHelperProgressStage('AI 요청을 전송했습니다. 응답을 기다리는 중...');

    let runner = runAiTreeHelper;
    if (aiHelperMode === 'qa') {
        runner = runAiQaHelper;
    } else if (aiHelperMode === 'node') {
        runner = runAiNodeHelper;
    }
    Promise.resolve()
        .then(() => runner(requestSeq))
        .finally(() => {
            if (aiHelperActiveRequestSeq !== requestSeq) return;
            const box = document.getElementById('ai-result');
            const success = !!(box && String(box.innerHTML || '').trim() && !document.getElementById('ai-loading-msg'));
            stopAiHelperProgress(success);
            setAiHelperLoading(false);
            clearAiHelperLoadingInterval();
            aiHelperAbortController = null;
            aiHelperActiveRequestSeq = 0;
        });
}


function runAiTreeHelper(requestSeq) {
    if (typeof isReadOnly !== 'undefined' && isReadOnly) {
        if (typeof showToast === 'function') showToast('읽기 전용 모드에서는 사용할 수 없습니다.');
        return Promise.resolve();
    }
    const promptEl = document.getElementById('ai-tree-prompt');
    const countEl = document.getElementById('ai-tree-count');
    const prompt = promptEl ? promptEl.value.trim() : '';
    let count = 4;
    if (countEl) {
        const n = parseInt(countEl.value, 10);
        if (!isNaN(n) && n > 0 && n <= 12) count = n;
    }

    // Gemini API 호출 시도
    const signal = aiHelperAbortController ? aiHelperAbortController.signal : undefined;

    // buildSuggestionFromNodeEdit moved to src/editor-ai-logic.js


    const fallbackTreeOnePass = function () {
        setAiHelperProgressStage('기존 방식으로 결과를 생성 중입니다...');
        return callAiHelperApi('tree', { prompt, count }, { signal: signal }).then(async function (result) {
            if (aiHelperActiveRequestSeq !== requestSeq) return;
            if (Array.isArray(result)) {
                setAiHelperProgressStage('결과를 정리하고 있습니다...');
                const suggestions = result.map(function (item) {
                    const title = item && item.title ? item.title : '새 순간';
                    const date = item && item.date ? item.date : '';
                    let videoId = '';
                    if (item && typeof item.videoId === 'string' && item.videoId) {
                        videoId = item.videoId;
                    } else if (item && typeof item.youtubeUrl === 'string' && item.youtubeUrl && typeof parseYouTubeId === 'function') {
                        const parsed = parseYouTubeId(item.youtubeUrl);
                        if (parsed) videoId = parsed;
                    }

                    let moments = [];
                    if (item && Array.isArray(item.moments)) {
                        moments = item.moments
                            .map(function (m) {
                                return {
                                    time: m && m.time ? m.time : '0:00',
                                    text: m && m.text ? m.text : '',
                                    feeling: m && m.feeling ? m.feeling : 'love'
                                };
                            })
                            .filter(function (m) { return m.text && m.text.trim().length > 0; });
                    }
                    const description = item && item.description ? item.description : '';
                    if ((!moments || moments.length === 0) && description) {
                        moments = [{ time: '0:00', text: description, feeling: 'love' }];
                    }

                    return { title, date, videoId, description, moments };
                });
                if (aiHelperActiveRequestSeq !== requestSeq) return;
                aiTreeSuggestions = suggestions;
                renderAiTreePreview();
                return;
            }

            setAiHelperProgressStage('대체 생성 로직으로 전환했습니다...');
            const skeleton = await createAiTreeSkeleton(prompt, count);
            if (aiHelperActiveRequestSeq !== requestSeq) return;
            aiTreeSuggestions = skeleton;
            renderAiTreePreview();
        });
    };

    setAiHelperProgressStage('1/2: 타임라인 뼈대를 생성하고 있습니다...');

    return callAiHelperApi('tree_skeleton', { prompt, count }, { signal: signal })
        .then(async function (skeletonResult) {
            if (aiHelperActiveRequestSeq !== requestSeq) return;
            const skeleton = Array.isArray(skeletonResult) ? skeletonResult : [];
            const items = skeleton.slice(0, count);
            if (!items.length) {
                return fallbackTreeOnePass();
            }

            const suggestions = items.map(function (item) {
                const title = item && item.title ? String(item.title) : '새 순간';
                const searchQuery = item && item.searchQuery ? String(item.searchQuery) : '';
                const fallbackQueries = (item && Array.isArray(item.fallbackQueries))
                    ? item.fallbackQueries.map(function (q) { return q == null ? '' : String(q).trim(); }).filter(function (q) { return q.length > 0; }).slice(0, 6)
                    : [];
                return {
                    title: title,
                    date: '',
                    videoId: '',
                    description: '',
                    moments: [],
                    _searchQuery: searchQuery,
                    _searchFallbackQueries: fallbackQueries
                };
            });

            const total = suggestions.length;

            for (let i = 0; i < total; i++) {
                if (aiHelperActiveRequestSeq !== requestSeq) return;
                setAiHelperProgressStage('2/2: 순간 ' + (i + 1) + '/' + total + ' 내용을 채우는 중...');

                const base = suggestions[i];
                const instruction = '이 순간을 대표하는 영상과 핵심 모먼트를 3~6개로 정리해줘.';
                try {
                    const nodeEditPayload = {
                        node: {
                            title: base.title || '',
                            date: base.date || '',
                            videoId: base.videoId || '',
                            description: base.description || '',
                            moments: Array.isArray(base.moments) ? base.moments : []
                        },
                        instruction: instruction,
                        searchQuery: base._searchQuery || base.title || ''
                        ,
                        searchFallbackQueries: Array.isArray(base._searchFallbackQueries) ? base._searchFallbackQueries : []
                    };

                    const nodeEditResult = await callAiHelperApi('node_edit', nodeEditPayload, { signal: signal });
                    if (aiHelperActiveRequestSeq !== requestSeq) return;
                    const enriched = buildSuggestionFromNodeEdit(base, nodeEditResult);
                    suggestions[i] = Object.assign({}, enriched, { _searchQuery: base._searchQuery || '' });
                } catch (e) {
                    if (e && e.name === 'AbortError') return;
                }
            }

            suggestions.forEach(function (s) { delete s._searchQuery; });
            if (aiHelperActiveRequestSeq !== requestSeq) return;
            setAiHelperProgressStage('완료! 결과를 표시합니다.');
            aiTreeSuggestions = suggestions;
            renderAiTreePreview();
        })
        .catch(function (err) {
            if (aiHelperActiveRequestSeq !== requestSeq) return;
            if (err && err.name === 'AbortError') return;
            return fallbackTreeOnePass();
        });
}

// Tree skeleton, preview, and draft functions moved to src/editor-ai-logic.js and src/editor-ai-ui.js


function clearAiTreeDraft() {
    aiTreeDraftIndex = null;
    aiTreeDraftNode = null;
}

function applyAiTreeDraftSingleToTree(index, draft) {
    if (typeof state === 'undefined' || !state) {
        if (typeof showToast === 'function') showToast('트리 상태를 찾을 수 없습니다.');
        return;
    }
    if (!Array.isArray(state.nodes)) state.nodes = [];
    if (!Array.isArray(state.edges)) state.edges = [];

    if (typeof isReadOnly !== 'undefined' && isReadOnly) {
        if (typeof showToast === 'function') showToast('읽기 전용 모드에서는 사용할 수 없습니다.');
        return;
    }

    const item = draft || {};
    let maxId = 0;
    state.nodes.forEach(function (n) {
        const nId = typeof n.id === 'number' ? n.id : (parseInt(n.id, 10) || 0);
        if (nId > maxId) maxId = nId;
    });

    const k = state.transform && state.transform.k ? state.transform.k : 1;
    const centerX = -state.transform.x / k + window.innerWidth / 2 / k - 140;
    const baseY = -state.transform.y / k + window.innerHeight / 2 / k - 100;

    const nodeObj = {
        id: maxId + 1,
        x: centerX,
        y: baseY,
        title: item.title || '새 순간',
        date: item.date || '',
        videoId: item.videoId || '',
        description: item.description || '',
        moments: Array.isArray(item.moments) ? item.moments : []
    };

    if ((!nodeObj.moments || nodeObj.moments.length === 0) && nodeObj.description) {
        nodeObj.moments = [{ time: '0:00', text: nodeObj.description, feeling: 'love' }];
    }

    state.nodes.push(nodeObj);
    if (typeof render === 'function') render();
    if (typeof saveDataImmediate === 'function') {
        saveDataImmediate(true);
    } else if (typeof saveData === 'function') {
        saveData();
    }

    if (typeof showToast === 'function') showToast('노드 1개가 추가되었습니다.');

    if (aiTreeSuggestions && index >= 0 && index < aiTreeSuggestions.length) {
        aiTreeSuggestions.splice(index, 1);
    }
}

if (typeof window !== 'undefined') {
    window.onAiTreeDraftSaved = function (index, draft) {
        updateAiTreeSuggestionFromDraft(index, draft);
        clearAiTreeDraft();
        renderAiTreePreview();
        if (typeof showToast === 'function') showToast('AI 제안이 저장되었습니다.');
        if (typeof openAiHelper === 'function') {
            openAiHelper('tree');
        }
    };

    window.onAiTreeDraftApplySingle = function (index, draft) {
        updateAiTreeSuggestionFromDraft(index, draft);
        applyAiTreeDraftSingleToTree(index, draft);
        clearAiTreeDraft();
        renderAiTreePreview();
        if (typeof openAiHelper === 'function') {
            openAiHelper('tree');
        }
    };
}

function closeAiTreeSuggestionEditor() {
    aiTreeEditIndex = null;
    renderAiTreePreview();
}

function getAiTreeSuggestionEditingItem() {
    if (aiTreeEditIndex === null || aiTreeEditIndex === undefined) return null;
    if (!aiTreeSuggestions || aiTreeEditIndex < 0 || aiTreeEditIndex >= aiTreeSuggestions.length) return null;
    return aiTreeSuggestions[aiTreeEditIndex];
}

function clearAiTreeVideoInput() {
    const input = document.getElementById('ai-tree-edit-video');
    if (input) input.value = '';
    updateAiTreeVideoPreview();
}

function updateAiTreeVideoPreview() {
    const input = document.getElementById('ai-tree-edit-video');
    const errorEl = document.getElementById('ai-tree-edit-video-error');
    const preview = document.getElementById('ai-tree-edit-video-preview');
    const thumb = document.getElementById('ai-tree-edit-video-thumb');
    const textEl = document.getElementById('ai-tree-edit-video-preview-text');
    const linkEl = document.getElementById('ai-tree-edit-video-preview-link');

    if (!input || !errorEl || !preview || !thumb || !textEl || !linkEl) return;

    const raw = (input.value || '').trim();
    if (!raw) {
        errorEl.classList.add('hidden');
        preview.classList.add('hidden');
        return;
    }

    const videoId = (typeof validateYouTubeUrl === 'function')
        ? (validateYouTubeUrl(raw) || '')
        : ((raw.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^"&?\/\s]{11})/) || [])[1] || '');

    if (!videoId) {
        errorEl.textContent = '유튜브 URL을 인식하지 못했습니다.';
        errorEl.classList.remove('hidden');
        preview.classList.add('hidden');
        return;
    }

    errorEl.classList.add('hidden');
    preview.classList.remove('hidden');

    const thumbUrl = (typeof getYouTubeThumb === 'function')
        ? getYouTubeThumb(videoId)
        : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    thumb.src = thumbUrl;
    textEl.textContent = `영상 ID: ${videoId}`;
    linkEl.href = `https://www.youtube.com/watch?v=${videoId}`;
}

function renderAiTreeYouTubeSearchResults(list) {
    const box = document.getElementById('ai-tree-edit-video-search-result');
    if (!box) return;
    box.innerHTML = '';

    if (!Array.isArray(list) || list.length === 0) {
        box.innerHTML = '<p class="text-[11px] text-slate-400">검색 결과가 없습니다.</p>';
        return;
    }

    list.forEach(function (item) {
        if (!item || !item.videoId) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-full text-left px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100';
        btn.onclick = function () {
            const input = document.getElementById('ai-tree-edit-video');
            if (input) input.value = `https://youtu.be/${item.videoId}`;
            updateAiTreeVideoPreview();
        };

        const wrap = document.createElement('div');
        wrap.className = 'flex gap-3 items-start';

        const img = document.createElement('img');
        img.className = 'w-20 h-12 rounded-md border border-slate-200 object-cover bg-slate-100';
        img.alt = 'YouTube Thumbnail';
        img.src = (typeof getYouTubeThumb === 'function')
            ? getYouTubeThumb(item.videoId)
            : `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;

        const meta = document.createElement('div');
        meta.className = 'flex-1 min-w-0';

        const title = document.createElement('p');
        title.className = 'text-[11px] font-bold text-slate-800 leading-snug line-clamp-2';
        title.textContent = String(item.title || '제목 없음');

        const sub = document.createElement('p');
        sub.className = 'text-[10px] text-slate-500 mt-0.5 truncate';
        const channel = item.channelTitle ? String(item.channelTitle) : '';
        const published = item.publishedAt ? String(item.publishedAt).split('T')[0] : '';
        sub.textContent = [channel, published].filter(Boolean).join(' · ');

        meta.appendChild(title);
        meta.appendChild(sub);
        wrap.appendChild(img);
        wrap.appendChild(meta);
        btn.appendChild(wrap);
        box.appendChild(btn);
    });
}

function searchYouTubeForAiTreeSuggestion() {
    const input = document.getElementById('ai-tree-edit-video-search');
    const box = document.getElementById('ai-tree-edit-video-search-result');
    const titleEl = document.getElementById('ai-tree-edit-title');
    const query = (input && input.value && input.value.trim())
        ? input.value.trim()
        : (titleEl && titleEl.value ? titleEl.value.trim() : '');

    if (!box) return;
    if (!query) {
        box.innerHTML = '<p class="text-[11px] text-slate-400">검색어를 입력해 주세요.</p>';
        return;
    }

    box.innerHTML = '<p class="text-[11px] text-slate-400">YouTube에서 검색 중...</p>';

    if (typeof callAiHelperApi !== 'function') {
        box.innerHTML = '<p class="text-[11px] text-slate-400">검색 기능을 사용할 수 없습니다.</p>';
        return;
    }

    callAiHelperApi('youtube_search', { query: query, maxResults: 6 })
        .then(function (result) {
            renderAiTreeYouTubeSearchResults(result);
        })
        .catch(function () {
            box.innerHTML = '<p class="text-[11px] text-slate-400">검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>';
        });
}

function addAiTreeMomentRow() {
    const item = getAiTreeSuggestionEditingItem();
    if (!item) return;
    if (!Array.isArray(item.moments)) item.moments = [];
    item.moments.push({ time: '0:00', text: '', feeling: 'love' });
    renderAiTreeSuggestionEditor();
}

function removeAiTreeMomentRow(idx) {
    const item = getAiTreeSuggestionEditingItem();
    if (!item || !Array.isArray(item.moments)) return;
    if (idx < 0 || idx >= item.moments.length) return;
    item.moments.splice(idx, 1);
    renderAiTreeSuggestionEditor();
}

function updateAiTreeMomentField(idx, field, value) {
    const item = getAiTreeSuggestionEditingItem();
    if (!item || !Array.isArray(item.moments)) return;
    if (idx < 0 || idx >= item.moments.length) return;
    const m = item.moments[idx];
    if (!m) return;
    if (field === 'time') m.time = value;
    if (field === 'text') m.text = value;
    if (field === 'feeling') m.feeling = value;
}

function saveAiTreeSuggestionEditorValues() {
    const item = getAiTreeSuggestionEditingItem();
    if (!item) return;

    const titleInput = document.getElementById('ai-tree-edit-title');
    const dateInput = document.getElementById('ai-tree-edit-date');
    const videoInput = document.getElementById('ai-tree-edit-video');
    const descInput = document.getElementById('ai-tree-edit-description');

    const nextTitle = titleInput ? String(titleInput.value || '').trim() : '';
    const nextDate = dateInput ? String(dateInput.value || '') : '';
    const nextDesc = descInput ? String(descInput.value || '') : '';

    let nextVideoId = '';
    const rawVideo = videoInput ? String(videoInput.value || '').trim() : '';
    if (rawVideo) {
        const parsed = (typeof validateYouTubeUrl === 'function')
            ? (validateYouTubeUrl(rawVideo) || '')
            : ((rawVideo.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^"&?\/\s]{11})/) || [])[1] || '');
        if (!parsed) {
            if (typeof showToast === 'function') showToast('유튜브 주소를 인식하지 못했습니다. URL을 확인해 주세요.');
            return false;
        }
        nextVideoId = parsed;
    }

    item.title = nextTitle || item.title;
    item.date = nextDate || item.date;
    item.description = nextDesc;
    item.videoId = nextVideoId;

    if (Array.isArray(item.moments)) {
        item.moments = item.moments
            .map(function (m) {
                return {
                    time: m && m.time ? m.time : '0:00',
                    text: m && m.text ? m.text : '',
                    feeling: m && m.feeling ? m.feeling : 'love'
                };
            })
            .filter(function (m) { return m.text && m.text.trim().length > 0; });
    }

    if ((!item.moments || item.moments.length === 0) && item.description) {
        item.moments = [{ time: '0:00', text: item.description, feeling: 'love' }];
    }

    return true;
}

function applyAiTreeSuggestionSingle() {
    if (!saveAiTreeSuggestionEditorValues()) return;
    const item = getAiTreeSuggestionEditingItem();
    if (!item) return;

    if (typeof state === 'undefined' || !state) {
        if (typeof showToast === 'function') showToast('트리 상태를 찾을 수 없습니다.');
        return;
    }
    if (!Array.isArray(state.nodes)) state.nodes = [];
    if (!Array.isArray(state.edges)) state.edges = [];

    if (typeof isReadOnly !== 'undefined' && isReadOnly) {
        if (typeof showToast === 'function') showToast('읽기 전용 모드에서는 사용할 수 없습니다.');
        return;
    }

    let maxId = 0;
    state.nodes.forEach(function (n) {
        const nId = typeof n.id === 'number' ? n.id : (parseInt(n.id, 10) || 0);
        if (nId > maxId) maxId = nId;
    });

    const k = state.transform && state.transform.k ? state.transform.k : 1;
    const centerX = -state.transform.x / k + window.innerWidth / 2 / k - 140;
    const baseY = -state.transform.y / k + window.innerHeight / 2 / k - 100;

    const id = maxId + 1;
    const nodeObj = {
        id: id,
        x: centerX,
        y: baseY,
        title: item.title,
        date: item.date,
        videoId: item.videoId,
        description: item.description || '',
        moments: Array.isArray(item.moments) ? item.moments : []
    };

    state.nodes.push(nodeObj);
    if (typeof render === 'function') render();
    if (typeof saveDataImmediate === 'function') {
        saveDataImmediate(true);
    } else if (typeof saveData === 'function') {
        saveData();
    }
    if (typeof showToast === 'function') showToast('노드 1개가 추가되었습니다.');
    closeAiTreeSuggestionEditor();
    closeAiHelper();
}

function renderAiTreeSuggestionEditor() {
    const box = document.getElementById('ai-result');
    if (!box) return;
    const item = getAiTreeSuggestionEditingItem();
    if (!item) {
        aiTreeEditIndex = null;
        renderAiTreePreview();
        return;
    }

    const safeTitle = escapeHtmlForAi(item.title || '');
    const safeDate = item.date || '';
    const urlValue = item.videoId ? ('https://youtu.be/' + item.videoId) : '';
    const safeDesc = escapeHtmlForAi(item.description || '');
    const moments = Array.isArray(item.moments) ? item.moments : [];

    const momentsHtml = moments.map(function (m, idx) {
        const time = escapeHtmlForAi((m && m.time) ? m.time : '0:00');
        const text = escapeHtmlForAi((m && m.text) ? m.text : '');
        const feeling = (m && m.feeling) ? String(m.feeling) : 'love';
        const opt = function (v, label) {
            return '<option value="' + v + '"' + (feeling === v ? ' selected' : '') + '>' + label + '</option>';
        };
        return '' +
            '<div class="rounded-xl border border-slate-200 bg-white p-2 space-y-2">' +
            '  <div class="flex items-center gap-2">' +
            '    <input type="text" class="w-20 px-2 py-1 rounded-lg border border-slate-200 text-[11px]" value="' + time + '" oninput="updateAiTreeMomentField(' + idx + ', \'time\', this.value)">' +
            '    <select class="px-2 py-1 rounded-lg border border-slate-200 text-[11px]" onchange="updateAiTreeMomentField(' + idx + ', \'feeling\', this.value)">' +
            opt('love', '😍') + opt('tear', '😭') + opt('funny', '🤣') + opt('shock', '😲') +
            '    </select>' +
            '    <button type="button" class="ml-auto text-[11px] text-slate-400 hover:text-red-500" onclick="removeAiTreeMomentRow(' + idx + ')">삭제</button>' +
            '  </div>' +
            '  <textarea rows="2" class="w-full px-2 py-1 rounded-lg border border-slate-200 text-[11px]" oninput="updateAiTreeMomentField(' + idx + ', \'text\', this.value)">' + text + '</textarea>' +
            '</div>';
    }).join('');

    const html = [
        '<div class="space-y-3">',
        '  <div class="flex items-center justify-between">',
        '    <p class="text-xs font-bold text-slate-800">상세 편집 (순간 ' + (aiTreeEditIndex + 1) + ')</p>',
        '    <button type="button" class="text-[11px] text-slate-500 hover:text-slate-700" onclick="closeAiTreeSuggestionEditor()">목록으로</button>',
        '  </div>',
        '  <div class="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-3">',
        '    <div>',
        '      <label class="block text-[11px] font-bold text-slate-500 mb-1">제목</label>',
        '      <input id="ai-tree-edit-title" type="text" class="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px]" value="' + safeTitle + '">',
        '    </div>',
        '    <div>',
        '      <label class="block text-[11px] font-bold text-slate-500 mb-1">날짜</label>',
        '      <input id="ai-tree-edit-date" type="date" class="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px]" value="' + safeDate + '">',
        '    </div>',
        '    <div>',
        '      <label class="block text-[11px] font-bold text-slate-500 mb-1">유튜브 URL</label>',
        '      <input id="ai-tree-edit-video" type="text" class="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px]" value="' + escapeHtmlForAi(urlValue) + '" oninput="updateAiTreeVideoPreview()">',
        '      <p id="ai-tree-edit-video-error" class="hidden mt-1 text-[11px] text-red-500"></p>',
        '    </div>',
        '    <div id="ai-tree-edit-video-preview" class="hidden p-2 rounded-lg border border-slate-200 bg-white">',
        '      <div class="flex gap-3 items-start">',
        '        <img id="ai-tree-edit-video-thumb" src="" alt="YouTube Thumbnail" class="w-24 h-14 rounded-md border border-slate-200 object-cover bg-slate-100">',
        '        <div class="flex-1 min-w-0">',
        '          <p id="ai-tree-edit-video-preview-text" class="text-[11px] text-slate-600 truncate"></p>',
        '          <a id="ai-tree-edit-video-preview-link" href="#" target="_blank" class="text-[11px] text-brand-600 hover:underline">YouTube에서 열기</a>',
        '        </div>',
        '        <button type="button" onclick="clearAiTreeVideoInput()" class="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100">제거</button>',
        '      </div>',
        '    </div>',
        '    <div>',
        '      <div class="flex gap-2">',
        '        <input type="text" id="ai-tree-edit-video-search" placeholder="키워드로 영상 검색" class="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px]">',
        '        <button type="button" onclick="searchYouTubeForAiTreeSuggestion()" class="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 text-white hover:bg-slate-900">검색</button>',
        '      </div>',
        '      <div id="ai-tree-edit-video-search-result" class="mt-2 space-y-1"></div>',
        '    </div>',
        '    <div>',
        '      <label class="block text-[11px] font-bold text-slate-500 mb-1">설명</label>',
        '      <textarea id="ai-tree-edit-description" rows="3" class="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px]">' + safeDesc + '</textarea>',
        '    </div>',
        '    <div class="space-y-2">',
        '      <div class="flex items-center justify-between">',
        '        <p class="text-[11px] font-bold text-slate-500">모먼트</p>',
        '        <button type="button" onclick="addAiTreeMomentRow()" class="text-[11px] text-brand-600 hover:underline">+ 추가</button>',
        '      </div>',
        (momentsHtml || '<p class="text-[11px] text-slate-400">모먼트가 없습니다. + 추가로 직접 입력하거나, 설명을 채우고 적용해도 됩니다.</p>'),
        '    </div>',
        '    <div class="flex justify-end gap-2">',
        '      <button type="button" class="px-3 py-1.5 rounded-xl text-[11px] text-slate-500 hover:bg-slate-100" onclick="closeAiTreeSuggestionEditor()">취소</button>',
        '      <button type="button" class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-800 text-white hover:bg-slate-900" onclick="if(saveAiTreeSuggestionEditorValues()){ closeAiTreeSuggestionEditor(); }">저장</button>',
        '      <button type="button" class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-brand-500 text-white hover:bg-brand-600" onclick="applyAiTreeSuggestionSingle()">이 노드만 적용</button>',
        '    </div>',
        '  </div>',
        '</div>'
    ].join('');

    box.innerHTML = html;
    updateAiTreeVideoPreview();
}

function updateAiTreeSuggestion(index, field, value) {
    if (!aiTreeSuggestions || index < 0 || index >= aiTreeSuggestions.length) return;
    const item = aiTreeSuggestions[index];
    if (!item) return;
    if (field === 'title') {
        item.title = value;
    } else if (field === 'date') {
        item.date = value;
    }
}

function removeAiTreeSuggestion(index) {
    if (!aiTreeSuggestions || index < 0 || index >= aiTreeSuggestions.length) return;
    aiTreeSuggestions.splice(index, 1);
    renderAiTreePreview();
}

// escapeHtmlForAi moved to src/editor-ai-utils.js


function applyAiTreeSkeleton() {
    console.log('[AI] applyAiTreeSkeleton called', { aiTreeSuggestions, state: typeof state });

    // state 검사를 더 유연하게
    if (typeof state === 'undefined' || !state) {
        console.error('[AI] state is not defined');
        if (typeof showToast === 'function') showToast('트리 상태를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
        return;
    }
    if (!Array.isArray(state.nodes)) {
        state.nodes = [];
    }

    if (typeof isReadOnly !== 'undefined' && isReadOnly) {
        if (typeof showToast === 'function') showToast('읽기 전용 모드에서는 사용할 수 없습니다.');
        return;
    }
    if (!aiTreeSuggestions || aiTreeSuggestions.length === 0) {
        console.warn('[AI] No suggestions to apply');
        if (typeof showToast === 'function') showToast('적용할 노드가 없습니다.');
        return;
    }

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const ok = window.confirm('생성된 노드 ' + aiTreeSuggestions.length + '개를 현재 트리에 추가할까요? (나중에 언제든지 수정할 수 있습니다.)');
        if (!ok) return;
    }

    // maxId 계산 개선 - 숫자든 타임스탬프든 처리
    let maxId = 0;
    state.nodes.forEach(function (n) {
        const nId = typeof n.id === 'number' ? n.id : (parseInt(n.id, 10) || 0);
        if (nId > maxId) maxId = nId;
    });
    const k = state.transform && state.transform.k ? state.transform.k : 1;
    const centerX = -state.transform.x / k + window.innerWidth / 2 / k - 140;
    const baseY = -state.transform.y / k + window.innerHeight / 2 / k - 100;
    const gapX = 320;
    const newNodes = [];
    aiTreeSuggestions.forEach(function (item, index) {
        const id = maxId + index + 1;

        let moments = [];
        if (Array.isArray(item.moments)) {
            moments = item.moments
                .map(function (m) {
                    return {
                        time: m && m.time ? m.time : '0:00',
                        text: m && m.text ? m.text : '',
                        feeling: m && m.feeling ? m.feeling : 'love'
                    };
                })
                .filter(function (m) {
                    return m.text && m.text.trim().length > 0;
                });
        }

        if ((!moments || moments.length === 0) && item.description) {
            moments = [{ time: '0:00', text: item.description, feeling: 'love' }];
        }

        newNodes.push({
            id: id,
            x: centerX + index * gapX,
            y: baseY,
            title: item.title,
            date: item.date,
            videoId: item.videoId,
            description: item.description || '',
            moments: moments
        });
    });
    newNodes.forEach(function (n) {
        state.nodes.push(n);
    });
    for (let i = 0; i < newNodes.length - 1; i++) {
        state.edges.push({ from: newNodes[i].id, to: newNodes[i + 1].id });
    }
    if (typeof render === 'function') render();
    if (typeof saveDataImmediate === 'function') {
        saveDataImmediate(true);
    } else if (typeof saveData === 'function') {
        saveData();
    }
    if (typeof showToast === 'function') {
        showToast('AI 추천 트리가 추가되었습니다.');
    }
    closeAiHelper();
}

function runAiNodeHelper(requestSeq) {
    const box = document.getElementById('ai-result');
    const promptEl = document.getElementById('ai-node-prompt');

    if (typeof state === 'undefined' || !state || !Array.isArray(state.nodes)) {
        if (box) box.innerHTML = '<p class="text-xs text-slate-400">먼저 편집할 노드를 선택해 주세요.</p>';
        return Promise.resolve();
    }

    const node = state.nodes.find(function (n) { return n.id === state.activeNodeId; });
    if (!node) {
        if (box) box.innerHTML = '<p class="text-xs text-slate-400">먼저 편집할 노드를 선택해 주세요.</p>';
        return Promise.resolve();
    }

    const instruction = promptEl ? promptEl.value.trim() : '';

    const payload = {
        node: {
            title: node.title || '',
            date: node.date || '',
            videoId: node.videoId || '',
            description: node.description || '',
            moments: Array.isArray(node.moments) ? node.moments : []
        },
        instruction
    };

    if (box) {
        const hasLoadingUi = !!document.getElementById('ai-loading-msg');
        if (!hasLoadingUi) {
            box.innerHTML = '<p class="text-xs text-slate-400">AI가 이 노드를 분석하고 있습니다...</p>';
        }
    }

    const signal = aiHelperAbortController ? aiHelperAbortController.signal : undefined;
    return callAiHelperApi('node_edit', payload, { signal: signal }).then(function (result) {
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        if (!result) {
            if (box) box.innerHTML = '<p class="text-xs text-slate-400">AI 응답을 가져오지 못했습니다. 다시 시도해 주세요.</p>';
            return;
        }

        let suggestion = result;
        if (typeof result === 'string') {
            try {
                suggestion = JSON.parse(result);
            } catch (e) {
                // 파싱 실패 시 그대로 텍스트만 보여준다.
                if (box) {
                    const safe = escapeHtmlForAi(result).replace(/\n/g, '<br>');
                    box.innerHTML = '<div class="text-xs leading-relaxed text-slate-800">' + safe + '</div>';
                }
                return;
            }
        }

        aiNodeSuggestion = suggestion || null;
        renderNodeAiSuggestion(node, aiNodeSuggestion);
    }).catch(function (err) {
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        if (err && err.name === 'AbortError') return;
        if (box) {
            box.innerHTML = '<div class="flex flex-col items-center py-8 gap-3">'
                + '<p class="text-xs text-slate-500">AI 응답 중 오류가 발생했습니다.</p>'
                + '<div class="flex gap-2">'
                + '<button type="button" onclick="retryAiHelper()" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600">재시도</button>'
                + '<button type="button" onclick="closeAiHelper()" class="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100">닫기</button>'
                + '</div>'
                + '</div>';
        }
    });
}

// Node suggestion UI and YouTube search functions moved to src/editor-ai-ui.js


function applyAiNodeSuggestion() {
    if (!aiNodeSuggestion || typeof state === 'undefined' || !state || !Array.isArray(state.nodes)) return;
    const node = state.nodes.find(function (n) { return n.id === state.activeNodeId; });
    if (!node) return;

    const suggestion = aiNodeSuggestion;

    const titleInput = document.getElementById('ai-node-edit-title');
    const dateInput = document.getElementById('ai-node-edit-date');
    const videoInput = document.getElementById('ai-node-edit-video');
    const descInput = document.getElementById('ai-node-edit-description');

    const nextTitle = titleInput ? String(titleInput.value || '').trim() : (suggestion.title || '');
    const nextDate = dateInput ? String(dateInput.value || '') : (suggestion.date || '');
    const nextDesc = descInput ? String(descInput.value || '') : (typeof suggestion.description === 'string' ? suggestion.description : '');

    let nextVideoId = node.videoId || '';
    if (videoInput) {
        const raw = String(videoInput.value || '').trim();
        if (!raw) {
            nextVideoId = '';
        } else {
            const parsed = (typeof validateYouTubeUrl === 'function')
                ? (validateYouTubeUrl(raw) || '')
                : ((raw.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^"&?\/\s]{11})/) || [])[1] || '');
            if (!parsed) {
                if (typeof showToast === 'function') {
                    showToast('유튜브 주소를 인식하지 못했습니다. URL을 확인해 주세요.');
                }
                return;
            }
            nextVideoId = parsed;
        }
    } else {
        let videoId = node.videoId || '';
        if (typeof suggestion.videoId === 'string' && suggestion.videoId) {
            videoId = suggestion.videoId;
        } else if (!videoId && typeof suggestion.youtubeUrl === 'string' && suggestion.youtubeUrl && typeof parseYouTubeId === 'function') {
            const parsed = parseYouTubeId(suggestion.youtubeUrl);
            if (parsed) videoId = parsed;
        }
        if (videoId) nextVideoId = videoId;
    }

    if (nextTitle) node.title = nextTitle;
    if (dateInput) {
        node.date = nextDate;
    } else if (nextDate) {
        node.date = nextDate;
    }
    node.videoId = nextVideoId;

    if (typeof nextDesc === 'string') {
        node.description = nextDesc;
    }

    if (Array.isArray(suggestion.moments)) {
        node.moments = suggestion.moments
            .map(function (m) {
                return {
                    time: m && m.time ? m.time : '0:00',
                    text: m && m.text ? m.text : '',
                    feeling: m && m.feeling ? m.feeling : 'love'
                };
            })
            .filter(function (m) { return m.text && m.text.trim().length > 0; });
    }

    if ((!node.moments || node.moments.length === 0) && node.description) {
        node.moments = [{ time: '0:00', text: node.description, feeling: 'love' }];
    }

    // UI 업데이트
    const detailTitle = document.getElementById('detail-title');
    const detailDate = document.getElementById('detail-date');
    const editTitle = document.getElementById('edit-title');
    const editDate = document.getElementById('edit-date');
    const editVideo = document.getElementById('edit-video');

    if (detailTitle) detailTitle.innerText = node.title || '';
    if (detailDate) detailDate.innerText = node.date || '';
    if (editTitle) editTitle.value = node.title || '';
    if (editDate) editDate.value = node.date || '';
    if (editVideo) editVideo.value = node.videoId ? `https://youtu.be/${node.videoId}` : '';

    if (typeof updateDetailVideoEditorUi === 'function') {
        updateDetailVideoEditorUi();
    }

    if (typeof renderMomentsList === 'function') {
        renderMomentsList(Array.isArray(node.moments) ? node.moments : []);
    }
    if (typeof updateDetailMedia === 'function') {
        updateDetailMedia(node);
    }
    if (typeof render === 'function') render();
    if (typeof saveData === 'function') saveData();

    if (typeof showToast === 'function') {
        showToast('AI 제안이 노드에 적용되었습니다.');
    }
}

function onNodeDragStartForAi(event, nodeId) {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', String(nodeId));
    event.dataTransfer.effectAllowed = 'copy';
}

function handleNodeDropForAi(event) {
    event.preventDefault();
    if (!event.dataTransfer) return;
    const raw = event.dataTransfer.getData('text/plain');
    const id = raw ? parseInt(raw, 10) : NaN;
    if (!raw || Number.isNaN(id)) return;

    if (typeof state === 'undefined' || !state || !Array.isArray(state.nodes)) return;
    const node = state.nodes.find(function (n) { return n.id === id; });
    if (!node) return;

    if (aiHelperLastNodeId !== node.id && !aiHelperLoading) {
        const resultEl = document.getElementById('ai-result');
        if (resultEl) resultEl.innerHTML = '';
        aiNodeSuggestion = null;
    }

    aiHelperLastNodeId = node.id;

    state.activeNodeId = node.id;
    prepareNodeAiContext(node);
    setAiHelperMode('node');
}

function setupAiHelperDropZone() {
    const panel = document.getElementById('ai-node-panel');
    if (!panel) return;

    panel.addEventListener('dragover', function (event) {
        event.preventDefault();
    });

    panel.addEventListener('drop', handleNodeDropForAi);
}

function runAiQaHelper(requestSeq) {
    const promptEl = document.getElementById('ai-comment-prompt');
    const box = document.getElementById('ai-result');
    if (!promptEl || !box) return Promise.resolve();

    const userPrompt = promptEl.value.trim();
    if (!userPrompt) {
        box.innerHTML = '<p class="text-xs text-slate-400">궁금한 내용을 먼저 적어주세요.</p>';
        return Promise.resolve();
    }

    const contextParts = [];
    const titleEl = document.getElementById('tree-title');
    if (titleEl && titleEl.innerText) {
        contextParts.push('트리 제목: ' + titleEl.innerText);
    }
    if (typeof state !== 'undefined' && state && Array.isArray(state.nodes)) {
        contextParts.push('노드 개수: ' + state.nodes.length);
        if (state.activeNodeId) {
            const node = state.nodes.find(function (n) { return n.id === state.activeNodeId; });
            if (node && node.title) {
                contextParts.push('선택된 노드 제목: ' + node.title);
            }
        }
    }
    const context = contextParts.join('\n');

    box.innerHTML = '<p class="text-xs text-slate-400">AI가 답변을 준비하고 있습니다...</p>';

    const signal = aiHelperAbortController ? aiHelperAbortController.signal : undefined;
    return callAiHelperApi('qa', { prompt: userPrompt, context: context }, { signal: signal }).then(function (result) {
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        if (!result) {
            box.innerHTML = '<p class="text-xs text-slate-400">답변을 가져오지 못했습니다. 다시 시도해 주세요.</p>';
            return;
        }
        const safe = escapeHtmlForAi(String(result)).replace(/\n/g, '<br>');
        box.innerHTML = '<div class="text-xs leading-relaxed text-slate-800">' + safe + '</div>';
    }).catch(function (err) {
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        if (err && err.name === 'AbortError') return;
        box.innerHTML = '<div class="flex flex-col items-center py-8 gap-3">'
            + '<p class="text-xs text-slate-500">AI 답변 중 오류가 발생했습니다.</p>'
            + '<div class="flex gap-2">'
            + '<button type="button" onclick="retryAiHelper()" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600">재시도</button>'
            + '<button type="button" onclick="closeAiHelper()" class="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100">닫기</button>'
            + '</div>'
            + '</div>';
    });
}

function runAiCommentHelper() {
    const promptEl = document.getElementById('ai-comment-prompt');
    let base = '';

    // 1순위: 사용자가 직접 적은 설명
    if (promptEl && promptEl.value.trim()) {
        base = promptEl.value.trim();
    } else if (typeof state !== 'undefined' && state && state.activeNodeId) {
        // 2순위: 선택된 노드의 제목
        const nodeId = state.activeNodeId;
        const node = Array.isArray(state.nodes)
            ? state.nodes.find(function (n) { return n.id === nodeId; })
            : null;
        if (node && node.title) {
            base = node.title;
        }
    }

    // 둘 다 없으면 기본 문구 사용
    if (!base) {
        base = '이 순간';
    }

    return callAiHelperApi('comment', { prompt: base, nodeTitle: base }).then(function (result) {
        if (Array.isArray(result) && result.length > 0) {
            aiCommentSuggestions = result;
            renderAiCommentPreview();
            return;
        }
        aiCommentSuggestions = createAiCommentSuggestions(base);
        renderAiCommentPreview();
    }).catch(function () {
        aiCommentSuggestions = createAiCommentSuggestions(base);
        renderAiCommentPreview();
    });
}

// createAiCommentSuggestions moved to src/editor-ai-logic.js


// AI Comment & Moment helper functions moved to src/editor-ai-logic.js and src/editor-ai-ui.js


function callAiHelperApi(mode, payload, options) {
    return new Promise(function (resolve, reject) {
        try {
            // Netlify Functions 엔드포인트를 기본으로 사용
            const hasOverride = (typeof window !== 'undefined' && window.RELOVETREE_AI_ENDPOINT);
            const localEndpoint = (typeof window !== 'undefined')
                ? new URL('/.netlify/functions/ai-helper', window.location.origin).toString()
                : '/.netlify/functions/ai-helper';
            const fallbackEndpoint = 'https://lovetree.limone.dev/.netlify/functions/ai-helper';
            const endpoint = hasOverride ? window.RELOVETREE_AI_ENDPOINT : localEndpoint;

            const fetchJson = function (url) {
                return fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: mode, payload: payload }),
                    signal: options && options.signal ? options.signal : undefined
                }).then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                });
            };

            fetchJson(endpoint)
                .catch(function (err) {
                    if (err && err.name === 'AbortError') throw err;
                    if (hasOverride) throw err;
                    if (endpoint !== localEndpoint) throw err;
                    return fetchJson(fallbackEndpoint);
                })
                .then(function (data) {
                    if (data && data.result !== undefined) {
                        resolve(data.result);
                    } else {
                        resolve(data);
                    }
                })
                .catch(function (err) {
                    reject(err);
                });
        } catch (e) {
            reject(e);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('ai-helper-form');
    if (form) {
        form.addEventListener('submit', onAiHelperSubmit);
    }
});
