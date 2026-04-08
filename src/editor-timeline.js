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
                ? `<div class="w-full h-full relative overflow-hidden">
                            <img src="${thumbUrl}" alt="YouTube thumbnail" class="w-full h-full object-cover" />
                            <div class="absolute inset-0 bg-black/25"></div>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                    <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"></path>
                                    </svg>
                                </div>
                            </div>
                       </div>`
                : (node.imageUrl
                    ? `<div class="w-full h-full relative overflow-hidden">
                        <img src="${node.imageUrl}" alt="Node Image" class="w-full h-full object-cover" />
                       </div>`
                    : `<div class="w-full h-full flex items-center justify-center bg-slate-800 text-slate-300 text-xs">No Media</div>`
                )
            }
            </div>
            <div class="p-4 space-y-3">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <h3 class="font-bold text-slate-800 text-base leading-snug mb-1 line-clamp-2">${node.title}</h3>
                        <p class="text-xs text-slate-400 font-medium">${node.date || ''}</p>
                        <p class="mt-1 text-[11px] text-slate-400">${feelingSummary}</p>
                        <div class="mt-1 flex gap-1">
                            <button type="button" class="w-7 h-7 rounded-full bg-pink-50 text-xs flex items-center justify-center"
                                onclick="event.stopPropagation(); addQuickFeeling(${node.id}, 'love')">😍</button>
                            <button type="button" class="w-7 h-7 rounded-full bg-sky-50 text-xs flex items-center justify-center"
                                onclick="event.stopPropagation(); addQuickFeeling(${node.id}, 'tear')">😭</button>
                            <button type="button" class="w-7 h-7 rounded-full bg-amber-50 text-xs flex items-center justify-center"
                                onclick="event.stopPropagation(); addQuickFeeling(${node.id}, 'funny')">🤣</button>
                            <button type="button" class="w-7 h-7 rounded-full bg-violet-50 text-xs flex items-center justify-center"
                                onclick="event.stopPropagation(); addQuickFeeling(${node.id}, 'shock')">😲</button>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1 shrink-0">
                        <button type="button" class="px-3 py-1.5 rounded-full bg-brand-500 text-white text-xs font-bold"
                            onclick="event.stopPropagation(); openDetailFromTimeline(${node.id})">열기</button>
                        <button type="button" class="px-2 py-1 rounded-full bg-slate-100 text-[11px] text-slate-600"
                            onclick="event.stopPropagation(); toggleQuickEdit(${node.id})">빠른수정</button>
                    </div>
                </div>
                <form class="quick-edit-form hidden mt-2 space-y-2" onsubmit="saveQuickEdit(event, ${node.id})">
                    <div>
                        <input type="text" class="quick-edit-title w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg"
                            placeholder="제목" />
                    </div>
                    <div class="flex gap-2">
                        <input type="date" class="quick-edit-date flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
                        <input type="text" class="quick-edit-video flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg"
                            placeholder="유튜브 URL" />
                    </div>
                    <div class="flex justify-end gap-2">
                        <button type="button" class="px-2 py-1 text-[11px] text-slate-500"
                            onclick="event.stopPropagation(); toggleQuickEdit(${node.id})">취소</button>
                        <button type="submit" class="px-3 py-1 text-[11px] font-bold text-white bg-brand-500 rounded-full">
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

        if (form.classList.contains('hidden')) {
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

        form.classList.toggle('hidden');
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
