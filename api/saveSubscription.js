// Web Push 비활성화: 구독 저장 엔드포인트 종료
export default async function handler(req, res) {
  return res.status(410).json({ message: '웹푸시 구독 저장은 더 이상 지원하지 않습니다. (FCM만 사용)' });
}
