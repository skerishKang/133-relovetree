# 유튜브 썸네일 생성 프롬프트

## 역할

당신은 유튜브 데이터 API와 웹 프론트엔드 개발에 능숙한 전문가입니다.

## 상황

현재 웹 애플리케이션에서 유튜브 비디오 ID를 기반으로 썸네일을 표시하고 있습니다. 하지만 일부 비디오의 썸네일이 깨지거나 로드되지 않는 문제가 발생하고 있습니다.

## 문제점

- **maxresdefault.jpg (고해상도 썸네일)**는 모든 유튜브 영상에 존재하지 않을 수 있습니다. 이 경우 404 에러가 발생하여 이미지가 깨져 보입니다.
- **hqdefault.jpg (표준 화질)**는 모든 영상에 존재하지만, 4:3 비율이라 16:9 컨테이너에 맞지 않을 수 있습니다.

## 요청 사항

다음 요구사항을 만족하는 코드를 작성하거나 수정해주세요:

### 1. 안정적인 썸네일 URL 사용

- 기본적으로 `hqdefault.jpg`를 사용하여 이미지가 항상 로드되도록 보장하세요.
- **URL 패턴**: `https://img.youtube.com/vi/[VIDEO_ID]/hqdefault.jpg`

### 2. CSS를 이용한 비율 조정

- hqdefault.jpg는 4:3 비율이고 위아래에 검은 레터박스가 있을 수 있습니다.
- CSS의 `object-fit: cover` 속성과 컨테이너의 `aspect-ratio`를 활용하여 16:9 영역에 꽉 차게 보이도록 스타일링해주세요.
- **예시**: Tailwind CSS의 `aspect-video`, `object-cover`, `scale-105` (레터박스 숨김용) 등을 활용.

### 3. 폴백(Fallback) 처리

- 만약 이미지 로드에 실패할 경우를 대비해 `onerror` 이벤트를 사용하여 기본 색상이나 대체 이미지를 보여주는 로직을 포함하세요.

## 예시 코드 (참고용)

```javascript
// 데이터 예시
const artist = {
    id: 'bts',
    thumbnail: 'https://img.youtube.com/vi/gwMa6gpoE9I/hqdefault.jpg', // hqdefault 사용
    // ...
};

// HTML/CSS 예시 (Tailwind CSS)
const html = `
    <div class="aspect-video relative overflow-hidden bg-gray-100">
        <img src="${artist.thumbnail}" 
             class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
             onerror="this.style.display='none'; this.parentNode.style.backgroundColor='#e9d5ff'">
    </div>
`;
```

## 구현 목표

- 모든 썸네일이 안정적으로 로드되어 깨지지 않도록 구현
- 16:9 비율의 컨테이너에 썸네일이 꽉 차게 표시되도록 스타일링
- 이미지 로드 실패 시 적절한 폴백 처리

이 프롬프트를 사용하여 다른 에이전트에게 작업을 요청하면, 썸네일 관련 문제를 명확하게 이해하고 해결책을 제시해 줄 것입니다.
