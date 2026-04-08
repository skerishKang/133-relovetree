(function () {
    let ytPlayer = null;
    let youTubeApiReady = false;
    let aiTreeDraftDetailActive = false;
    let aiTreeDraftDetailIndex = null;
    let aiTreeDraftDetailNode = null;

    function showToast(runtime, message) {
        if (runtime && typeof runtime.showToast === 'function') {
            runtime.showToast(message);
            return;
        }
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        }
    }

    function render(runtime) {
        if (runtime && typeof runtime.render === 'function') {
            runtime.render();
        }
    }

    function saveImmediate(runtime, showToastOnSuccess) {
        if (runtime && typeof runtime.saveDataImmediate === 'function') {
            return runtime.saveDataImmediate(showToastOnSuccess);
        }
        if (typeof window.saveDataImmediate === 'function') {
            return window.saveDataImmediate(showToastOnSuccess);
        }
        return null;
    }

    function saveDebounced(runtime) {
        if (runtime && typeof runtime.saveData === 'function') {
            return runtime.saveData();
        }
        if (typeof window.saveData === 'function') {
            return window.saveData();
        }
        return null;
    }

    function updateStats(runtime) {
        if (runtime && typeof runtime.updateTreeStatsBanner === 'function') {
            runtime.updateTreeStatsBanner();
            return;
        }
        if (typeof window.updateTreeStatsBanner === 'function') {
            window.updateTreeStatsBanner();
        }
    }

    function getIsKorean(runtime) {
        if (runtime && typeof runtime.isKorean === 'boolean') {
            return runtime.isKorean;
        }
        if (typeof window.isKorean === 'boolean') {
            return window.isKorean;
        }
        return true;
    }

    function closeDialogById(id) {
        const modal = document.getElementById(id);
        if (modal && typeof modal.close === 'function') {
            modal.close();
        }
    }

    function setYouTubeApiReady() {
        youTubeApiReady = true;
    }

    function startVideo(runtime, videoId, startSeconds) {
        if (!videoId) return;
        const iframe = document.getElementById('detail-video');
        const placeholder = document.getElementById('video-placeholder');

        const startSec = (typeof startSeconds === 'number' && Number.isFinite(startSeconds) && startSeconds > 0)
            ? Math.floor(startSeconds)
            : 0;

        if (youTubeApiReady && typeof YT !== 'undefined' && typeof YT.Player === 'function') {
            try {
                if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') {
                    ytPlayer = new YT.Player('detail-video', {
                        videoId: videoId,
                        playerVars: {
                            playsinline: 1,
                            rel: 0,
                            modestbranding: 1,
                            autoplay: 1,
                            start: startSec
                        }
                    });
                } else {
                    ytPlayer.loadVideoById({
                        videoId: videoId,
                        startSeconds: startSec
                    });
                }

                if (iframe) iframe.classList.remove('hidden');
                if (placeholder) placeholder.classList.add('hidden');
                return;
            } catch (e) {
                console.error('YouTube Player API 오류, iframe src 폴백으로 전환합니다:', e);
                ytPlayer = null;
            }
        }

        const params = new URLSearchParams({
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            autoplay: 1
        });

        if (startSec > 0) {
            params.set('start', String(startSec));
        }

        if (iframe) {
            iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?' + params.toString();
            iframe.classList.remove('hidden');
        }
        if (placeholder) {
            placeholder.classList.add('hidden');
        }
    }

    function setCurrentMomentTime(runtime) {
        const input = document.getElementById('new-moment-time');
        if (!input) return;

        let seconds = 0;
        if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
            try {
                seconds = ytPlayer.getCurrentTime();
            } catch (e) {
                seconds = 0;
            }
        }

        if (!Number.isFinite(seconds) || seconds < 0) {
            seconds = 0;
        }

        const total = Math.floor(seconds);
        if (typeof window.secondsToTime === 'function') {
            input.value = window.secondsToTime(total);
            return;
        }

        const m = Math.floor(total / 60);
        const s = total % 60;
        input.value = m + ':' + String(s).padStart(2, '0');
    }

    function setAiTreeDraftDetailUi(active) {
        aiTreeDraftDetailActive = !!active;
        const applyBtn = document.getElementById('ai-draft-apply-btn');
        const saveBtn = document.getElementById('edit-save-btn');

        if (applyBtn) {
            applyBtn.classList.toggle('hidden', !aiTreeDraftDetailActive);
        }
        if (saveBtn) {
            saveBtn.textContent = aiTreeDraftDetailActive ? '제안 저장' : '저장';
        }

        const deleteBtn = document.querySelector('#detail-modal [title="삭제"]');
        if (deleteBtn) {
            deleteBtn.classList.toggle('hidden', aiTreeDraftDetailActive);
        }
    }

    function normalizeDraftNode(node) {
        const draft = node || {};
        const moments = Array.isArray(draft.moments) ? draft.moments : [];
        const normalized = {
            title: String(draft.title || '새 순간'),
            date: String(draft.date || ''),
            videoId: String(draft.videoId || ''),
            description: String(draft.description || ''),
            moments: moments.map(function (m) {
                return {
                    time: m && m.time ? String(m.time) : '0:00',
                    text: m && m.text ? String(m.text) : '',
                    feeling: m && m.feeling ? String(m.feeling) : 'love'
                };
            }).filter(function (m) {
                return m.text && m.text.trim().length > 0;
            })
        };

        if ((!normalized.moments || normalized.moments.length === 0) && normalized.description) {
            normalized.moments = [{ time: '0:00', text: normalized.description, feeling: 'love' }];
        }

        return normalized;
    }

    function getFeelingEmoji(feeling) {
        const map = { love: '😍', tear: '😭', funny: '🤣', shock: '😲' };
        return map[feeling] || '😊';
    }

    function renderMomentsList(runtime, moments) {
        const list = document.getElementById('moments-list');
        if (!list) return;

        list.innerHTML = '';
        if (!Array.isArray(moments) || moments.length === 0) {
            list.innerHTML = '<div class="text-center text-slate-400 text-sm py-10">아직 기록된 순간이 없습니다.<br>영상을 보며 감정을 남겨보세요!</div>';
            return;
        }

        moments.forEach(function (m) {
            const el = document.createElement('div');
            el.className = 'flex gap-3 items-start';
            el.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm text-lg">
                    ${getFeelingEmoji(m.feeling)}
                </div>
                <div class="flex-1 bg-white p-3 rounded-r-xl rounded-bl-xl shadow-sm border border-slate-100">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-brand-100" onclick="seekVideo('${m.time}')">
                            ${m.time}
                        </span>
                        <span class="text-[10px] text-slate-400">User</span>
                    </div>
                    <p class="text-sm text-slate-700 leading-snug">${m.text}</p>
                </div>
            `;
            list.appendChild(el);
        });
    }

    function updateDetailMedia(runtime, node) {
        const iframe = document.getElementById('detail-video');
        const placeholder = document.getElementById('video-placeholder');
        const externalLink = document.getElementById('external-link');
        if (!iframe || !placeholder || !externalLink) return;

        iframe.src = '';
        iframe.classList.add('hidden');
        placeholder.classList.remove('hidden');
        placeholder.style.backgroundImage = '';
        placeholder.innerHTML = `
            <div class="w-16 h-16 rounded-full border-2 border-white/60 flex items-center justify-center bg-black/40 shadow-lg">
                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                </svg>
            </div>
            <p class="text-sm font-medium">영상을 보려면 클릭하세요</p>
            <p class="text-xs text-slate-400">썸네일은 숨기고, 재생 시에만 영상을 불러옵니다.</p>
        `;
        externalLink.classList.add('hidden');

        if (node && node.videoId) {
            placeholder.onclick = function () {
                startVideo(runtime, node.videoId);
            };
            externalLink.href = 'https://www.youtube.com/watch?v=' + node.videoId;
            externalLink.classList.remove('hidden');
            return;
        }

        if (node && node.imageUrl) {
            placeholder.innerHTML = '';
            placeholder.style.backgroundImage = "url('" + node.imageUrl + "')";
            placeholder.style.backgroundSize = 'contain';
            placeholder.style.backgroundPosition = 'center';
            placeholder.style.backgroundRepeat = 'no-repeat';
            placeholder.onclick = null;
            return;
        }

        placeholder.innerHTML = `
            <div class="w-16 h-16 rounded-full border-2 border-white/60 flex items-center justify-center bg-black/40 shadow-lg">
                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                </svg>
            </div>
            <p class="text-sm font-medium">유튜브 영상을 추가하려면 클릭하세요</p>
            <p class="text-xs text-slate-400">우측 편집 영역에서 유튜브 URL을 입력하면 바로 재생할 수 있어요.</p>
        `;
        placeholder.onclick = function () {
            if (runtime.isReadOnly) {
                showToast(runtime, '읽기 전용 모드입니다.');
                return;
            }

            enableEditMode();
            const videoInput = document.getElementById('edit-video');
            if (videoInput) {
                videoInput.focus();
            }
        };
    }

    function openDetailModal(runtime, node) {
        if (!node) return;

        runtime.state.activeNodeId = node.id;
        document.getElementById('detail-title').innerText = node.title;
        document.getElementById('detail-date').innerText = node.date;
        document.getElementById('edit-title').value = node.title;
        document.getElementById('edit-date').value = node.date;
        document.getElementById('edit-video').value = node.videoId ? 'https://youtu.be/' + node.videoId : '';
        document.getElementById('edit-description').value = node.description || '';

        updateDetailVideoEditorUi(runtime);

        if (runtime.isReadOnly) {
            disableEditMode();
        } else {
            enableEditMode();
            setTimeout(function () {
                const titleInput = document.getElementById('edit-title');
                if (titleInput) titleInput.focus();
            }, 0);
        }

        updateDetailMedia(runtime, node);

        const imagePreviewContainer = document.getElementById('image-preview-container');
        const imagePreview = document.getElementById('image-preview');
        if (imagePreviewContainer && imagePreview) {
            if (node.imageUrl) {
                imagePreview.src = node.imageUrl;
                imagePreviewContainer.classList.remove('hidden');
            } else {
                imagePreviewContainer.classList.add('hidden');
            }
        }

        renderMomentsList(runtime, node.moments);
        const modal = document.getElementById('detail-modal');
        if (modal && typeof modal.showModal === 'function') {
            modal.showModal();
        }
    }

    function openDetailModalForAiTreeSuggestion(runtime, index, draftNode) {
        aiTreeDraftDetailIndex = index;
        aiTreeDraftDetailNode = normalizeDraftNode(draftNode);
        setAiTreeDraftDetailUi(true);

        document.getElementById('detail-title').innerText = aiTreeDraftDetailNode.title;
        document.getElementById('detail-date').innerText = aiTreeDraftDetailNode.date;
        document.getElementById('edit-title').value = aiTreeDraftDetailNode.title;
        document.getElementById('edit-date').value = aiTreeDraftDetailNode.date;
        document.getElementById('edit-video').value = aiTreeDraftDetailNode.videoId ? 'https://youtu.be/' + aiTreeDraftDetailNode.videoId : '';
        document.getElementById('edit-description').value = aiTreeDraftDetailNode.description || '';

        updateDetailVideoEditorUi(runtime);
        enableEditMode();
        updateDetailMedia(runtime, aiTreeDraftDetailNode);
        renderMomentsList(runtime, aiTreeDraftDetailNode.moments);

        const modal = document.getElementById('detail-modal');
        if (modal && typeof modal.showModal === 'function') {
            modal.showModal();
        }
    }

    function resetAiTreeDraftDetail() {
        aiTreeDraftDetailIndex = null;
        aiTreeDraftDetailNode = null;
        setAiTreeDraftDetailUi(false);
    }

    function seekVideo(runtime, timeStr) {
        const parts = String(timeStr || '').split(':').map(Number);
        let seconds = 0;
        if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
        if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];

        const node = runtime.state.nodes.find(function (item) {
            return item.id === runtime.state.activeNodeId;
        });
        if (!node || !node.videoId) return;

        startVideo(runtime, node.videoId, seconds);
    }

    function addMomentFromDetail(runtime, e) {
        e.preventDefault();
        if (runtime.isReadOnly) {
            showToast(runtime, '읽기 전용 모드입니다.');
            return;
        }

        const time = document.getElementById('new-moment-time').value;
        const text = document.getElementById('new-moment-text').value;
        const selected = document.querySelector('input[name="new-moment-feeling"]:checked');
        const feeling = selected ? selected.value : 'love';

        if (!time || !text) return;

        if (aiTreeDraftDetailActive && aiTreeDraftDetailNode) {
            aiTreeDraftDetailNode.moments.push({ time: time, text: text, feeling: feeling });
            renderMomentsList(runtime, aiTreeDraftDetailNode.moments);
            document.getElementById('new-moment-text').value = '';
            document.getElementById('new-moment-time').value = '';
            showToast(runtime, getIsKorean(runtime) ? '순간이 등록되었습니다!' : 'Moment added!');
            return;
        }

        const node = runtime.state.nodes.find(function (item) {
            return item.id === runtime.state.activeNodeId;
        });
        if (!node) return;

        node.moments.push({ time: time, text: text, feeling: feeling });
        renderMomentsList(runtime, node.moments);
        render(runtime);
        saveDebounced(runtime);
        document.getElementById('new-moment-text').value = '';
        document.getElementById('new-moment-time').value = '';
        updateStats(runtime);
        showToast(runtime, getIsKorean(runtime) ? '순간이 등록되었습니다!' : 'Moment added!');
    }

    function enableEditMode() {
        const form = document.getElementById('edit-form');
        if (form) form.classList.remove('hidden');
    }

    function disableEditMode() {
        const form = document.getElementById('edit-form');
        if (form) form.classList.add('hidden');
    }

    async function saveNodeDetails(runtime, e) {
        e.preventDefault();
        if (runtime.isReadOnly) {
            showToast(runtime, '읽기 전용 모드입니다.');
            return;
        }

        const title = document.getElementById('edit-title').value;
        const date = document.getElementById('edit-date').value;
        const videoUrl = document.getElementById('edit-video').value;
        const description = document.getElementById('edit-description').value;
        const imageFileInput = document.getElementById('edit-image');
        const imageFile = imageFileInput && imageFileInput.files ? imageFileInput.files[0] : null;

        const trimmedVideoUrl = String(videoUrl || '').trim();
        const parsedVideoId = (typeof window.validateYouTubeUrl === 'function')
            ? window.validateYouTubeUrl(trimmedVideoUrl)
            : ((trimmedVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^"&?\/\s]{11})/) || [])[1] || '');

        if (aiTreeDraftDetailActive && aiTreeDraftDetailNode) {
            aiTreeDraftDetailNode.title = title;
            aiTreeDraftDetailNode.date = date;
            aiTreeDraftDetailNode.description = description || '';

            if (!trimmedVideoUrl) {
                aiTreeDraftDetailNode.videoId = '';
            } else if (parsedVideoId) {
                aiTreeDraftDetailNode.videoId = parsedVideoId;
            } else {
                showToast(runtime, '유튜브 주소를 인식하지 못했습니다. 영상은 변경하지 않았습니다.');
                const editVideoEl = document.getElementById('edit-video');
                if (editVideoEl) {
                    editVideoEl.value = aiTreeDraftDetailNode.videoId ? 'https://youtu.be/' + aiTreeDraftDetailNode.videoId : '';
                }
            }

            document.getElementById('detail-title').innerText = aiTreeDraftDetailNode.title;
            document.getElementById('detail-date').innerText = aiTreeDraftDetailNode.date;
            updateDetailVideoEditorUi(runtime);
            updateDetailMedia(runtime, aiTreeDraftDetailNode);
            renderMomentsList(runtime, aiTreeDraftDetailNode.moments);

            if (typeof window.onAiTreeDraftSaved === 'function') {
                window.onAiTreeDraftSaved(aiTreeDraftDetailIndex, aiTreeDraftDetailNode);
            }

            disableEditMode();
            return;
        }

        const node = runtime.state.nodes.find(function (item) {
            return item.id === runtime.state.activeNodeId;
        });
        if (!node) return;

        node.title = title;
        node.date = date;
        node.description = description || '';

        if (!trimmedVideoUrl) {
            node.videoId = '';
        } else if (parsedVideoId) {
            node.videoId = parsedVideoId;
        } else {
            showToast(runtime, '유튜브 주소를 인식하지 못했습니다. 영상은 변경하지 않았습니다.');
            const editVideoEl = document.getElementById('edit-video');
            if (editVideoEl) {
                editVideoEl.value = node.videoId ? 'https://youtu.be/' + node.videoId : '';
            }
        }

        if (imageFile) {
            if (!runtime.currentUser) {
                showToast(runtime, '이미지 업로드는 로그인 후 가능합니다.');
                return;
            }

            try {
                const storageRef = runtime.storage.ref();
                const fileRef = storageRef.child('users/' + runtime.currentUser.uid + '/trees/' + runtime.treeId + '/nodes/' + node.id + '/' + imageFile.name);
                await fileRef.put(imageFile);
                node.imageUrl = await fileRef.getDownloadURL();
            } catch (error) {
                console.error('Image upload failed:', error);
                showToast(runtime, '이미지 업로드 실패: ' + error.message);
                return;
            }
        }

        document.getElementById('detail-title').innerText = title;
        document.getElementById('detail-date').innerText = date;
        updateDetailVideoEditorUi(runtime);
        updateDetailMedia(runtime, node);
        render(runtime);

        const saved = await saveImmediate(runtime, true);
        if (!saved) {
            saveDebounced(runtime);
            showToast(runtime, getIsKorean(runtime) ? '저장되었습니다' : 'Saved');
        }
        disableEditMode();
    }

    function applyAiTreeDraftFromDetail() {
        if (!aiTreeDraftDetailActive || !aiTreeDraftDetailNode) return;
        if (typeof window.onAiTreeDraftApplySingle === 'function') {
            window.onAiTreeDraftApplySingle(aiTreeDraftDetailIndex, aiTreeDraftDetailNode);
        }
        closeDialogById('detail-modal');
    }

    function clearDetailVideoInput(runtime) {
        const input = document.getElementById('edit-video');
        if (input) input.value = '';
        updateDetailVideoEditorUi(runtime);
    }

    function updateDetailVideoEditorUi(runtime) {
        const input = document.getElementById('edit-video');
        const errorEl = document.getElementById('edit-video-error');
        const preview = document.getElementById('edit-video-preview');
        const thumb = document.getElementById('edit-video-thumb');
        const textEl = document.getElementById('edit-video-preview-text');
        const linkEl = document.getElementById('edit-video-preview-link');

        if (!input || !errorEl || !preview || !thumb || !textEl || !linkEl) return;

        const raw = String(input.value || '').trim();
        if (!raw) {
            errorEl.classList.add('hidden');
            preview.classList.add('hidden');
            return;
        }

        const videoId = (typeof window.validateYouTubeUrl === 'function')
            ? window.validateYouTubeUrl(raw)
            : ((raw.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^"&?\/\s]{11})/) || [])[1] || '');

        if (!videoId) {
            errorEl.textContent = '유튜브 URL을 인식하지 못했습니다.';
            errorEl.classList.remove('hidden');
            preview.classList.add('hidden');
            return;
        }

        errorEl.classList.add('hidden');
        preview.classList.remove('hidden');
        thumb.src = (typeof window.getYouTubeThumb === 'function')
            ? window.getYouTubeThumb(videoId)
            : 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';
        textEl.textContent = '영상 ID: ' + videoId;
        linkEl.href = 'https://www.youtube.com/watch?v=' + videoId;
    }

    function renderDetailYouTubeSearchResults(runtime, list) {
        const box = document.getElementById('edit-video-search-result');
        if (!box) return;

        box.innerHTML = '';
        if (!Array.isArray(list) || list.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'text-[11px] text-slate-400';
            empty.textContent = '검색 결과가 없습니다.';
            box.appendChild(empty);
            return;
        }

        list.forEach(function (item) {
            if (!item || !item.videoId) return;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'w-full text-left px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100';
            btn.onclick = function () {
                const input = document.getElementById('edit-video');
                if (input) input.value = 'https://youtu.be/' + item.videoId;
                updateDetailVideoEditorUi(runtime);
            };

            const wrap = document.createElement('div');
            wrap.className = 'flex gap-3 items-start';

            const img = document.createElement('img');
            img.className = 'w-20 h-12 rounded-md border border-slate-200 object-cover bg-slate-100';
            img.alt = 'YouTube Thumbnail';
            img.src = (typeof window.getYouTubeThumb === 'function')
                ? window.getYouTubeThumb(item.videoId)
                : 'https://img.youtube.com/vi/' + item.videoId + '/hqdefault.jpg';

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

    async function searchYouTubeForDetail(runtime) {
        const input = document.getElementById('edit-video-search');
        const box = document.getElementById('edit-video-search-result');
        const titleEl = document.getElementById('edit-title');
        const query = (input && input.value && input.value.trim())
            ? input.value.trim()
            : (titleEl && titleEl.value ? titleEl.value.trim() : '');

        if (!box) return;
        if (!query) {
            box.innerHTML = '<p class="text-[11px] text-slate-400">검색어를 입력해 주세요.</p>';
            return;
        }

        box.innerHTML = '<p class="text-[11px] text-slate-400">YouTube에서 검색 중...</p>';

        try {
            if (typeof window.callAiHelperApi !== 'function') {
                box.innerHTML = '<p class="text-[11px] text-slate-400">검색 기능을 사용할 수 없습니다.</p>';
                return;
            }

            const result = await window.callAiHelperApi('youtube_search', { query: query, maxResults: 6 });
            renderDetailYouTubeSearchResults(runtime, result);
        } catch (e) {
            box.innerHTML = '<p class="text-[11px] text-slate-400">검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>';
        }
    }

    async function recommendYouTubeForDetail(runtime) {
        const input = document.getElementById('edit-video-search');
        const box = document.getElementById('edit-video-search-result');
        const titleEl = document.getElementById('edit-title');
        const treeTitleEl = document.getElementById('tree-title');
        if (!box) return;

        const nodeTitle = titleEl && titleEl.value ? String(titleEl.value).trim() : '';
        const treeTitle = treeTitleEl ? String(treeTitleEl.innerText || '').trim() : '';
        const query = [treeTitle, nodeTitle, '무대'].filter(Boolean).join(' ');

        if (!query) {
            box.innerHTML = '<p class="text-[11px] text-slate-400">추천을 만들 수 없습니다.</p>';
            return;
        }

        if (input && (!input.value || !input.value.trim())) {
            input.value = query;
        }

        box.innerHTML = '<p class="text-[11px] text-slate-400">YouTube 추천을 불러오는 중...</p>';

        try {
            if (typeof window.callAiHelperApi !== 'function') {
                box.innerHTML = '<p class="text-[11px] text-slate-400">추천 기능을 사용할 수 없습니다.</p>';
                return;
            }

            const result = await window.callAiHelperApi('youtube_search', { query: query, maxResults: 3 });
            renderDetailYouTubeSearchResults(runtime, result);
        } catch (e) {
            box.innerHTML = '<p class="text-[11px] text-slate-400">추천 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>';
        }
    }

    function setupDetailVideoEditor(runtime) {
        const editVideo = document.getElementById('edit-video');
        if (editVideo && !editVideo.dataset.bound) {
            editVideo.addEventListener('input', function () {
                updateDetailVideoEditorUi(runtime);
            });
            editVideo.dataset.bound = '1';
        }

        const searchInput = document.getElementById('edit-video-search');
        if (searchInput && !searchInput.dataset.bound) {
            searchInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchYouTubeForDetail(runtime);
                }
            });
            searchInput.dataset.bound = '1';
        }
    }

    function removeImage(runtime) {
        const node = runtime.state.nodes.find(function (item) {
            return item.id === runtime.state.activeNodeId;
        });
        if (!node) return;

        delete node.imageUrl;
        const editImage = document.getElementById('edit-image');
        const container = document.getElementById('image-preview-container');
        if (editImage) editImage.value = '';
        if (container) container.classList.add('hidden');

        updateDetailMedia(runtime, node);
        render(runtime);
        saveDebounced(runtime);
    }

    function createNewNode(runtime) {
        if (runtime.isReadOnly) return;

        const transform = runtime.state.transform || { x: 0, y: 0, k: 1 };
        const zoom = transform.k || 1;
        const newNode = {
            id: Date.now(),
            x: -transform.x / zoom + window.innerWidth / 2 / zoom - 140,
            y: -transform.y / zoom + window.innerHeight / 2 / zoom - 100,
            title: 'New Moment',
            date: new Date().toISOString().split('T')[0],
            videoId: '',
            moments: []
        };

        runtime.state.nodes.push(newNode);
        runtime.state.activeNodeId = newNode.id;
        render(runtime);
        saveDebounced(runtime);
        openDetailModal(runtime, newNode);
        updateStats(runtime);

        setTimeout(function () {
            enableEditMode();
        }, 100);
    }

    function deleteNode(runtime) {
        if (runtime.isReadOnly) return;

        const node = runtime.state.nodes.find(function (item) {
            return item.id === runtime.state.activeNodeId;
        });
        if (!node) return;

        if (!confirm(getIsKorean(runtime) ? '"' + node.title + '" 노드를 삭제하시겠습니까?' : 'Delete "' + node.title + '"?')) {
            return;
        }

        runtime.state.edges = runtime.state.edges.filter(function (edge) {
            return edge.from !== node.id && edge.to !== node.id;
        });
        runtime.state.nodes = runtime.state.nodes.filter(function (item) {
            return item.id !== node.id;
        });
        runtime.state.activeNodeId = null;
        runtime.state.selectedNode = null;

        closeModal(runtime, 'detail-modal');
        render(runtime);
        saveDebounced(runtime);
        updateStats(runtime);
        showToast(runtime, getIsKorean(runtime) ? '노드가 삭제되었습니다' : 'Node deleted');
    }

    function closeModal(runtime, id) {
        closeDialogById(id);

        const iframe = document.getElementById('detail-video');
        if (iframe) {
            iframe.src = '';
        }

        if (id === 'detail-modal') {
            resetAiTreeDraftDetail();
        }
    }

    function bindDetailModalDismiss(runtime) {
        const detailModalEl = document.getElementById('detail-modal');
        if (!detailModalEl || detailModalEl.dataset.dismissBound) return;

        detailModalEl.addEventListener('click', function (e) {
            const rect = detailModalEl.getBoundingClientRect();
            const isInDialog = (
                rect.top <= e.clientY && e.clientY <= rect.bottom &&
                rect.left <= e.clientX && e.clientX <= rect.right
            );

            if (!isInDialog) {
                closeModal(runtime, 'detail-modal');
            }
        });

        detailModalEl.dataset.dismissBound = '1';
    }

    window.EditorDetailHelpers = {
        setYouTubeApiReady: setYouTubeApiReady,
        startVideo: startVideo,
        setCurrentMomentTime: setCurrentMomentTime,
        openDetailModal: openDetailModal,
        openDetailModalForAiTreeSuggestion: openDetailModalForAiTreeSuggestion,
        resetAiTreeDraftDetail: resetAiTreeDraftDetail,
        renderMomentsList: renderMomentsList,
        getFeelingEmoji: getFeelingEmoji,
        seekVideo: seekVideo,
        addMomentFromDetail: addMomentFromDetail,
        enableEditMode: enableEditMode,
        disableEditMode: disableEditMode,
        saveNodeDetails: saveNodeDetails,
        applyAiTreeDraftFromDetail: applyAiTreeDraftFromDetail,
        clearDetailVideoInput: clearDetailVideoInput,
        updateDetailVideoEditorUi: updateDetailVideoEditorUi,
        renderDetailYouTubeSearchResults: renderDetailYouTubeSearchResults,
        searchYouTubeForDetail: searchYouTubeForDetail,
        recommendYouTubeForDetail: recommendYouTubeForDetail,
        setupDetailVideoEditor: setupDetailVideoEditor,
        removeImage: removeImage,
        updateDetailMedia: updateDetailMedia,
        createNewNode: createNewNode,
        deleteNode: deleteNode,
        closeModal: closeModal,
        bindDetailModalDismiss: bindDetailModalDismiss
    };
})();
