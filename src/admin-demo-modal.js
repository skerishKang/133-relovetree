(function () {
    const DEMO_MODAL_CONFIG = {
        users: {
            title: '데모 사용자 생성',
            description: '대시보드와 사용자 관리 화면에 표시할 데모 사용자를 몇 명까지 생성할지 입력하세요. 비워두면 기본 개수로 생성됩니다.'
        },
        trees: {
            title: '데모 러브트리 생성',
            description: '홈과 에디터에서 사용할 데모 러브트리를 몇 개까지 생성할지 입력하세요. 비워두면 기본 개수로 생성됩니다.'
        },
        community: {
            title: '커뮤니티 데모 글 생성',
            description: '커뮤니티 목록에 표시할 데모 글을 몇 개까지 생성할지 입력하세요. 비워두면 기본 개수로 생성됩니다.'
        },
        default: {
            title: '데모 데이터 생성',
            description: '생성할 개수를 입력하세요. 비워두면 기본 개수로 생성됩니다.'
        }
    };

    function getModalConfig(mode) {
        return DEMO_MODAL_CONFIG[mode] || DEMO_MODAL_CONFIG.default;
    }

    function openDemoSeedModal(mode) {
        window.currentDemoSeedMode = mode;
        
        const modal = document.getElementById('demoSeedModal');
        const titleEl = document.getElementById('demoSeedTitle');
        const descEl = document.getElementById('demoSeedDescription');
        const inputEl = document.getElementById('demoSeedCount');

        if (!modal || !titleEl || !descEl || !inputEl) return;

        const config = getModalConfig(mode);
        titleEl.textContent = config.title;
        descEl.textContent = config.description;
        inputEl.value = '';
        modal.classList.remove('is-hidden');
    }

    function closeDemoSeedModal() {
        const modal = document.getElementById('demoSeedModal');
        if (!modal) return;
        modal.classList.add('is-hidden');
        window.currentDemoSeedMode = null;
    }

    function showDemoSeedError(message) {
        alert('데모 데이터 생성 중 오류가 발생했습니다: ' + message);
    }

    function showDemoSeedSuccess(type, count) {
        const typeLabel = {
            users: '사용자',
            trees: '러브트리',
            community: '글'
        };
        const label = typeLabel[type] || '데이터';
        alert(`데모 ${label} ${count}개를 생성했습니다.`);
    }

    function showDemoSeedNoChange(type) {
        const typeLabel = {
            users: '데모 사용자가',
            trees: '데모 러브트리가',
            community: '데모 글이'
        };
        const label = typeLabel[type] || '데이터가';
        alert(`새로 생성된 ${label} 없습니다. (이미 같은 ID의 데이터가 있습니다)`);
    }

    function parseSeedCount(value) {
        if (!value || value === '') return null;
        const parsed = parseInt(value, 10);
        return (typeof parsed === 'number' && parsed > 0) ? parsed : null;
    }

    window.AdminDemoModal = {
        openDemoSeedModal,
        closeDemoSeedModal,
        showDemoSeedError,
        showDemoSeedSuccess,
        showDemoSeedNoChange,
        parseSeedCount,
        getModalConfig
    };
    window.openDemoSeedModal = openDemoSeedModal;
    window.closeDemoSeedModal = closeDemoSeedModal;
})();