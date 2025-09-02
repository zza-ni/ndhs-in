import React from 'react';
import styles from './Skeletons.module.css';

export function CardSkeleton({ lines = 2, withTitle = true, style }) {
  return (
    <div className={styles.skeletonList} style={{ margin: 0, ...style }}>
      {withTitle && <div className={`${styles.sk} ${styles.title}`} />}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`${styles.sk} ${styles.line} ${i === lines - 1 ? styles.short : ''}`} />
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
