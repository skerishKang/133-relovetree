let aiHelperMode = 'tree';
let aiTreeSuggestions = [];
let aiCommentSuggestions = [];
let aiHelperLoading = false;
let momentAiSuggestions = [];
let commentAiSuggestions = [];

function openAiHelper() {
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
    const resultEl = document.getElementById('ai-result');
    if (resultEl) resultEl.innerHTML = '';
    setAiHelperMode('tree');
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
    if (mode !== 'tree' && mode !== 'qa') return;
    aiHelperMode = mode;
    const treeBtn = document.getElementById('ai-mode-tree-btn');
    const commentBtn = document.getElementById('ai-mode-comment-btn');
    const treePanel = document.getElementById('ai-tree-panel');
    const commentPanel = document.getElementById('ai-comment-panel');
    if (treeBtn && commentBtn) {
        if (mode === 'tree') {
            treeBtn.classList.add('bg-slate-900', 'text-white');
            treeBtn.classList.remove('bg-slate-100', 'text-slate-600');
            commentBtn.classList.remove('bg-slate-900', 'text-white');
            commentBtn.classList.add('bg-slate-100', 'text-slate-600');
        } else {
            commentBtn.classList.add('bg-slate-900', 'text-white');
            commentBtn.classList.remove('bg-slate-100', 'text-slate-600');
            treeBtn.classList.remove('bg-slate-900', 'text-white');
            treeBtn.classList.add('bg-slate-100', 'text-slate-600');
        }
    }
    if (treePanel && commentPanel) {
        if (mode === 'tree') {
            treePanel.classList.remove('hidden');
            commentPanel.classList.add('hidden');
        } else {
            commentPanel.classList.remove('hidden');
            treePanel.classList.add('hidden');
        }
    }
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
    if (typeof showToast === 'function') {
        showToast('AI가 제안을 생성 중입니다...');
    }

    const runner = aiHelperMode === 'tree' ? runAiTreeHelper : runAiQaHelper;
    Promise.resolve()
        .then(() => runner())
        .finally(() => {
            setAiHelperLoading(false);
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
                return {
                    title: item.title || '새 순간',
                    date: item.date || new Date().toISOString().split('T')[0],
                    videoId: '',
                    description: item.description || ''
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
            description: ''
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
        return '<div class="border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-start justify-between gap-3">' +
            '<div class="flex-1 min-w-0">' +
            '<p class="text-xs font-semibold text-slate-500">순간 ' + (index + 1) + '</p>' +
            '<p class="text-sm font-bold text-slate-900 truncate">' + escapeHtmlForAi(item.title) + '</p>' +
            '<p class="text-[11px] text-slate-500 mt-0.5">' + item.date + '</p>' +
            '</div>' +
            '</div>';
    }).join('');
    const applyButton = '<button type="button" onclick="applyAiTreeSkeleton()" class="w-full mt-2 px-3 py-2 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600">현재 트리에 적용</button>';
    box.innerHTML = items + applyButton;
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
        newNodes.push({
            id: id,
            x: centerX + index * gapX,
            y: baseY,
            title: item.title,
            date: item.date,
            videoId: item.videoId,
            moments: []
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
            // 기본은 Netlify Functions 엔드포인트
            const endpoint = (typeof window !== 'undefined' && window.RELOVETREE_AI_ENDPOINT)
                ? window.RELOVETREE_AI_ENDPOINT
                : '/.netlify/functions/ai-helper';
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
