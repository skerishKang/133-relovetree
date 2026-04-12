/**
 * Auth: Firebase / Data: Neon Postgres via compat layer
 * Lovetree My Trees Dashboard
 */
(function () {
  var F = window.FlowShared;
  var currentUser = null;
  var listenersAttached = false;

  function init() {
    F.requireAuth(function (user) {
      currentUser = user;
      updateNavAuthUI(user);
      showUserAvatar(user);
      attachEventListeners();
      loadTrees();
    });
  }

  function updateNavAuthUI(user) {
    var authItem = document.getElementById('nav-auth-item');
    if (authItem && user) {
      authItem.textContent = '내 트리';
      authItem.href = 'my-trees.html';
      authItem.classList.add('active');
    }
  }

  function showUserAvatar(user) {
    var img = document.getElementById('user-avatar');
    if (img && user && user.photoURL) {
      img.src = user.photoURL;
      img.style.display = 'block';
    }
  }

  function loadTrees() {
    showLoading();
    
    F.loadUserTrees(currentUser).then(function (trees) {
      hideLoading();
      
      if (!trees || trees.length === 0) {
        showEmptyState();
      } else {
        showContentArea();
        renderTreeList(trees);
      }
    }).catch(function (err) {
      console.error('Failed to load trees:', err);
      hideLoading();
      showErrorState(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    });
  }

  function showLoading() {
    var loading = document.getElementById('loading-area');
    var content = document.getElementById('content-area');
    var empty = document.getElementById('empty-state');
    var error = document.getElementById('error-state');
    
    if (loading) loading.style.display = 'block';
    if (content) content.style.display = 'none';
    if (empty) empty.style.display = 'none';
    if (error) error.style.display = 'none';
  }

  function hideLoading() {
    var loading = document.getElementById('loading-area');
    if (loading) loading.style.display = 'none';
  }

  function showEmptyState() {
    var empty = document.getElementById('empty-state');
    var content = document.getElementById('content-area');
    var error = document.getElementById('error-state');
    
    if (empty) empty.style.display = 'block';
    if (content) content.style.display = 'none';
    if (error) error.style.display = 'none';
  }

  function showContentArea() {
    var content = document.getElementById('content-area');
    var empty = document.getElementById('empty-state');
    var error = document.getElementById('error-state');
    
    if (content) content.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (error) error.style.display = 'none';
  }

  function showErrorState(message) {
    var error = document.getElementById('error-state');
    var empty = document.getElementById('empty-state');
    var content = document.getElementById('content-area');
    var msgEl = document.getElementById('error-message');
    
    if (error) {
      error.style.display = 'block';
      if (msgEl && message) {
        msgEl.textContent = message;
      }
    }
    if (empty) empty.style.display = 'none';
    if (content) content.style.display = 'none';
  }

  function getTreeId(tree) {
    return tree._id || tree.id || '';
  }

  function getNodeCount(tree) {
    var nodes = tree && tree.nodes;
    if (!nodes || !Array.isArray(nodes)) return 0;
    return nodes.length;
  }

  function getTreeVisibility(tree) {
    return tree && (tree.visibility || tree.isPublic || 'private');
  }

function renderTreeList(trees) {
    var list = document.getElementById('tree-list');
    if (!list) return;

    list.innerHTML = '';

    trees.forEach(function (tree) {
      var treeId = getTreeId(tree);
      if (!treeId) return;

      var nodeCount = getNodeCount(tree);
      var lastUpdated = (tree.lastUpdated || tree.updatedAt || tree.createdAt || '');
      var dateStr = F.formatKoreanDate(lastUpdated);
      var treeName = tree.name || '이름 없는 트리';
      var visibility = getTreeVisibility(tree);
      var isPublic = visibility === 'public';

      var firstThumb = '';
      var nodes = tree.nodes;
      if (nodes && nodes.length > 0 && nodes[0].videoId) {
        firstThumb = F.getYouTubeThumb(nodes[0].videoId);
      }

      var card = document.createElement('div');
      card.className = 'my-tree-card';

      card.innerHTML = 
        '<div class="card-top">' +
        '<h3>' + escapeHtml(treeName) + '</h3>' +
        '<span class="status-badge ' + (isPublic ? 'public' : 'private') + '">' + (isPublic ? 'Public' : 'Private') + '</span>' +
        '</div>' +
        '<div class="card-meta">' +
        '<p>' + nodeCount + '개의 순간 • ' + escapeHtml(dateStr) + '</p>' +
        '</div>' +
        '<div class="card-thumbnails">' +
        (firstThumb ? '<div class="thumb-box"><img src="' + escapeHtml(firstThumb) + '" alt=""></div>' : '<div class="thumb-box">🌱</div>') +
        '<div class="thumb-box"></div>' +
        '<div class="thumb-box"></div>' +
        '</div>' +
        '<div class="card-actions">' +
        '<button class="action-item action-primary" data-action="add" data-tree-id="' + escapeHtml(treeId) + '"><span class="action-icon">✏️</span> 순간 추가</button>' +
        '<button class="action-item" data-action="view" data-tree-id="' + escapeHtml(treeId) + '"><span class="action-icon">🌳</span> 트리 보기</button>' +
        '</div>';

      list.appendChild(card);
    });

    if (!listenersAttached) {
      list.addEventListener('click', handleTreeActionClick);
      listenersAttached = true;
    }
  }

function handleTreeActionClick(e) {
    var btn = e.target.closest('.action-item');
    if (!btn) return;

    var action = btn.getAttribute('data-action');
    var treeId = btn.getAttribute('data-tree-id');

    if (!treeId) return;

    if (action === 'add') {
      window.location.href = '/pages/mobile-add-memory.html?treeId=' + encodeURIComponent(treeId);
    } else if (action === 'view') {
      window.location.href = '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showNewTreeModal() {
    var modal = document.getElementById('new-tree-modal');
    var nameInput = document.getElementById('new-tree-name');
    var createBtn = document.getElementById('btn-create-tree');
    
    if (modal) modal.classList.remove('is-hidden');
    if (nameInput) {
      nameInput.value = '';
      nameInput.focus();
    }
    if (createBtn) {
      createBtn.disabled = false;
      createBtn.textContent = '만들기';
    }
  }

  function hideNewTreeModal() {
    var modal = document.getElementById('new-tree-modal');
    if (modal) modal.classList.add('is-hidden');
  }

  function createNewTree() {
    var nameInput = document.getElementById('new-tree-name');
    var btn = document.getElementById('btn-create-tree');
    
    if (!nameInput || !btn) return;
    
    var name = (nameInput.value || '').trim() || '나의 러브트리';
    
    btn.disabled = true;
    btn.textContent = '만드는 중...';

    F.createTree(currentUser, name).then(function (docRef) {
      hideNewTreeModal();
      var treeId = docRef && (docRef.id || docRef);
      if (treeId) {
        window.location.href = '/pages/mobile-add-memory.html?treeId=' + encodeURIComponent(treeId) + '&isNew=1';
      } else {
        window.location.reload();
      }
    }).catch(function (err) {
      console.error('Failed to create tree:', err);
      if (btn) {
        btn.disabled = false;
        btn.textContent = '만들기';
      }
      alert('트리 생성에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    });
  }

  function attachEventListeners() {
    if (listenersAttached) return;
    
    var newTreeBtn = document.getElementById('btn-new-tree');
    var firstTreeBtn = document.getElementById('btn-first-tree');
    var cancelBtn = document.getElementById('btn-cancel-tree');
    var createBtn = document.getElementById('btn-create-tree');
    var modalOverlay = document.getElementById('new-tree-modal');
    var nameInput = document.getElementById('new-tree-name');
    var retryBtn = document.getElementById('btn-retry-load');

    if (newTreeBtn) newTreeBtn.addEventListener('click', showNewTreeModal);
    if (firstTreeBtn) firstTreeBtn.addEventListener('click', showNewTreeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideNewTreeModal);
    if (createBtn) createBtn.addEventListener('click', createNewTree);
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) hideNewTreeModal();
      });
    }
    if (nameInput) {
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') createNewTree();
      });
    }
    if (retryBtn) {
      retryBtn.addEventListener('click', function() {
        loadTrees();
      });
    }

    listenersAttached = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();