/**
 * Relovetree - Admin Dashboard Logic
 */

// Configuration
const ADMIN_EMAILS = ['padiemipu@gmail.com', 'limone@example.com'];
const AI_HELPER_ENDPOINT = 'https://lovetree.limone.dev/.netlify/functions/ai-helper';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase (if not already initialized in shared.js, but shared.js might not auto-init if config is in index.js)
    // We need to ensure Firebase is ready. Since we included SDKs in admin.html, we need to init app.
    // However, shared.js or index.js usually holds the config.
    // For Admin, we'll duplicate config or rely on shared.js if it exposes init.
    // Assuming shared.js exposes 'APP_CONFIG' but maybe not firebase init if it was in index.js.
    // Let's grab config from index.js logic or re-declare it here for safety as admin is separate.

    const firebaseConfig = {
        apiKey: "AIzaSyDQNR8bNIp4LG4EGNwl1ew8B7Har-KJC90",
        authDomain: "relovetree.firebaseapp.com",
        projectId: "relovetree",
        storageBucket: "relovetree.firebasestorage.app",
        messagingSenderId: "1091063063536",
        appId: "1:1091063063536:web:065a746e2578c47dd7b335",
        measurementId: "G-D4R5XMGFK5"
    };

window.editBotProfile = async function (uid) {
    const db = firebase.firestore();
    try {
        const doc = await db.collection('users').doc(uid).get();
        const data = doc.exists ? (doc.data() || {}) : {};

        let currentProfile = '';
        if (data.botProfile) {
            currentProfile = String(data.botProfile);
        }

        const settings = data.botSettings || {};
        let tone = settings.tone || '';
        let fanType = settings.fanType || '';
        let length = settings.length || '';
        let emoji = settings.emoji || '';
        let extraNote = settings.extraNote || '';

        const profileInput = window.prompt('이 사용자를 AI 봇으로 사용할 때의 전체적인 말투/설명을 입력하세요.\n예: 과몰입 여돌 덕후, 항상 감탄사 많이 씀', currentProfile);
        if (profileInput === null) return;
        const profileTrimmed = profileInput.trim();

        if (window.confirm('톤, 팬 타입, 문장 길이, 이모지 사용량 같은 고급 설정도 함께 편집할까요?')) {
            const toneLabel = tone === 'over_reactive' ? '과몰입' :
                tone === 'friendly' ? '친근' :
                    tone === 'calm' ? '차분' :
                        tone === 'formal' ? '공식' : '';
            const toneInput = window.prompt('톤을 선택해 주세요. (숫자 또는 한글)\n1) 과몰입\n2) 친근\n3) 차분\n4) 공식', toneLabel);
            if (toneInput !== null) {
                const v = toneInput.trim();
                if (v === '1' || v === '과몰입') tone = 'over_reactive';
                else if (v === '2' || v === '친근') tone = 'friendly';
                else if (v === '3' || v === '차분') tone = 'calm';
                else if (v === '4' || v === '공식') tone = 'formal';
            }

            const fanLabel = fanType === 'fresh' ? '입덕러' :
                fanType === 'core' ? '고인물' :
                    fanType === 'light' ? '라이트팬' : '';
            const fanInput = window.prompt('팬 타입을 선택해 주세요.\n1) 입덕러\n2) 고인물\n3) 라이트팬', fanLabel);
            if (fanInput !== null) {
                const v = fanInput.trim();
                if (v === '1' || v === '입덕러') fanType = 'fresh';
                else if (v === '2' || v === '고인물') fanType = 'core';
                else if (v === '3' || v === '라이트팬') fanType = 'light';
            }

            const lengthLabel = length === 'short' ? '짧게' :
                length === 'medium' ? '보통' :
                    length === 'long' ? '길게' : '';
            const lengthInput = window.prompt('문장 길이를 선택해 주세요.\n1) 짧게\n2) 보통\n3) 길게', lengthLabel);
            if (lengthInput !== null) {
                const v = lengthInput.trim();
                if (v === '1' || v === '짧게') length = 'short';
                else if (v === '2' || v === '보통') length = 'medium';
                else if (v === '3' || v === '길게') length = 'long';
            }

            const emojiLabel = emoji === 'few' ? '거의 안씀' :
                emoji === 'normal' ? '적당히' :
                    emoji === 'many' ? '많이' : '';
            const emojiInput = window.prompt('이모지 사용량을 선택해 주세요.\n1) 거의 안씀\n2) 적당히\n3) 많이', emojiLabel);
            if (emojiInput !== null) {
                const v = emojiInput.trim();
                if (v === '1' || v === '거의 안씀') emoji = 'few';
                else if (v === '2' || v === '적당히') emoji = 'normal';
                else if (v === '3' || v === '많이') emoji = 'many';
            }

            const extraInput = window.prompt('추가 설명이 있다면 입력해 주세요. (선택 사항)', extraNote);
            if (extraInput !== null) {
                extraNote = extraInput.trim();
            }
        }

        const updatePayload = {};
        if (profileTrimmed) {
            updatePayload.botProfile = profileTrimmed;
        } else {
            updatePayload.botProfile = firebase.firestore.FieldValue.delete();
        }

        const hasSettings = tone || fanType || length || emoji || extraNote;
        if (hasSettings) {
            updatePayload.botSettings = { tone, fanType, length, emoji, extraNote };
        } else {
            updatePayload.botSettings = firebase.firestore.FieldValue.delete();
        }

        await db.collection('users').doc(uid).update(updatePayload);
        alert('AI 프로필이 업데이트되었습니다.');
    } catch (e) {
        alert('AI 프로필 업데이트 중 오류: ' + e.message);
    }
};

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const loginOverlay = document.getElementById('loginOverlay');
    const loginStatus = document.getElementById('loginStatus');

    function setStatus(msg) {
        if (loginStatus) loginStatus.textContent = msg;
    }

    // 1. Check Admin Auth
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            if (loginOverlay) loginOverlay.classList.remove('hidden');
            setStatus('로그인이 필요합니다.');
            return;
        }

        setStatus('권한 확인 중...');

        const isAdmin = ADMIN_EMAILS.includes(user.email) || await checkAdminRole(user.uid);

        if (!isAdmin) {
            setStatus('관리자 권한이 없습니다. (' + user.email + ')');
            if (loginOverlay) loginOverlay.classList.remove('hidden');
            return;
        }

        if (loginOverlay) loginOverlay.classList.add('hidden');
        initDashboard(user);
    });

    // Login Button
    const loginBtn = document.getElementById('adminLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                if (typeof provider.setCustomParameters === 'function') {
                    provider.setCustomParameters({ prompt: 'select_account' });
                }
            } catch (e) {
                console.warn('Admin Google Provider custom parameters 설정 실패:', e);
            }
            firebase.auth().signInWithPopup(provider).catch(e => setStatus(e.message));
        });
    }

    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            firebase.auth().signOut().then(() => window.location.reload());
        });
    }

    // AI 로그 새로고침 버튼
    const refreshAiLogsBtn = document.getElementById('refreshAiLogsBtn');
    if (refreshAiLogsBtn) {
        refreshAiLogsBtn.addEventListener('click', () => {
            loadAiLogs();
        });
    }

    const seedDemoCommunityBtn = document.getElementById('seedDemoCommunityBtn');
    if (seedDemoCommunityBtn) {
        seedDemoCommunityBtn.addEventListener('click', () => {
            seedDemoCommunityPosts();
        });
    }

    const seedDemoUsersBtn = document.getElementById('seedDemoUsersBtn');
    if (seedDemoUsersBtn) {
        seedDemoUsersBtn.addEventListener('click', () => {
            seedDemoUsers();
        });
    }

    const seedDemoTreesBtn = document.getElementById('seedDemoTreesBtn');
    if (seedDemoTreesBtn) {
        seedDemoTreesBtn.addEventListener('click', () => {
            seedDemoTrees();
        });
    }

    // Navigation
    setupNavigation();
});

async function checkAdminRole(uid) {
    try {
        const doc = await firebase.firestore().collection('users').doc(uid).get();
        return doc.exists && doc.data().role === 'admin';
    } catch (e) {
        return false;
    }
}

function initDashboard(user) {
    const emailEl = document.getElementById('adminEmail');
    if (emailEl) emailEl.textContent = user.email;

    // Set Date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString();

    loadStats();
    loadUsers();
    loadAiLogs();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    console.log('[Admin] setupNavigation called:', {
        navCount: navItems.length,
        sectionCount: sections.length
    });

    navItems.forEach(item => {
        const target = item.dataset.target;
        console.log('[Admin] nav item found:', target);

        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.dataset.target;
            console.log('[Admin] nav click:', targetId);

            navItems.forEach(nav => {
                nav.classList.remove('active', 'bg-slate-800', 'text-white');
                if (!nav.classList.contains('hover:text-white')) {
                    nav.classList.add('text-slate-300');
                }
            });

            item.classList.add('active', 'bg-slate-800', 'text-white');
            item.classList.remove('text-slate-300');

            sections.forEach(section => {
                const isTarget = section.id === targetId;
                section.classList.toggle('hidden', !isTarget);
                section.classList.toggle('active', isTarget);
            });
        });
    });
}

// --- Data Loading ---

async function loadStats() {
    const db = firebase.firestore();
    try {
        const snapshot = await db.collection('users').get();
        const total = snapshot.size;

        let active = 0;
        let pro = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const recentUsers = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const lastLogin = data.lastLogin ? data.lastLogin.toDate() : new Date(0);

            if (lastLogin >= today) active++;
            if (data.role === 'pro') pro++;

            recentUsers.push({ id: doc.id, ...data });
        });

        document.getElementById('totalUsers').textContent = total;
        document.getElementById('activeUsers').textContent = active;
        document.getElementById('proUsers').textContent = pro;

        // Recent Users Table
        recentUsers.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        renderRecentUsers(recentUsers.slice(0, 5));

    } catch (e) {
        console.error('Stats error:', e);
    }
}

function getUserAvatarHTML(user, size) {
    const baseName = user.displayName || user.email || 'U';
    const initial = String(baseName).charAt(0).toUpperCase();
    const dimClass = size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';

    if (user.photoURL) {
        return `<img src="${user.photoURL}" alt="avatar" class="${dimClass} rounded-full object-cover">`;
    }

    return `
        <div class="${dimClass} rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
            ${initial}
        </div>
    `;
}

function formatKoreanDateTime(ts) {
    if (!ts || typeof ts.toDate !== 'function') return '-';
    const d = ts.toDate();
    const formatted = d.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    return formatted + ' (KST)';
}

function renderRecentUsers(users) {
    const tbody = document.getElementById('recentUsersTable');
    if (!tbody) return;
    tbody.innerHTML = users.map(user => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4 flex items-center gap-3">
                ${getUserAvatarHTML(user, 'sm')}
                <span class="font-medium text-slate-900">${user.displayName || 'No Name'}</span>
            </td>
            <td class="px-6 py-4">${user.email}</td>
            <td class="px-6 py-4 text-slate-500">${user.createdAt ? formatKoreanDateTime(user.createdAt) : '-'}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs font-bold ${user.role === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">
                    ${(user.role || 'free').toUpperCase()}
                </span>
            </td>
        </tr>
    `).join('');
}

async function loadUsers() {
    const db = firebase.firestore();
    const tbody = document.getElementById('allUsersTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center">로딩 중...</td></tr>';

    try {
        const snapshot = await db.collection('users').orderBy('lastLogin', 'desc').get();

        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 border-b border-slate-50 last:border-0';
            tr.innerHTML = `
                <td class="px-6 py-4 flex items-center gap-3">
                    ${getUserAvatarHTML(user, 'sm')}
                    <span class="font-medium text-slate-900">${user.displayName || 'No Name'}</span>
                </td>
                <td class="px-6 py-4">${user.email}</td>
                <td class="px-6 py-4">
                    <select onchange="updateUserRole('${doc.id}', this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-brand-500">
                        <option value="free" ${user.role === 'free' || !user.role ? 'selected' : ''}>Free</option>
                        <option value="pro" ${user.role === 'pro' ? 'selected' : ''}>Pro</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td class="px-6 py-4 text-slate-500">${user.lastLogin ? user.lastLogin.toDate().toLocaleDateString() : '-'}</td>
                <td class="px-6 py-4">
                    <div class="flex gap-2">
                        <button onclick="editBotProfile('${doc.id}')" class="text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                            AI 프로필
                        </button>
                        <button onclick="createAiDemoTree('${doc.id}')" class="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                            AI 트리
                        </button>
                        <button onclick="createAiReactions('${doc.id}')" class="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                            AI 반응
                        </button>
                        <button onclick="createAiCommunityComments('${doc.id}')" class="text-violet-600 hover:text-violet-800 hover:bg-violet-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                            AI 커뮤댓글
                        </button>
                        <button onclick="deleteUser('${doc.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                            삭제
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Load users error:', e);
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">데이터 로드 실패</td></tr>';
    }
}

async function seedDemoUsers() {
    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;

    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    const confirmed = window.confirm('대시보드와 사용자 관리 화면을 위한 데모 사용자를 몇 명 추가할까요?\n같은 ID의 데모 사용자가 이미 있으면 건너뜁니다.');
    if (!confirmed) return;

    const templates = [
        {
            uid: 'demo-user-01',
            email: 'demo-army@demo.local',
            displayName: '데모 아미',
            role: 'free'
        },
        {
            uid: 'demo-user-02',
            email: 'demo-carat@demo.local',
            displayName: '데모 캐럿',
            role: 'pro'
        },
        {
            uid: 'demo-user-03',
            email: 'demo-stay@demo.local',
            displayName: '데모 스테이',
            role: 'free'
        },
        {
            uid: 'demo-user-04',
            email: 'demo-diver@demo.local',
            displayName: '데모 다이브',
            role: 'free'
        }
    ];

    let createdCount = 0;

    try {
        for (const tpl of templates) {
            const ref = db.collection('users').doc(tpl.uid);
            const snap = await ref.get();
            if (snap.exists) continue;

            await ref.set({
                email: tpl.email,
                displayName: tpl.displayName,
                photoURL: '',
                role: tpl.role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                isDemo: true
            }, { merge: true });

            createdCount++;
        }

        if (createdCount > 0) {
            alert(`데모 사용자 ${createdCount}명을 생성했습니다.`);
            await loadStats();
            await loadUsers();
        } else {
            alert('새로 생성된 데모 사용자가 없습니다. (이미 같은 ID의 데모 사용자가 있습니다)');
        }
    } catch (e) {
        console.error('데모 사용자 생성 오류:', e);
        alert('데모 사용자 생성 중 오류가 발생했습니다: ' + e.message);
    }
}

async function seedDemoTrees() {
    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;

    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    const confirmed = window.confirm('홈과 에디터에서 볼 수 있는 데모 러브트리를 여러 개 생성할까요?\n같은 ID의 트리가 이미 있으면 건너뜁니다.');
    if (!confirmed) return;

    const owners = [];

    try {
        const demoSnap = await db.collection('users').where('isDemo', '==', true).limit(10).get();
        demoSnap.forEach((doc) => {
            const data = doc.data() || {};
            owners.push({ uid: doc.id, name: data.displayName || data.email || doc.id });
        });
    } catch (e) {
    }

    if (!owners.length) {
        owners.push({ uid: currentUser.uid, name: currentUser.displayName || currentUser.email || '관리자' });
    }

    const templates = [
        {
            id: 'demo-tree-bts',
            name: '방탄소년단 타임라인 데모',
            baseTitle: 'BTS 활동 정리'
        },
        {
            id: 'demo-tree-svt',
            name: '세븐틴 투어 히스토리 데모',
            baseTitle: '세븐틴 투어 기록'
        },
        {
            id: 'demo-tree-skz',
            name: '스트레이 키즈 컴백 타임라인 데모',
            baseTitle: '스트레이 키즈 컴백 정리'
        },
        {
            id: 'demo-tree-newjeans',
            name: '뉴진스 활동 모먼트 데모',
            baseTitle: '뉴진스 활동 정리'
        },
        {
            id: 'demo-tree-illit',
            name: '아일릿 성장기 데모',
            baseTitle: '아일릿 활동 타임라인'
        }
    ];

    let createdCount = 0;

    try {
        for (let i = 0; i < templates.length; i++) {
            const tpl = templates[i];
            const ref = db.collection('trees').doc(tpl.id);
            const snap = await ref.get();
            if (snap.exists) continue;

            const owner = owners[i % owners.length];

            const now = new Date();
            const nodes = [];
            const edges = [];

            for (let step = 0; step < 4; step++) {
                const id = step + 1;
                const d = new Date(now.getTime() - (3 - step) * 30 * 24 * 60 * 60 * 1000);
                const date = d.toISOString().split('T')[0];
                nodes.push({
                    id: id,
                    x: 200 + step * 260,
                    y: 200,
                    title: tpl.baseTitle + ' - 단계 ' + (step + 1),
                    date: date,
                    videoId: '',
                    moments: []
                });
                if (step > 0) {
                    edges.push({ from: id - 1, to: id });
                }
            }

            await ref.set({
                name: tpl.name,
                ownerId: owner.uid,
                nodes: nodes,
                edges: edges,
                likes: [],
                likeCount: 0,
                comments: [],
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                isDemo: true
            }, { merge: true });

            createdCount++;
        }

        if (createdCount > 0) {
            alert(`데모 러브트리 ${createdCount}개를 생성했습니다.`);
        } else {
            alert('새로 생성된 데모 러브트리가 없습니다. (이미 같은 ID의 트리가 있습니다)');
        }
    } catch (e) {
        console.error('데모 러브트리 생성 오류:', e);
        alert('데모 러브트리 생성 중 오류가 발생했습니다: ' + e.message);
    }
}

async function seedDemoCommunityPosts() {
    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;

    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    const confirmed = window.confirm('커뮤니티에 데모 글을 여러 개 추가할까요?\n같은 제목의 글이 이미 있으면 건너뜁니다.');
    if (!confirmed) return;

    const authorId = currentUser.uid;
    const authorName = currentUser.displayName || currentUser.email || '관리자';

    const templates = [
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

    try {
        const existingSnap = await db.collection('community_posts')
            .where('authorId', '==', authorId)
            .get();

        const existingTitles = new Set();
        existingSnap.forEach((doc) => {
            const data = doc.data() || {};
            if (data.title) existingTitles.add(String(data.title));
        });

        let createdCount = 0;

        for (const tpl of templates) {
            if (existingTitles.has(tpl.title)) continue;

            await db.collection('community_posts').add({
                title: tpl.title,
                content: tpl.content,
                authorId,
                authorDisplayName: authorName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                likeCount: 0,
                commentCount: 0,
                isDeleted: false
            });

            createdCount++;
        }

        if (createdCount > 0) {
            alert(`커뮤니티 데모 글 ${createdCount}개를 생성했습니다.`);
        } else {
            alert('새로 생성된 데모 글이 없습니다. (이미 같은 제목의 글이 있습니다)');
        }
    } catch (e) {
        console.error('데모 커뮤니티 글 생성 오류:', e);
        alert('데모 커뮤니티 글 생성 중 오류가 발생했습니다: ' + e.message);
    }
}

// AI 봇 활동 로그 로드
async function loadAiLogs() {
    const db = firebase.firestore();
    const tbody = document.getElementById('aiLogsTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center">로딩 중...</td></tr>';

    try {
        const snapshot = await db.collection('ai_logs')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const rows = [];
        snapshot.forEach((doc) => {
            const data = doc.data() || {};
            const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function'
                ? data.createdAt.toDate().toLocaleString()
                : '-';
            const type = data.type || '-';
            const bot = data.botName || data.botUid || '-';
            const summary = data.summary || '';

            rows.push(`
                <tr class="hover:bg-slate-50">
                    <td class="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">${createdAt}</td>
                    <td class="px-6 py-3 text-xs font-semibold text-slate-700">${type}</td>
                    <td class="px-6 py-3 text-xs text-slate-700">${bot}</td>
                    <td class="px-6 py-3 text-xs text-slate-600">${summary}</td>
                </tr>
            `);
        });

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-slate-400">아직 기록된 AI 로그가 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = rows.join('');
        }
    } catch (e) {
        console.error('AI 로그 로드 오류:', e);
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">AI 로그 로드 실패</td></tr>';
    }
}

// AI 봇 활동을 Firestore에 기록하는 헬퍼
async function logAiActivity(entry) {
    try {
        const db = firebase.firestore();
        const adminUser = firebase.auth().currentUser;
        const payload = {
            type: entry.type || 'unknown',
            botUid: entry.botUid || null,
            botName: entry.botName || null,
            targetType: entry.targetType || null,
            targetId: entry.targetId || null,
            count: typeof entry.count === 'number' ? entry.count : null,
            summary: entry.summary || '',
            meta: entry.meta || null,
            adminUid: adminUser ? adminUser.uid : null,
            adminEmail: adminUser ? adminUser.email : null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('ai_logs').add(payload);
    } catch (e) {
        console.warn('AI 로그 기록 실패:', e);
    }
}

// 사용자 botSettings를 사람이 읽을 수 있는 설명 텍스트로 변환하는 헬퍼
function buildBotSettingsDescription(settings) {
    if (!settings) return '';
    const parts = [];

    if (settings.tone) {
        if (settings.tone === 'over_reactive') parts.push('- 톤: 과몰입 (감탄사와 리액션이 큰 스타일)');
        else if (settings.tone === 'friendly') parts.push('- 톤: 친근 (팬들끼리 편하게 대화하는 느낌)');
        else if (settings.tone === 'calm') parts.push('- 톤: 차분 (설명 위주, 담백한 스타일)');
        else if (settings.tone === 'formal') parts.push('- 톤: 공식 (존댓말, 공지문 같은 느낌)');
    }

    if (settings.fanType) {
        if (settings.fanType === 'fresh') parts.push('- 팬 타입: 입덕러 (최근에 좋아하게 된 팬)');
        else if (settings.fanType === 'core') parts.push('- 팬 타입: 고인물 (활동/정보를 잘 아는 오래된 팬)');
        else if (settings.fanType === 'light') parts.push('- 팬 타입: 라이트팬 (편하게 즐기는 가벼운 팬)');
    }

    if (settings.length) {
        if (settings.length === 'short') parts.push('- 문장 길이: 짧게 (한 문장 정도)');
        else if (settings.length === 'medium') parts.push('- 문장 길이: 보통 (두세 문장 이내)');
        else if (settings.length === 'long') parts.push('- 문장 길이: 길게 (조금 더 자세하게)');
    }

    if (settings.emoji) {
        if (settings.emoji === 'few') parts.push('- 이모지: 거의 사용하지 않음');
        else if (settings.emoji === 'normal') parts.push('- 이모지: 적당히 사용');
        else if (settings.emoji === 'many') parts.push('- 이모지: 자주 사용');
    }

    if (settings.extraNote) {
        parts.push('- 추가 설명: ' + String(settings.extraNote));
    }

    if (!parts.length) return '';

    return '\n\n[봇 설정]\n' + parts.join('\n');
}

// --- Actions ---

window.updateUserRole = async function (uid, newRole) {
    if (!confirm(`등급을 ${newRole}(으)로 변경하시겠습니까?`)) {
        loadUsers();
        return;
    }
    try {
        await firebase.firestore().collection('users').doc(uid).update({ role: newRole });
        alert('등급이 변경되었습니다.');
    } catch (e) {
        alert('오류: ' + e.message);
    }
};

window.deleteUser = async function (uid) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
        await firebase.firestore().collection('users').doc(uid).delete();
        alert('삭제되었습니다.');
        loadUsers();
    } catch (e) {
        alert('오류: ' + e.message);
    }
};

window.createAiDemoTree = async function (uid) {
    const db = firebase.firestore();
    const defaultPrompt = '플레이브 활동을 입덕부터 최근까지 4단계로 정리해줘';
    const promptText = window.prompt('이 사용자의 트리를 어떤 주제로 만들까요?', defaultPrompt);
    if (promptText === null) return;

    const count = 4;

    let userName = '';
    let botProfileSuffix = '';
    let botSettingsSuffix = '';
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const u = userDoc.data() || {};
            if (u.botProfile) {
                botProfileSuffix = '\n\n[봇 프로필]\n' + String(u.botProfile);
            }
            if (u.botSettings) {
                botSettingsSuffix = buildBotSettingsDescription(u.botSettings);
            }
            if (u.displayName) {
                userName = u.displayName;
            } else if (u.email) {
                userName = u.email.split('@')[0];
            }
        }
    } catch (e) {
        console.warn('AI 트리용 봇 프로필 조회 실패:', e);
    }

    const finalPrompt = (promptText || defaultPrompt) + botProfileSuffix + botSettingsSuffix;

    let suggestions = [];
    try {
        const res = await fetch(AI_HELPER_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'tree', payload: { prompt: finalPrompt, count: count } })
        });
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.result)) {
                suggestions = data.result;
            }
        }
    } catch (e) {
        console.error('AI helper error:', e);
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
        const now = new Date();
        const base = promptText || 'AI 러브트리';
        suggestions = [];
        for (let i = 0; i < count; i++) {
            const d = new Date(now.getTime() - (count - 1 - i) * 7 * 24 * 60 * 60 * 1000);
            const date = d.toISOString().split('T')[0];
            suggestions.push({
                title: base + ' - 순간 ' + (i + 1),
                date: date,
                description: ''
            });
        }
    }

    const nodes = [];
    const edges = [];
    suggestions.forEach((item, index) => {
        const id = index + 1;
        nodes.push({
            id: id,
            x: 200 + index * 320,
            y: 200,
            title: item.title || '새 순간',
            date: item.date || new Date().toISOString().split('T')[0],
            videoId: '',
            moments: []
        });
        if (index > 0) {
            edges.push({ from: id - 1, to: id });
        }
    });

    const treeId = 'ai-' + uid + '-' + Date.now();
    const name = '[AI] ' + (promptText || '데모 트리');

    const dataToSave = {
        name: name,
        nodes: nodes,
        edges: edges,
        likes: [],
        likeCount: 0,
        comments: [],
        ownerId: uid,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('trees').doc(treeId).set(dataToSave, { merge: true });
        // AI 활동 로그 기록
        logAiActivity({
            type: 'tree_create',
            botUid: uid,
            botName: userName || null,
            targetType: 'tree',
            targetId: treeId,
            count: nodes.length,
            summary: name
        });
        const url = 'editor.html?id=' + encodeURIComponent(treeId);
        alert('AI 트리가 생성되었습니다. 에디터에서 확인해 보세요.\n' + url);
        if (window.confirm('지금 바로 에디터에서 열어볼까요?')) {
            window.open(url, '_blank');
        }
    } catch (e) {
        console.error('AI 트리 생성 오류:', e);
        alert('AI 트리 생성 중 오류가 발생했습니다: ' + e.message);
    }
};

// 특정 사용자를 AI 봇처럼 사용해 여러 트리에 자동으로 좋아요/댓글을 생성하는 함수
window.createAiReactions = async function (uid) {
    const db = firebase.firestore();

    // 몇 개의 트리에 반응을 남길지 입력 받기
    const countInput = window.prompt('이 사용자가 AI처럼 반응할 트리 개수를 입력하세요. (기본 3)', '3');
    if (countInput === null) return;

    const reactionCount = parseInt(countInput, 10);
    if (!reactionCount || reactionCount <= 0) {
        alert('1 이상의 숫자를 입력해 주세요.');
        return;
    }

    try {
        // 사용자 정보에서 닉네임/표시 이름 가져오기
        let userName = '익명';
        let botProfile = '';
        let botSettingsSuffix = '';
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const u = userDoc.data() || {};
                if (u.displayName) userName = u.displayName;
                else if (u.email) userName = u.email.split('@')[0];
                if (u.botProfile) botProfile = String(u.botProfile);
                if (u.botSettings) botSettingsSuffix = buildBotSettingsDescription(u.botSettings);
            }
        } catch (e) {
            console.warn('AI 반응용 사용자 정보 조회 실패:', e);
        }

        // 최근 트리 몇 개 가져오기 (본인 소유/타인 소유 모두 포함)
        const snapshot = await db.collection('trees')
            .orderBy('lastUpdated', 'desc')
            .limit(30)
            .get();

        const candidates = [];
        snapshot.forEach((doc) => {
            const data = doc.data() || {};

            // 이미 이 사용자가 좋아요를 누른 트리는 건너뛴다
            const likes = Array.isArray(data.likes) ? data.likes : [];
            if (likes.includes(uid)) return;

            candidates.push({ id: doc.id, data });
        });

        if (candidates.length === 0) {
            alert('AI가 반응할 수 있는 트리가 없습니다. (이미 좋아요를 눌렀거나 트리가 없습니다)');
            return;
        }

        // 무작위로 reactionCount 개까지 선택
        const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
        const targets = shuffled.slice(0, Math.min(reactionCount, shuffled.length));

        const reactedTrees = [];

        for (const item of targets) {
            const treeId = item.id;
            const treeData = item.data;
            const treeName = treeData.name || '이 트리';

            // AI에게 댓글 문장 한 줄 생성 요청
            let commentText = '';
            let basePrompt = `${treeName} 트리를 본 팬이 남길만한 한 줄 감상평을 한국어로 짧게 써줘. 최대 1문장.`;
            if (botProfile) {
                basePrompt += `\n\n이 계정의 말투: ${botProfile}`;
            }
            if (botSettingsSuffix) {
                basePrompt += botSettingsSuffix;
            }
            try {
                const res = await fetch(AI_HELPER_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'comment',
                        payload: {
                            prompt: basePrompt,
                            nodeTitle: treeName
                        }
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.result) && data.result.length > 0) {
                        commentText = String(data.result[0]);
                    }
                }
            } catch (e) {
                console.warn('AI 반응 생성 중 오류:', e);
            }

            // AI 호출이 실패했거나 결과가 비어 있으면 기본 문장 사용
            if (!commentText) {
                commentText = `${treeName}를 보면 다시 입덕하는 느낌이에요.`;
            }

            // 좋아요 추가
            try {
                const likesArray = Array.isArray(treeData.likes) ? treeData.likes : [];
                const newLikeCount = likesArray.length + 1;

                await db.collection('trees').doc(treeId).update({
                    likes: firebase.firestore.FieldValue.arrayUnion(uid),
                    likeCount: newLikeCount
                });
            } catch (e) {
                console.warn('AI 좋아요 업데이트 실패:', e);
            }

            // 댓글 추가
            try {
                await db.collection('trees').doc(treeId).collection('comments').add({
                    text: commentText,
                    userId: uid,
                    userName: userName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isAiBot: true
                });
            } catch (e) {
                console.warn('AI 댓글 생성 실패:', e);
            }

            reactedTrees.push(treeName);
        }

        if (reactedTrees.length > 0) {
            // AI 활동 로그 기록
            logAiActivity({
                type: 'tree_reactions',
                botUid: uid,
                botName: userName || null,
                targetType: 'tree',
                targetId: null,
                count: reactedTrees.length,
                summary: `트리 ${reactedTrees.length}개에 AI 반응 생성`,
                meta: { treeNames: reactedTrees }
            });
            alert(`총 ${reactedTrees.length}개의 트리에 AI 반응이 생성되었습니다.\n\n- ` + reactedTrees.join('\n- '));
        } else {
            alert('실제로 반응이 생성된 트리가 없습니다. (모든 시도가 실패했습니다)');
        }
    } catch (e) {
        console.error('AI 반응 생성 중 오류:', e);
        alert('AI 반응 생성 중 오류가 발생했습니다: ' + e.message);
    }
};

// 특정 사용자를 AI 봇처럼 사용해 커뮤니티 글에 자동으로 댓글을 생성하는 함수
window.createAiCommunityComments = async function (uid) {
    const db = firebase.firestore();

    const countInput = window.prompt('이 사용자가 AI처럼 댓글을 남길 커뮤니티 글 개수를 입력하세요. (기본 3)', '3');
    if (countInput === null) return;

    const reactionCount = parseInt(countInput, 10);
    if (!reactionCount || reactionCount <= 0) {
        alert('1 이상의 숫자를 입력해 주세요.');
        return;
    }

    try {
        let userName = '익명';
        let botProfile = '';
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const u = userDoc.data() || {};
                if (u.displayName) userName = u.displayName;
                else if (u.email) userName = u.email.split('@')[0];
                if (u.botProfile) botProfile = String(u.botProfile);
            }
        } catch (e) {
            console.warn('AI 커뮤니티 댓글용 사용자 정보 조회 실패:', e);
        }

        const snapshot = await db.collection('community_posts')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const candidates = [];
        snapshot.forEach((doc) => {
            const data = doc.data() || {};
            candidates.push({ id: doc.id, data });
        });

        if (candidates.length === 0) {
            alert('AI가 댓글을 남길 수 있는 커뮤니티 글이 없습니다.');
            return;
        }

        const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
        const targets = shuffled.slice(0, Math.min(reactionCount, shuffled.length));

        const reactedPosts = [];

        for (const item of targets) {
            const postId = item.id;
            const postData = item.data;
            const title = postData.title || '제목 없음';
            const content = postData.content || '';
            const snippet = content.length > 80 ? content.slice(0, 80) + '…' : content;

            let commentText = '';
            let basePrompt = `"${title}"라는 제목의 글과 다음 내용을 읽은 팬이 남길만한 한 줄 댓글을 한국어로 짧게 써줘. 최대 1문장.\n\n내용 요약: ${snippet}`;
            if (botProfile) {
                basePrompt += `\n\n이 계정의 말투: ${botProfile}`;
            }
            if (botSettingsSuffix) {
                basePrompt += botSettingsSuffix;
            }

            try {
                const res = await fetch(AI_HELPER_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'comment',
                        payload: {
                            prompt: basePrompt,
                            nodeTitle: title
                        }
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.result) && data.result.length > 0) {
                        commentText = String(data.result[0]);
                    }
                }
            } catch (e) {
                console.warn('AI 커뮤니티 댓글 생성 중 오류:', e);
            }

            if (!commentText) {
                commentText = `${title} 글 너무 공감돼요.`;
            }

            try {
                await db.collection('community_posts').doc(postId).collection('comments').add({
                    content: commentText,
                    authorId: uid,
                    authorDisplayName: userName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isDeleted: false,
                    isAiBot: true
                });

                await db.collection('community_posts').doc(postId).update({
                    commentCount: firebase.firestore.FieldValue.increment(1)
                });
            } catch (e) {
                console.warn('AI 커뮤니티 댓글 쓰기 실패:', e);
            }

            reactedPosts.push(title);
        }

        if (reactedPosts.length > 0) {
            // AI 활동 로그 기록
            logAiActivity({
                type: 'community_comments',
                botUid: uid,
                botName: userName || null,
                targetType: 'community_post',
                targetId: null,
                count: reactedPosts.length,
                summary: `커뮤니티 글 ${reactedPosts.length}개에 AI 댓글 생성`,
                meta: { postTitles: reactedPosts }
            });
            alert(`총 ${reactedPosts.length}개의 글에 AI 커뮤니티 댓글이 생성되었습니다.\n\n- ` + reactedPosts.join('\n- '));
        } else {
            alert('실제로 댓글이 생성된 글이 없습니다. (모든 시도가 실패했습니다)');
        }
    } catch (e) {
        console.error('AI 커뮤니티 댓글 생성 중 오류:', e);
        alert('AI 커뮤니티 댓글 생성 중 오류가 발생했습니다: ' + e.message);
    }
};
