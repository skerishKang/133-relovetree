/**
 * Lovetree - Index Page Runtime & Orchestration
 * Handles mobile shell, menu interactions, and main data loading flows.
 */

window.IndexRuntime = (function() {
    /**
     * Load and display "Recent Trees" from LocalStorage (비로그인/백업용)
     */
    function loadRecentTrees() {
        if (!window.elements.recentTreesScroll || !window.elements.recentSection) return;

        const myTrees = window.IndexDataLoader.loadRecentTreesFromLocalStorage();

        window.IndexRender.renderMyTreesGrid([], window.renderHomeTreeCard);
        if (myTrees.length > 0) {
            window.IndexRender.renderRecentTreesFromList(myTrees);
        } else {
            if (window.elements.recentTreesScroll.children.length === 0) {
                window.elements.recentTreesScroll.innerHTML = '<div class=\'text-sm text-slate-400 py-4 px-2\'>최근 방문 기록이 없습니다.</div>';
            }
        }
    }

    /**
     * Firestore에서 현재 사용자(ownerId 기준) 트리를 불러오기
     */
    async function loadUserTreesFromFirestore(user) {
        if (!user) {
            loadRecentTrees();
            return;
        }

        const myTrees = await window.IndexDataLoader.loadUserTreesFromFirestore(user);
        if (!myTrees) {
            loadRecentTrees();
            return;
        }

        if (window.elements.localMigrationBanner) {
            const existingIds = new Set(myTrees.map(t => t.id));
            const localOnlyCount = window.IndexDataLoader.countLocalOnlyTrees(existingIds);

            if (localOnlyCount > 0) {
                window.elements.localMigrationBanner.classList.remove('is-hidden');
                const textEl = document.getElementById('local-migration-text');
                if (textEl) {
                    textEl.textContent = '이 기기에만 저장된 러브트리 ' + localOnlyCount + '개를 계정으로 가져올 수 있습니다.';
                }
            } else {
                window.elements.localMigrationBanner.classList.add('is-hidden');
            }
        }

        window.IndexRender.renderMyTreesGrid(myTrees, window.renderHomeTreeCard);
        window.IndexRender.renderRecentTreesFromList(myTrees);
        window.myTreesCache = myTrees.slice();
    }

    /**
     * 최근 만들어진 러브트리 섹션용 그리드 렌더러 (전역 최신 트리 기준)
     */
    async function loadRecentCreatedTrees() {
        const section = document.getElementById('recent-created-section');
        const grid = document.getElementById('recent-created-grid');

        if (!section || !grid) return;

        section.classList.add('is-hidden');

        const trees = await window.IndexDataLoader.loadRecentCreatedTreesFromFirestore();
        if (!trees || trees.length === 0) return;

        window.recentCreatedTreesCache = trees.slice();

        const cardsHTML = trees.map((tree) => {
            const updatedDate = (tree.lastUpdated || '').slice(0, 10);
            return window.renderHomeTreeCard(tree, {
                title: `${tree.name || '?'} 러브트리 보기`,
                subtitle: `최근 업데이트: ${updatedDate}`
            });
        }).join('');

        grid.innerHTML = cardsHTML;
        section.classList.remove('is-hidden');
    }

    /**
     * 모바일 메뉴 가시성 조절
     */
    function setMobileMenuVisible(visible) {
        const panel = document.getElementById('mobile-menu-panel');
        if (!panel) return;
        if (visible) {
            panel.classList.remove('is-hidden');
        } else {
            panel.classList.add('is-hidden');
        }
    }

    function toggleMobileMenu() {
        const panel = document.getElementById('mobile-menu-panel');
        if (!panel) return;
        const isHidden = panel.classList.contains('is-hidden');
        setMobileMenuVisible(isHidden);
    }

    function navigateToHome() {
        setMobileMenuVisible(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function scrollToMyTrees() {
        setMobileMenuVisible(false);
        const section = document.getElementById('my-created-trees-section');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function scrollToAllTrees() {
        setMobileMenuVisible(false);
        const section = document.getElementById('discovery-section');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    return {
        loadRecentTrees,
        loadUserTreesFromFirestore,
        loadRecentCreatedTrees,
        setMobileMenuVisible,
        toggleMobileMenu,
        navigateToHome,
        scrollToMyTrees,
        scrollToAllTrees
    };
})();
