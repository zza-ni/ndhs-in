import React from "react";
import { useToast } from "../components/ui/Toast.jsx";
import PageHeader from "../components/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "../components/ui/Card";
import form from "../components/ui/Form.module.css";

export default function OvernightPage() {
  const toast = useToast();
  // 오늘 날짜 yyyy-mm-dd
  const today = React.useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);
  // 내일 날짜 yyyy-mm-dd
  const tomorrow = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);
  // 복귀 예정일만 사용 (기본값: 내일)
  const [returnDate, setReturnDate] = React.useState(tomorrow);
  const [dateError, setDateError] = React.useState("");
  const [reason, setReason] = React.useState("");

  // 페이지 진입 시 안내 토스트 자동 표시 (10초)
  React.useEffect(() => {
    // Dev StrictMode에서 이펙트 2회 실행 방지용: 1초 내 중복 호출 차단
    try {
      const key = "__overnight_toast_block__";
      const now = Date.now();
      const last = typeof window !== "undefined" ? window[key] || 0 : 0;
      if (now - last < 1000) return;
      if (typeof window !== "undefined") window[key] = now;
    } catch {}
    toast?.show("남도학숙과 협의되지 않아 현재 외박 신청이 불가능해요.", {
      type: "error",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 복귀 예정일 유효성 (일부 iOS에서 min 무시 가능성 방어)
  React.useEffect(() => {
    if (returnDate < tomorrow) {
      setDateError("복귀 예정일은 내일 이후여야 합니다.");
      toast?.show("복귀 예정일은 내일 이후여야 합니다.", { type: "error" });
    } else {
      setDateError("");
    }
    // eslint-disable-next-line
  }, [returnDate, tomorrow]);

  return (
    <main className="main-content page-content">
      <PageHeader title="외박 신청" />
      <div className="container">
        <Card>
          <CardHeader>
            <CardTitle>외박 신청</CardTitle>
          </CardHeader>
          <CardBody style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ fontWeight: 700, minWidth: 60, marginBottom: 0 }}>
                복귀 예정일
              </label>
              <input
                className={form.input}
                style={{ flex: 1 }}
                type="date"
                value={returnDate}
                min={tomorrow}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
            {/* 오류 메시지는 토스트로 대체 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ fontWeight: 700, minWidth: 60, marginBottom: 0 }}>
                사유 (장소)
              </label>
              <input
                className={form.input}
                style={{ flex: 1 }}
                type="text"
                placeholder="귀향(광주), 도서관(혜화역) 등"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className={form.btn}
                disabled={!!dateError || !reason.trim()}
                aria-disabled={!!dateError || !reason.trim()}
                title={dateError || undefined}
                type="button"
                onClick={() => {
                  toast?.show(
                    "남도학숙과 협의되지 않아 현재 지원하지 않아요.",
                    {
                      type: "error",
                    }
                  );
                }}
              >
                신청
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
