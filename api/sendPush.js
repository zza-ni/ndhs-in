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

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

    // 4. 메시지 페이로드 작성
    const message = {
      notification: { title, body },
      data: data || {},
      tokens,
    };

    // 5. FCM 발송
    const response = await admin.messaging().sendEachForMulticast(message);

    // 6. 실패한 토큰 확인 & Firestore에서 삭제
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === "messaging/registration-token-not-registered" ||
          errorCode === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      const batch = db.batch();
      for (const token of invalidTokens) {
        const snapshot = await db.collection("tokens").where("token", "==", token).get();
        snapshot.forEach(doc => batch.delete(doc.ref));
      }
      await batch.commit();
    }

    // 7. 결과 응답
    return res.status(200).json({
      message: `전송 완료: 성공 ${response.successCount}건, 실패 ${response.failureCount}건, 삭제된 토큰 ${invalidTokens.length}건`,
      failures: response.responses
        .map((r, i) => ({
          success: r.success,
          token: tokens[i],
          error: r.error ? r.error.message : null,
        }))
        .filter(r => !r.success),
    });
  } catch (error) {
    console.error("푸시 알림 전송 중 오류:", error);
    return res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
}
