# 남도인 (React + Vite)

이 프로젝트는 기존 HTML/CSS/JS 기반 사이트를 React + Vite로 마이그레이션한 버전입니다.

## 개발 실행

```cmd
npm install
npm run dev
```

브라우저가 자동으로 열리지 않으면 http://localhost:5173 에 접속하세요.

## 프로덕션 빌드

```cmd
npm run build
npm run preview
```

## 구조
- `index.html`: Vite 루트 HTML. React가 `#root`에 마운트됩니다.
- `src/`: React 소스 (`App.jsx`, `main.jsx`).
- `public/`: 정적 자산(PWA manifest, 서비스워커, 이미지, 주간 식단 `data/*.json`).
- `api/`, `lib/`: 서버 사이드 API (FCM 토큰 저장/발송). 현재 Node 환경에서 동작하며 배포 환경에 맞게 라우팅이 필요합니다.

## 주의사항
- FCM은 HTTPS + 실제 도메인/localhost 환경에서만 정상 동작합니다.
- 서비스워커 파일 경로는 `index.html` 기준으로 `/src/service-worker.js`, `/firebase-messaging-sw.js`에 맞춰져 있습니다.
