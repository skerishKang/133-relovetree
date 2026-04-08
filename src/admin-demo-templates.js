(function () {
    const DEMO_USER_TEMPLATES = [
        {
            uid: 'demo-user-01',
            email: 'demo-army@demo.local',
            displayName: '데모 아미',
            userId: 'demo_army',
            role: 'free',
            isDemo: true
        },
        {
            uid: 'demo-user-02',
            email: 'demo-carat@demo.local',
            displayName: '데모 캐럿',
            userId: 'demo_carat',
            role: 'pro',
            isDemo: true
        },
        {
            uid: 'demo-user-03',
            email: 'demo-stay@demo.local',
            displayName: '데모 스테이',
            userId: 'demo_stay',
            role: 'free',
            isDemo: true
        },
        {
            uid: 'demo-user-04',
            email: 'demo-diver@demo.local',
            displayName: '데모 다이브',
            userId: 'demo_diver',
            role: 'free',
            isDemo: true
        },
        {
            uid: 'ai-user-01',
            email: 'ai-bot@demo.local',
            displayName: 'Relovetree AI',
            userId: 'relovetree_ai',
            role: 'free',
            isDemo: false,
            isAiBot: true
        }
    ];

    const DEMO_TREE_TEMPLATES = [
        { id: 'demo-tree-bts', name: '방탄소년단 타임라인 데모', baseTitle: 'BTS 활동 정리' },
        { id: 'demo-tree-svt', name: '세븐틴 투어 히스토리 데모', baseTitle: '세븐틴 투어 기록' },
        { id: 'demo-tree-skz', name: '스트레이 키즈 컴백 타임라인 데모', baseTitle: '스트레이 키즈 컴백 정리' },
        { id: 'demo-tree-newjeans', name: '뉴진스 활동 모먼트 데모', baseTitle: '뉴진스 활동 정리' },
        { id: 'demo-tree-illit', name: '아일릿 성장기 데모', baseTitle: '아일릿 활동 타임라인' },
        { id: 'demo-tree-ive', name: '아이브 모먼트 데모', baseTitle: '아이브 활동 기록' },
        { id: 'demo-tree-leserafim', name: '르세라핌 모먼트 데모', baseTitle: '르세라핌 활동 기록' },
        { id: 'demo-tree-aespa', name: '에스파 모먼트 데모', baseTitle: '에스파 컴백 기록' },
        { id: 'demo-tree-riize', name: '라이즈 모먼트 데모', baseTitle: '라이즈 활동 기록' },
        { id: 'demo-tree-iu', name: '아이유 모먼트 데모', baseTitle: '아이유 활동 기록' }
    ];

    const DEMO_COMMUNITY_TEMPLATES = [
        {
            title: 'Relovetree로 덕질 기록하는 법',
            content: '처음 오신 분들을 위해 Relovetree를 어떻게 쓰면 좋은지 간단히 정리해봤어요.\n1) 아티스트 러브트리를 만들고\n2) 입덕부터 최신 활동까지 순간들을 노드로 추가해 보세요.'
        },
        {
            title: '내 최애 무대 추천 스레드',
            content: '각자 최애 무대 하나씩만 링크와 함께 추천해 주세요!\n왜 이 무대를 좋아하는지도 한 줄로 적어주면 더 좋아요 :)'
        },
        {
            title: '덕질 루틴 공유해요',
            content: '출근길/등굣길, 퇴근 후, 주말에 어떻게 덕질하는지 루틴을 공유해 봅시다.\n러브트리를 어떻게 활용하고 있는지도 같이 써 주세요.'
        },
        {
            title: '입덕 계기 썰 풀어보기',
            content: '어떤 계기로 지금 최애를 좋아하게 되었나요? 음악, 무대, 예능, 혹은 친구의 추천 등 각자의 입덕 스토리를 자유롭게 공유해 주세요.'
        },
        {
            title: '최애 짤/움짤 자랑방',
            content: '요즘 계속 돌려보는 최애 짤이나 움짤이 있다면 여기에 공유해 주세요. 왜 좋아하는지도 한 줄 코멘트로 남겨주면 더 재밌어요.'
        }
    ];

    function getDemoUserTemplates() {
        return DEMO_USER_TEMPLATES.slice();
    }

    function getDemoTreeTemplates() {
        return DEMO_TREE_TEMPLATES.slice();
    }

    function getDemoCommunityTemplates() {
        return DEMO_COMMUNITY_TEMPLATES.slice();
    }

    function buildDemoUserPayload(uid) {
        const templates = getDemoUserTemplates();
        return templates.find(t => t.uid === uid) || null;
    }

    function buildDemoTreePayload(treeId) {
        const templates = getDemoTreeTemplates();
        return templates.find(t => t.id === treeId) || null;
    }

    function buildDemoCommunityPayload(index) {
        const templates = getDemoCommunityTemplates();
        return templates[index] || null;
    }

    function getMaxSeedCount(requestCount, templates) {
        const defaultCount = templates.length;
        if (typeof requestCount === 'number' && requestCount > 0) {
            return Math.min(requestCount, defaultCount);
        }
        return defaultCount;
    }

    window.AdminDemoTemplates = {
        getDemoUserTemplates,
        getDemoTreeTemplates,
        getDemoCommunityTemplates,
        buildDemoUserPayload,
        buildDemoTreePayload,
        buildDemoCommunityPayload,
        getMaxSeedCount
    };
})();