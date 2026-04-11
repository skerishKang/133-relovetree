# Lovetree 데이터 모델 초안

## 1. 목적

현재 Lovetree 코드에서 실제로 사용되는 데이터 구조를 문서화한다. 이상적인 스키마가 아닌 현재 구현 기준의 초안이다.

**중요 원칙 (DATA_NAMING_RULE):**
- **인증(Auth):** Firebase Auth에서 전담 관리한다.
- **데이터(Data):** 실제 앱 데이터 저장소는 **Neon/Postgres**다.
- **호환성 레이어:** 클라이언트와 서버에서 Firestore 스타일 API(`collection`, `doc`)를 사용하지만, 이는 Postgres로 전달되는 인터페이스일 뿐이다.

## 2. 핵심 엔티티 목록

| 엔티티 | 용도 | 저장소 및 접근 방식 |
|--------|------|--------------------|
| user | 로그인 사용자 정보 | Firebase Auth (세션 전용) |
| tree | 러브트리 전체 컨테이너 | DB `trees` 테이블/컬렉션 |
| node (memory) | 트리의 각 순간/기억 | `tree.nodes` 배열 내장 |
| edge | 노드 간 연결 관계 | `tree.edges` 배열 내장 |
| likes | 트리/노드 공감 | DB `trees` 내 배열 또는 별도 테이블 |
| comments | 트리/노드 댓글 | DB `trees` 내 배열 또는 별도 테이블 |

## 3. 각 엔티티의 주요 필드

### 3.1 Tree (trees 데이터)

```javascript
{
  // 식별자
  _id: string,          // DB 고유 식별자 (자동 생성)
  
  // 필수 필드
  name: string,         // 트리 제목 (사용자 입력)
  ownerId: string,      // 소유자 UID (Firebase Auth의 uid와 매핑)
  nodes: array,         // 노드(순간) 객체 배열
  edges: array,         // 간선(연결) 객체 배열
  lastUpdated: string,  // ISO 8601 형식의 마지막 수정 시간
  
  // 선택 필드
  nodeCount: number,    // nodes.length (조회 최적화용 캐시)
  visibility: string,   // "public" | "private" | "link" (공개 범위 설정)
  viewCount: number,    // 조회수
  shareCount: number,   // 공유 횟수
  likeCount: number,    // 좋아요 수
  lastOpened: timestamp, // 마지막 열람 시간
  forkedFrom: object,   // 다른 트리에서 복제된 경우의 원본 정보
  
  // 하위 데이터 (현재는 Tree 객체 내에 포함)
  likes: array,         // 공감한 사용자 ID 리스트
  comments: array,      // 댓글 데이터 배열
  updatedAt: timestamp, // 데이터 수정 시점
  createdAt: timestamp  // 데이터 생성 시점
}
```

> [!NOTE]
> `createdAt`와 `updatedAt`는 클라이언트 코드에서 `firebase.firestore.FieldValue.serverTimestamp()`를 호출하지만, 실제로는 호환 레이어를 통해 **Postgres의 서버 시간**으로 저장됩니다. (Firebase는 Auth 전용)

### 3.2 Node (tree.nodes 배열 내 객체)

```javascript
{
  // 필수 필드
  id: number|string,   // 개별 노드 식별자 (컴포넌트 식별용, 주로 Date.now())
  title: string,       // 순간의 제목 (사용자 입력)
  date: string,        // 기록된 날짜 ("YYYY-MM-DD")
  
  // 영상 정보
  videoId: string,     // YouTube 동영상 ID (URL에서 자동 추출)
  sourceUrl: string,   // 원본 미디어 URL
  
  // 감정 및 메모
  moments: array,      // 상세 타임라인 정보 [{ time, text, feeling }]
  description: string, // 노드 대표 설명 (메모 내용)
  
  // 시각화 정보 (에디터 내 위치)
  x: number,           // 캔버스 가로 좌표 (기본값)
  y: number            // 캔버스 세로 좌표 (기본값)
}
```

### 3.3 Edge (tree.edges 배열 내 객체)

```javascript
{
  // 필수 필드
  from: number|string, // 부모 노드(이전 순간) ID
  to: number|string    // 자식 노드(다음 순간) ID
}
```

## 4. 실제 구현 핵심 로직 (Flow A 기준)

### 4.1 새 노드 초기화 (`src/flow-shared.js`)
순간을 추가할 때 생성되는 기본 스키마입니다.

```javascript
var newNode = {
  id: Date.now(),
  x: 400,
  y: 300,
  title: memoryData.title || '새 순간',
  date: memoryData.date || new Date().toISOString().split('T')[0],
  videoId: memoryData.videoId || '',
  sourceUrl: memoryData.sourceUrl || '',
  moments: [],
  description: memoryData.memo || ''
};
```

### 4.2 타임라인 및 감정 태그 연동
사용자가 영상의 특정 시점과 감정을 남길 때 `moments` 배열에 하나 이상의 정보가 기록됩니다.

```javascript
// 시점이 있는 경우
{
  time: memoryData.timestamp,
  text: memoryData.memo || '',
  feeling: memoryData.emotionTag || 'love'
}
```

## 5. 데이터 명칭 가이드 (작업자 주의사항)

| 잘못된 표현 | **권장 표현** | 이유 |
|------------|--------------|------|
| Firestore 문서 ID | **DB 레코드 ID** | 저장소 본체는 Postgres임 |
| Firestore FieldValue | **DB 타임스탬프** | 실제 서버 환경(Neon)의 시간임 |
| Firebase 데이터 | **앱 데이터 / 트리 데이터** | Firebase는 인증(Auth) 전용으로만 사용 |
| collection/doc API | **테이블/레코드 접근** | API 스타일일 뿐 실제 저장소는 Postgres |

> **중요:** `firebase.firestore()` 호출은 여전히 코드에 남아 있지만, 이는 **호환 레이어(interface)**일 뿐입니다. 실제 데이터는 `postgres-client.js` → `/api/firestore` → **Neon/Postgres** 경로를をたど릅니다.

## 6. 현재 구조의 보정 포인트

1.  **데이터 저장 방식**: 현재는 `trees`라는 커다란 객체 하나에 모든 노드와 연결 정보를 담고 있습니다. 트리가 매우 커질 경우 성능 최적화를 위해 노드와 연결 정보를 별도 테이블로 분리하는 마이그레이션이 필요할 수 있습니다.
2.  **ID 체계**: 현재 클라이언트에서 `Date.now()`로 생성하는 ID와 DB 서버에서 생성하는 `_id`가 섞여 있습니다. 이를 명확히 구분하여 문서화해야 합니다.
3.  **호환 레이어 의존성**: 코드상에 남아 있는 `firebase.firestore` 호출은 점진적으로 `postgresDB`와 같은 추상화된 명칭으로 교체해 나가야 합니다.

---

**참조 문서:**
- `docs/product/DATA_NAMING_RULE.md` - 명칭 결정 원칙
- `docs/product/PRODUCT_IDENTITY.md` - 제품의 가치와 정의
- `src/flow-shared.js` - 데이터 CRUD 구현체