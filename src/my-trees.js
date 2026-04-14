/**
 * Auth: Firebase / Data: Neon Postgres via compat layer
 * Lovetree My Trees Dashboard
 */
(function () {
  var F = window.FlowShared;
  var currentUser = null;
  var loadedTrees = [];
  var listenersAttached = false;

  function init() {
    // Show loading state first (prevents "flash of empty content")
    showLoading();
    
    F.requireAuth(function (user) {
      currentUser = user;
      if (window.updateLTAuthUI) window.updateLTAuthUI(user);
      showUserAvatar(user);
      attachEventListeners();
      
      // Now load trees after auth is confirmed
      loadTrees();
    });
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
      loadedTrees = trees || [];
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
    var loading = document.getElementById('loading-area');
    
    if (content) content.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (error) error.style.display = 'none';
    if (loading) loading.style.display = 'none';
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
    return tree && tree.isPublic === true ? 'public' : 'private';
  }

  function renderTreeList(trees) {
    var list = document.getElementById('tree-list');
    if (!list) return;

    list.innerHTML = '';

    // Collect all nodes for sidebar
    var allNodes = [];

    trees.forEach(function (tree) {
      var treeId = getTreeId(tree);
      if (!treeId) return;

      var nodes = tree.nodes || [];
      var nodeCount = nodes.length;
      var lastUpdated = tree.updatedAt || tree.createdAt || '';
      var dateStr = F.formatKoreanDate(lastUpdated);
      var treeName = tree.name || '이름 없는 트리';
      var visibility = getTreeVisibility(tree);
      var isPublic = visibility === 'public';

      // Store nodes for sidebar sorting
      nodes.forEach(function(n) { 
        n.treeId = treeId;
        n.treeName = treeName;
        allNodes.push(n); 
      });

      // Get up to 3 thumbnails
      var thumbs = [];
      nodes.slice(0, 3).forEach(function(node) {
        if (node.videoId) thumbs.push(F.getYouTubeThumb(node.videoId));
      });

      var card = document.createElement('div');
      card.className = 'tree-card-v3';

      var thumbsHtml = '';
      for (var i = 0; i < 3; i++) {
        thumbsHtml += '<div class="tc-thumb-item">' + 
          (thumbs[i] ? '<img src="' + escapeHtml(thumbs[i]) + '" alt="">' : '<span>🌱</span>') + 
          '</div>';
      }

      card.innerHTML = 
        '<div class="tc-header">' +
        '    <div class="tc-title">' +
        '        <h3>' + escapeHtml(treeName) + '</h3>' +
        '        <span class="tc-meta">마지막 업데이트 ' + escapeHtml(dateStr) + '</span>' +
        '    </div>' +
        '    <span class="tc-badge ' + (isPublic ? 'public' : '') + '">' + (isPublic ? 'Public' : 'Private') + '</span>' +
        '</div>' +
        '<div style="font-size: 0.85rem; color: #64748b;">' + nodeCount + ' 순간들</div>' +
        '<div class="tc-thumbs">' + thumbsHtml + '</div>' +
        '<div class="tc-actions">' +
        '    <button class="btn-tc-action" data-action="edit" data-tree-id="' + escapeHtml(treeId) + '"><span>✎</span>편집</button>' +
        '    <button class="btn-tc-action" data-action="toggle-public" data-tree-id="' + escapeHtml(treeId) + '"><span>' + (isPublic ? '🔒' : '🌐') + '</span>' + (isPublic ? '비공개' : '공개') + '</button>' +
        '    <button class="btn-tc-action" data-action="share" data-tree-id="' + escapeHtml(treeId) + '"><span>↗</span>공유</button>' +
        '    <button class="btn-tc-action" data-action="duplicate" data-tree-id="' + escapeHtml(treeId) + '"><span>❐</span>복제</button>' +
        '    <button class="btn-tc-action" data-action="delete" data-tree-id="' + escapeHtml(treeId) + '"><span>🗑</span>삭제</button>' +
        '</div>';

      list.appendChild(card);
    });

    renderRecentMoments(allNodes);

    if (!listenersAttached) {
      list.addEventListener('click', handleTreeActionClick);
      listenersAttached = true;
    }
  }

  function renderRecentMoments(nodes) {
    var sidebarList = document.getElementById('recent-moments');
    if (!sidebarList) return;

    // Sort nodes by date desc
    nodes.sort(function(a, b) {
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });

    var recent = nodes.slice(0, 5);
    if (recent.length === 0) return;

    sidebarList.innerHTML = '';
    recent.forEach(function(node) {
      var thumb = node.videoId ? F.getYouTubeThumb(node.videoId) : '';
      var timeAgo = F.formatKoreanDate(node.updatedAt || node.createdAt);
      
      var item = document.createElement('a');
      item.href = '/pages/memory-detail.html?id=' + encodeURIComponent(node.id || node._id) + '&treeId=' + encodeURIComponent(node.treeId);
      item.className = 'moment-item-mini';
      item.innerHTML = 
        '<div class="mini-thumb">' + (thumb ? '<img src="' + thumb + '" style="width:100%; height:100%; object-fit:cover;">' : '🎬') + '</div>' +
        '<div class="mini-text">' +
        '    <h4>' + escapeHtml(node.title || '새로운 기억') + '</h4>' +
        '    <span>' + timeAgo + '</span>' +
        '</div>';
      sidebarList.appendChild(item);
    });
  }

  function handleTreeActionClick(e) {
    var btn = e.target.closest('.btn-tc-action');
    if (!btn) return;

    var action = btn.getAttribute('data-action');
    var treeId = btn.getAttribute('data-tree-id');

    if (!treeId) return;

    if (action === 'edit') {
      window.location.href = '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);
    } else if (action === 'share') {
      var shareUrl = window.location.origin + '/pages/community-tree-detail.html?treeId=' + encodeURIComponent(treeId);
      if (navigator.share) {
        navigator.share({ title: '나의 러브트리', url: shareUrl });
      } else {
        copyToClipboard(shareUrl);
        alert('공유 링크가 복사되었습니다!');
      }
    } else if (action === 'toggle-public') {
      var tree = loadedTrees.find(function(t) { return getTreeId(t) === treeId; });
      if (!tree) return;
      var newVisibility = !tree.isPublic;
      var db = window.postgresDB;
      if (!db) return;
      db.collection('trees').doc(treeId).set({ isPublic: newVisibility }, { merge: true }).then(function() {
        loadTrees();
      }).catch(function(err) {
        console.error('Failed to update visibility:', err);
        alert('공개 설정 변경에 실패했습니다.');
      });
    } else if (action === 'duplicate') {
      var tree = loadedTrees.find(function(t) { return getTreeId(t) === treeId; });
      if (!tree) return;
      if (!confirm('이 트리를 복제하시겠습니까?')) return;
      var db = window.postgresDB;
      if (!db) { alert('데이터베이스 연결 오류'); return; }
      var newDocRef = db.collection('trees').doc();
      var cloneData = Object.assign({}, tree);
      delete cloneData._id;
      delete cloneData.id;
      cloneData.name = (cloneData.name || '러브트리') + ' (복제)';
      cloneData.isPublic = false;
      cloneData.lastUpdated = new Date().toISOString();
      newDocRef.set(cloneData, { merge: true }).then(function() {
        loadTrees();
      }).catch(function(err) {
        console.error('Duplicate failed:', err);
        alert('트리 복제에 실패했습니다.');
      });
    } else if (action === 'delete') {
      if (confirm('정말 이 트리를 삭제하시겠습니까?')) {
        F.deleteTree(currentUser, treeId).then(function() {
          loadTrees();
        });
      }
    }
  }

  function copyToClipboard(text) {
    var input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
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
    
    if (modal) modal.classList.remove('is-hidden');
    if (nameInput) {
      nameInput.value = '';
      nameInput.focus();
    }
  }

  function hideNewTreeModal() {
    var modal = document.getElementById('new-tree-modal');
    if (modal) modal.classList.add('is-hidden');
  }

  function createNewTree() {
    var nameInput = document.getElementById('new-tree-name');
    var btn = document.getElementById('btn-create-confirm');
    
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
        btn.textContent = '트리 생성';
      }
      alert('트리 생성에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    });
  }

  function attachEventListeners() {
    if (listenersAttached) return;
    
    var newTreeBtn = document.getElementById('btn-new-tree');
    var firstTreeBtn = document.getElementById('btn-first-tree');
    var cancelBtn = document.getElementById('btn-cancel-tree');
    var confirmBtn = document.getElementById('btn-create-confirm');
    var modalOverlay = document.getElementById('new-tree-modal');
    var nameInput = document.getElementById('new-tree-name');
    var retryBtn = document.getElementById('btn-retry-load');

    if (newTreeBtn) newTreeBtn.addEventListener('click', showNewTreeModal);
    if (firstTreeBtn) firstTreeBtn.addEventListener('click', showNewTreeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideNewTreeModal);
    if (confirmBtn) confirmBtn.addEventListener('click', createNewTree);
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