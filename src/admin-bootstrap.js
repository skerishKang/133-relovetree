(function () {
    const firebaseConfig = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.firebase)
        ? APP_CONFIG.firebase
        : ((typeof window !== 'undefined' && window.RELOVETREE_FIREBASE_CONFIG)
            ? window.RELOVETREE_FIREBASE_CONFIG
            : null);

    function setStatus(msg) {
        const loginStatus = document.getElementById('loginStatus');
        if (loginStatus) loginStatus.textContent = msg;
    }

    async function checkAdminRole(uid) {
        try {
            const doc = await window.getAdminDb().collection('users').doc(uid).get();
            return doc.exists && doc.data().role === 'admin';
        } catch (e) {
            return false;
        }
    }

    function initDashboard(user) {
        const emailEl = document.getElementById('adminEmail');
        if (emailEl) emailEl.textContent = user.email;

        const dateEl = document.getElementById('currentDate');
        if (dateEl) dateEl.textContent = new Date().toLocaleDateString();

        if (typeof window.loadStats === 'function') window.loadStats();
        if (typeof window.loadUsers === 'function') window.loadUsers();
        if (typeof window.loadAiLogs === 'function') window.loadAiLogs();
        if (typeof window.initTreeManager === 'function') window.initTreeManager(user);
    }

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');

  navItems.forEach(item => {
    const target = item.dataset.target;

    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.dataset.target;

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
                    section.classList.toggle('is-hidden', !isTarget);
                    section.classList.toggle('active', isTarget);
                });
            });
        });
    }

    function bindSettingsModalButton() {
        const adminMyBtn = document.getElementById('adminMyBtn');
        if (!adminMyBtn) return;

        adminMyBtn.addEventListener('click', () => {
            try {
                let modal = document.getElementById('settings-modal');
                if (!modal) {
                    if (typeof buildGlobalMyModalHTML === 'function') {
                        const wrap = document.createElement('div');
                        wrap.innerHTML = buildGlobalMyModalHTML();
                        const el = wrap.firstElementChild;
                        if (el) document.body.appendChild(el);
                    }
                    modal = document.getElementById('settings-modal');
                }

                if (!modal) {
                    alert('마이 메뉴를 열 수 없습니다.');
                    return;
                }

                if (!modal.dataset.outsideClickBound) {
                    modal.dataset.outsideClickBound = '1';
                    modal.addEventListener('click', function (e) {
                        try {
                            const rect = modal.getBoundingClientRect();
                            const x = e.clientX;
                            const y = e.clientY;
                            const isOutside = x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
                            if (isOutside) {
                                if (typeof modal.close === 'function') modal.close();
                                else modal.removeAttribute('open');
                            }
                        } catch (err) {
                        }
                    });
                }

                if (typeof modal.showModal === 'function') modal.showModal();
                else modal.setAttribute('open', 'open');
            } catch (e) {
                console.warn('adminMyBtn open settings-modal 실패:', e);
            }
        });
    }

    function bindBootstrapControls() {
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

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                firebase.auth().signOut().then(() => window.location.reload());
            });
        }

        bindSettingsModalButton();

        const refreshAiLogsBtn = document.getElementById('refreshAiLogsBtn');
        if (refreshAiLogsBtn) {
            refreshAiLogsBtn.addEventListener('click', () => {
                if (typeof window.loadAiLogs === 'function') {
                    window.loadAiLogs();
                }
            });
        }

        const seedDemoCommunityBtn = document.getElementById('seedDemoCommunityBtn');
        if (seedDemoCommunityBtn) {
            seedDemoCommunityBtn.addEventListener('click', () => {
                window.openDemoSeedModal('community');
            });
        }

        const seedDemoUsersBtn = document.getElementById('seedDemoUsersBtn');
        if (seedDemoUsersBtn) {
            seedDemoUsersBtn.addEventListener('click', () => {
                window.openDemoSeedModal('users');
            });
        }

        const seedDemoTreesBtn = document.getElementById('seedDemoTreesBtn');
        if (seedDemoTreesBtn) {
            seedDemoTreesBtn.addEventListener('click', () => {
                window.openDemoSeedModal('trees');
            });
        }

        const recalcNodeCountBtn = document.getElementById('recalcNodeCountBtn');
        if (recalcNodeCountBtn) {
            recalcNodeCountBtn.addEventListener('click', async () => {
                if (!window.confirm('모든 트리의 노드 수(nodeCount)를 다시 계산하시겠습니까?')) return;
                await window.recalcAllTreesNodeCount();
            });
        }

        const demoSeedCancel = document.getElementById('demoSeedCancel');
        if (demoSeedCancel) {
            demoSeedCancel.addEventListener('click', () => {
                window.closeDemoSeedModal();
            });
        }

        const demoSeedConfirm = document.getElementById('demoSeedConfirm');
        if (demoSeedConfirm) {
            demoSeedConfirm.addEventListener('click', async () => {
                const inputEl = document.getElementById('demoSeedCount');
                let count = inputEl ? parseInt(inputEl.value, 10) : NaN;
                if (!Number.isFinite(count) || count <= 0) {
                    count = null;
                }

                const mode = window.currentDemoSeedMode;
                window.closeDemoSeedModal();

                if (mode === 'users') {
                    await window.seedDemoUsers(count);
                } else if (mode === 'trees') {
                    await window.seedDemoTrees(count);
                } else if (mode === 'community') {
                    await window.seedDemoCommunityPosts(count);
                }
            });
        }
    }

    function bootAdminPage(adminEmails) {
        document.addEventListener('DOMContentLoaded', () => {
            if (!firebase.apps.length && firebaseConfig) {
                firebase.initializeApp(firebaseConfig);
            }

            bindBootstrapControls();
            setupNavigation();

            if (window.AdminUsers && typeof window.AdminUsers.bindUserControls === 'function') {
                window.AdminUsers.bindUserControls();
            }

            const loginOverlay = document.getElementById('loginOverlay');

            firebase.auth().onAuthStateChanged(async (user) => {
                const adminShell = document.getElementById('adminShell');

                if (!user) {
                    if (adminShell) adminShell.classList.add('is-hidden');
                    if (loginOverlay) loginOverlay.classList.remove('is-hidden');
                    setStatus('로그인이 필요합니다.');
                    return;
                }

                setStatus('권한 확인 중...');

                const isAdmin = await checkAdminRole(user.uid);

                if (!isAdmin) {
                    setStatus('관리자 권한이 없습니다. (' + user.email + ')');
                    if (adminShell) adminShell.classList.add('is-hidden');
                    if (loginOverlay) loginOverlay.classList.remove('is-hidden');
                    return;
                }

                if (loginOverlay) loginOverlay.classList.add('is-hidden');
                if (adminShell) adminShell.classList.remove('is-hidden');
                initDashboard(user);
            });
        });
    }

    window.AdminBootstrap = {
        bootAdminPage,
        checkAdminRole,
        initDashboard,
        setupNavigation
    };
    window.checkAdminRole = checkAdminRole;
    window.initDashboard = initDashboard;
    window.setupNavigation = setupNavigation;
})();
