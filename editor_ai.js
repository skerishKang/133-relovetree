let aiHelperMode = 'tree';
let aiTreeSuggestions = [];
let aiCommentSuggestions = [];
let aiHelperLoading = false;
let momentAiSuggestions = [];
let commentAiSuggestions = [];
let aiNodeSuggestion = null;

function openAiHelper(initialMode) {
    const modal = document.getElementById('ai-helper-modal');
    if (!modal) return;

    const treePrompt = document.getElementById('ai-tree-prompt');
    const titleEl = document.getElementById('tree-title');
    if (treePrompt && titleEl && !treePrompt.value) {
        const base = titleEl.innerText || '';
        if (base) {
            treePrompt.value = base + ' 활동을 단계별로 정리해줘';
        }
    }

    const commentPrompt = document.getElementById('ai-comment-prompt');
    if (commentPrompt) commentPrompt.value = '';

    const nodePrompt = document.getElementById('ai-node-prompt');
    if (nodePrompt) nodePrompt.value = '';

    const ctxEl = document.getElementById('ai-node-context');
    if (ctxEl) ctxEl.textContent = '';

    const resultEl = document.getElementById('ai-result');
    if (resultEl) resultEl.innerHTML = '';

    setAiHelperMode(initialMode || 'tree');
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

function setAiHelperMode(mode) {
    if (mode !== 'tree' && mode !== 'qa' && mode !== 'node') return;
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
    if (resultEl) resultEl.innerHTML = '';
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
        cancelBtn.disabled = isLoading;
        if (isLoading) {
            cancelBtn.classList.add('opacity-60', 'cursor-not-allowed');
        } else {
            cancelBtn.classList.remove('opacity-60', 'cursor-not-allowed');
        }
    }
}

function onAiHelperSubmit(event) {
    event.preventDefault();
    if (aiHelperLoading) return;

    setAiHelperLoading(true);

    // 결과 영역에 진행 메시지 표시
    const resultEl = document.getElementById('ai-result');
    if (resultEl) {
        const loadingMessages = [
            'AI가 아티스트 정보를 검색하고 있습니다...',
            '관련 무대와 영상을 찾고 있습니다...',
            '타임라인을 구성하고 있습니다...'
        ];
        let msgIndex = 0;
        resultEl.innerHTML = '<div class="flex flex-col items-center py-8 gap-3">' +
            '<div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>' +
            '<p id="ai-loading-msg" class="text-xs text-slate-500">' + loadingMessages[0] + '</p>' +
            '</div>';

        // 메시지 순환 표시
        window._aiLoadingInterval = setInterval(function () {
            msgIndex = (msgIndex + 1) % loadingMessages.length;
            const msgEl = document.getElementById('ai-loading-msg');
            if (msgEl) {
                msgEl.textContent = loadingMessages[msgIndex];
            }
        }, 2000);
    }

    let runner = runAiTreeHelper;
    if (aiHelperMode === 'qa') {
        runner = runAiQaHelper;
    } else if (aiHelperMode === 'node') {
        runner = runAiNodeHelper;
    }
    Promise.resolve()
        .then(() => runner())
        .finally(() => {
            setAiHelperLoading(false);
            // 로딩 인터벌 정리
            if (window._aiLoadingInterval) {
                clearInterval(window._aiLoadingInterval);
                window._aiLoadingInterval = null;
            }
        });
}


function runAiTreeHelper() {
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
    return callAiHelperApi('tree', { prompt, count }).then(function (result) {
        if (Array.isArray(result)) {
            aiTreeSuggestions = result.map(function (item) {
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
            renderAiTreePreview();
            return;
        }
        // 응답 형식이 예상과 다르면 더미 로직으로 폴백
        aiTreeSuggestions = createAiTreeSkeleton(prompt, count);
        renderAiTreePreview();
    }).catch(function () {
        // 에러 시에도 안전하게 폴백
        aiTreeSuggestions = createAiTreeSkeleton(prompt, count);
        renderAiTreePreview();
    });
}

function createAiTreeSkeleton(prompt, count) {
    const list = [];
    const titleEl = document.getElementById('tree-title');
    let base = '';
    if (prompt) base = prompt;
    else if (titleEl && titleEl.innerText) base = titleEl.innerText;
    else base = '새 러브트리';
    const now = new Date();
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
            moments: []
        });
    }
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
        return '' +
            '<div class="border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-start justify-between gap-3">' +
            '  <div class="flex-1 min-w-0 space-y-1">' +
            '    <div class="flex items-center justify-between gap-2">' +
            '      <p class="text-xs font-semibold text-slate-500">순간 ' + (index + 1) + '</p>' +
            '      <button type="button" onclick="removeAiTreeSuggestion(' + index + ')" class="text-[10px] text-slate-400 hover:text-red-500">삭제</button>' +
            '    </div>' +
            '    <input type="text" class="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"' +
            '      value="' + safeTitle + '"' +
            '      oninput="updateAiTreeSuggestion(' + index + ', \'title\', this.value)">' +
            '    <input type="date" class="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"' +
            '      value="' + safeDate + '"' +
            '      oninput="updateAiTreeSuggestion(' + index + ', \'date\', this.value)">' +
            '  </div>' +
            '</div>';
    }).join('');
    const helperText = '<p class="mt-2 text-[11px] text-slate-400">각 순간의 제목과 날짜를 먼저 확인·수정한 뒤 아래 버튼을 눌러 현재 트리에 추가하세요.</p>';
    const applyButton = '<button type="button" onclick="applyAiTreeSkeleton()" class="w-full mt-3 px-3 py-2 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600">선택한 노드들을 현재 트리에 적용</button>';
    box.innerHTML = items + helperText + applyButton;
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
    if (typeof state === 'undefined' || !state || !Array.isArray(state.nodes)) return;
    if (typeof isReadOnly !== 'undefined' && isReadOnly) {
        if (typeof showToast === 'function') showToast('읽기 전용 모드에서는 사용할 수 없습니다.');
        return;
    }
    if (!aiTreeSuggestions || aiTreeSuggestions.length === 0) return;

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const ok = window.confirm('생성된 노드 ' + aiTreeSuggestions.length + '개를 현재 트리에 추가할까요? (나중에 언제든지 수정할 수 있습니다.)');
        if (!ok) return;
    }
    let maxId = 0;
    state.nodes.forEach(function (n) {
        if (typeof n.id === 'number' && n.id > maxId) maxId = n.id;
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

function runAiNodeHelper() {
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
        box.innerHTML = '<p class="text-xs text-slate-400">AI가 이 노드를 분석하고 있습니다...</p>';
    }

    return callAiHelperApi('node_edit', payload).then(function (result) {
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
    }).catch(function () {
        if (box) box.innerHTML = '<p class="text-xs text-slate-400">AI 응답 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>';
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

    let hasVideo = !!node.videoId;
    let videoId = node.videoId || '';
    if (!videoId && typeof suggestion.videoId === 'string' && suggestion.videoId) {
        videoId = suggestion.videoId;
        hasVideo = true;
    } else if (!videoId && typeof suggestion.youtubeUrl === 'string' && suggestion.youtubeUrl && typeof parseYouTubeId === 'function') {
        const parsed = parseYouTubeId(suggestion.youtubeUrl);
        if (parsed) {
            videoId = parsed;
            hasVideo = true;
        }
    }

    const videoLabel = hasVideo ? 'YouTube 연결됨' : 'YouTube 없음';

    const html = [
        '<div class="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-2">',
        '  <p class="text-[11px] text-slate-500 mb-1">AI가 제안한 수정안입니다. 적용 버튼을 누르면 현재 노드에 반영됩니다.</p>',
        '  <div class="grid grid-cols-2 gap-2 text-[11px]">',
        '    <div>',
        '      <p class="font-semibold text-slate-500 mb-1">현재 노드</p>',
        '      <p class="text-slate-800 line-clamp-2">제목: ' + escapeHtmlForAi(node.title || '') + '</p>',
        '      <p class="text-slate-500">날짜: ' + escapeHtmlForAi(node.date || '') + '</p>',
        '      <p class="text-slate-500">영상: ' + (node.videoId ? '연결됨' : '없음') + '</p>',
        '    </div>',
        '    <div>',
        '      <p class="font-semibold text-slate-500 mb-1">AI 제안</p>',
        '      <p class="text-slate-800 line-clamp-2">제목: ' + escapeHtmlForAi(newTitle) + '</p>',
        '      <p class="text-slate-500">날짜: ' + escapeHtmlForAi(newDate) + '</p>',
        '      <p class="text-slate-500">영상: ' + videoLabel + '</p>',
        '    </div>',
        '  </div>',
        newDescription
            ? '  <div class="mt-2 p-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700"><p class="font-semibold mb-1">설명 제안</p><p>' + escapeHtmlForAi(newDescription) + '</p></div>'
            : '',
        '  <div class="mt-2 flex justify-end gap-2">',
        '    <button type="button" class="px-3 py-1.5 rounded-xl text-[11px] text-slate-500 hover:bg-slate-100" onclick="closeAiHelper()">취소</button>',
        '    <button type="button" class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-brand-500 text-white hover:bg-brand-600" onclick="applyAiNodeSuggestion()">이대로 적용</button>',
        '  </div>',
        '</div>'
    ].join('');

    box.innerHTML = html;
}

function applyAiNodeSuggestion() {
    if (!aiNodeSuggestion || typeof state === 'undefined' || !state || !Array.isArray(state.nodes)) return;
    const node = state.nodes.find(function (n) { return n.id === state.activeNodeId; });
    if (!node) return;

    const suggestion = aiNodeSuggestion;

    if (suggestion.title) node.title = suggestion.title;
    if (suggestion.date) node.date = suggestion.date;

    let videoId = node.videoId || '';
    if (typeof suggestion.videoId === 'string' && suggestion.videoId) {
        videoId = suggestion.videoId;
    } else if (!videoId && typeof suggestion.youtubeUrl === 'string' && suggestion.youtubeUrl && typeof parseYouTubeId === 'function') {
        const parsed = parseYouTubeId(suggestion.youtubeUrl);
        if (parsed) videoId = parsed;
    }
    if (videoId) node.videoId = videoId;

    if (typeof suggestion.description === 'string') {
        node.description = suggestion.description;
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

function runAiQaHelper() {
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

    return callAiHelperApi('qa', { prompt: userPrompt, context: context }).then(function (result) {
        if (!result) {
            box.innerHTML = '<p class="text-xs text-slate-400">답변을 가져오지 못했습니다. 다시 시도해 주세요.</p>';
            return;
        }
        const safe = escapeHtmlForAi(String(result)).replace(/\n/g, '<br>');
        box.innerHTML = '<div class="text-xs leading-relaxed text-slate-800">' + safe + '</div>';
    }).catch(function () {
        box.innerHTML = '<p class="text-xs text-slate-400">AI 답변 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>';
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

function callAiHelperApi(mode, payload) {
    return new Promise(function (resolve, reject) {
        try {
            // Netlify Functions 엔드포인트를 기본으로 사용
            const endpoint = (typeof window !== 'undefined' && window.RELOVETREE_AI_ENDPOINT)
                ? window.RELOVETREE_AI_ENDPOINT
                : 'https://lovetree.limone.dev/.netlify/functions/ai-helper';
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: mode, payload: payload })
            }).then(function (res) {
                if (!res.ok) {
                    reject(new Error('HTTP ' + res.status));
                    return;
                }
                return res.json();
            }).then(function (data) {
                if (!data) {
                    reject(new Error('Empty response'));
                    return;
                }
                resolve(data.result);
            }).catch(function (err) {
                console.error('AI helper fetch error:', err);
                reject(err);
            });
        } catch (e) {
            console.error('AI helper error:', e);
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
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('ai-helper-form');
    if (form) {
        form.addEventListener('submit', onAiHelperSubmit);
    }
});
