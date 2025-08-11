const { db } = require("./firebaseAdmin");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { token } = JSON.parse(event.body);
    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "토큰이 필요합니다." }),
      };
    }

    // Firestore 'tokens' 컬렉션에 토큰 문서 추가 (중복 저장 방지 가능)
    const tokensRef = db.collection("tokens");
    const existingTokens = await tokensRef.where("token", "==", token).get();

    if (existingTokens.empty) {
      await tokensRef.add({
        token,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "토큰 저장 완료" }),
    };
  } catch (error) {
    console.error("토큰 저장 오류:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "서버 오류가 발생했습니다." }),
    };
  }
};
