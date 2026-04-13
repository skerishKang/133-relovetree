/**
 * Editor AI Logic
 * - Data preparation & context building
 * - AI response processing & normalization
 * - Skeleton & Suggestion generation
 */

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

function buildSuggestionFromNodeEdit(base, result) {
    const fallbackTitle = base && base.title ? String(base.title) : '새 순간';
    const fallbackDate = base && base.date ? String(base.date) : '';

    let obj = result;
    if (typeof obj === 'string') {
        try {
            obj = JSON.parse(obj);
        } catch (e) {
            obj = null;
        }
    }

    const next = {
        title: fallbackTitle,
        date: fallbackDate,
        videoId: '',
        description: '',
        moments: []
    };

    if (obj && typeof obj === 'object') {
        if (obj.title) next.title = String(obj.title);
        if (obj.date) next.date = String(obj.date);

        if (typeof obj.videoId === 'string' && obj.videoId) {
            next.videoId = obj.videoId;
        } else if (typeof obj.youtubeUrl === 'string' && obj.youtubeUrl && typeof parseYouTubeId === 'function') {
            const parsed = parseYouTubeId(obj.youtubeUrl);
            if (parsed) next.videoId = parsed;
        }

        if (typeof obj.description === 'string') {
            next.description = obj.description;
        }

        if (Array.isArray(obj.moments)) {
            next.moments = obj.moments
                .map(function (m) {
                    return {
                        time: m && m.time ? m.time : '0:00',
                        text: m && m.text ? m.text : '',
                        feeling: m && m.feeling ? m.feeling : 'love'
                    };
                })
                .filter(function (m) { return m.text && m.text.trim().length > 0; });
        }
    }

    if ((!next.moments || next.moments.length === 0) && next.description) {
        next.moments = [{ time: '0:00', text: next.description, feeling: 'love' }];
    }

    return next;
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

        const result = await searchYouTubeVideo(searchQuery);
if (result && result.videoId) {
      // 첫 번째 노드에 영상 적용
      list[0].videoId = result.videoId;
      list[0].description = result.description ? result.description.substring(0, 100) : '';
    }
    } catch (error) {
        console.warn('[AI] YouTube search failed:', error);
    }

    // 검색 쿼리 필드 제거
    list.forEach(item => delete item._searchQuery);

    return list;
}

async function openMomentAiHelper() {
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
        box.innerHTML = '<p class="editor-empty-copy">AI가 추천 문장을 생성 중입니다...</p>';
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

async function openCommentAiHelper() {
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
        box.innerHTML = '<p class="editor-empty-copy">AI가 추천 문장을 생성 중입니다...</p>';
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


function createAiCommentSuggestions(base) {
    const list = [];
    list.push(base + '이(가) 진짜 인생 순간이다. 다시 봐도 소름 돋는다.');
    list.push(base + '을(를) 볼 때마다 처음 입덕했을 때 느낌이 그대로 난다.');
    list.push('이 장면에서 분위기가 최고조에 올라간다. 현장에서 봤으면 울었을 것 같다.');
    return list;
}
