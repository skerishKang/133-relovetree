// frontend-concept-v2/src/concept-state.js

/**
 * Shared Dummy Data for UI Concept Demos
 */
const dummyMemories = [
    {
        id: "m1",
        date: "2023. 11. 15",
        title: "첫 콘서트의 전율",
        memo: `"처음으로 아티스트와 같은 공간에 있었다는 사실만으로도 가슴이 벅찼던 하루. 떼창할 때의 그 전율은 평생 잊지 못할 기록이 될 것 같다."`,
        thumbUrl: "https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=800&auto=format&fit=crop",
        tags: ["#감동", "#설렘", "#무대천재"],
        emotion: "감동",
        path: "내 러브트리 > 2023 하이라이트",
        likes: 125,
        comments: 3
    },
    {
        id: "m2",
        date: "2023. 10. 20",
        title: "춤선이 예쁜 날",
        memo: `"무대 위에서 손끝 하나하나 살아있는 느낌이 너무 좋았어요. 기록해두고 싶을 만큼 계속 돌려보게 되는 소중한 영상입니다. 아티스트와 눈이 마주친 것만 같은 그 찰나의 순간을 영원히 간직하고 싶어요."`,
        thumbUrl: "https://images.unsplash.com/photo-1493225255766-d9584f8606e9?q=80&w=800&auto=format&fit=crop",
        tags: ["#설렘", "#직캠", "#레전드"],
        emotion: "설렘",
        path: "내 러브트리 > 2023 하이라이트",
        likes: 842,
        comments: 15
    }
];

function renderStoryCards() {
    // 1. Story View (.slider-track)
    const sliderTrack = document.querySelector('.slider-track');
    if (sliderTrack) {
        sliderTrack.setAttribute('data-binding-state', 'loading');
        document.body.classList.add('state-loading');

        setTimeout(() => {
            sliderTrack.innerHTML = ''; // Clear static dummy
            
            dummyMemories.forEach(memory => {
                const card = document.createElement('article');
                card.className = 'story-card ui-fade-in';
                card.innerHTML = `
                    <section class="st-video-box">
                        <img src="${memory.thumbUrl}" alt="기억 영상 썸네일">
                        <div class="st-play-btn"></div>
                    </section>
                    <section class="st-content">
                        <span class="st-date">${memory.date}</span>
                        <h2 class="st-title">${memory.title}</h2>
                        <div class="st-memo-box">
                            <p class="st-memo-text">${memory.memo}</p>
                        </div>
                    </section>
                `;
                sliderTrack.appendChild(card);
            });
            
            sliderTrack.setAttribute('data-binding-state', 'bound');
            document.body.classList.remove('state-loading');
        }, 800); // 0.8s artificial delay
    }

    // 2. Memory Detail View
    const memoryDetail = document.querySelector('.detail-page');
    if (memoryDetail) {
        const detailInfo = document.querySelector('.detail-info');
        const heroPlayer = document.querySelector('.hero-player');
        
        if (detailInfo && heroPlayer) {
            // Apply standard skeleton loading state
            detailInfo.classList.add('ui-skeleton');
            
            setTimeout(() => {
                const memory = dummyMemories[0];
                
                heroPlayer.innerHTML = `
                    <img src="${memory.thumbUrl}" alt="기억 영상 썸네일" class="ui-fade-in">
                    <div class="play-btn-large"></div>
                `;

                detailInfo.innerHTML = `
                    <span class="detail-date ui-fade-in">${memory.date}</span>
                    <h2 class="ui-fade-in">${memory.title}</h2>
                    
                    <div class="detail-tags ui-fade-in">
                        ${memory.tags.map(tag => `<span class="detail-tag">${tag}</span>`).join('')}
                    </div>

                    <div class="memo-box ui-fade-in">
                        ${memory.memo.replace(/"/g, '')}
                    </div>

                    <div class="related-section ui-fade-in">
                        <h3>그날의 이어진 경로</h3>
                        <div class="related-path">
                            <a href="#" class="r-item active">
                                <div class="r-thumb">
                                    <img src="${memory.thumbUrl}" alt="현재 기억">
                                </div>
                                <div class="r-info">
                                    <span class="r-title">${memory.title}</span>
                                    <span class="r-date">현재 머물고 있는 기록</span>
                                </div>
                            </a>
                        </div>
                    </div>
                `;
                
                detailInfo.classList.remove('ui-skeleton');
            }, 800); // 0.8s artificial delay
        }
    }
    }
}

function initTreeDataBinding() {
    document.body.classList.add('state-loading');

    // Robust Production Check: Ensure firebase object, auth module, and initialized apps exist
    const isFirebaseReady = typeof firebase !== 'undefined' && 
                             firebase.auth && 
                             firebase.apps && 
                             firebase.apps.length > 0;

    if (isFirebaseReady) {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                if (typeof fetchUserTrees === 'function') {
                    fetchUserTrees(user.uid)
                        .then(trees => {
                            document.body.classList.remove('state-loading');
                            if (!trees || trees.length === 0) {
                                document.body.classList.add('state-empty');
                            } else {
                                if (typeof renderTreeNodes === 'function') {
                                    renderTreeNodes(trees);
                                }
                            }
                        })
                        .catch(err => {
                            console.error('Tree fetch error:', err);
                            document.body.classList.remove('state-loading');
                            document.body.classList.add('state-error');
                        });
                } else {
                    document.body.classList.remove('state-loading');
                }
            } else {
                document.body.classList.remove('state-loading');
            }
        });
    } else {
        // Fallback or development demo mode
        setTimeout(() => { document.body.classList.remove('state-loading'); }, 800);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderStoryCards();
    initTreeDataBinding();
});
