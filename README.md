# 나라장터 검색 도우미

나라장터 입찰공고, 낙찰정보, 계약정보를 검색하고 즐겨찾기하며 Telegram으로 일일 요약을 받는 도구.

## 설정

### 1. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 편집하여 다음을 입력:

| 변수 | 설명 |
|------|------|
| `NARA_SERVICE_KEY` | data.go.kr에서 발급받은 API 키 (설정 페이지에서도 입력 가능) |
| `TURSO_DATABASE_URL` | Turso DB URL (로컬 개발 시 생략 가능 — file:local.db 사용) |
| `TURSO_AUTH_TOKEN` | Turso 인증 토큰 (로컬 개발 시 생략 가능) |
| `CRON_SECRET` | Cron 엔드포인트 보호용 임의 문자열 |

### 2. 나라장터 API 키 발급

1. https://www.data.go.kr 회원가입
2. "나라장터 공공데이터개방표준서비스" 검색
3. 활용신청 → 서비스키 발급 (즉시 또는 1-2일 소요)

### 3. Turso DB 설정 (Vercel 배포 시)

```bash
npm install -g turso
turso auth login
turso db create nara
turso db show nara  # URL 확인
turso db tokens create nara  # Token 확인
```

### 4. Vercel 배포

```bash
npm install -g vercel
vercel
```

Vercel 대시보드 → Settings → Environment Variables에 위 변수들 입력.
Cron은 KST 08:00 (UTC 23:00)에 자동 실행. `vercel.json`에서 조정 가능.

## 로컬 개발

```bash
npm run dev
```

http://localhost:3000 → /search 로 자동 이동.

---

(Original Next.js README below)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# nara
