/**
 * Editor AI Tree Editor
 * - Tree suggestion editor open/close helpers
 * - YouTube preview & search helpers
 * - Moment row editing helpers
 * - Suggestion save/apply helpers
 */

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

function closeAiTreeSuggestionEditor() {
    aiTreeEditIndex = null;
    renderAiTreePreview();
}

function getAiTreeSuggestionEditingItem() {
    if (aiTreeEditIndex === null || aiTreeEditIndex === undefined) return null;
    if (!aiTreeSuggestions || aiTreeEditIndex < 0 || aiTreeEditIndex >= aiTreeSuggestions.length) return null;
    return aiTreeSuggestions[aiTreeEditIndex];
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

function renderAiTreeYouTubeSearchResults(list) {
    const box = document.getElementById('ai-tree-edit-video-search-result');
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
            const input = document.getElementById('ai-tree-edit-video');
            if (input) input.value = `https://youtu.be/${item.videoId}`;
            updateAiTreeVideoPreview();
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

function searchYouTubeForAiTreeSuggestion() {
    const input = document.getElementById('ai-tree-edit-video-search');
    const box = document.getElementById('ai-tree-edit-video-search-result');
    const titleEl = document.getElementById('ai-tree-edit-title');
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
            renderAiTreeYouTubeSearchResults(result);
        })
        .catch(function () {
            box.innerHTML = '<p class="editor-empty-copy">검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>';
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
    const moment = item.moments[idx];
    if (!moment) return;
    if (field === 'time') moment.time = value;
    if (field === 'text') moment.text = value;
    if (field === 'feeling') moment.feeling = value;
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
            '<div class="editor-ai-moment-card">' +
            '  <div class="editor-ai-moment-head">' +
            '    <input type="text" class="editor-ai-inline-input editor-ai-time-input" value="' + time + '" oninput="updateAiTreeMomentField(' + idx + ', \'time\', this.value)">' +
            '    <select class="editor-ai-inline-select" onchange="updateAiTreeMomentField(' + idx + ', \'feeling\', this.value)">' +
            opt('love', '😍') + opt('tear', '😭') + opt('funny', '🤣') + opt('shock', '😲') +
            '    </select>' +
            '    <button type="button" class="editor-ai-link-btn editor-ai-link-btn-danger" onclick="removeAiTreeMomentRow(' + idx + ')">삭제</button>' +
            '  </div>' +
            '  <textarea rows="2" class="editor-ai-inline-textarea" oninput="updateAiTreeMomentField(' + idx + ', \'text\', this.value)">' + text + '</textarea>' +
            '</div>';
    }).join('');

    const html = [
        '<div class="editor-ai-stack-sm">',
        '  <div class="editor-ai-card-head">',
        '    <p class="editor-ai-card-label">상세 편집 (순간 ' + (aiTreeEditIndex + 1) + ')</p>',
        '    <button type="button" class="editor-ai-link-btn" onclick="closeAiTreeSuggestionEditor()">목록으로</button>',
        '  </div>',
        '  <div class="editor-ai-card editor-ai-stack-sm">',
        '    <div>',
        '      <label class="editor-form-label">제목</label>',
        '      <input id="ai-tree-edit-title" type="text" class="editor-ai-inline-input" value="' + safeTitle + '">',
        '    </div>',
        '    <div>',
        '      <label class="editor-form-label">날짜</label>',
        '      <input id="ai-tree-edit-date" type="date" class="editor-ai-inline-date" value="' + safeDate + '">',
        '    </div>',
        '    <div>',
        '      <label class="editor-form-label">유튜브 URL</label>',
        '      <input id="ai-tree-edit-video" type="text" class="editor-ai-inline-input" value="' + escapeHtmlForAi(urlValue) + '" oninput="updateAiTreeVideoPreview()">',
        '      <p id="ai-tree-edit-video-error" class="is-hidden editor-error-text"></p>',
        '    </div>',
        '    <div id="ai-tree-edit-video-preview" class="is-hidden editor-video-preview">',
        '      <div class="editor-search-preview">',
        '        <img id="ai-tree-edit-video-thumb" src="" alt="YouTube Thumbnail" class="editor-ai-thumb">',
        '        <div class="editor-ai-meta">',
        '          <p id="ai-tree-edit-video-preview-text" class="editor-ai-sub-xs"></p>',
        '          <a id="ai-tree-edit-video-preview-link" href="#" target="_blank" class="editor-search-link">YouTube에서 열기</a>',
        '        </div>',
        '        <button type="button" onclick="clearAiTreeVideoInput()" class="editor-search-ghost-btn">제거</button>',
        '      </div>',
        '    </div>',
        '    <div>',
        '      <div class="editor-search-actions">',
        '        <input type="text" id="ai-tree-edit-video-search" placeholder="키워드로 영상 검색" class="editor-ai-inline-search editor-search-input">',
        '        <button type="button" onclick="searchYouTubeForAiTreeSuggestion()" class="editor-ai-tag-btn editor-ai-tag-btn-dark">검색</button>',
        '      </div>',
        '      <div id="ai-tree-edit-video-search-result" class="editor-search-result"></div>',
        '    </div>',
        '    <div>',
        '      <label class="editor-form-label">설명</label>',
        '      <textarea id="ai-tree-edit-description" rows="3" class="editor-ai-inline-textarea">' + safeDesc + '</textarea>',
        '    </div>',
        '    <div class="editor-ai-stack-sm">',
        '      <div class="editor-ai-card-head">',
        '        <p class="editor-ai-card-label">모먼트</p>',
        '        <button type="button" onclick="addAiTreeMomentRow()" class="editor-ai-link-btn">+ 추가</button>',
        '      </div>',
        (momentsHtml || '<p class="editor-empty-copy">모먼트가 없습니다. + 추가로 직접 입력하거나, 설명을 채우고 적용해도 됩니다.</p>'),
        '    </div>',
        '    <div class="editor-ai-actions-end">',
        '      <button type="button" class="editor-ai-tag-btn editor-ai-tag-btn-ghost" onclick="closeAiTreeSuggestionEditor()">취소</button>',
        '      <button type="button" class="editor-ai-tag-btn editor-ai-tag-btn-dark" onclick="if(saveAiTreeSuggestionEditorValues()){ closeAiTreeSuggestionEditor(); }">저장</button>',
        '      <button type="button" class="editor-ai-tag-btn editor-ai-tag-btn-brand" onclick="applyAiTreeSuggestionSingle()">이 노드만 적용</button>',
        '    </div>',
        '  </div>',
        '</div>'
    ].join('');

    box.innerHTML = html;
    updateAiTreeVideoPreview();
}
