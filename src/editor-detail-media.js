(function () {
    let ytPlayer = null;
    let youTubeApiReady = false;

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

                if (iframe) iframe.classList.remove('is-hidden');
                if (placeholder) placeholder.classList.add('is-hidden');
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
            iframe.classList.remove('is-hidden');
        }
        if (placeholder) {
            placeholder.classList.add('is-hidden');
        }
    }

    function setCurrentMomentTime() {
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

    function updateDetailMedia(runtime, node) {
        const iframe = document.getElementById('detail-video');
        const placeholder = document.getElementById('video-placeholder');
        const externalLink = document.getElementById('external-link');
        if (!iframe || !placeholder || !externalLink) return;

        iframe.src = '';
        iframe.classList.add('is-hidden');
        placeholder.classList.remove('is-hidden');
        placeholder.style.backgroundImage = '';
        placeholder.innerHTML = `
            <div class="editor-video-empty-state">
                <div class="editor-video-empty-icon">
                <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                </svg>
                </div>
                <p class="editor-video-empty-title">영상을 보려면 클릭하세요</p>
                <p class="editor-video-empty-copy">썸네일은 숨기고, 재생 시에만 영상을 불러옵니다.</p>
            </div>
        `;
        externalLink.classList.add('is-hidden');

        if (node && node.videoId) {
            placeholder.onclick = function () {
                startVideo(runtime, node.videoId);
            };
            externalLink.href = 'https://www.youtube.com/watch?v=' + node.videoId;
            externalLink.classList.remove('is-hidden');
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
            <div class="editor-video-empty-state">
                <div class="editor-video-empty-icon">
                <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                </svg>
                </div>
                <p class="editor-video-empty-title">유튜브 영상을 추가하려면 클릭하세요</p>
                <p class="editor-video-empty-copy">우측 편집 영역에서 유튜브 URL을 입력하면 바로 재생할 수 있어요.</p>
            </div>
        `;
        placeholder.onclick = function () {
            if (runtime.isReadOnly) {
                if (runtime && typeof runtime.showToast === 'function') {
                    runtime.showToast('읽기 전용 모드입니다.');
                } else if (typeof window.showToast === 'function') {
                    window.showToast('읽기 전용 모드입니다.');
                }
                return;
            }

            if (window.EditorDetailHelpers && typeof window.EditorDetailHelpers.enableEditMode === 'function') {
                window.EditorDetailHelpers.enableEditMode(runtime);
            }
            const videoInput = document.getElementById('edit-video');
            if (videoInput) {
                videoInput.focus();
            }
        };
    }

    function updateDetailVideoEditorUi() {
        const input = document.getElementById('edit-video');
        const errorEl = document.getElementById('edit-video-error');
        const preview = document.getElementById('edit-video-preview');
        const thumb = document.getElementById('edit-video-thumb');
        const textEl = document.getElementById('edit-video-preview-text');
        const linkEl = document.getElementById('edit-video-preview-link');

        if (!input || !errorEl || !preview || !thumb || !textEl || !linkEl) return;

        const raw = String(input.value || '').trim();
        if (!raw) {
            errorEl.classList.add('is-hidden');
            preview.classList.add('is-hidden');
            return;
        }

        const videoId = (typeof window.validateYouTubeUrl === 'function')
            ? window.validateYouTubeUrl(raw)
            : ((raw.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^"&?\/\s]{11})/) || [])[1] || '');

        if (!videoId) {
            errorEl.textContent = '유튜브 URL을 인식하지 못했습니다.';
            errorEl.classList.remove('is-hidden');
            preview.classList.add('is-hidden');
            return;
        }

        errorEl.classList.add('is-hidden');
        preview.classList.remove('is-hidden');
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
            empty.className = 'editor-empty-copy';
            empty.textContent = '검색 결과가 없습니다.';
            box.appendChild(empty);
            return;
        }

        list.forEach(function (item) {
            if (!item || !item.videoId) return;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'editor-search-option';
            btn.onclick = function () {
                const input = document.getElementById('edit-video');
                if (input) input.value = 'https://youtu.be/' + item.videoId;
                updateDetailVideoEditorUi(runtime);
            };

            const wrap = document.createElement('div');
            wrap.className = 'editor-search-preview';

            const img = document.createElement('img');
            img.className = 'editor-search-preview-thumb';
            img.alt = 'YouTube Thumbnail';
            img.src = (typeof window.getYouTubeThumb === 'function')
                ? window.getYouTubeThumb(item.videoId)
                : 'https://img.youtube.com/vi/' + item.videoId + '/hqdefault.jpg';

            const meta = document.createElement('div');
            meta.className = 'editor-search-preview-meta';

            const title = document.createElement('p');
            title.className = 'editor-search-preview-title';
            title.textContent = String(item.title || '제목 없음');

            const sub = document.createElement('p');
            sub.className = 'editor-search-preview-sub';
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
            box.innerHTML = '<p class="editor-empty-copy">검색어를 입력해 주세요.</p>';
            return;
        }

        box.innerHTML = '<p class="editor-empty-copy">YouTube에서 검색 중...</p>';

        try {
            if (typeof window.callAiHelperApi !== 'function') {
                box.innerHTML = '<p class="editor-empty-copy">검색 기능을 사용할 수 없습니다.</p>';
                return;
            }

            const result = await window.callAiHelperApi('youtube_search', { query: query, maxResults: 6 });
            renderDetailYouTubeSearchResults(runtime, result);
        } catch (e) {
            box.innerHTML = '<p class="editor-empty-copy">검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>';
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
            box.innerHTML = '<p class="editor-empty-copy">추천을 만들 수 없습니다.</p>';
            return;
        }

        if (input && (!input.value || !input.value.trim())) {
            input.value = query;
        }

        box.innerHTML = '<p class="editor-empty-copy">YouTube 추천을 불러오는 중...</p>';

        try {
            if (typeof window.callAiHelperApi !== 'function') {
                box.innerHTML = '<p class="editor-empty-copy">추천 기능을 사용할 수 없습니다.</p>';
                return;
            }

            const result = await window.callAiHelperApi('youtube_search', { query: query, maxResults: 3 });
            renderDetailYouTubeSearchResults(runtime, result);
        } catch (e) {
            box.innerHTML = '<p class="editor-empty-copy">추천 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>';
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

    window.EditorDetailMediaHelpers = {
        setYouTubeApiReady: setYouTubeApiReady,
        startVideo: startVideo,
        setCurrentMomentTime: setCurrentMomentTime,
        updateDetailMedia: updateDetailMedia,
        updateDetailVideoEditorUi: updateDetailVideoEditorUi,
        renderDetailYouTubeSearchResults: renderDetailYouTubeSearchResults,
        searchYouTubeForDetail: searchYouTubeForDetail,
        recommendYouTubeForDetail: recommendYouTubeForDetail,
        setupDetailVideoEditor: setupDetailVideoEditor
    };
})();
