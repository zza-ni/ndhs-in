import webpush from "web-push";
import { db } from "./lib/firebaseAdmin.js";

// Expect VAPID keys in env
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { password, title, body, url, icon, badge, filter } = req.body || {};
    if (password !== process.env.PUSH_PASSWORD) {
      return res.status(403).json({ message: "비밀번호가 일치하지 않습니다." });
    }
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return res.status(400).json({ message: "VAPID 키가 설정되지 않았습니다." });
    }

    const payload = JSON.stringify({ title, body, url, icon, badge });

    // Load subscriptions
    let subsQuery = db.collection("subscriptions");
    if (filter && filter.userIds && filter.userIds.length > 0) {
      subsQuery = subsQuery.where("userId", "in", filter.userIds);
    }
    const snapshot = await subsQuery.get();
    if (snapshot.empty) {
      return res.status(200).json({ message: "구독 항목이 없습니다." });
    }

    const subs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const results = await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: s.keys,
            },
            payload
          );
          return { id: s.id, ok: true };
        } catch (err) {
          const removable = err?.statusCode === 404 || err?.statusCode === 410; // gone
          return { id: s.id, ok: false, removable, error: err?.message };
        }
      })
    );

    // Clean up gone endpoints
    const toDelete = results.filter((r) => !r.ok && r.removable).map((r) => r.id);
    if (toDelete.length) {
      const batch = db.batch();
      toDelete.forEach((id) => batch.delete(db.collection("subscriptions").doc(id)));
      await batch.commit();
    }

    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    return res.status(200).json({ message: `전송 완료: 성공 ${okCount}건, 실패 ${failCount}건, 삭제 ${toDelete.length}건`, failures: results.filter((r) => !r.ok) });
  } catch (error) {
    console.error("웹푸시 전송 오류:", error);
    return res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
}
