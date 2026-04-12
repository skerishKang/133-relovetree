/**
 * Auth: Firebase / Data: Neon Postgres via compat layer
 * Lovetree Mobile Tree View
 * 
 * Works with existing mobile-tree.html structure:
 * - .trunk container for moment cards
 * - .moment-card for each moment
 * - .mc-date, .mc-title, .mc-memo, .mc-tag for card content
 */
(function () {
  var F = window.FlowShared;
  var currentUser = null;
  var treeId = '';
  var treeData = null;

  function init() {
    treeId = getTreeIdFromUrl();

    if (!treeId) {
      window.location.href = '/pages/my-trees.html';
      return;
    }

    showLoading();

    F.requireAuth(function (user) {
      currentUser = user;
      loadTree();
    });
  }

  function getTreeIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get('treeId') || '';
  }

  function showLoading() {
    var loading = document.getElementById('loading-state');
    var error = document.getElementById('error-state');
    var empty = document.getElementById('empty-state');
    var trunk = document.querySelector('.trunk');
    
    if (loading) loading.classList.remove('is-hidden');
    if (error) error.classList.add('is-hidden');
    if (empty) empty.classList.add('is-hidden');
    if (trunk) trunk.style.display = 'none';
  }

  function hideLoading() {
    var loading = document.getElementById('loading-state');
    if (loading) loading.classList.add('is-hidden');
  }

  function showError(message) {
    var error = document.getElementById('error-state');
    var msgEl = document.getElementById('error-message');
    var loading = document.getElementById('loading-state');
    var trunk = document.querySelector('.trunk');
    
    if (loading) loading.classList.add('is-hidden');
    if (trunk) trunk.style.display = 'none';
    if (error) {
      error.classList.remove('is-hidden');
      if (msgEl && message) {
        msgEl.textContent = message;
      }
    }
  }

  function showEmpty() {
    var empty = document.getElementById('empty-state');
    var trunk = document.querySelector('.trunk');
    var loading = document.getElementById('loading-state');
    
    if (loading) loading.classList.add('is-hidden');
    if (trunk) trunk.style.display = 'none';
    if (empty) empty.classList.remove('is-hidden');
  }

  function showContent() {
    var trunk = document.querySelector('.trunk');
    var loading = document.getElementById('loading-state');
    var error = document.getElementById('error-state');
    var empty = document.getElementById('empty-state');
    
    if (loading) loading.classList.add('is-hidden');
    if (error) error.classList.add('is-hidden');
    if (empty) empty.classList.add('is-hidden');
    if (trunk) trunk.style.display = 'block';
  }

  function loadTree() {
    F.loadTree(treeId).then(function (data) {
      hideLoading();

      if (!data) {
        showError('트리를 찾을 수 없습니다.');
        return;
      }

      treeData = data;
      updateHeader(data);
      
      var nodes = data.nodes || [];
      
      if (nodes.length === 0) {
        showEmpty();
      } else {
        showContent();
        renderMoments(nodes);
      }
    }).catch(function (err) {
      console.error('Failed to load tree:', err);
      showError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    });
  }

  function updateHeader(data) {
    var titleEl = document.querySelector('.mob-top-title');
    var subEl = document.querySelector('.mob-top-sub');
    
    if (titleEl) {
      titleEl.textContent = data.name || '러브트리';
    }
    
    if (subEl && data.createdAt) {
      var date = F.formatKoreanDate(data.createdAt);
      subEl.textContent = date + '부터 함께한 기록';
    } else if (subEl) {
      subEl.textContent = '사랑의 기록';
    }
  }

  function renderMoments(nodes) {
    var trunk = document.querySelector('.trunk');
    if (!trunk) return;

    // Remove existing moment cards (keep trunk-line)
    var existingCards = trunk.querySelectorAll('.moment-card');
    existingCards.forEach(function(card) {
      card.remove();
    });

    // Remove existing trunk-end
    var existingEnd = trunk.querySelector('.trunk-end');
    if (existingEnd) {
      existingEnd.remove();
    }

    // Sort nodes by date
    var sortedNodes = nodes.slice().sort(function(a, b) {
      var dateA = a.date || '';
      var dateB = b.date || '';
      return dateA.localeCompare(dateB);
    });

    // Render each moment
    sortedNodes.forEach(function(node, index) {
      var card = createMomentCard(node, index);
      trunk.appendChild(card);
    });

    // Add trunk end
    var endDiv = document.createElement('div');
    endDiv.className = 'trunk-end';
    endDiv.innerHTML = 
      '<span class="trunk-end-dot"></span>' +
      '<span class="trunk-end-text">오늘까지 ' + nodes.length + '개의 순간</span>';
    trunk.appendChild(endDiv);
  }

  function createMomentCard(node, index) {
    var card = document.createElement('article');
    card.className = 'moment-card';
    if (index % 2 === 1) card.classList.add('mc-alt');

    var dateStr = F.formatKoreanDate(node.date);
    var title = escapeHtml(node.title || '순간');
    var memo = escapeHtml(node.description || node.memo || '');
    
    // Get emotion tag
    var emotionTag = '';
    if (node.moments && node.moments.length > 0 && node.moments[0].feeling) {
      emotionTag = F.feelingToTag(node.moments[0].feeling);
    }

    // Get thumbnail
    var thumbHtml = '';
    if (node.videoId) {
      var thumbUrl = F.getYouTubeThumb(node.videoId);
      thumbHtml = '<img src="' + thumbUrl + '" alt="">';
    } else {
      thumbHtml = '<span>🎬</span>';
    }

    card.innerHTML = 
      '<div class="mc-branch">' +
      '<span class="mc-node-dot"></span>' +
      '<span class="mc-node-line"></span>' +
      '</div>' +
      '<div class="mc-body">' +
      '<div class="mc-thumb">' +
      thumbHtml +
      '<div class="mc-thumb-veil"></div>' +
      '</div>' +
      '<span class="mc-date">' + dateStr + '</span>' +
      '<h3 class="mc-title">' + title + '</h3>' +
      (memo ? '<p class="mc-memo">' + memo + '</p>' : '') +
      (emotionTag ? '<span class="mc-tag">#' + emotionTag + '</span>' : '') +
      '</div>';

    return card;
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getAddMemoryUrl() {
    return '/pages/mobile-add-memory.html?treeId=' + encodeURIComponent(treeId);
  }

  function bindEvents() {
    // Retry button
    var retryBtn = document.getElementById('btn-retry-tree');
    if (retryBtn) {
      retryBtn.addEventListener('click', function() {
        loadTree();
      });
    }

    // Add first button (in empty state)
    var addFirstBtn = document.getElementById('btn-add-first');
    if (addFirstBtn) {
      addFirstBtn.addEventListener('click', function() {
        window.location.href = getAddMemoryUrl();
      });
    }

    // Add moment button (in bottom CTA)
    var addMomentBtn = document.getElementById('btn-add-moment');
    if (addMomentBtn) {
      addMomentBtn.addEventListener('click', function() {
        window.location.href = getAddMemoryUrl();
      });
    // Continue editing button (in bottom CTA)
    var continueEditBtn = document.getElementById("btn-edit-tree");
    if (continueEditBtn) {
      continueEditBtn.addEventListener("click", function() {
        window.location.href = "/pages/editor.html?id=" + encodeURIComponent(treeId);
      });
    }
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      bindEvents();
    });
  } else {
    init();
    bindEvents();
  }
})();