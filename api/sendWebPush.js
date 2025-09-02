// Web Push 비활성화: 이 엔드포인트는 더 이상 제공되지 않습니다.
export default async function handler(req, res) {
  return res.status(410).json({ message: '웹푸시는 더 이상 지원하지 않습니다. (FCM만 사용)' });
}
