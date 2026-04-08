(function () {
    const translations = {
        ko: {
            title: "사랑에 빠진 모든 순간을 기록해 보세요",
            subtitle: "나의 러브트리로 좋아하는 아티스트의 모든 순간을 한 곳에 차곡차곡 모아 보세요.",
            create: "새로운 트리 만들기",
            modalTitle: "누구의 팬이신가요?",
            modalDesc: "아티스트의 이름을 입력하여 새로운 여정을 시작하세요.",
            labelName: "아티스트 이름",
            cancel: "취소",
            start: "시작하기",
            langBtn: "English",
            myTreesTitle: "최근 방문한 트리",
            allTreesTitle: "모든 러브트리"
        },
        en: {
            title: "Capture every moment you fall in love.",
            subtitle: "Gather all your stan moments into a single LoveTree.",
            create: "Create New Tree",
            modalTitle: "Who is your artist?",
            modalDesc: "Enter the artist name to start a new journey.",
            labelName: "Artist Name",
            cancel: "Cancel",
            start: "Start Journey",
            langBtn: "한국어",
            myTreesTitle: "Recent Visits",
            allTreesTitle: "All LoveTrees"
        }
    };

    const messages = {
        loginRequiredMyTab: {
            ko: '로그인이 필요합니다. 하단의 [마이] 탭에서 먼저 로그인해 주세요.',
            en: 'Login is required. Please sign in from the [My] tab first.'
        },
        storageNotReady: {
            ko: '저장소 초기화 중입니다. 잠시 후 다시 시도해 주세요.',
            en: 'Storage is not ready. Please try again.'
        },
        importLocalTreesSuccess: {
            ko: function (count) { return '로컬 러브트리 ' + count + '개를 계정으로 가져왔습니다.'; },
            en: function (count) { return 'Imported ' + count + ' local trees into your account.'; }
        },
        importLocalTreesEmpty: {
            ko: '가져올 로컬 러브트리를 찾지 못했습니다.',
            en: 'No local trees to import.'
        },
        pageLoadError: {
            ko: '페이지 로딩 중 오류가 발생했습니다.',
            en: 'An error occurred while loading the page.'
        },
        loginComingSoon: {
            ko: '로그인 기능은 준비 중입니다.',
            en: 'Login feature is coming soon.'
        },
        loginRequired: {
            ko: '로그인이 필요합니다.',
            en: 'Login is required.'
        }
    };

    let isKorean = true;

    function getUIText(key) {
        const t = isKorean ? translations.ko : translations.en;
        return t[key] || key;
    }

    function getMessage(key) {
        var dictionary = isKorean ? messages.ko : messages.en;
        var entry = messages[key];
        if (!entry) return key;
        return isKorean ? entry.ko : entry.en;
    }

    function formatMessage(key) {
        var entry = messages[key];
        var localeValue;
        var args;

        if (!entry) return key;

        localeValue = isKorean ? entry.ko : entry.en;
        args = Array.prototype.slice.call(arguments, 1);

        return typeof localeValue === 'function' ? localeValue.apply(null, args) : localeValue;
    }

    function updateUIText() {
        const t = isKorean ? translations.ko : translations.en;

        const elementsToUpdate = {
            'page-title': t.title,
            'page-subtitle': t.subtitle,
            'btn-create': t.create,
            'modal-title': t.modalTitle,
            'modal-desc': t.modalDesc,
            'label-name': t.labelName,
            'btn-cancel': t.cancel,
            'btn-start': t.start,
            'lang-btn': t.langBtn,
            'my-trees-title': t.myTreesTitle,
            'all-trees-title': t.allTreesTitle
        };

        Object.keys(elementsToUpdate).forEach(function (id) {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = elementsToUpdate[id];
            }
        });

        if (typeof window.IndexRender !== 'undefined' && typeof window.IndexRender.updateMyCreatedTreesPlaceholder === 'function') {
            window.IndexRender.updateMyCreatedTreesPlaceholder();
        }
    }

    function toggleLanguage() {
        isKorean = !isKorean;
        updateUIText();
        safeLocalStorageSet('lovetree_language', isKorean ? 'ko' : 'en');
    }

    function loadLanguagePreference() {
        const savedLang = safeLocalStorageGet('lovetree_language', 'ko');
        isKorean = savedLang === 'ko';
    }

    window.IndexI18n = {
        translations: translations,
        messages: messages,
        get isKorean() { return isKorean; },
        set isKorean(val) { isKorean = !!val; },
        getUIText: getUIText,
        getMessage: getMessage,
        formatMessage: formatMessage,
        updateUIText: updateUIText,
        toggleLanguage: toggleLanguage,
        loadLanguagePreference: loadLanguagePreference
    };

    window.translations = translations;
    window.isKorean = isKorean;
    window.toggleLanguage = toggleLanguage;
    window.updateUIText = updateUIText;
})();
