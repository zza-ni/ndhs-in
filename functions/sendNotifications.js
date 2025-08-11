const { admin, db } = require("./firebaseAdmin");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { password, title, body, data, filter } = JSON.parse(event.body);

    if (password !== process.env.PUSH_PASSWORD) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "비밀번호가 일치하지 않습니다." }),
      };  
    }

    if (!title || !body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "title과 body가 필요합니다." }),
      };
    }

    // 필터 조건에 따른 토큰 조회 (없으면 전체)
    let tokensQuery = db.collection("tokens");
    if (filter) {
      // 필터 예: { userIds: ["user1", "user2"] }
      if (filter.userIds && filter.userIds.length > 0) {
        tokensQuery = tokensQuery.where("userId", "in", filter.userIds);
      }
      // 추가 필터 조건은 여기서 확장 가능
    }

    const tokensSnapshot = await tokensQuery.get();

    if (tokensSnapshot.empty) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "조건에 맞는 저장된 토큰이 없습니다." }),
      };
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

    // 메시지 페이로드 작성
    const message = {
      notification: { title, body },
      data: data || {},
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // 실패한 토큰 수집 및 삭제
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error.code;
        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      const batch = db.batch();
      for (const token of invalidTokens) {
        const snapshot = await db.collection("tokens").where("token", "==", token).get();
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
      }
      await batch.commit();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `전송 완료: 성공 ${response.successCount}건, 실패 ${response.failureCount}건, 삭제된 토큰 ${invalidTokens.length}건`,
        failures: response.responses
          .map((r, i) => ({
            success: r.success,
            token: tokens[i],
            error: r.error ? r.error.message : null,
          }))
          .filter(r => !r.success),
      }),
    };
  } catch (error) {
    console.error("푸시 알림 전송 중 오류:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "서버 오류 발생", error: error.message }),
    };
  }
};
