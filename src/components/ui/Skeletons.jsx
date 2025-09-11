import React from "react";
import styles from "./Skeletons.module.css";

export function CardSkeleton({ lines = 2, withTitle = true, style }) {
  return (
    <div className={styles.skeletonList} style={{ margin: 0, ...style }}>
      {withTitle && <div className={`${styles.sk} ${styles.title}`} />}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${styles.sk} ${styles.line} ${
            i === lines - 1 ? styles.short : ""
          }`}
        />
      ))}
    </div>
  );
}

export function CardError({ message }) {
  if (!message) return null;
  return <p className="card-error">{message}</p>;
}

export function LoadMoreSkeleton({ style }) {
  return (
    <div className={`${styles.skeletonList} ${styles.more}`} style={style}>
      <div className={`${styles.sk} ${styles.line}`} />
      <div className={`${styles.sk} ${styles.line} ${styles.short}`} />
    </div>
  );
}

// Tailored skeletons for better UX

// Home: Menu card body (2-3 lines like menu text)
export function MenuSkeleton() {
  return (
    <div className={styles.skeletonList} style={{ margin: 0 }}>
      <div className={`${styles.sk} ${styles.line}`} />
      <div className={`${styles.sk} ${styles.line}`} />
      <div className={`${styles.sk} ${styles.line} ${styles.short}`} />
    </div>
  );
}

// Home: Notice list (3 rows with optional tag chip and date)
export function NoticeListSkeleton({ count = 3 }) {
  return (
    <div className={`${styles.list} ${styles.noticeList}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.listItem}>
          <div className={styles.left}>
            <span className={`${styles.sk} ${styles.chip}`} />
            <span
              className={`${styles.sk} ${styles.line}`}
              style={{ maxWidth: "70%" }}
            />
          </div>
          <div className={styles.right}>
            <span
              className={`${styles.sk} ${styles.small}`}
              style={{ width: 44 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Home: Equipments (dryer) grid
export function EquipmentsSkeleton({ count = 5 }) {
  return (
    <div className={styles.equipGrid} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.equipItem}>
          <span className={`${styles.sk} ${styles.equipCircle}`} />
          <span className={`${styles.sk} ${styles.equipTime}`} />
        </div>
      ))}
    </div>
  );
}

// Board/Notice: Accordion list headers
export function AccordionListSkeleton({ items = 3 }) {
  return (
    <div className={styles.skeletonList} style={{ margin: 0 }}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.skeletonHeaderRow}>
            <div className={styles.left}>
              <span className={`${styles.sk} ${styles.chip}`} />
              <span
                className={`${styles.sk} ${styles.line}`}
                style={{ width: "56vw", maxWidth: 360 }}
              />
            </div>
            <span
              className={`${styles.sk} ${styles.small}`}
              style={{ width: 48 }}
            />
          </div>
          <div className={styles.panel}>
            <div className={`${styles.sk} ${styles.line}`} />
            <div className={`${styles.sk} ${styles.line} ${styles.short}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
