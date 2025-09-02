import { admin, db } from "./lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
  const { token, deviceId, ua, platform } = req.body || {};

    if (!token) {
      return res.status(400).json({ message: "토큰이 필요합니다." });
    }

    // Firestore 'tokens' 컬렉션에서 동일 토큰 있는지 검사
    const tokensRef = db.collection("tokens");
    const existingTokens = await tokensRef.where("token", "==", token).get();

    if (existingTokens.empty) {
      await tokensRef.add({
        token,
        deviceId: deviceId || null,
        ua: ua || null,
        platform: platform || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // update metadata
      existingTokens.forEach((doc) => doc.ref.update({ deviceId: deviceId || null, ua: ua || null, platform: platform || null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
    }

    // If deviceId is provided, prune other tokens with same deviceId but different token
    if (deviceId) {
      const byDevice = await tokensRef.where('deviceId', '==', deviceId).get();
      const batch = db.batch();
      byDevice.forEach((doc) => {
        const d = doc.data();
        if (d.token !== token) batch.delete(doc.ref);
      });
      if (!batch._ops || batch._ops.length > 0) {
        await batch.commit();
      }
    }

    // Additionally, if UA is available, prune older tokens with the same UA
    if (ua) {
      const byUa = await tokensRef.where('ua', '==', ua).get();
      const batch = db.batch();
      byUa.forEach((doc) => {
        const d = doc.data();
        if (d.token !== token) batch.delete(doc.ref);
      });
      if (!batch._ops || batch._ops.length > 0) {
        await batch.commit();
      }
    }

    return res.status(200).json({ message: "토큰 저장 완료" });
  } catch (error) {
    console.error("토큰 저장 오류:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
}
