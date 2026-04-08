/**
 * Editor AI UI
 * - Loading indicators & Progress tracking
 * - Mode switching & Loading state management
 * - Result rendering (Tree, QA, Comments)
 */

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
            box.innerHTML = '<div class="editor-ai-center-state">'
                + '<p class="editor-ai-center-copy">요청이 취소되었습니다.</p>'
                + '<div class="editor-ai-center-actions">'
                + '<button type="button" onclick="retryAiHelper()" class="editor-ai-tag-btn editor-ai-tag-btn-brand">재시도</button>'
                + '<button type="button" onclick="closeAiHelper()" class="editor-ai-tag-btn editor-ai-tag-btn-ghost">닫기</button>'
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
        btn.classList.remove('is-active');
    });

    if (mode === 'tree' && treeBtn) {
        treeBtn.classList.add('is-active');
    } else if (mode === 'qa' && commentBtn) {
        commentBtn.classList.add('is-active');
    } else if (mode === 'node' && nodeBtn) {
        nodeBtn.classList.add('is-active');
    }

    const panels = [treePanel, commentPanel, nodePanel];
    panels.forEach((p) => {
        if (p) p.classList.add('is-hidden');
    });
    if (mode === 'tree' && treePanel) treePanel.classList.remove('is-hidden');
    if (mode === 'qa' && commentPanel) commentPanel.classList.remove('is-hidden');
    if (mode === 'node' && nodePanel) nodePanel.classList.remove('is-hidden');

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

function renderAiTreePreview() {
    const box = document.getElementById('ai-result');
    if (!box) return;
    if (!aiTreeSuggestions || aiTreeSuggestions.length === 0) {
        box.innerHTML = '<p class="editor-empty-copy">생성된 노드가 없습니다. 프롬프트를 입력해 보세요.</p>';
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
            '<div class="editor-ai-card">' +
            '  <div class="editor-ai-card-main">' +
            '    <div class="editor-ai-card-head">' +
            '      <p class="editor-ai-card-label">순간 ' + (index + 1) + '</p>' +
            '      <div class="editor-ai-card-actions">' +
            '        <button type="button" onclick="openAiTreeSuggestionEditor(' + index + ')" class="editor-ai-link-btn">상세편집</button>' +
            '        <button type="button" onclick="removeAiTreeSuggestion(' + index + ')" class="editor-ai-link-btn editor-ai-link-btn-danger">삭제</button>' +
            '      </div>' +
            '    </div>' +
            '    <input type="text" class="editor-ai-inline-input"' +
            '      value="' + safeTitle + '"' +
            '      oninput="updateAiTreeSuggestion(' + index + ', \'title\', this.value)">' +
            '    <input type="date" class="editor-ai-inline-date"' +
            '      value="' + safeDate + '"' +
            '      oninput="updateAiTreeSuggestion(' + index + ', \'date\', this.value)">' +
            '    <p class="editor-ai-sub-xs">' + videoText + ' · 모먼트 ' + momentsCount + '개</p>' +
            (safeDesc ? ('    <p class="editor-ai-sub-xs">' + safeDesc + '</p>') : '') +
            '  </div>' +
            '</div>';
    }).join('');
    const helperText = '<p class="editor-result-hint">각 카드에서 상세 편집(영상/설명/모먼트)을 확인한 뒤 적용하세요.</p>';
    const applyButton = '<button type="button" onclick="applyAiTreeSkeleton()" class="editor-primary-btn editor-apply-btn-full">현재 트리에 적용</button>';
    box.innerHTML = items + helperText + applyButton;
}

function renderNodeAiSuggestion(node, suggestion) {
    const box = document.getElementById('ai-result');
    if (!box) return;
    if (!suggestion || typeof suggestion !== 'object') {
        box.innerHTML = '<p class="editor-empty-copy">적용할 수 있는 제안이 없습니다.</p>';
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
        '<div class="editor-ai-card editor-ai-stack-sm">',
        '  <p class="editor-ai-muted-note">AI 제안은 적용 전에 직접 수정할 수 있어요.</p>',
        '  <div class="editor-ai-stack-sm">',
        '    <div>',
        '      <label class="editor-form-label">제목</label>',
        '      <input id="ai-node-edit-title" type="text" class="editor-ai-inline-input" value="' + escapeHtmlForAi(newTitle) + '">',
        '    </div>',
        '    <div class="editor-ai-grid-2">',
        '      <div>',
        '        <label class="editor-form-label">날짜</label>',
        '        <input id="ai-node-edit-date" type="date" class="editor-ai-inline-date" value="' + escapeHtmlForAi(newDate) + '">',
        '      </div>',
        '      <div>',
        '        <label class="editor-form-label">유튜브 URL</label>',
        '        <input id="ai-node-edit-video" type="text" class="editor-ai-inline-input" value="' + escapeHtmlForAi(suggestedUrl) + '" oninput="updateAiNodeVideoPreview()">',
        '        <p id="ai-node-edit-video-error" class="is-hidden editor-error-text"></p>',
        '      </div>',
        '    </div>',
        '    <div id="ai-node-edit-video-preview" class="is-hidden editor-video-preview">',
        '      <div class="editor-search-preview">',
        '        <img id="ai-node-edit-video-thumb" src="" alt="YouTube Thumbnail" class="editor-ai-thumb">',
        '        <div class="editor-ai-meta">',
        '          <p id="ai-node-edit-video-preview-text" class="editor-ai-sub-xs"></p>',
        '          <a id="ai-node-edit-video-preview-link" href="#" target="_blank" class="editor-search-link">YouTube에서 열기</a>',
        '        </div>',
        '        <button type="button" onclick="clearAiNodeVideoInput()" class="editor-search-ghost-btn">제거</button>',
        '      </div>',
        '    </div>',
        '    <div>',
        '      <div class="editor-search-actions">',
        '        <input type="text" id="ai-node-edit-video-search" placeholder="키워드로 영상 검색" class="editor-ai-inline-search editor-search-input">',
        '        <button type="button" onclick="searchYouTubeForAiNodeEdit()" class="editor-ai-tag-btn editor-ai-tag-btn-dark">검색</button>',
        '      </div>',
        '      <div id="ai-node-edit-video-search-result" class="editor-search-result"></div>',
        '    </div>',
        '    <div>',
        '      <label class="editor-form-label">설명</label>',
        '      <textarea id="ai-node-edit-description" rows="3" class="editor-ai-inline-textarea">' + escapeHtmlForAi(newDescription) + '</textarea>',
        '    </div>',
        '  </div>',
        '  <div class="editor-ai-actions-end">',
        '    <button type="button" class="editor-ai-tag-btn editor-ai-tag-btn-ghost" onclick="closeAiHelper()">취소</button>',
        '    <button type="button" class="editor-ai-tag-btn editor-ai-tag-btn-brand" onclick="applyAiNodeSuggestion()">적용</button>',
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
        errorEl.classList.add('is-hidden');
        preview.classList.add('is-hidden');
        return;
    }

    const videoId = (typeof validateYouTubeUrl === 'function')
        ? (validateYouTubeUrl(raw) || '')
        : ((raw.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^"&?\/\s]{11})/) || [])[1] || '');

    if (!videoId) {
        errorEl.textContent = '유튜브 URL을 인식하지 못했습니다.';
        errorEl.classList.remove('is-hidden');
        preview.classList.add('is-hidden');
        return;
    }

    errorEl.classList.add('is-hidden');
    preview.classList.remove('is-hidden');

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
        box.innerHTML = '<p class="editor-empty-copy">검색 결과가 없습니다.</p>';
        return;
    }

    list.forEach(function (item) {
        if (!item || !item.videoId) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'editor-search-option';
        btn.onclick = function () {
            const input = document.getElementById('ai-node-edit-video');
            if (input) input.value = `https://youtu.be/${item.videoId}`;
            if (typeof updateAiNodeVideoPreview === 'function') {
                updateAiNodeVideoPreview();
            }
        };

        const wrap = document.createElement('div');
        wrap.className = 'editor-search-preview';

        const img = document.createElement('img');
        img.className = 'editor-ai-thumb';
        img.alt = 'YouTube Thumbnail';
        img.src = (typeof getYouTubeThumb === 'function')
            ? getYouTubeThumb(item.videoId)
            : `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;

        const meta = document.createElement('div');
        meta.className = 'editor-ai-meta';

        const title = document.createElement('p');
        title.className = 'editor-ai-title-xs';
        title.textContent = String(item.title || '제목 없음');

        const sub = document.createElement('p');
        sub.className = 'editor-ai-sub-xs';
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
        box.innerHTML = '<p class="editor-empty-copy">검색어를 입력해 주세요.</p>';
        return;
    }

    box.innerHTML = '<p class="editor-empty-copy">YouTube에서 검색 중...</p>';

    if (typeof callAiHelperApi !== 'function') {
        box.innerHTML = '<p class="editor-empty-copy">검색 기능을 사용할 수 없습니다.</p>';
        return;
    }

    callAiHelperApi('youtube_search', { query: query, maxResults: 6 })
        .then(function (result) {
            renderAiNodeYouTubeSearchResults(result);
        })
        .catch(function () {
            box.innerHTML = '<p class="editor-empty-copy">검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>';
        });
}

function renderAiCommentPreview() {
    const box = document.getElementById('ai-result');
    if (!box) return;
    if (!aiCommentSuggestions || aiCommentSuggestions.length === 0) {
        box.innerHTML = '<p class="editor-empty-copy">추천 문장이 없습니다. 간단한 상황 설명을 적어 보세요.</p>';
        return;
    }
    const items = aiCommentSuggestions.map(function (text, index) {
        return '<button type="button" onclick="applyAiCommentSuggestion(' + index + ')" class="editor-ai-suggestion-btn">' +
            escapeHtmlForAi(text) +
            '</button>';
    }).join('');
    box.innerHTML = items;
}

function renderMomentAiSuggestions() {
    const box = document.getElementById('moment-ai-result');
    if (!box) return;
    if (!momentAiSuggestions || momentAiSuggestions.length === 0) {
        box.innerHTML = '<p class="editor-empty-copy">추천 문장이 없습니다. 간단한 상황 설명을 적어 보세요.</p>';
        return;
    }
    const items = momentAiSuggestions.map(function (text, index) {
        return '<button type="button" onclick="applyMomentAiSuggestion(' + index + ')" class="editor-ai-suggestion-btn">' +
            escapeHtmlForAi(text) +
            '</button>';
    }).join('');
    box.innerHTML = items;
}

function renderCommentAiSuggestions() {
    const box = document.getElementById('comment-ai-result');
    if (!box) return;
    if (!commentAiSuggestions || commentAiSuggestions.length === 0) {
        box.innerHTML = '<p class="editor-empty-copy">추천 문장이 없습니다. 간단한 상황 설명을 적어 보세요.</p>';
        return;
    }
    const items = commentAiSuggestions.map(function (text, index) {
        return '<button type="button" onclick="applyCommentAiSuggestion(' + index + ')" class="editor-ai-suggestion-btn">' +
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
