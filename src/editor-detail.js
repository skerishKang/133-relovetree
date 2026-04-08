(function () {
    let aiTreeDraftDetailActive = false;
    let aiTreeDraftDetailIndex = null;
    let aiTreeDraftDetailNode = null;

    function media() {
        return window.EditorDetailMediaHelpers || {};
    }

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
        if (typeof media().setYouTubeApiReady === 'function') {
            media().setYouTubeApiReady();
        }
    }

    function startVideo(runtime, videoId, startSeconds) {
        if (typeof media().startVideo === 'function') {
            return media().startVideo(runtime, videoId, startSeconds);
        }
    }

    function setCurrentMomentTime(runtime) {
        if (typeof media().setCurrentMomentTime === 'function') {
            return media().setCurrentMomentTime(runtime);
        }
    }

    function setAiTreeDraftDetailUi(active) {
        aiTreeDraftDetailActive = !!active;
        const applyBtn = document.getElementById('ai-draft-apply-btn');
        const saveBtn = document.getElementById('edit-save-btn');

        if (applyBtn) {
            applyBtn.classList.toggle('is-hidden', !aiTreeDraftDetailActive);
        }
        if (saveBtn) {
            saveBtn.textContent = aiTreeDraftDetailActive ? '제안 저장' : '저장';
        }

        const deleteBtn = document.querySelector('#detail-modal [title="삭제"]');
        if (deleteBtn) {
            deleteBtn.classList.toggle('is-hidden', aiTreeDraftDetailActive);
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
            list.innerHTML = '<div class="editor-moment-empty">아직 기록된 순간이 없습니다.<br>영상을 보며 감정을 남겨보세요!</div>';
            return;
        }

        moments.forEach(function (m) {
            const el = document.createElement('div');
            el.className = 'editor-moment-card';
            el.innerHTML = `
                <div class="editor-moment-avatar">
                    ${getFeelingEmoji(m.feeling)}
                </div>
                <div class="editor-moment-bubble">
                    <div class="editor-moment-head">
                        <span class="editor-moment-time-chip" onclick="seekVideo('${m.time}')">
                            ${m.time}
                        </span>
                        <span class="editor-moment-author">User</span>
                    </div>
                    <p class="editor-moment-copy">${m.text}</p>
                </div>
            `;
            list.appendChild(el);
        });
    }

    function updateDetailMedia(runtime, node) {
        if (typeof media().updateDetailMedia === 'function') {
            return media().updateDetailMedia(runtime, node);
        }
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
                imagePreviewContainer.classList.remove('is-hidden');
            } else {
                imagePreviewContainer.classList.add('is-hidden');
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
        if (form) form.classList.remove('is-hidden');
    }

    function disableEditMode() {
        const form = document.getElementById('edit-form');
        if (form) form.classList.add('is-hidden');
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
        if (typeof media().updateDetailVideoEditorUi === 'function') {
            return media().updateDetailVideoEditorUi(runtime);
        }
    }

    function renderDetailYouTubeSearchResults(runtime, list) {
        if (typeof media().renderDetailYouTubeSearchResults === 'function') {
            return media().renderDetailYouTubeSearchResults(runtime, list);
        }
    }

    async function searchYouTubeForDetail(runtime) {
        if (typeof media().searchYouTubeForDetail === 'function') {
            return media().searchYouTubeForDetail(runtime);
        }
    }

    async function recommendYouTubeForDetail(runtime) {
        if (typeof media().recommendYouTubeForDetail === 'function') {
            return media().recommendYouTubeForDetail(runtime);
        }
    }

    function setupDetailVideoEditor(runtime) {
        if (typeof media().setupDetailVideoEditor === 'function') {
            return media().setupDetailVideoEditor(runtime);
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
        if (container) container.classList.add('is-hidden');

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
