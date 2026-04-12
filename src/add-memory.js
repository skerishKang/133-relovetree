/**
 * Lovetree - Add Memory Form Handler
 * mobile-add-memory.html의 폼 제출 로직
 *
 * Canonical implementation: Uses createMoment() from api.js
 * and properly handles treeId from URL params.
 */

// Get treeId from URL params (passed from my-trees when creating new tree)
function getTreeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('treeId') || '';
}

// Get isNew flag from URL
function getIsNewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('isNew') === '1';
}

// 폼 데이터 수집
function collectFormData() {
  // 선택된 감정 chips
  const selectedEmotionEl = document.querySelector('.emotion-chip.selected');
  const emotion = selectedEmotionEl ? selectedEmotionEl.dataset.emotion : '감동';

  // 트리 ID: URL parameter takes priority, then dropdown
  let treeId = getTreeIdFromUrl();
  if (!treeId) {
    const treeSelect = document.getElementById('tree-select');
    treeId = treeSelect?.value || '';
  }

  return {
    treeId: treeId,
    title: document.getElementById('memory-title')?.value || '',
    videoUrl: document.getElementById('video-url')?.value || '',
    date: document.getElementById('memory-date')?.value || new Date().toISOString().split('T')[0],
    emotion: emotion,
    memo: document.getElementById('memory-memo')?.value || ''
  };
}

// 폼 유효성 검사
function validateFormData(data) {
  const errors = [];

  // treeId must be provided
  if (!data.treeId) {
    errors.push('트리를 선택해 주세요');
  }

  if (!data.videoUrl || data.videoUrl.trim().length < 5) {
    errors.push('영상 링크를 입력해 주세요');
  }

  if (!data.title || data.title.trim().length < 1) {
    errors.push('기억의 제목을 입력해 주세요');
  }

  if (!data.date) {
    errors.push('날짜를 선택해 주세요');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// 폼 제출 핸들러
async function handleMemorySubmit(event) {
  if (event) event.preventDefault();

  const submitBtn = document.getElementById('btn-submit-memory');
  if (!submitBtn) return;

  // treeId validation - MUST have treeId from URL for this flow
  const treeId = getTreeIdFromUrl();
  if (!treeId) {
    alert('트리를 찾을 수 없습니다. 다시 시도해 주세요.');
    window.location.href = '/pages/my-trees.html';
    return;
  }

  // 로딩 상태
  const idleSpan = submitBtn.querySelector('.state-idle');
  const loadingSpan = submitBtn.querySelector('.state-loading');
  const originalText = idleSpan ? idleSpan.textContent : submitBtn.textContent;
  
  submitBtn.disabled = true;
  if (idleSpan) idleSpan.classList.add('is-hidden');
  if (loadingSpan) loadingSpan.classList.remove('is-hidden');

  try {
    // 1. 폼 데이터 수집
    const formData = collectFormData();
    formData.treeId = treeId; // Ensure treeId from URL is used

    // 2. 유효성 검사
    const validation = validateFormData(formData);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    // 3. FlowShared를 사용하여 트리에 순간 추가
    const F = window.FlowShared;
    
    // 3a. 트리 데이터 로드
    const treeData = await F.loadTree(treeId);
    if (!treeData) {
      throw new Error('트리를 찾을 수 없습니다.');
    }

    // 3b. 메모리 데이터 포맷팅
    const memoryData = {
      title: formData.title,
      date: formData.date,
      videoId: F.parseYouTubeId(formData.videoUrl) || '',
      sourceUrl: formData.videoUrl,
      memo: formData.memo,
      emotionTag: formData.emotion
    };

    // 3c. 트리에 순간 추가
    await F.addMemoryToTree(treeId, treeData, null, memoryData);

    // 4. 성공: 트리 페이지로 이동
    alert('기억이 저장되었습니다!');
    window.location.href = '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);

  } catch (error) {
    console.error('Memory submit error:', error);
    alert('저장 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
  } finally {
    // 로딩 상태 해제
    submitBtn.disabled = false;
    if (idleSpan) idleSpan.classList.remove('is-hidden');
    if (loadingSpan) loadingSpan.classList.add('is-hidden');
    if (idleSpan) idleSpan.textContent = originalText;
  }
}

// 비디오 URL 변경 시 프리뷰 업데이트
function setupVideoPreview() {
  const videoInput = document.getElementById('video-url');
  const previewNode = document.getElementById('preview-node');
  const previewTitle = document.getElementById('preview-title');
  const previewDate = document.getElementById('preview-date');

  if (!videoInput || !previewNode) return;

  videoInput.addEventListener('input', function(e) {
    const url = e.target.value;

    if (url.length > 10) {
      // 프리뷰 활성화
      previewNode.style.transform = 'rotate(0deg) scale(1.05)';
      previewNode.style.borderColor = '#b56e6e';

      const thumbBox = document.getElementById('preview-thumb');
      if (thumbBox) {
        thumbBox.style.background = '#000';
        // 실제 구현 시 YouTube 썸네일 API 연동
        thumbBox.innerHTML = '<img src="https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=300&auto=format&fit=crop" class="preview-dynamic-img">';
      }

      // URL에서 제목 추출 시도
      if (previewTitle) {
        previewTitle.textContent = extractTitleFromUrl(url) || '새로운 기억';
      }
    } else {
      // 초기화
      previewNode.style.transform = '';
      previewNode.style.borderColor = '';

      const thumbBox = document.getElementById('preview-thumb');
      if (thumbBox) {
        thumbBox.style.background = '';
        thumbBox.innerHTML = '<span>🎬</span>';
      }
    }
  });
}

// 제목 자동 추출 (간이 구현)
function extractTitleFromUrl(url) {
  // 실제 구현 시 YouTube Data API 연동 필요
  // 여기서는 URL을 기반으로 간단히 처리
  try {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return '유튜브 영상';
    }
  } catch (e) {
    // 무시
  }
  return null;
}

// 감정 chips 선택 핸들러
function setupEmotionTabs() {
  const tabs = document.getElementById('emotion-tabs');
  if (!tabs) return;

  tabs.addEventListener('click', function(e) {
    const chip = e.target.closest('.emotion-chip');
    if (!chip) return;

    tabs.querySelectorAll('.emotion-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
  });
}

// 초기화
function initAddMemory() {
  // 폼 제출 리스너
  const form = document.getElementById('memory-form');
  if (form) {
    form.addEventListener('submit', handleMemorySubmit);
  }

  // 비디오 프리뷰
  setupVideoPreview();

  // 감정 tabs
  setupEmotionTabs();
}

// DOM 로드 후 실행
document.addEventListener('DOMContentLoaded', initAddMemory);

// 전역 노출
window.handleMemorySubmit = handleMemorySubmit;
window.collectFormData = collectFormData;
window.validateFormData = validateFormData;
