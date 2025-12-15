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

// YouTube Data API v3 설정
const YOUTUBE_API_KEY = '';

/**
 * YouTube에서 영상을 검색하고 첫 번째 결과의 videoId를 반환
 * @param {string} query - 검색어
 * @returns {Promise<{videoId: string, title: string, description: string} | null>}
 */
async function searchYouTubeVideo(query) {
    if (!query || !YOUTUBE_API_KEY) return null;

    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('q', query);
        url.searchParams.set('type', 'video');
        url.searchParams.set('maxResults', '1');
        url.searchParams.set('key', YOUTUBE_API_KEY);

        const response = await fetch(url.toString());
        if (!response.ok) {
            console.warn('[YouTube API] Search failed:', response.status);
            return null;
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            return {
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description
            };
        }
        return null;
    } catch (error) {
        console.error('[YouTube API] Error:', error);
        return null;
    }
}

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

function prepareNodeAiContext(node) {
    const ctxEl = document.getElementById('ai-node-context');
    if (ctxEl) {
        const videoLabel = node.videoId ? `YouTube: https://youtu.be/${node.videoId}` : 'YouTube 영상 없음';
        const momentsCount = Array.isArray(node.moments) ? node.moments.length : 0;
        ctxEl.textContent = `${node.title || ''} · ${node.date || ''} · ${videoLabel} · 순간 ${momentsCount}개`;
    }

    const promptEl = document.getElementById('ai-node-prompt');
    if (promptEl && !promptEl.value.trim()) {
        promptEl.value = '이 노드의 제목과 설명을 더 자연스럽고 감성적으로 다듬어줘.';
    }
}

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

function getAiHelperEstimateKey(mode, count) {
    const safeMode = mode || 'unknown';
    const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
    return 'ai_estimate_' + safeMode + '_' + safeCount;
}

function readAiHelperEstimateMs(mode, count) {
    try {
        const raw = localStorage.getItem(getAiHelperEstimateKey(mode, count));
        const n = raw ? parseInt(raw, 10) : NaN;
        return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (e) {
        return 0;
    }
}

function writeAiHelperEstimateMs(mode, count, durationMs) {
    if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) return;
    try {
        const prev = readAiHelperEstimateMs(mode, count);
        const next = prev ? Math.round(prev * 0.7 + durationMs * 0.3) : Math.round(durationMs);
        localStorage.setItem(getAiHelperEstimateKey(mode, count), String(next));
    } catch (e) {
    }
}

function calcAiHelperDefaultEstimateMs(mode, count) {
    const c = Number.isFinite(count) && count > 0 ? count : 4;
    if (mode === 'tree') {
        return 8000 + c * 12000;
    }
    if (mode === 'node') {
        return 7000 + 15000;
    }
    if (mode === 'qa') {
        return 6000 + 6000;
    }
    return 15000;
}

function getAiHelperEstimateMs(mode, count) {
    const saved = readAiHelperEstimateMs(mode, count);
    return saved || calcAiHelperDefaultEstimateMs(mode, count);
}

function formatSeconds(sec) {
    const s = Math.max(0, Math.round(sec || 0));
    if (s < 60) return s + '초';
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + '분 ' + r + '초';
}

function setAiHelperProgressStage(stageText) {
    const stageEl = document.getElementById('ai-loading-stage');
    if (stageEl) stageEl.textContent = stageText || '';
}

function updateAiHelperEtaUi() {
    const etaEl = document.getElementById('ai-loading-eta');
    if (!etaEl) return;
    const startedAt = aiHelperStartedAt || 0;
    const totalMs = aiHelperEstimatedTotalMs || 0;
    if (!startedAt || !totalMs) {
        etaEl.textContent = '';
        return;
    }
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    etaEl.textContent = '경과 ' + formatSeconds(elapsedMs / 1000) + ' · 예상 남은 ' + formatSeconds(remainingMs / 1000);
}

function startAiHelperProgress(mode, count) {
    aiHelperProgressMode = mode || '';
    aiHelperProgressCount = Number.isFinite(count) && count > 0 ? count : 0;
    aiHelperStartedAt = Date.now();
    aiHelperEstimatedTotalMs = getAiHelperEstimateMs(aiHelperProgressMode, aiHelperProgressCount);
    if (aiHelperProgressTimer) {
        clearInterval(aiHelperProgressTimer);
        aiHelperProgressTimer = null;
    }
    updateAiHelperEtaUi();
    aiHelperProgressTimer = setInterval(function () {
        if (!aiHelperLoading) return;
        updateAiHelperEtaUi();
    }, 1000);
}

function stopAiHelperProgress(success) {
    if (aiHelperProgressTimer) {
        clearInterval(aiHelperProgressTimer);
        aiHelperProgressTimer = null;
    }
    if (success && aiHelperStartedAt) {
        const durationMs = Date.now() - aiHelperStartedAt;
        writeAiHelperEstimateMs(aiHelperProgressMode, aiHelperProgressCount, durationMs);
    }
    aiHelperStartedAt = 0;
    aiHelperEstimatedTotalMs = 0;
    aiHelperProgressMode = '';
    aiHelperProgressCount = 0;
}

function retryAiHelper() {
    if (aiHelperLoading) return;
    onAiHelperSubmit({ preventDefault: function () { } });
}

function onAiHelperCancel() {
    if (aiHelperLoading) {
        aiHelperActiveRequestSeq = 0;
        if (aiHelperAbortController) {
            try {
                aiHelperAbortController.abort();
            } catch (e) {
            }
        }
        aiHelperAbortController = null;
        clearAiHelperLoadingInterval();
        stopAiHelperProgress(false);
        setAiHelperLoading(false);

        const box = document.getElementById('ai-result');
        if (box) {
            box.innerHTML = '<div class="flex flex-col items-center py-8 gap-3">'
                + '<p class="text-xs text-slate-500">요청이 취소되었습니다.</p>'
                + '<div class="flex gap-2">'
                + '<button type="button" onclick="retryAiHelper()" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600">재시도</button>'
                + '<button type="button" onclick="closeAiHelper()" class="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100">닫기</button>'
                + '</div>'
                + '</div>';
        }
        return;
    }
    closeAiHelper();
}

function setAiHelperMode(mode) {
    if (mode !== 'tree' && mode !== 'qa' && mode !== 'node') return;
    const prevMode = aiHelperMode;
    aiHelperMode = mode;
    const treeBtn = document.getElementById('ai-mode-tree-btn');
    const commentBtn = document.getElementById('ai-mode-comment-btn');
    const nodeBtn = document.getElementById('ai-mode-node-btn');
    const treePanel = document.getElementById('ai-tree-panel');
    const commentPanel = document.getElementById('ai-comment-panel');
    const nodePanel = document.getElementById('ai-node-panel');

    const allBtns = [treeBtn, commentBtn, nodeBtn].filter(Boolean);
    allBtns.forEach((btn) => {
        btn.classList.remove('bg-slate-900', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-600');
    });

    if (mode === 'tree' && treeBtn) {
        treeBtn.classList.add('bg-slate-900', 'text-white');
        treeBtn.classList.remove('bg-slate-100', 'text-slate-600');
    } else if (mode === 'qa' && commentBtn) {
        commentBtn.classList.add('bg-slate-900', 'text-white');
        commentBtn.classList.remove('bg-slate-100', 'text-slate-600');
    } else if (mode === 'node' && nodeBtn) {
        nodeBtn.classList.add('bg-slate-900', 'text-white');
        nodeBtn.classList.remove('bg-slate-100', 'text-slate-600');
    }

    const panels = [treePanel, commentPanel, nodePanel];
    panels.forEach((p) => {
        if (p) p.classList.add('hidden');
    });
    if (mode === 'tree' && treePanel) treePanel.classList.remove('hidden');
    if (mode === 'qa' && commentPanel) commentPanel.classList.remove('hidden');
    if (mode === 'node' && nodePanel) nodePanel.classList.remove('hidden');

    const resultEl = document.getElementById('ai-result');
    if (resultEl && prevMode !== mode) resultEl.innerHTML = '';
}

function setAiHelperLoading(isLoading) {
    aiHelperLoading = isLoading;
    const submitBtn = document.getElementById('ai-helper-submit');
    const cancelBtn = document.getElementById('ai-helper-cancel');

    if (submitBtn) {
        if (isLoading) {
            if (!submitBtn.dataset.originalText) {
                submitBtn.dataset.originalText = submitBtn.textContent || '생성';
            }
            submitBtn.textContent = '생성 중...';
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-60', 'cursor-not-allowed');
        } else {
            submitBtn.textContent = submitBtn.dataset.originalText || '생성';
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-60', 'cursor-not-allowed');
        }
    }

    if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.textContent = isLoading ? '취소' : '닫기';
        cancelBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
}

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
    setAiHelperProgressStage('AI가 타임라인을 구성하고 있습니다...');
    return callAiHelperApi('tree', { prompt, count }, { signal: signal }).then(async function (result) {
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        if (Array.isArray(result)) {
            setAiHelperProgressStage('결과를 정리하고 있습니다...');
            const suggestions = result.map(function (item) {
                const title = item && item.title ? item.title : '새 순간';
                const date = item && item.date ? item.date : new Date().toISOString().split('T')[0];

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
                        .filter(function (m) {
                            return m.text && m.text.trim().length > 0;
                        });
                }

                const description = item && item.description ? item.description : '';

                if ((!moments || moments.length === 0) && description) {
                    moments = [{ time: '0:00', text: description, feeling: 'love' }];
                }

                return {
                    title: title,
                    date: date,
                    videoId: videoId,
                    description: description,
                    moments: moments
                };
            });
            if (aiHelperActiveRequestSeq !== requestSeq) return;
            aiTreeSuggestions = suggestions;
            renderAiTreePreview();
            return;
        }
        // 응답 형식이 예상과 다르면 더미 로직으로 폴백 (YouTube 검색 포함)
        setAiHelperProgressStage('대체 생성 로직으로 전환했습니다...');
        const skeleton = await createAiTreeSkeleton(prompt, count);
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        aiTreeSuggestions = skeleton;
        renderAiTreePreview();
    }).catch(async function (err) {
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        if (err && err.name === 'AbortError') return;
        // 에러 시에도 안전하게 폴백 (YouTube 검색 포함)
        setAiHelperProgressStage('오류가 발생해 대체 생성 로직으로 전환했습니다...');
        const skeleton = await createAiTreeSkeleton(prompt, count);
        if (aiHelperActiveRequestSeq !== requestSeq) return;
        aiTreeSuggestions = skeleton;
        renderAiTreePreview();
    });
}

async function createAiTreeSkeleton(prompt, count) {
    const list = [];
    const titleEl = document.getElementById('tree-title');
    let base = '';
    if (prompt) base = prompt;
    else if (titleEl && titleEl.innerText) base = titleEl.innerText;
    else base = '새 러브트리';

    const now = new Date();

    // 먼저 기본 노드 구조 생성
    for (let i = 0; i < count; i++) {
        const d = new Date(now.getTime() - (count - 1 - i) * 7 * 24 * 60 * 60 * 1000);
        const date = d.toISOString().split('T')[0];
        const suffix = i + 1;
        const nodeTitle = base + ' - 순간 ' + suffix;
        list.push({
            title: nodeTitle,
            date: date,
            videoId: '',
            description: '',
            moments: [],
            _searchQuery: base + ' 무대' // YouTube 검색용 쿼리
        });
    }

    // YouTube 검색 수행 (병렬로)
    const loadingMsgEl = document.getElementById('ai-loading-msg');
    if (loadingMsgEl) {
        loadingMsgEl.textContent = 'YouTube에서 관련 영상을 검색 중...';
    }

    try {
        // 각 노드에 대해 YouTube 검색 (첫 번째 노드만 검색하여 API 할당량 절약)
        const searchQuery = base + ' 무대 공연';
        console.log('[AI] Searching YouTube for:', searchQuery);

        const result = await searchYouTubeVideo(searchQuery);
        if (result && result.videoId) {
            // 첫 번째 노드에 영상 적용
            list[0].videoId = result.videoId;
            list[0].description = result.description ? result.description.substring(0, 100) : '';
            console.log('[AI] Found video:', result.videoId);
        }
    } catch (error) {
        console.warn('[AI] YouTube search failed:', error);
    }

    // 검색 쿼리 필드 제거
    list.forEach(item => delete item._searchQuery);

    return list;
}

function renderAiTreePreview() {
    const box = document.getElementById('ai-result');
    if (!box) return;
    if (!aiTreeSuggestions || aiTreeSuggestions.length === 0) {
        box.innerHTML = '<p class="text-xs text-slate-400">생성된 노드가 없습니다. 프롬프트를 입력해 보세요.</p>';
        return;
    }

    const items = aiTreeSuggestions.map(function (item, index) {
        const safeTitle = escapeHtmlForAi(item.title);
        const safeDate = item.date || '';

        const hasVideo = !!(item && item.videoId);
        const videoText = hasVideo ? ('YouTube: ' + escapeHtmlForAi(item.videoId)) : 'YouTube 없음';
        const descText = item && item.description ? String(item.description) : '';
        const safeDesc = escapeHtmlForAi(descText);
        const momentsCount = Array.isArray(item && item.moments) ? item.moments.length : 0;

        return '' +
            '<div class="border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-start justify-between gap-3">' +
            '  <div class="flex-1 min-w-0 space-y-1">' +
            '    <div class="flex items-center justify-between gap-2">' +
            '      <p class="text-xs font-semibold text-slate-500">순간 ' + (index + 1) + '</p>' +
            '      <div class="flex items-center gap-2">' +
            '        <button type="button" onclick="openAiTreeSuggestionEditor(' + index + ')" class="text-[10px] text-slate-500 hover:text-brand-600">상세편집</button>' +
            '        <button type="button" onclick="removeAiTreeSuggestion(' + index + ')" class="text-[10px] text-slate-400 hover:text-red-500">삭제</button>' +
            '      </div>' +
            '    </div>' +
            '    <input type="text" class="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"' +
            '      value="' + safeTitle + '"' +
            '      oninput="updateAiTreeSuggestion(' + index + ', \'title\', this.value)">' +
            '    <input type="date" class="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"' +
            '      value="' + safeDate + '"' +
            '      oninput="updateAiTreeSuggestion(' + index + ', \'date\', this.value)">' +
            '    <p class="text-[11px] text-slate-500 truncate">' + videoText + ' · 모먼트 ' + momentsCount + '개</p>' +
            (safeDesc ? ('    <p class="text-[11px] text-slate-600 line-clamp-2">' + safeDesc + '</p>') : '') +
            '  </div>' +
            '</div>';
    }).join('');
    const helperText = '<p class="mt-2 text-[11px] text-slate-400">각 카드에서 상세 편집(영상/설명/모먼트)을 확인한 뒤 적용하세요.</p>';
    const applyButton = '<button type="button" onclick="applyAiTreeSkeleton()" class="w-full mt-3 px-3 py-2 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600">현재 트리에 적용</button>';
    box.innerHTML = items + helperText + applyButton;
}

function openAiTreeSuggestionEditor(index) {
    if (!aiTreeSuggestions || index < 0 || index >= aiTreeSuggestions.length) return;

    const item = aiTreeSuggestions[index] || {};
    const draft = {
        title: item.title || '새 순간',
        date: item.date || '',
        videoId: item.videoId || '',
        description: item.description || '',
        moments: Array.isArray(item.moments)
            ? item.moments.map(function (m) {
                return {
                    time: m && m.time ? m.time : '0:00',
                    text: m && m.text ? m.text : '',
                    feeling: m && m.feeling ? m.feeling : 'love'
                };
            })
            : []
    };

    aiTreeDraftIndex = index;
    aiTreeDraftNode = draft;

    if (typeof closeAiHelper === 'function') {
        closeAiHelper();
    }

    if (typeof openDetailModalForAiTreeSuggestion === 'function') {
        openDetailModalForAiTreeSuggestion(index, draft);
        return;
    }

    aiTreeEditIndex = index;
    renderAiTreeSuggestionEditor();
}

function updateAiTreeSuggestionFromDraft(index, draft) {
    if (!aiTreeSuggestions || index < 0 || index >= aiTreeSuggestions.length) return;
    const item = aiTreeSuggestions[index];
    if (!item || !draft) return;

    item.title = draft.title || item.title;
    item.date = draft.date || item.date;
    item.videoId = draft.videoId || '';
    item.description = draft.description || '';
    item.moments = Array.isArray(draft.moments) ? draft.moments : [];

    if ((!item.moments || item.moments.length === 0) && item.description) {
        item.moments = [{ time: '0:00', text: item.description, feeling: 'love' }];
    }
}

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

function escapeHtmlForAi(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function (ch) {
        if (ch === '&') return '&amp;';
        if (ch === '<') return '&lt;';
        if (ch === '>') return '&gt;';
        if (ch === '"') return '&quot;';
        if (ch === "'") return '&#39;';
        return ch;
    });
}

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

function renderNodeAiSuggestion(node, suggestion) {
    const box = document.getElementById('ai-result');
    if (!box) return;
    if (!suggestion || typeof suggestion !== 'object') {
        box.innerHTML = '<p class="text-xs text-slate-400">적용할 수 있는 제안이 없습니다.</p>';
        return;
    }

    const newTitle = suggestion.title || node.title || '';
    const newDate = suggestion.date || node.date || '';
    const newDescription = suggestion.description || node.description || '';

    let suggestedUrl = '';
    if (typeof suggestion.youtubeUrl === 'string' && suggestion.youtubeUrl.trim()) {
        suggestedUrl = suggestion.youtubeUrl.trim();
    } else if (typeof suggestion.videoId === 'string' && suggestion.videoId) {
        suggestedUrl = 'https://youtu.be/' + suggestion.videoId;
    } else if (node.videoId) {
        suggestedUrl = 'https://youtu.be/' + node.videoId;
    }

    const html = [
        '<div class="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-3">',
        '  <p class="text-[11px] text-slate-500">AI 제안은 적용 전에 직접 수정할 수 있어요.</p>',
        '  <div class="space-y-2">',
        '    <div>',
        '      <label class="block text-[11px] font-bold text-slate-500 mb-1">제목</label>',
        '      <input id="ai-node-edit-title" type="text" class="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500" value="' + escapeHtmlForAi(newTitle) + '">',
        '    </div>',
        '    <div class="grid grid-cols-2 gap-2">',
        '      <div>',
        '        <label class="block text-[11px] font-bold text-slate-500 mb-1">날짜</label>',
        '        <input id="ai-node-edit-date" type="date" class="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500" value="' + escapeHtmlForAi(newDate) + '">',
        '      </div>',
        '      <div>',
        '        <label class="block text-[11px] font-bold text-slate-500 mb-1">유튜브 URL</label>',
        '        <input id="ai-node-edit-video" type="text" class="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500" value="' + escapeHtmlForAi(suggestedUrl) + '" oninput="updateAiNodeVideoPreview()">',
        '        <p id="ai-node-edit-video-error" class="hidden mt-1 text-[11px] text-red-500"></p>',
        '      </div>',
        '    </div>',
        '    <div id="ai-node-edit-video-preview" class="hidden p-2 rounded-lg border border-slate-200 bg-white">',
        '      <div class="flex gap-3 items-start">',
        '        <img id="ai-node-edit-video-thumb" src="" alt="YouTube Thumbnail" class="w-24 h-14 rounded-md border border-slate-200 object-cover bg-slate-100">',
        '        <div class="flex-1 min-w-0">',
        '          <p id="ai-node-edit-video-preview-text" class="text-[11px] text-slate-600 truncate"></p>',
        '          <a id="ai-node-edit-video-preview-link" href="#" target="_blank" class="text-[11px] text-brand-600 hover:underline">YouTube에서 열기</a>',
        '        </div>',
        '        <button type="button" onclick="clearAiNodeVideoInput()" class="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100">제거</button>',
        '      </div>',
        '    </div>',
        '    <div>',
        '      <div class="flex gap-2">',
        '        <input type="text" id="ai-node-edit-video-search" placeholder="키워드로 영상 검색" class="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-500">',
        '        <button type="button" onclick="searchYouTubeForAiNodeEdit()" class="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 text-white hover:bg-slate-900">검색</button>',
        '      </div>',
        '      <div id="ai-node-edit-video-search-result" class="mt-2 space-y-1"></div>',
        '    </div>',
        '    <div>',
        '      <label class="block text-[11px] font-bold text-slate-500 mb-1">설명</label>',
        '      <textarea id="ai-node-edit-description" rows="3" class="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500">' + escapeHtmlForAi(newDescription) + '</textarea>',
        '    </div>',
        '  </div>',
        '  <div class="flex justify-end gap-2">',
        '    <button type="button" class="px-3 py-1.5 rounded-xl text-[11px] text-slate-500 hover:bg-slate-100" onclick="closeAiHelper()">취소</button>',
        '    <button type="button" class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-brand-500 text-white hover:bg-brand-600" onclick="applyAiNodeSuggestion()">적용</button>',
        '  </div>',
        '</div>'
    ].join('');

    box.innerHTML = html;
    if (typeof updateAiNodeVideoPreview === 'function') {
        updateAiNodeVideoPreview();
    }
}

function clearAiNodeVideoInput() {
    const input = document.getElementById('ai-node-edit-video');
    if (input) input.value = '';
    if (typeof updateAiNodeVideoPreview === 'function') {
        updateAiNodeVideoPreview();
    }
}

function updateAiNodeVideoPreview() {
    const input = document.getElementById('ai-node-edit-video');
    const errorEl = document.getElementById('ai-node-edit-video-error');
    const preview = document.getElementById('ai-node-edit-video-preview');
    const thumb = document.getElementById('ai-node-edit-video-thumb');
    const textEl = document.getElementById('ai-node-edit-video-preview-text');
    const linkEl = document.getElementById('ai-node-edit-video-preview-link');

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

function renderAiNodeYouTubeSearchResults(list) {
    const box = document.getElementById('ai-node-edit-video-search-result');
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
            const input = document.getElementById('ai-node-edit-video');
            if (input) input.value = `https://youtu.be/${item.videoId}`;
            if (typeof updateAiNodeVideoPreview === 'function') {
                updateAiNodeVideoPreview();
            }
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

function searchYouTubeForAiNodeEdit() {
    const input = document.getElementById('ai-node-edit-video-search');
    const box = document.getElementById('ai-node-edit-video-search-result');
    const titleEl = document.getElementById('ai-node-edit-title');
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
            renderAiNodeYouTubeSearchResults(result);
        })
        .catch(function () {
            box.innerHTML = '<p class="text-[11px] text-slate-400">검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>';
        });
}

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

function createAiCommentSuggestions(base) {
    const list = [];
    list.push(base + '이(가) 진짜 인생 순간이다. 다시 봐도 소름 돋는다.');
    list.push(base + '을(를) 볼 때마다 처음 입덕했을 때 느낌이 그대로 난다.');
    list.push('이 장면에서 분위기가 최고조에 올라간다. 현장에서 봤으면 울었을 것 같다.');
    return list;
}

function renderAiCommentPreview() {
    const box = document.getElementById('ai-result');
    if (!box) return;
    if (!aiCommentSuggestions || aiCommentSuggestions.length === 0) {
        box.innerHTML = '<p class="text-xs text-slate-400">추천 문장이 없습니다. 간단한 상황 설명을 적어 보세요.</p>';
        return;
    }
    const items = aiCommentSuggestions.map(function (text, index) {
        return '<button type="button" onclick="applyAiCommentSuggestion(' + index + ')" class="w-full text-left px-3 py-2 mb-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-800">' +
            escapeHtmlForAi(text) +
            '</button>';
    }).join('');
    box.innerHTML = items;
}

function applyAiCommentSuggestion(index) {
    if (!aiCommentSuggestions || index < 0 || index >= aiCommentSuggestions.length) return;
    const text = aiCommentSuggestions[index];
    const input = document.getElementById('new-moment-text');
    if (input) {
        input.value = text;
        const modal = document.getElementById('ai-helper-modal');
        if (modal) modal.close();
        if (typeof showToast === 'function') showToast('추천 문장이 입력되었습니다. 시간을 맞추고 등록을 눌러주세요.');
        return;
    }
    const commentInput = document.getElementById('new-comment-input');
    if (commentInput) {
        commentInput.value = text;
        const modal = document.getElementById('ai-helper-modal');
        if (modal) modal.close();
        if (typeof showToast === 'function') showToast('댓글 입력란에 추천 문장이 채워졌습니다. 전송을 눌러주세요.');
    }
}

function openMomentAiHelper() {
    const input = document.getElementById('new-moment-text');
    let base = '';

    if (input && input.value.trim()) {
        base = input.value.trim();
    } else if (typeof state !== 'undefined' && state && state.activeNodeId && Array.isArray(state.nodes)) {
        const node = state.nodes.find(function (n) { return n.id === state.activeNodeId; });
        if (node && node.title) {
            base = node.title;
        }
    }

    if (!base) {
        base = '이 순간';
    }

    const box = document.getElementById('moment-ai-result');
    if (box) {
        box.innerHTML = '<p class="text-xs text-slate-400">AI가 추천 문장을 생성 중입니다...</p>';
    }

    return callAiHelperApi('comment', { prompt: base, nodeTitle: base }).then(function (result) {
        if (Array.isArray(result) && result.length > 0) {
            momentAiSuggestions = result;
        } else {
            momentAiSuggestions = createAiCommentSuggestions(base);
        }
        renderMomentAiSuggestions();
    }).catch(function () {
        momentAiSuggestions = createAiCommentSuggestions(base);
        renderMomentAiSuggestions();
    });
}

function renderMomentAiSuggestions() {
    const box = document.getElementById('moment-ai-result');
    if (!box) return;
    if (!momentAiSuggestions || momentAiSuggestions.length === 0) {
        box.innerHTML = '<p class="text-xs text-slate-400">추천 문장이 없습니다. 간단한 상황 설명을 적어 보세요.</p>';
        return;
    }
    const items = momentAiSuggestions.map(function (text, index) {
        return '<button type="button" onclick="applyMomentAiSuggestion(' + index + ')" class="w-full text-left px-3 py-2 mb-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-800">' +
            escapeHtmlForAi(text) +
            '</button>';
    }).join('');
    box.innerHTML = items;
}

function applyMomentAiSuggestion(index) {
    if (!momentAiSuggestions || index < 0 || index >= momentAiSuggestions.length) return;
    const text = momentAiSuggestions[index];
    const input = document.getElementById('new-moment-text');
    if (!input) return;
    input.value = text;
    if (typeof showToast === 'function') {
        showToast('추천 문장이 입력되었습니다. 시간을 맞추고 등록을 눌러주세요.');
    }
}

function openCommentAiHelper() {
    const input = document.getElementById('new-comment-input');
    let base = '';

    if (input && input.value.trim()) {
        base = input.value.trim();
    } else if (typeof state !== 'undefined' && state && state.activeNodeId && Array.isArray(state.nodes)) {
        const node = state.nodes.find(function (n) { return n.id === state.activeNodeId; });
        if (node && node.title) {
            base = node.title;
        }
    }

    if (!base) {
        base = '이 순간';
    }

    const box = document.getElementById('comment-ai-result');
    if (box) {
        box.innerHTML = '<p class="text-xs text-slate-400">AI가 추천 문장을 생성 중입니다...</p>';
    }

    return callAiHelperApi('comment', { prompt: base, nodeTitle: base }).then(function (result) {
        if (Array.isArray(result) && result.length > 0) {
            commentAiSuggestions = result;
        } else {
            commentAiSuggestions = createAiCommentSuggestions(base);
        }
        renderCommentAiSuggestions();
    }).catch(function () {
        commentAiSuggestions = createAiCommentSuggestions(base);
        renderCommentAiSuggestions();
    });
}

function renderCommentAiSuggestions() {
    const box = document.getElementById('comment-ai-result');
    if (!box) return;
    if (!commentAiSuggestions || commentAiSuggestions.length === 0) {
        box.innerHTML = '<p class="text-xs text-slate-400">추천 문장이 없습니다. 간단한 상황 설명을 적어 보세요.</p>';
        return;
    }
    const items = commentAiSuggestions.map(function (text, index) {
        return '<button type="button" onclick="applyCommentAiSuggestion(' + index + ')" class="w-full text-left px-3 py-2 mb-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-800">' +
            escapeHtmlForAi(text) +
            '</button>';
    }).join('');
    box.innerHTML = items;
}

function applyCommentAiSuggestion(index) {
    if (!commentAiSuggestions || index < 0 || index >= commentAiSuggestions.length) return;
    const text = commentAiSuggestions[index];
    const input = document.getElementById('new-comment-input');
    if (!input) return;
    input.value = text;
    if (typeof showToast === 'function') {
        showToast('댓글 입력란에 추천 문장이 채워졌습니다. 전송을 눌러주세요.');
    }
}

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
