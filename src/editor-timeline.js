(function () {
    function showToast(runtime, message) {
        if (runtime && typeof runtime.showToast === 'function') {
            runtime.showToast(message);
            return;
        }
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        }
    }

    function buildFeelingSummary(node) {
        const moments = Array.isArray(node.moments) ? node.moments : [];
        if (!moments.length) {
            return '아직 감정 기록이 없습니다.';
        }

        const counts = {};
        moments.forEach(function (m) {
            const feeling = m.feeling || 'other';
            counts[feeling] = (counts[feeling] || 0) + 1;
        });

        let topFeeling = null;
        let topCount = 0;
        Object.keys(counts).forEach(function (feeling) {
            if (feeling !== 'other' && counts[feeling] > topCount) {
                topFeeling = feeling;
                topCount = counts[feeling];
            }
        });
        if (!topFeeling) {
            topFeeling = Object.keys(counts)[0];
        }

        const emoji = window.getFeelingEmoji(topFeeling);
        return emoji + ' 포함 ' + moments.length + '회';
    }

    function buildTimelineCard(node) {
        const card = document.createElement('div');
        card.className = 'timeline-card mx-auto mt-4 w-full max-w-md rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden';
        card.dataset.nodeId = node.id;
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', function (event) {
            if (typeof window.onNodeDragStartForAi === 'function') {
                window.onNodeDragStartForAi(event, node.id);
            }
        });

        const hasVideo = !!node.videoId;
        const thumbUrl = hasVideo && typeof window.getYouTubeThumb === 'function'
            ? window.getYouTubeThumb(node.videoId, 'hqdefault')
            : '';
        const feelingSummary = buildFeelingSummary(node);

        card.innerHTML = `
            <div class="bg-black h-40 relative overflow-hidden">
                ${hasVideo
                ? `<div class="editor-node-media-fill">
                            <img src="${thumbUrl}" alt="YouTube thumbnail" class="editor-node-media-image" />
                            <div class="editor-node-media-overlay"></div>
                            <div class="editor-node-media-center">
                                <div class="editor-node-play-badge">
                                    <svg fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"></path>
                                    </svg>
                                </div>
                            </div>
                       </div>`
                : (node.imageUrl
                    ? `<div class="editor-node-media-fill">
                        <img src="${node.imageUrl}" alt="Node Image" class="editor-node-media-image" />
                       </div>`
                    : `<div class="editor-node-empty-media">No Media</div>`
                )
            }
            </div>
            <div class="timeline-card-inner">
                <div class="timeline-card-head">
                    <div>
                        <h3 class="timeline-card-title">${node.title}</h3>
                        <p class="timeline-card-date">${node.date || ''}</p>
                        <p class="timeline-card-feeling">${feelingSummary}</p>
                        <div class="timeline-feeling-row">
                            <button type="button" class="timeline-feeling-btn is-love"
                                onclick="event.stopPropagation(); addQuickFeeling(${node.id}, 'love')">😍</button>
                            <button type="button" class="timeline-feeling-btn is-tear"
                                onclick="event.stopPropagation(); addQuickFeeling(${node.id}, 'tear')">😭</button>
                            <button type="button" class="timeline-feeling-btn is-funny"
                                onclick="event.stopPropagation(); addQuickFeeling(${node.id}, 'funny')">🤣</button>
                            <button type="button" class="timeline-feeling-btn is-shock"
                                onclick="event.stopPropagation(); addQuickFeeling(${node.id}, 'shock')">😲</button>
                        </div>
                    </div>
                    <div class="timeline-card-actions">
                        <button type="button" class="timeline-open-btn"
                            onclick="event.stopPropagation(); openDetailFromTimeline(${node.id})">열기</button>
                        <button type="button" class="timeline-ghost-btn"
                            onclick="event.stopPropagation(); toggleQuickEdit(${node.id})">빠른수정</button>
                    </div>
                </div>
                <form class="quick-edit-form timeline-quick-form is-hidden" onsubmit="saveQuickEdit(event, ${node.id})">
                    <div>
                        <input type="text" class="quick-edit-title timeline-quick-input"
                            placeholder="제목" />
                    </div>
                    <div class="timeline-quick-grid">
                        <input type="date" class="quick-edit-date timeline-quick-input" />
                        <input type="text" class="quick-edit-video timeline-quick-input"
                            placeholder="유튜브 URL" />
                    </div>
                    <div class="timeline-quick-actions">
                        <button type="button" class="timeline-cancel-btn"
                            onclick="event.stopPropagation(); toggleQuickEdit(${node.id})">취소</button>
                        <button type="submit" class="timeline-save-btn">
                            저장
                        </button>
                    </div>
                </form>
            </div>
        `;

        card.onclick = function () {
            window.openDetailModal(node);
        };

        return card;
    }

    function renderTimeline(runtime) {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;

        timeline.innerHTML = '';

        const nodes = runtime.state.nodes.slice();
        nodes.sort(function (a, b) {
            const ad = a.date || '';
            const bd = b.date || '';
            if (ad === bd) return 0;
            return ad < bd ? -1 : 1;
        });

        if (nodes.length === 0) {
            timeline.innerHTML = '<div class="h-full flex items-center justify-center text-slate-400 text-sm px-6 text-center">아직 등록된 순간이 없습니다.<br>아래 + 버튼으로 첫 순간을 추가해 보세요.</div>';
            return;
        }

        nodes.forEach(function (node) {
            timeline.appendChild(buildTimelineCard(node));
        });
    }

    function openDetailFromTimeline(runtime, nodeId) {
        const node = runtime.state.nodes.find(function (item) {
            return item.id === nodeId;
        });
        if (!node) return;
        window.openDetailModal(node);
    }

    function toggleQuickEdit(runtime, nodeId) {
        const selector = '.timeline-card[data-node-id="' + nodeId + '"]';
        const card = document.querySelector(selector);
        if (!card) return;

        const form = card.querySelector('.quick-edit-form');
        if (!form) return;

        if (form.classList.contains('is-hidden')) {
            const node = runtime.state.nodes.find(function (item) {
                return item.id === nodeId;
            });
            if (!node) return;

            const titleInput = form.querySelector('.quick-edit-title');
            const dateInput = form.querySelector('.quick-edit-date');
            const videoInput = form.querySelector('.quick-edit-video');

            if (titleInput) titleInput.value = node.title || '';
            if (dateInput) dateInput.value = node.date || '';
            if (videoInput) videoInput.value = node.videoId ? 'https://youtu.be/' + node.videoId : '';
        }

        form.classList.toggle('is-hidden');
    }

    function saveQuickEdit(runtime, e, nodeId) {
        e.preventDefault();
        e.stopPropagation();

        if (runtime.isReadOnly) {
            showToast(runtime, '읽기 전용 모드입니다.');
            return;
        }

        const selector = '.timeline-card[data-node-id="' + nodeId + '"]';
        const card = document.querySelector(selector);
        if (!card) return;

        const titleInput = card.querySelector('.quick-edit-title');
        const dateInput = card.querySelector('.quick-edit-date');
        const videoInput = card.querySelector('.quick-edit-video');

        const node = runtime.state.nodes.find(function (item) {
            return item.id === nodeId;
        });
        if (!node) return;

        const newTitle = titleInput ? titleInput.value.trim() : '';
        const newDate = dateInput ? dateInput.value : '';
        const videoUrl = videoInput ? videoInput.value.trim() : '';

        if (newTitle) node.title = newTitle;
        node.date = newDate;

        let videoId = '';
        if (videoUrl) {
            const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^"&?\/\s]{11})/);
            if (match) videoId = match[1];
        }
        node.videoId = videoId;

        if (typeof runtime.render === 'function') {
            runtime.render();
        }
        if (typeof runtime.saveData === 'function') {
            runtime.saveData();
        }
    }

    function addQuickFeeling(runtime, nodeId, feeling) {
        if (runtime.isReadOnly) {
            showToast(runtime, '읽기 전용 모드입니다.');
            return;
        }

        const node = runtime.state.nodes.find(function (item) {
            return item.id === nodeId;
        });
        if (!node) return;

        if (!Array.isArray(node.moments)) {
            node.moments = [];
        }

        node.moments.push({
            time: '00:00',
            text: '',
            feeling: feeling
        });

        if (typeof runtime.render === 'function') {
            runtime.render();
        }
        if (typeof runtime.saveData === 'function') {
            runtime.saveData();
        }
    }

    window.EditorTimelineHelpers = {
        renderTimeline: renderTimeline,
        openDetailFromTimeline: openDetailFromTimeline,
        toggleQuickEdit: toggleQuickEdit,
        saveQuickEdit: saveQuickEdit,
        addQuickFeeling: addQuickFeeling
    };
})();
