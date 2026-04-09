const {
  clampNumber,
  isoToDate,
  truncateText,
  safeJsonParse,
} = require('./ai-helper-utils');

/**
 * AI 비즈니스 로직 - 비디오 정보를 바탕으로 노드 JSON 객체 생성 및 가공
 */
async function buildRealNodeFromVideo(opts, callAiText) {
  const {
    baseTitle,
    instruction,
    video,
    transcriptText,
    env,
  } = opts;

  const safeTranscript = truncateText(transcriptText || '', 14000);

  const prompt =
    `당신은 K-pop 팬의 덕질 기록(러브트리) 노드를 '실제 영상 기반'으로 채우는 한국어 어시스턴트입니다.\n` +
    `다음 영상 정보를 바탕으로 노드 JSON 객체 하나를 만들어 주세요.\n` +
    `반드시 다음 필드를 포함하세요: title, date, videoId, description, moments\n` +
    `- title: 영상과 팬 관점에서 자연스럽게(너무 길지 않게)\n` +
    `- date: 영상 업로드일(YYYY-MM-DD). 모르면 빈 문자열\n` +
    `- videoId: 반드시 11글자 영상 ID\n` +
    `- description: 2~4문장 한국어 요약\n` +
    `- moments: time(M:SS), text(한국어), feeling(love|tear|funny|shock)로 이루어진 배열\n` +
    `moments의 time은 아래 자막에 등장하는 타임스탬프([M:SS]) 중에서만 선택하세요.\n` +
    `moments는 5~10개 정도로 만들어 주세요.\n` +
    `출력은 오직 JSON 객체 1개만 주세요(설명 문장/코드블록/추가 텍스트 금지).\n\n` +
    `기본 제목(참고): ${baseTitle || ''}\n` +
    (instruction ? `사용자 추가 요청: ${instruction}\n` : '') +
    `영상 제목: ${video.title || ''}\n` +
    `채널: ${video.channelTitle || ''}\n` +
    `업로드: ${video.publishedAt || ''}\n` +
    `videoId: ${video.videoId || ''}\n` +
    `영상 설명(일부): ${truncateText(video.description || '', 600)}\n\n` +
    (safeTranscript
      ? `자막(타임스탬프 포함, 일부):\n${safeTranscript}\n`
      : `자막을 가져오지 못했습니다. 영상 설명을 바탕으로 moments를 만들되 time은 0:00부터 적당히 분산해 주세요.\n`);

  const raw = await callAiText(prompt, env);
  const obj = safeJsonParse(raw);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return null;
  }

  const date = obj.date || isoToDate(video.publishedAt || '');
  const out = {
    title: obj.title || baseTitle || video.title || '새 순간',
    date: date || '',
    videoId: obj.videoId || video.videoId || '',
    description: typeof obj.description === 'string' ? obj.description : '',
    moments: Array.isArray(obj.moments) ? obj.moments : [],
  };

  out.moments = out.moments
    .map((m) => {
      const time = m && m.time ? String(m.time) : '0:00';
      const text = m && m.text ? String(m.text) : '';
      const feeling = m && m.feeling ? String(m.feeling) : 'love';
      return { time, text, feeling };
    })
    .filter((m) => m.text && m.text.trim().length > 0);

  if (!out.moments.length && out.description) {
    out.moments = [{ time: '0:00', text: out.description, feeling: 'love' }];
  }

  return out;
}

/**
 * 모드별 AI 프롬프트 본문 생성
 */
function buildPromptBody(mode, data) {
  if (mode === 'tree') {
    const { prompt, count } = data || {};
    const safeCount = clampNumber(count || 4, 1, 12);
    const text =
      `당신은 K-pop 팬을 위한 타임라인 도우미입니다.\n` +
      `사용자의 설명을 바탕으로 ${safeCount}개의 중요한 순간을 시간순으로 제안해 주세요.\n` +
      `각 순간은 JSON 배열 원소 하나로, 필드는 title, searchQuery 입니다.\n` +
      `searchQuery는 YouTube에서 실제 영상을 찾기 위한 검색어(한국어)로 작성해 주세요.\n` +
      `출력은 오직 JSON 배열(문자열이 아닌 JSON 객체 배열)만 제공하세요.\n` +
      `한국어로 작성하세요.\n` +
      `사용자 설명: ${prompt || ''}`;
    return { text, count: safeCount };
  }

  if (mode === 'tree_skeleton') {
    const { prompt, count } = data || {};
    const safeCount = clampNumber(count || 4, 1, 12);
    const text =
      `당신은 K-pop 팬을 위한 타임라인 도우미입니다.\n` +
      `사용자의 설명을 바탕으로 ${safeCount}개의 중요한 순간을 시간순으로 제안해 주세요.\n` +
      `각 순간은 JSON 배열 원소 하나로, 필드는 title, searchQuery, fallbackQueries 입니다.\n` +
      `title은 너무 추상적으로 쓰지 말고, 곡/무대/방송/쇼케이스/수상/첫 1위 같은 구체적인 단서를 포함해 주세요.\n` +
      `searchQuery는 YouTube에서 실제 영상을 찾기 위한 검색어(한국어)로 작성해 주세요.\n` +
      `fallbackQueries는 검색이 실패할 때 쓸 대체 검색어 2~3개 배열입니다. (예: 방송명/직캠/뮤비/무대 키워드 변형)\n` +
      `출력은 오직 JSON 배열(문자열이 아닌 JSON 객체 배열)만 제공하세요.\n` +
      `한국어로 작성하세요.\n` +
      `사용자 설명: ${prompt || ''}`;

    return { text, count: safeCount };
  }

  if (mode === 'node_edit') {
    const { node, instruction } = data || {};
    const title = (node && node.title) || '';
    const date = (node && node.date) || '';
    const videoId = (node && node.videoId) || '';
    const description = (node && node.description) || '';
    const moments = Array.isArray(node && node.moments) ? node.moments : [];

    const baseJson = JSON.stringify(
      {
        title,
        date,
        videoId,
        description,
        moments,
      },
      null,
      2
    );

    const text =
      `당신은 이미 만들어진 러브트리 노드를 다듬어 주는 한국어 편집 도우미입니다.\n` +
      `현재 노드를 읽고, 사용자의 요청에 맞게 title, description, youtubeUrl, videoId, moments를 업데이트한 JSON 객체 하나를 반환하세요.\n` +
      `필드 설명:\n` +
      `- title: 노드 제목 (필요하면 더 자연스럽게 수정)\n` +
      `- description: 이 노드를 설명하는 1~3문장 정도의 한국어 요약\n` +
      `- youtubeUrl: 가능하면 대표 YouTube 영상 전체 URL (없으면 비워둘 수 있음)\n` +
      `- videoId: youtubeUrl에서 추출한 11글자 영상 ID (둘 중 하나만 있어도 됨)\n` +
      `- moments: time, text, feeling(love|tear|funny|shock) 필드를 가진 객체 배열\n` +
      `응답은 오직 하나의 JSON 객체만 포함해야 하며, 한국어로 작성된 description과 moments.text를 포함해야 합니다.\n` +
      `현재 노드(JSON):\n${baseJson}\n\n` +
      `사용자 요청: ${instruction || '이 노드를 더 자연스럽고 감성적으로 정리해줘.'}`;

    return { text };
  }

  if (mode === 'comment') {
    const { prompt, nodeTitle } = data || {};
    const base = prompt || nodeTitle || '이 순간';
    const text =
      `당신은 K-pop 팬의 감정 표현을 도와주는 어시스턴트입니다.\n` +
      `다음 순간을 설명하는 한국어 한 줄 코멘트를 3개 제안해 주세요.\n` +
      `각 코멘트는 1~2문장, 60자 이내로 해주세요.\n` +
      `응답은 오직 JSON 문자열 배열 형식으로만 주세요.\n` +
      `순간 설명: ${base}`;
    return { text };
  }

  if (mode === 'qa') {
    const { prompt, context } = data || {};
    const text =
      `당신은 러브트리(LoveTree) 앱을 사용하는 사용자를 돕는 한국어 어시스턴트입니다.\n` +
      `질문에 대해 친절하지만 간결하게 답변하고, 가능하면 번호 목록이나 불릿으로 정리해 주세요.\n` +
      `앱의 현재 상태에 대한 추가 정보가 있을 수 있습니다:\n` +
      `${context || '(추가 정보 없음)'}\n` +
      `질문: ${prompt || ''}`;
    return { text };
  }

  throw new Error('Unsupported mode');
}

module.exports = {
  buildRealNodeFromVideo,
  buildPromptBody,
};
