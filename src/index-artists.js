(function () {
    const DEFAULT_THUMBNAIL = 'https://placehold.co/640x360/f8fafc/94a3b8?text=Relovetree';

    const BASE_POPULAR_ARTISTS = [
        {
            id: 'bts',
            name: '방탄소년단',
            englishName: 'BTS',
            category: 'Legend',
            videoId: 'gwMa6gpoE9I',
            moments: 108,
            lastUpdate: '방금 전',
            color: 'purple'
        },
        {
            id: 'seventeen',
            name: '세븐틴',
            englishName: 'Seventeen',
            category: 'Group',
            videoId: 'ThI0pBAbFnk',
            thumbnail: 'https://img.youtube.com/vi/ThI0pBAbFnk/hqdefault.jpg',
            moments: 95,
            lastUpdate: '2시간 전',
            color: 'blue'
        },
        {
            id: 'straykids',
            name: '스트레이 키즈',
            englishName: 'Stray Kids',
            category: 'Group',
            videoId: 'EaswWiwMVs8',
            moments: 87,
            lastUpdate: '4시간 전',
            color: 'red'
        },
        {
            id: 'leejunyoung',
            name: '이준영',
            englishName: 'Lee Jun-young',
            category: 'Solo',
            videoId: 'PPgQOxtnUao',
            thumbnail: 'https://img.youtube.com/vi/PPgQOxtnUao/hqdefault.jpg',
            moments: 23,
            lastUpdate: '6시간 전',
            color: 'green'
        },
        {
            id: 'hearts2hearts',
            name: '하츠투하츠',
            englishName: 'Hearts2Hearts',
            category: 'Group',
            videoId: 'kxUA2wwYiME',
            moments: 45,
            lastUpdate: '1시간 전',
            color: 'pink'
        },
        {
            id: 'illit',
            name: '아일릿',
            englishName: 'ILLIT',
            category: 'Group',
            videoId: 'Vk5-c_v4gMU',
            moments: 62,
            lastUpdate: '30분 전',
            color: 'purple'
        },
        {
            id: 'newjeans',
            name: '뉴진스',
            englishName: 'NewJeans',
            category: 'Group',
            videoId: 'js1CtxSY38I',
            moments: 74,
            lastUpdate: '어제',
            color: 'pink'
        },
        {
            id: 'lesserafim',
            name: '르세라핌',
            englishName: 'LE SSERAFIM',
            category: 'Group',
            videoId: 'pyf8cbqyfPs',
            moments: 68,
            lastUpdate: '3일 전',
            color: 'red'
        },
        {
            id: 'ive',
            name: '아이브',
            englishName: 'IVE',
            category: 'Group',
            videoId: 'Y8JFxS1HlDo',
            moments: 81,
            lastUpdate: '5일 전',
            color: 'blue'
        },
        {
            id: 'aespa',
            name: '에스파',
            englishName: 'aespa',
            category: 'Group',
            videoId: 'ZeerrnuLi5E',
            moments: 59,
            lastUpdate: '1주 전',
            color: 'purple'
        }
    ];

    function resolveArtistThumbnail(artist) {
        if (artist.thumbnail) return artist.thumbnail;
        if (artist.videoId && typeof getYouTubeThumb === 'function') {
            const videoThumb = getYouTubeThumb(artist.videoId);
            if (videoThumb) return videoThumb;
        }
        return DEFAULT_THUMBNAIL;
    }

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

    function navigateToArtist(artistId) {
        if (!artistId) return;
        window.location.href = `/pages/editor.html?id=${encodeURIComponent(artistId)}`;
    }

    function attachArtistCardEvents() {
        const container = document.getElementById('popular-feed');
        if (!container) return;

        container.querySelectorAll('a[data-artist-id]').forEach(function (anchor) {
            const artistId = anchor.dataset.artistId;
            if (!artistId) return;

            anchor.addEventListener('click', function (event) {
                event.preventDefault();
                navigateToArtist(artistId);
            });
        });
    }

    function attachPopularListEvents() {
        const list = document.getElementById('popular-artists-list');
        if (!list) return;

        list.querySelectorAll('[data-artist-id]').forEach(function (item) {
            const artistId = item.dataset.artistId;
            if (!artistId) return;

            var handleActivate = function (event) {
                if (event.type === 'click' || event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigateToArtist(artistId);
                }
            };

            item.addEventListener('click', handleActivate);
            item.addEventListener('keydown', handleActivate);
        });
    }

    const POPULAR_ARTISTS = BASE_POPULAR_ARTISTS.map(function (artist) {
        return Object.assign({}, artist, {
            thumbnail: artist.thumbnail || (typeof getYouTubeThumb === 'function' ? getYouTubeThumb(artist.videoId) : '')
        });
    });

    window.IndexArtists = {
        DEFAULT_THUMBNAIL: DEFAULT_THUMBNAIL,
        BASE_POPULAR_ARTISTS: BASE_POPULAR_ARTISTS,
        POPULAR_ARTISTS: POPULAR_ARTISTS,
        resolveArtistThumbnail: resolveArtistThumbnail,
        getFallbackColor: getFallbackColor,
        navigateToArtist: navigateToArtist,
        attachArtistCardEvents: attachArtistCardEvents,
        attachPopularListEvents: attachPopularListEvents
    };
})();
