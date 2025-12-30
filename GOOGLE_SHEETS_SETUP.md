# Google Sheets API 설정 가이드

이 가이드는 Google Sheets를 데이터베이스로 사용하기 위한 설정 방법을 안내합니다.

## 1단계: Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성
   - 프로젝트 이름: `G-Protocol` (또는 원하는 이름)
3. 프로젝트 선택

## 2단계: Google Sheets API 활성화

1. 좌측 메뉴에서 **"API 및 서비스" → "라이브러리"** 선택
2. "Google Sheets API" 검색
3. **"사용 설정"** 클릭

## 3단계: 서비스 계정 생성

1. 좌측 메뉴에서 **"API 및 서비스" → "사용자 인증 정보"** 선택
2. 상단의 **"+ 사용자 인증 정보 만들기"** 클릭
3. **"서비스 계정"** 선택
4. 서비스 계정 세부정보 입력:
   - 이름: `g-protocol-service`
   - ID: 자동 생성됨
   - 설명: `G-Protocol Google Sheets 접근용 서비스 계정`
5. **"만들기 및 계속하기"** 클릭
6. 역할 선택: **"편집자"** 선택 (또는 "뷰어"만 필요하면 "뷰어" 선택)
7. **"완료"** 클릭

## 4단계: 서비스 계정 키 생성

1. 생성된 서비스 계정 클릭
2. **"키"** 탭 선택
3. **"키 추가" → "새 키 만들기"** 클릭
4. 키 유형: **"JSON"** 선택
5. **"만들기"** 클릭
6. JSON 파일이 자동으로 다운로드됩니다
   - 파일명: `g-protocol-xxxxxx.json` (예시)
   - **⚠️ 이 파일은 절대 공개하지 마세요!**

## 5단계: Google Sheets 생성 및 공유

### 5-1. 새 스프레드시트 생성

1. [Google Sheets](https://sheets.google.com) 접속
2. 새 스프레드시트 생성
3. 스프레드시트 이름: `G-Protocol Database`

### 5-2. 시트 구조 설정

#### Sheet 1: Events
다음 헤더를 첫 번째 행에 입력:
```
id | title | date | location | description | status | createdAt | updatedAt
```

예시 데이터:
```
event-1 | 2025 경기도 체육대상 시상식 | 2025-01-15T14:00:00.000Z | 경기도청 대강당 | 2024년 우수 체육인 및 단체 시상 | upcoming | 2025-12-26T10:00:00.000Z | 2025-12-26T10:00:00.000Z
```

#### Sheet 2: Guests
다음 헤더를 첫 번째 행에 입력:
```
id | eventId | name | organization | position | seatNumber | status | type | biography | protocolNotes | updatedAt
```

예시 데이터:
```
g1 | event-1 | 김철수 | 경기도청 | 도지사 |  | arrived | vip | 제35대 경기도지사, 체육회장 겸임 | 인사말씀,대표 축사 | 2025-12-26T10:00:00.000Z
```

### 5-3. 서비스 계정과 공유

1. 스프레드시트 우측 상단 **"공유"** 클릭
2. JSON 파일에서 `client_email` 값 복사 (예: `g-protocol-service@xxx.iam.gserviceaccount.com`)
3. 이메일 주소 입력란에 붙여넣기
4. 권한: **"편집자"** 선택 (읽기만 필요하면 "뷰어")
5. **"완료"** 클릭

### 5-4. 스프레드시트 ID 복사

브라우저 주소창에서 스프레드시트 ID 복사:
```
https://docs.google.com/spreadsheets/d/[여기가_스프레드시트_ID]/edit
```

예: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

## 6단계: 환경변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
# Google Sheets API
GOOGLE_SHEETS_SPREADSHEET_ID=여기에_스프레드시트_ID_입력
GOOGLE_SHEETS_CLIENT_EMAIL=서비스계정_이메일@xxx.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n실제_프라이빗_키_내용\n-----END PRIVATE KEY-----\n"
```

**중요:**
- `GOOGLE_SHEETS_PRIVATE_KEY`는 JSON 파일의 `private_key` 값 전체를 큰따옴표로 감싸서 입력
- `\n` (줄바꿈 문자)는 그대로 유지해야 함

## 7단계: .gitignore 확인

`.gitignore` 파일에 다음이 포함되어 있는지 확인:

```
.env*.local
*.json
!package.json
!package-lock.json
!tsconfig.json
!components.json
```

## 설정 완료!

이제 애플리케이션에서 Google Sheets API를 사용할 수 있습니다.

## 문제 해결

### "Permission denied" 오류
- 서비스 계정 이메일이 스프레드시트에 공유되었는지 확인
- 권한이 "편집자" 이상인지 확인

### "API not enabled" 오류
- Google Sheets API가 활성화되었는지 확인
- Google Cloud Console에서 프로젝트가 올바르게 선택되었는지 확인

### "Invalid credentials" 오류
- `.env.local` 파일의 환경변수가 정확한지 확인
- `GOOGLE_SHEETS_PRIVATE_KEY`의 줄바꿈 문자(`\n`)가 올바른지 확인
- 개발 서버 재시작 (환경변수 변경 후 필수)
