import webpush from "web-push";
import { admin, db } from "./lib/firebaseAdmin.js";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  try {
    const { password, title, body, data, url, icon, badge, filter } = req.body || {};
    if (password !== process.env.PUSH_PASSWORD) {
      return res.status(403).json({ message: "비밀번호가 일치하지 않습니다." });
    }
    if (!title || !body) return res.status(400).json({ message: "title과 body가 필요합니다." });

    // Build queries
    let tokensQuery = db.collection("tokens");
    let subsQuery = db.collection("subscriptions");
    if (filter && filter.userIds && filter.userIds.length > 0) {
      tokensQuery = tokensQuery.where("userId", "in", filter.userIds);
      subsQuery = subsQuery.where("userId", "in", filter.userIds);
    }

    const [tokensSnapshot, subsSnapshot] = await Promise.all([tokensQuery.get(), subsQuery.get()]);

    const tokens = tokensSnapshot.empty ? [] : tokensSnapshot.docs.map((d) => d.data().token).filter(Boolean);
    const subs = subsSnapshot.empty ? [] : subsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Send FCM (multicast)
    let fcmResp = null;
    let fcmInvalid = [];
    if (tokens.length) {
      const message = { notification: { title, body }, data: data || {}, tokens };
      fcmResp = await admin.messaging().sendEachForMulticast(message);
      fcmResp.responses.forEach((r, i) => {
        if (!r.success) {
          const code = r.error?.code;
          if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
            fcmInvalid.push(tokens[i]);
          }
        }
      });
      if (fcmInvalid.length) {
        const batch = db.batch();
        for (const t of fcmInvalid) {
          const snap = await db.collection("tokens").where("token", "==", t).get();
          snap.forEach((doc) => batch.delete(doc.ref));
        }
        await batch.commit();
      }
    }

    // Send Web Push (VAPID)
    const payload = JSON.stringify({ title, body, url, icon, badge });
    const webResults = await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload);
          return { id: s.id, ok: true };
        } catch (err) {
          const removable = err?.statusCode === 404 || err?.statusCode === 410;
          return { id: s.id, ok: false, removable, error: err?.message };
        }
      })
    );
    const toDelete = webResults.filter((r) => !r.ok && r.removable).map((r) => r.id);
    if (toDelete.length) {
      const batch = db.batch();
      toDelete.forEach((id) => batch.delete(db.collection("subscriptions").doc(id)));
      await batch.commit();
    }

    const summary = {
      fcm: tokens.length
        ? { success: fcmResp?.successCount || 0, failure: fcmResp?.failureCount || 0, pruned: fcmInvalid.length }
        : { success: 0, failure: 0, pruned: 0 },
      web: { success: webResults.filter((r) => r.ok).length, failure: webResults.filter((r) => !r.ok).length, pruned: toDelete.length },
    };

    return res.status(200).json({ message: `전송 완료 (FCM S${summary.fcm.success}/F${summary.fcm.failure}, WEB S${summary.web.success}/F${summary.web.failure})`, summary });
  } catch (error) {
    console.error("sendAllPush 오류:", error);
    return res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
}
