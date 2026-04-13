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
  // 선택된 감정 chips (V3 대응: .emotion-chip-v3.active 또는 .emotion-chip.selected)
  const selectedEmotionEl = document.querySelector('.emotion-chip-v3.active, .emotion-chip.selected');
  const emotion = selectedEmotionEl ? (selectedEmotionEl.textContent || selectedEmotionEl.dataset.emotion) : '감동';

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
    emotion: emotion.trim(),
    memo: document.getElementById('memory-memo')?.value || ''
  };
}

// 폼 유효성 검사
function validateFormData(data) {
  const errors = [];

  // treeId must be provided
  if (!data.treeId) {
    errors.push('트리를 지정해 주세요 (URL 파라미터 필요)');
  }

  if (!data.videoUrl || data.videoUrl.trim().length < 5) {
    errors.push('영상 링크를 입력해 주세요');
  }

  if (!data.title || data.title.trim().length < 1) {
    errors.push('기억의 제목을 입력해 주세요');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// 폼 제출 핸들러
async function handleMemorySubmit(event) {
  if (event) event.preventDefault();

  // V3 ID: btn-submit, Legacy ID: btn-submit-memory
  const submitBtn = document.getElementById('btn-submit') || document.getElementById('btn-submit-memory');
  if (!submitBtn) return;

  const treeId = getTreeIdFromUrl();
  if (!treeId) {
    alert('트리 정보를 찾을 수 없습니다. 대시보드에서 시작해 주세요.');
    window.location.href = '/pages/my-trees.html';
    return;
  }

  // 로딩 상태 처리
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '기억을 심는 중...';

  try {
    const formData = collectFormData();
    formData.treeId = treeId;

    const validation = validateFormData(formData);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    const F = window.FlowShared;
    const treeData = await F.loadTree(treeId);
    if (!treeData) throw new Error('트리 데이터를 불러올 수 없습니다.');

    const memoryData = {
      title: formData.title,
      date: formData.date,
      videoId: F.parseYouTubeId(formData.videoUrl) || '',
      sourceUrl: formData.videoUrl,
      memo: formData.memo,
      emotionTag: formData.emotion
    };

    // DB 저장 (FlowShared 인터페이스 활용)
    await F.addMemoryToTree(treeId, treeData, null, memoryData);

    alert('당신의 소중한 기억이 러브트리에 심어졌습니다! 🌱');
    window.location.href = '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);

  } catch (error) {
    console.error('Memory submit error:', error);
    alert('저장 오류: ' + (error.message || '알 수 없는 오류'));
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// 비디오 URL 변경 시 프리뷰 업데이트 (V3 대응)
function setupVideoPreview() {
  const videoInput = document.getElementById('video-url');
  const previewArea = document.getElementById('preview-area') || document.getElementById('preview-node');
  const previewTitle = document.getElementById('preview-title');
  const thumbBox = document.getElementById('preview-thumb');

  if (!videoInput || !previewArea) return;

  videoInput.addEventListener('input', function(e) {
    const url = e.target.value.trim();
    const F = window.FlowShared;
    const videoId = F ? F.parseYouTubeId(url) : null;

    if (videoId) {
      previewArea.style.borderColor = '#b56e6e';
      if (thumbBox) {
        const thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        thumbBox.innerHTML = `<img src="${thumbUrl}" style="width:100%; height:100%; object-fit:cover;">`;
      }
      if (previewTitle && previewTitle.textContent.includes('감지')) {
        previewTitle.textContent = '영상이 인식되었습니다';
      }
    } else {
      previewArea.style.borderColor = '';
      if (thumbBox) thumbBox.innerHTML = '🎬';
    }
  });
}

// 초기화
function initAddMemory() {
  const submitBtn = document.getElementById('btn-submit') || document.getElementById('btn-submit-memory');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleMemorySubmit);
  }
  setupVideoPreview();
}

document.addEventListener('DOMContentLoaded', initAddMemory);

// 전역 노출
window.handleMemorySubmit = handleMemorySubmit;
window.collectFormData = collectFormData;
window.validateFormData = validateFormData;
