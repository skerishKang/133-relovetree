(function () {
  var SEL = {
    home:            { authItem: '#nav-auth-item', logoutBtn: '#nav-logout-btn' },
    'editor-desktop': { canvas: '.canvas', node: '.ed-node',
                        panelTitle: '.pan-title span', panelMemo: '.memo-text',
                        panelDate: '.archive-item:nth-child(1) .archive-val',
                        panelTags: '.archive-item:nth-child(2) .archive-val',
                        skeletonWrap: '.pan-skeleton-wrap', dataWrap: '.pan-data-wrap' },
    'mobile-tree':   { card: '.moment-card', date: '.mc-date', title: '.mc-title',
                        memo: '.mc-memo', tag: '.mc-tag', thumb: '.mc-thumb img',
                        sub: '.mob-top-sub', endText: '.trunk-end-text' },
    'my-trees':      { grid: '.trees-grid', empty: '.empty-state', card: '.my-tree-card' },
    'album-view':    { container: '.album-grid', item: '.av-item' },
    'mobile-add-branch': { nodes: '.bt-node-container' },
    settings:        { initial: '.profile-initial', name: '.profile-info h3',
                        email: '.profile-info p', logout: '.btn-logout' }
  };

  var PAGE_MAP = { 'ed-page':'editor-desktop', 'mob-page':'mobile-tree',
                   'settings-page':'settings', 'home-page':'home' };

  function detectPage() {
    for (var cls in PAGE_MAP) { if (document.body.classList.contains(cls)) return PAGE_MAP[cls]; }
    var p = location.pathname;
    if (p.includes('editor-desktop')) return 'editor-desktop';
    if (p.includes('mobile-tree')) return 'mobile-tree';
    if (p.includes('settings')) return 'settings';
    if (p.includes('home')) return 'home';
    if (p.includes('my-trees')) return 'my-trees';
    if (p.includes('album-view')) return 'album-view';
    if (p.includes('mobile-add-branch')) return 'mobile-add-branch';
    return null;
  }

  function fmt(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\s/g,'.');
  }

  function treeId() { return new URLSearchParams(location.search).get('treeId'); }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return document.querySelectorAll(s); }

  function initAuth() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    firebase.auth().onAuthStateChanged(function (user) {
      document.body.classList.toggle('auth-logged-in', !!user);
      document.body.classList.toggle('auth-logged-out', !user);
      if (user) onLogin(user); else onLogout();
    });
  }

  async function onLogin(user) {
    var page = detectPage();
    if (!page) return;
    if (page === 'home') applyHomeAuth(user);
    if (page === 'settings') applySettingsProfile(user);
    if (page === 'editor-desktop' || page === 'mobile-tree') await loadMoments(page, user);
    if (page === 'my-trees' || page === 'album-view' || page === 'mobile-add-branch') await loadConceptData(page, user);
  }

  function onLogout() {
    var page = detectPage();
    if (page === 'home') {
      var a = q(SEL.home.authItem), b = q(SEL.home.logoutBtn);
      if (a) { a.textContent = '로그인'; a.href = 'login.html'; a.classList.remove('is-hidden'); }
      if (b) b.classList.add('is-hidden');
    }
    var page2 = detectPage();
    if (page2 && SEL[page2]) {
      var target = q(SEL[page2].canvas || SEL[page2].grid || SEL[page2].container);
      if (target) target.classList.add('needs-auth');
    }
  }

  function applyHomeAuth(user) {
    var a = q(SEL.home.authItem), b = q(SEL.home.logoutBtn);
    if (a) { a.textContent = user.displayName || '마이페이지'; a.href = 'settings.html'; }
    if (b) b.classList.remove('is-hidden');
  }

  function applySettingsProfile(user) {
    var s = SEL.settings;
    var ini = q(s.initial), nm = q(s.name), em = q(s.email), lo = q(s.logout);
    if (nm) nm.textContent = user.displayName || '러브트리 여행자';
    if (em) em.textContent = user.email || '';
    if (ini) ini.textContent = (user.displayName || '러').charAt(0);
    if (lo) lo.onclick = function () { firebase.auth().signOut(); location.href = 'home.html'; };
  }

  async function loadMoments(page, user) {
    var tid = treeId();
    if (!tid || !window.postgresDB) return;
    try {
      var snap = await window.postgresDB.collection('moments')
        .where('treeId','==',tid).orderBy('createdAt','asc').get();
      var data = snap.docs.map(function (d) { return Object.assign({id:d.id}, d.data()); });
      if (page === 'editor-desktop') renderEditor(data);
      if (page === 'mobile-tree') renderMobileTree(data);
    } catch (e) { console.error('concept-state load error:', e); }
  }

  async function loadConceptData(page, user) {
    var s = SEL[page]; if (!s || !window.postgresDB) return;
    try {
      var snap, data, tid = treeId();
      if (page === 'my-trees') {
        snap = await window.postgresDB.collection('trees').where('userId','==',user.uid).get();
        data = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
        renderTrees(s, data);
      }
      if (page === 'album-view' && tid) {
        snap = await window.postgresDB.collection('moments').where('treeId','==',tid).orderBy('createdAt','desc').get();
        data = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
        renderAlbum(s, data);
      }
      if (page === 'mobile-add-branch' && tid) {
        snap = await window.postgresDB.collection('moments').where('treeId','==',tid).orderBy('createdAt','asc').get();
        data = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
        renderBranch(s, data);
      }
    } catch (e) { console.error('concept-state load error:', e); }
  }

  function renderTrees(s, trees) {
    var grid = q(s.grid), empty = q(s.empty);
    if (!grid) return;
    grid.classList.toggle('is-empty', trees.length === 0);
    if (empty) empty.classList.toggle('is-hidden', trees.length > 0);
    trees.forEach(function (t, i) {
      var card = grid.querySelectorAll(s.card)[i];
      if (!card) return;
      var h = card.querySelector('h3'); if (h) h.textContent = t.title || '제목 없음';
      var m = card.querySelector('.card-meta'); if (m) m.textContent = (t.momentCount||0)+'개의 기억 • '+fmt(t.createdAt);
    });
  }

  function renderAlbum(s, moments) {
    var c = q(s.container); if (!c) return;
    c.classList.toggle('is-empty', moments.length === 0);
    var items = c.querySelectorAll(s.item);
    moments.forEach(function (m, i) {
      if (!items[i]) return;
      var h = items[i].querySelector('h3'); if (h) h.textContent = m.title || '제목 없음';
      var d = items[i].querySelector('.av-date'); if (d) d.textContent = fmt(m.createdAt);
      var t = items[i].querySelector('.av-tag'); if (t && m.emotion) t.textContent = '#'+m.emotion;
    });
  }

  function renderBranch(s, moments) {
    var nodes = qa(s.nodes);
    moments.forEach(function (m, i) {
      if (!nodes[i]) return;
      var n = nodes[i].querySelector('.bt-node'); if (!n) return;
      var h = n.querySelector('h3'); if (h) h.textContent = m.title || '제목 없음';
      var d = n.querySelector('.date'); if (d) d.textContent = fmt(m.createdAt);
      var e = n.querySelector('.emotion'); if (e) e.textContent = m.emotion || '감동';
    });
  }

  function renderEditor(moments) {
    var s = SEL['editor-desktop'];
    var canvas = q(s.canvas), nodes = qa(s.node);
    if (!canvas) return;
    canvas.classList.toggle('is-empty', moments.length === 0);
    moments.forEach(function (m, i) {
      var n = nodes[i]; if (!n) return;
      var h5 = n.querySelector('h5'); if (h5) h5.textContent = m.title || '제목 없음';
      var meta = n.querySelector('.node-meta'); if (meta) meta.textContent = fmt(m.createdAt);
      var badge = n.querySelector('.node-emotion');
      if (badge) { badge.textContent = m.emotion || ''; badge.classList.toggle('is-hidden', !m.emotion); }
    });
    if (moments[0]) updatePanel(moments[0]);
  }

  function updatePanel(m) {
    var s = SEL['editor-desktop'];
    var sk = q(s.skeletonWrap), dw = q(s.dataWrap);
    if (sk) sk.classList.add('is-hidden');
    if (dw) dw.classList.remove('is-hidden');
    var t = q(s.panelTitle); if (t) t.textContent = m.title || '';
    var mt = q(s.panelMemo); if (mt) mt.textContent = m.memo || '';
    var dt = q(s.panelDate); if (dt) dt.textContent = fmt(m.createdAt);
    var tg = q(s.panelTags); if (tg) tg.textContent = m.tags || '';
  }

  function renderMobileTree(moments) {
    var s = SEL['mobile-tree'];
    var cards = qa(s.card);
    moments.forEach(function (m, i) {
      var c = cards[i]; if (!c) return;
      var ti = c.querySelector(s.title); if (ti) ti.textContent = m.title || '';
      var da = c.querySelector(s.date);  if (da) da.textContent = fmt(m.createdAt);
      var me = c.querySelector(s.memo);  if (me) me.textContent = m.memo || '';
      var ta = c.querySelector(s.tag);   if (ta) ta.textContent = m.tags ? '#'+m.tags.replace(/,/g,' #') : '';
      var im = c.querySelector(s.thumb); if (im && m.thumbUrl) im.src = m.thumbUrl;
    });
    var sub = q(s.sub);
    if (sub && moments.length) sub.textContent = fmt(moments[0].createdAt) + '부터 함께한 기록';
    var et = q(s.endText);
    if (et) et.textContent = '오늘까지 ' + moments.length + '개의 순간';
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAuth();
    setTimeout(function () {
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        onLogin(firebase.auth().currentUser);
      }
    }, 600);
  });
})();
