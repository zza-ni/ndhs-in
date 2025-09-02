import { admin, db } from "../lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { subscription, userId } = req.body || {};
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: "구독 정보가 필요합니다." });
    }

    const subsRef = db.collection("subscriptions");
    const existing = await subsRef.where("endpoint", "==", subscription.endpoint).get();

    if (existing.empty) {
      await subsRef.add({
        endpoint: subscription.endpoint,
        keys: subscription.keys || null,
        userId: userId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return res.status(200).json({ message: "구독 저장 완료" });
  } catch (error) {
    console.error("구독 저장 오류:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
}
