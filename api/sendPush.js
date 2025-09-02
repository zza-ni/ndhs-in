import { admin, db } from "./lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { password, title, body, data, filter } = req.body;

    // 1. 비밀번호 검증
    if (password !== process.env.PUSH_PASSWORD) {
      return res.status(403).json({ message: "비밀번호가 일치하지 않습니다." });
    }

    // 2. 필수값 확인
    if (!title || !body) {
      return res.status(400).json({ message: "title과 body가 필요합니다." });
    }

    // 3. 필터 조건에 맞는 토큰 조회
    let tokensQuery = db.collection("tokens");
    if (filter) {
      if (filter.userIds && filter.userIds.length > 0) {
        tokensQuery = tokensQuery.where("userId", "in", filter.userIds);
      }
      // 필요하면 다른 필터도 여기 추가
    }

    const tokensSnapshot = await tokensQuery.get();

    if (tokensSnapshot.empty) {
      return res.status(200).json({ message: "조건에 맞는 저장된 토큰이 없습니다." });
    }

    const tokensRaw = tokensSnapshot.docs.map(doc => doc.data().token).filter(Boolean);
    const tokens = Array.from(new Set(tokensRaw)); // dedupe

    // 4. 메시지 페이로드 작성 및 청크 발송(최대 500개)
    const chunkSize = 500;
    let success = 0, failure = 0; const invalidTokens = [];
    const openUrl = (data && data.url) || '/';
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const slice = tokens.slice(i, i + chunkSize);
      const message = {
        data: {
          title,
          body,
          url: openUrl,
          icon: (data && data.icon) || '/src/icon-192x192.png',
          badge: (data && data.badge) || '/src/icon-192x192.png',
          ...(data || {}),
        },
        tokens: slice,
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      success += response.successCount || 0;
      failure += response.failureCount || 0;
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
            invalidTokens.push(slice[idx]);
          }
        }
      });
    }

    if (invalidTokens.length > 0) {
      const batch = db.batch();
      for (const token of invalidTokens) {
        const snapshot = await db.collection('tokens').where('token', '==', token).get();
        snapshot.forEach(doc => batch.delete(doc.ref));
      }
      await batch.commit();
    }

    // 5. 결과 응답
    return res.status(200).json({
      message: `전송 완료: 성공 ${success}건, 실패 ${failure}건, 삭제된 토큰 ${invalidTokens.length}건`,
    });
  } catch (error) {
    console.error("푸시 알림 전송 중 오류:", error);
    return res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
}
