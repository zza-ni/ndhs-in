import { admin, db } from "./lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  try {
    const { password, title, body, data, url, icon, badge, filter } =
      req.body || {};
    if (password !== process.env.PUSH_PASSWORD) {
      return res.status(403).json({ message: "비밀번호가 일치하지 않습니다." });
    }
    if (!title || !body)
      return res.status(400).json({ message: "title과 body가 필요합니다." });

    // Build FCM token query only (web push intentionally disabled)
    let tokensQuery = db.collection("tokens");
    if (filter && filter.userIds && filter.userIds.length > 0) {
      tokensQuery = tokensQuery.where("userId", "in", filter.userIds);
    }

    const tokensSnapshot = await tokensQuery.get();
    // 그룹핑: 동일 deviceId > 동일 UA > 토큰으로 그룹핑, 최신(updatedAt/createdAt) 1개만 사용
    const docs = tokensSnapshot.empty
      ? []
      : tokensSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const groups = new Map();
    for (const d of docs) {
      const key = d.deviceId || d.ua || d.token;
      const ts =
        d.updatedAt?.toMillis?.() ||
        d.updatedAt ||
        0 ||
        d.createdAt?.toMillis?.() ||
        d.createdAt ||
        0 ||
        0;
      const cur = groups.get(key);
      if (!cur || ts > cur.ts) {
        groups.set(key, { token: d.token, ts });
      }
    }
    const tokens = Array.from(
      new Set(Array.from(groups.values()).map((v) => v.token))
    ).filter(Boolean);

    // Send FCM (multicast) in chunks of 500
    let fcmSuccess = 0;
    let fcmFailure = 0;
    let fcmInvalid = [];
    const fcmErrors = [];
    const chunkSize = 500;
    const openUrl = url || "/";
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const slice = tokens.slice(i, i + chunkSize);
      const message = {
        data: {
          title,
          body,
          url: openUrl,
          icon: icon || "./src/icon-192x192.png",
          badge: badge || "./src/icon-192x192.png",
          tag: "ndhs-bob-global",
          renotify: "true",
          ...(data || {}),
        },
        tokens: slice,
      };
      const resp = await admin.messaging().sendEachForMulticast(message);
      fcmSuccess += resp.successCount || 0;
      fcmFailure += resp.failureCount || 0;
      resp.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error?.code;
          const message = r.error?.message;
          if (fcmErrors.length < 10) {
            fcmErrors.push({ token: slice[idx], code, message });
          }
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            fcmInvalid.push(slice[idx]);
          }
        }
      });
    }
    if (fcmInvalid.length) {
      const batch = db.batch();
      // remove invalid tokens from collection
      for (const t of fcmInvalid) {
        const snap = await db
          .collection("tokens")
          .where("token", "==", t)
          .get();
        snap.forEach((doc) => batch.delete(doc.ref));
      }
      await batch.commit();
    }

    const summary = {
      fcm: tokens.length
        ? {
            success: fcmSuccess,
            failure: fcmFailure,
            pruned: fcmInvalid.length,
          }
        : { success: 0, failure: 0, pruned: 0 },
      web: { skipped: true },
    };

    return res.status(200).json({
      message: `전송 완료 (FCM S${summary.fcm.success}/F${summary.fcm.failure}; WebPush 비활성화됨)`,
      summary,
      errors: fcmErrors,
    });
  } catch (error) {
    console.error("sendAllPush 오류:", error);
    return res
      .status(500)
      .json({ message: "서버 오류 발생", error: error.message });
  }
}
