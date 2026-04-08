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

    let isKorean = true;

    function getUIText(key) {
        const t = isKorean ? translations.ko : translations.en;
        return t[key] || key;
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
        get isKorean() { return isKorean; },
        set isKorean(val) { isKorean = !!val; },
        getUIText: getUIText,
        updateUIText: updateUIText,
        toggleLanguage: toggleLanguage,
        loadLanguagePreference: loadLanguagePreference
    };

    window.translations = translations;
    window.isKorean = isKorean;
    window.toggleLanguage = toggleLanguage;
    window.updateUIText = updateUIText;
})();
