import React from "react";
import PageHeader from "../components/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "../components/ui/Card";
import Divider from "../components/ui/Divider";
import styles from "./InstallGuidePage.module.css";
import seg from "../components/ui/SegmentedControl.module.css";

const getUA = () => {
  try {
    return (typeof navigator !== "undefined" && navigator.userAgent) || "";
  } catch {
    return "";
  }
};
const isiOS = () => /iphone|ipad|ipod/i.test(getUA());
const isAndroid = () => /android/i.test(getUA());

export default function InstallGuidePage() {
  // Auto-select by UA; default to Android when unknown
  const [tab, setTab] = React.useState(() => (isiOS() ? "ios" : "android"));
  const triggerInstall = React.useCallback(() => {
    try {
      window.dispatchEvent(new Event("pwa:install"));
    } catch {}
  }, []);

  return (
    <main className="main-content page-content">
      <PageHeader title="설치 가이드" />
      <div className="container" style={{ paddingTop: 12 }}>
        {/* Segmented control (shared style across pages) */}
        <div style={{ marginBottom: 16 }}>
          <div className={seg.root} aria-label="디바이스 선택">
            {/* iOS tab */}
            <input
              className={seg.radio}
              type="radio"
              id="install-tab-ios"
              name="install-device"
              checked={tab === "ios"}
              onChange={() => setTab("ios")}
            />
            <label className={seg.label} htmlFor="install-tab-ios">
              아이폰
            </label>

            {/* Android tab */}
            <input
              className={seg.radio}
              type="radio"
              id="install-tab-android"
              name="install-device"
              checked={tab === "android"}
              onChange={() => setTab("android")}
            />
            <label className={seg.label} htmlFor="install-tab-android">
              갤럭시
            </label>
          </div>
        </div>
        {tab === "ios" ? (
          <Card as="section" aria-labelledby="ios-guide">
            <CardHeader>
              <CardTitle id="ios-guide">아이폰에서 설치하기</CardTitle>
            </CardHeader>
            <CardBody>
              <ol style={{ lineHeight: 1.6, paddingLeft: 18 }}>
                <li style={{ marginBottom: 6 }}>
                  Safari 하단의{" "}
                  <b className={styles["install-guide-highlight"]}>
                    <img
                      src="/src/ios-share-white.png"
                      alt="공유 버튼"
                      width="16"
                      style={{ verticalAlign: "middle" }}
                    />
                  </b>{" "}
                  버튼을 누르세요.
                  <img
                    src="/src/ios-guide-1.jpg"
                    alt="아이폰 설치 가이드"
                    style={{
                      width: "100%",
                      margin: "12px auto",
                      borderRadius: 8,
                    }}
                  />
                </li>
                <li style={{ marginBottom: 6 }}>
                  메뉴에서{" "}
                  <b className={styles["install-guide-highlight"]}>
                    홈 화면에 추가하기
                  </b>
                  를 선택하세요.
                  <img
                    src="/src/ios-guide-2.jpg"
                    alt="아이폰 설치 가이드"
                    style={{
                      width: "100%",
                      margin: "12px auto",
                      borderRadius: 8,
                    }}
                  />
                </li>
              </ol>
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--card-bg)",
                  boxShadow: "inset 0 0 0 1px var(--card-border-color)",
                  fontSize: 13,
                  opacity: 0.9,
                }}
              >
                네이버/카카오톡 등 인앱 브라우저에서는 설치가 되지 않아요.
                Safari로 열어 진행해 주세요.
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card as="section" aria-labelledby="android-guide">
            <CardHeader>
              <CardTitle id="android-guide">갤럭시에서 설치하기</CardTitle>
            </CardHeader>
            <CardBody style={{ background: "inherit" }}>
              <Divider />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button id="snackbar-install-btn" onClick={triggerInstall}>
                  설치
                </button>
              </div>
              <hr className={styles.hrText} data-content="OR"></hr>
              <ol style={{ lineHeight: 1.6, paddingLeft: 18 }}>
                <li style={{ marginBottom: 6 }}>
                  Chrome 우측 상단의{" "}
                  <b className={styles["install-guide-highlight"]}>⋮ 메뉴</b>를
                  누르세요.
                  <img
                    src="/src/aos-guide-1.jpg"
                    alt="안드로이드 설치 가이드"
                    style={{
                      width: "100%",
                      margin: "12px auto",
                      borderRadius: 8,
                    }}
                  />
                </li>
                <li style={{ marginBottom: 6 }}>
                  <b className={styles["install-guide-highlight"]}>
                    홈 화면에 추가
                  </b>{" "}
                  또는{" "}
                  <b className={styles["install-guide-highlight"]}>앱 설치</b>.
                  <img
                    src="/src/aos-guide-2.jpg"
                    alt="안드로이드 설치 가이드"
                    style={{
                      width: "100%",
                      margin: "12px auto",
                      borderRadius: 8,
                    }}
                  />
                </li>
              </ol>
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--card-bg)",
                  boxShadow: "inset 0 0 0 1px var(--card-border-color)",
                  fontSize: 13,
                  opacity: 0.9,
                }}
              >
                삼성 인터넷 브라우저도 비슷해요
                <br />⋮ 메뉴 → “홈 화면에 추가”.
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}
