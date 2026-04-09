(function () {
    const COLORS = ['purple', 'blue', 'red', 'green', 'pink', 'indigo', 'teal'];

    function getFallbackColor(colorKey) {
        const palette = {
            purple: '#e9d5ff',
            blue: '#dbeafe',
            red: '#fecaca',
            green: '#dcfce7',
            pink: '#fce7f3'
        };
        return palette[colorKey] || '#f1f5f9';
    }

    function resolveArtistThumbnail(artist) {
        if (artist.thumbnail) return artist.thumbnail;
        if (artist.videoId && typeof getYouTubeThumb === 'function') {
            const videoThumb = getYouTubeThumb(artist.videoId);
            if (videoThumb) return videoThumb;
        }
        return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.defaultThumbnail)
            ? APP_CONFIG.defaultThumbnail
            : '';
    }

    function createArtistCard(artist) {
        const thumbnailSrc = resolveArtistThumbnail(artist);
        const defaultThumb = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.defaultThumbnail)
            ? APP_CONFIG.defaultThumbnail
            : '';

        return `
        <a href="/pages/editor.html?id=${artist.id}"
            data-artist-id="${artist.id}"
            class="artist-card">
            
            <div class="artist-card-header">
                <div class="artist-card-profile">
                    <div class="artist-card-avatar bg-${artist.color}-100 text-${artist.color}-600">
                        ${artist.name.charAt(0)}
                    </div>
                    <div class="artist-card-copy">
                        <p class="artist-card-name">${artist.name}</p>
                        <p class="artist-card-subtitle">${artist.englishName}</p>
                    </div>
                </div>
                <button class="artist-card-menu">
                    <svg class="ui-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                </button>
            </div>

            <div class="artist-card-thumb group/thumb">
                <img src="${thumbnailSrc}" alt="${artist.name}의 러브트리 썸네일"
                    class="artist-card-thumb-image"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='${defaultThumb}';">
                <div class="artist-card-thumb-overlay">
                    <div class="artist-card-play">
                        <svg class="ui-icon-md icon-svg-nudge text-slate-900" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                        <span class="sr-only">러브트리 열기</span>
                    </div>
                </div>
            </div>

            <div class="artist-card-actions">
                <button type="button" class="artist-card-action artist-card-action-like group/btn" title="좋아요" aria-label="좋아요">
                    <svg class="artist-card-action-icon group-hover/btn:fill-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </button>
                <button type="button" class="artist-card-action artist-card-action-comment group/btn" title="댓글" aria-label="댓글">
                    <svg class="artist-card-action-icon group-hover/btn:fill-blue-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </button>
                <button type="button" class="artist-card-action artist-card-action-share group/btn" title="공유하기" aria-label="공유하기">
                    <svg class="artist-card-action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                </button>
            </div>

            <div class="artist-card-footer">
                <p class="artist-card-footer-title">${artist.moments}개의 순간이 기록됨</p>
                <p class="artist-card-footer-meta">${artist.lastUpdate} 업데이트</p>
            </div>
        </a>
    `;
    }

    function renderArtistCards(popularArtists) {
        const feedContainer = document.getElementById('popular-feed');
        if (!feedContainer) return;
        const cardsHTML = (popularArtists || []).map(artist => createArtistCard(artist)).join('');
        feedContainer.innerHTML = cardsHTML;
    }

    function renderRecentTreesFromList(myTrees) {
        const recentTreesScroll = document.getElementById('recent-trees-scroll');
        const recentSection = document.getElementById('recent-section');
        if (!recentTreesScroll || !recentSection) return;

        if (!myTrees || myTrees.length === 0) {
            recentSection.classList.remove('is-hidden');
            recentTreesScroll.innerHTML = `
                <div class="home-recent-empty">
                    <div class="initials-avatar mb-2">
                        <svg class="ui-icon-md icon-svg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <span class="home-recent-empty-label">방문 기록 없음</span>
                </div>
            `;
            return;
        }

        recentSection.classList.remove('is-hidden');

        const myTreesHTML = myTrees.map(tree => {
            const colorIndex = tree.id.length % COLORS.length;
            const color = COLORS[colorIndex];

            return `
                <a href="/pages/editor.html?id=${encodeURIComponent(tree.id)}"
                    class="home-recent-item group">
                    <div class="home-recent-avatar-shell bg-${color}-100 border-${color}-200 group-hover:border-${color}-500">
                        <div class="home-recent-avatar-core text-${color}-500">
                            ${tree.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <span class="home-recent-name">${tree.name}</span>
                </a>
            `;
        }).join('');

        recentTreesScroll.innerHTML = myTreesHTML;
    }

    function renderMyTreesGrid(myTrees, renderHomeTreeCardFn) {
        const grid = document.getElementById('my-created-grid');
        const placeholder = document.getElementById('my-created-list');
        if (!grid) return;

        const placeholderTitle = document.getElementById('my-created-placeholder-title');
        const placeholderDesc = document.getElementById('my-created-placeholder-desc');
        const loginBtn = document.getElementById('my-created-login-btn');
        const createBtn = document.getElementById('my-created-create-btn');
        const iconBtn = document.getElementById('my-created-placeholder-icon');

        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        const loggedIn = !!user;
        const isKorean = typeof window.IndexI18n !== 'undefined' ? window.IndexI18n.isKorean : true;

        if (!myTrees || myTrees.length === 0) {
            if (loggedIn) {
                if (placeholderTitle) placeholderTitle.textContent = isKorean ? '나만의 러브트리를 시작해 보세요' : 'Start your own LoveTree';
                if (placeholderDesc) placeholderDesc.textContent = isKorean ? '아직 만들어진 트리가 없습니다. 좋아하는 아티스트의 첫 번째 순간을 지금 기록해 보세요!' : 'No trees yet. Record your first moment with your favorite artist now!';
                if (loginBtn) loginBtn.classList.add('is-hidden');
                if (createBtn) {
                    createBtn.classList.remove('is-hidden');
                    createBtn.textContent = isKorean ? '+ 첫 트리 만들기' : '+ Create First Tree';
                }
                if (iconBtn && typeof openCreateModal === 'function') iconBtn.onclick = openCreateModal;
            } else {
                if (placeholderTitle) placeholderTitle.textContent = isKorean ? '내 러브트리를 안전하게 보관하세요' : 'Keep your LoveTrees safe';
                if (placeholderDesc) placeholderDesc.textContent = isKorean ? '로그인하면 내가 만든 트리를 모든 기기에서 확인하고 관리할 수 있습니다.' : 'Log in to access your trees from any device.';
                if (loginBtn) {
                    loginBtn.classList.remove('is-hidden');
                    loginBtn.textContent = isKorean ? '지금 로그인하기' : 'Login Now';
                }
                if (createBtn) createBtn.classList.add('is-hidden');
                if (iconBtn && typeof openSettingsModal === 'function') {
                    iconBtn.onclick = openSettingsModal;
                }
            }

            grid.classList.add('is-hidden');
            grid.innerHTML = '';
            if (placeholder) placeholder.classList.remove('is-hidden');
            return;
        }

        const cardsHTML = myTrees.map(tree => {
            const updated = (tree.lastUpdated || '').slice(0, 10);
            return renderHomeTreeCardFn(tree, {
                title: `${tree.name} 러브트리 계속 편집하기`,
                subtitle: `최근 업데이트: ${updated}`
            });
        }).join('');

        grid.innerHTML = cardsHTML;
        grid.classList.remove('is-hidden');
        if (placeholder) placeholder.classList.add('is-hidden');
    }

    function updateMyCreatedTreesPlaceholder() {
        // Called by language toggle - just re-render current state
    }

    window.renderArtistCards = renderArtistCards;
    window.IndexRender = {
        getFallbackColor,
        resolveArtistThumbnail,
        createArtistCard,
        renderArtistCards,
        renderRecentTreesFromList,
        renderMyTreesGrid,
        updateMyCreatedTreesPlaceholder
    };
})();
