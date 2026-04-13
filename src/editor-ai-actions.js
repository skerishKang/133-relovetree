/**
 * Editor AI Actions
 * - Draft apply/save integration
 * - Tree/node suggestion apply helpers
 * - Drag/drop wiring
 * - AI helper API client
 */

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

function applyAiTreeSkeleton() {

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

function runAiCommentHelper() {
    const promptEl = document.getElementById('ai-comment-prompt');
    let base = '';

    if (promptEl && promptEl.value.trim()) {
        base = promptEl.value.trim();
    } else if (typeof state !== 'undefined' && state && state.activeNodeId) {
        const nodeId = state.activeNodeId;
        const node = Array.isArray(state.nodes)
            ? state.nodes.find(function (n) { return n.id === nodeId; })
            : null;
        if (node && node.title) {
            base = node.title;
        }
    }

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

function callAiHelperApi(mode, payload, options) {
    return new Promise(function (resolve, reject) {
        try {
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
