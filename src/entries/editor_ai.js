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
        resultEl.innerHTML = '<div class="editor-loading-state">' +
            '<div class="editor-loading-spinner"></div>' +
            '<p id="ai-loading-msg" class="editor-loading-copy">' + loadingMessages[0] + '</p>' +
            '<p id="ai-loading-stage" class="editor-loading-subcopy">요청을 준비하고 있습니다...</p>' +
            '<p id="ai-loading-eta" class="editor-loading-subcopy"></p>' +
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

// Tree skeleton/draft apply actions moved to src/editor-ai-actions.js

function runAiNodeHelper(requestSeq) {
    const box = document.getElementById('ai-result');
    const promptEl = document.getElementById('ai-node-prompt');

    if (typeof state === 'undefined' || !state || !Array.isArray(state.nodes)) {
        if (box) box.innerHTML = '<p class="editor-empty-copy">먼저 편집할 노드를 선택해 주세요.</p>';
        return Promise.resolve();
    }

    const node = state.nodes.find(function (n) { return n.id === state.activeNodeId; });
    if (!node) {
        if (box) box.innerHTML = '<p class="editor-empty-copy">먼저 편집할 노드를 선택해 주세요.</p>';
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
            box.innerHTML = '<p class="editor-empty-copy">AI가 이 노드를 분석하고 있습니다...</p>';
        }
    }

    const signal = aiHelperAbortController ? aiHelperAbortController.signal : undefined;
    return callAiHelperApi('node_edit', payload, { signal: signal }).then(function (result) {
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        if (!result) {
            if (box) box.innerHTML = '<p class="editor-empty-copy">AI 응답을 가져오지 못했습니다. 다시 시도해 주세요.</p>';
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
                    box.innerHTML = '<div class="editor-ai-response-copy">' + safe + '</div>';
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
            box.innerHTML = '<div class="editor-ai-center-state">'
                + '<p class="editor-ai-center-copy">AI 응답 중 오류가 발생했습니다.</p>'
                + '<div class="editor-ai-center-actions">'
                + '<button type="button" onclick="retryAiHelper()" class="editor-ai-tag-btn editor-ai-tag-btn-brand">재시도</button>'
                + '<button type="button" onclick="closeAiHelper()" class="editor-ai-tag-btn editor-ai-tag-btn-ghost">닫기</button>'
                + '</div>'
                + '</div>';
        }
    });
}

// Node apply/drag-drop actions moved to src/editor-ai-actions.js

function runAiQaHelper(requestSeq) {
    const promptEl = document.getElementById('ai-comment-prompt');
    const box = document.getElementById('ai-result');
    if (!promptEl || !box) return Promise.resolve();

    const userPrompt = promptEl.value.trim();
    if (!userPrompt) {
        box.innerHTML = '<p class="editor-empty-copy">궁금한 내용을 먼저 적어주세요.</p>';
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

    box.innerHTML = '<p class="editor-empty-copy">AI가 답변을 준비하고 있습니다...</p>';

    const signal = aiHelperAbortController ? aiHelperAbortController.signal : undefined;
    return callAiHelperApi('qa', { prompt: userPrompt, context: context }, { signal: signal }).then(function (result) {
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        if (!result) {
            box.innerHTML = '<p class="editor-empty-copy">답변을 가져오지 못했습니다. 다시 시도해 주세요.</p>';
            return;
        }
        const safe = escapeHtmlForAi(String(result)).replace(/\n/g, '<br>');
        box.innerHTML = '<div class="editor-ai-response-copy">' + safe + '</div>';
    }).catch(function (err) {
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        if (err && err.name === 'AbortError') return;
        box.innerHTML = '<div class="editor-ai-center-state">'
            + '<p class="editor-ai-center-copy">AI 답변 중 오류가 발생했습니다.</p>'
            + '<div class="editor-ai-center-actions">'
            + '<button type="button" onclick="retryAiHelper()" class="editor-ai-tag-btn editor-ai-tag-btn-brand">재시도</button>'
            + '<button type="button" onclick="closeAiHelper()" class="editor-ai-tag-btn editor-ai-tag-btn-ghost">닫기</button>'
            + '</div>'
            + '</div>';
    });
}

// Comment apply/API client moved to src/editor-ai-actions.js

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('ai-helper-form');
    if (form) {
        form.addEventListener('submit', onAiHelperSubmit);
    }
});
