import { admin, db } from "./lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "토큰이 필요합니다." });
    }

    // Firestore 'tokens' 컬렉션에서 동일 토큰 있는지 검사
    const tokensRef = db.collection("tokens");
    const existingTokens = await tokensRef.where("token", "==", token).get();

    if (existingTokens.empty) {
      await tokensRef.add({
        token,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return res.status(200).json({ message: "토큰 저장 완료" });
  } catch (error) {
    console.error("토큰 저장 오류:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
}
