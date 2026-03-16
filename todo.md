# NewsMemo - Project TODO

## 브랜딩 & 설정
- [x] 앱 로고 생성 (AI 이미지 생성)
- [x] 앱 아이콘 파일 적용 (icon.png, splash-icon.png, favicon.png, android-icon-foreground.png)
- [x] app.config.ts 업데이트 (앱 이름, 로고 URL)
- [x] 테마 컬러 설정 (theme.config.js)
- [x] Android 공유 인텐트 필터 설정 (app.config.ts intentFilters)

## 서버 / AI
- [x] tRPC 라우터에 기사 요약 엔드포인트 추가 (server/routers.ts)
- [x] 기사 URL 스크래핑 + AI 요약 로직 구현 (invokeLLM 활용)
- [x] 플랫폼별 메모 생성 (LinkedIn, Twitter/X, 일반)

## 앱 화면
- [x] 홈 화면 구현 (메모 목록 + 빈 상태 안내)
- [x] 공유 수신 처리 화면 구현 (로딩 + 진행 단계)
- [x] 메모 편집 화면 구현 (AI 결과 확인 + 편집)
- [x] 메모 상세 화면 구현 (저장된 메모 조회)
- [x] 설정 화면 구현

## 데이터 & 상태
- [x] AsyncStorage 메모 저장/불러오기/삭제 구현
- [x] 공유 인텐트 URL 수신 처리 (expo-linking)
- [x] 메모 Context/상태 관리 구현

## 공유 기능
- [x] 클립보드 복사 기능 (expo-clipboard)
- [x] 시스템 공유 시트 연동 (Share API)
- [x] LinkedIn 앱 직접 열기 시도 (시스템 공유 시트로 대체)

## 탭 네비게이션
- [x] 탭 바 구성 (홈, 설정)
- [x] 아이콘 매핑 추가 (icon-symbol.tsx)

## 최종 확인
- [x] 체크포인트 저장
