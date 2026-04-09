(function () {
    function debounce(func, wait) {
        var timeout;
        return function () {
            var context = this;
            var args = arguments;
            var later = function () {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Must be called early from the page entry before render/update helpers use window.elements.
    function cacheElements() {
        window.elements = {
            pageTitle: document.getElementById('page-title'),
            pageSubtitle: document.getElementById('page-subtitle'),
            btnCreate: document.getElementById('btn-create'),
            btnCancel: document.getElementById('btn-cancel'),
            btnStart: document.getElementById('btn-start'),
            langBtn: document.getElementById('lang-btn'),
            modalTitle: document.getElementById('modal-title'),
            modalDesc: document.getElementById('modal-desc'),
            labelName: document.getElementById('label-name'),
            mainGrid: document.getElementById('main-grid'),
            artistCardsContainer: document.getElementById('popular-feed'),
            popularArtistsList: document.getElementById('popular-artists-list'),
            recentTreesScroll: document.getElementById('recent-trees-scroll'),
            recentSection: document.getElementById('recent-section'),
            myCreatedTreesSection: document.getElementById('my-created-trees-section'),
            localMigrationBanner: document.getElementById('local-migration-banner'),
            recentCreatedSection: document.getElementById('recent-created-section'),
            recentCreatedGrid: document.getElementById('recent-created-grid')
        };
    }

    function showLoading() {
        var indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.classList.remove('is-hidden');
        }
    }

    function hideLoading() {
        var indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.classList.add('is-hidden');
        }
    }

    function initializeLazyLoading() {
        if (!('IntersectionObserver' in window)) return;

        var imageObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('loading-skeleton');
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
            img.classList.add('loading-skeleton');
            imageObserver.observe(img);
        });
    }

    function bindClickIfExists(id, handler) {
        var element = document.getElementById(id);
        if (!element || typeof handler !== 'function') return null;
        element.addEventListener('click', handler);
        return element;
    }

    function onDomReady(callback) {
        if (typeof callback !== 'function') return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
            return;
        }
        callback();
    }

    window.IndexUtils = {
        debounce: debounce,
        cacheElements: cacheElements,
        showLoading: showLoading,
        hideLoading: hideLoading,
        initializeLazyLoading: initializeLazyLoading,
        bindClickIfExists: bindClickIfExists,
        onDomReady: onDomReady
    };
})();
