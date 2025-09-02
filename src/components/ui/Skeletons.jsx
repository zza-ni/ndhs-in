import React from 'react';

export function CardSkeleton({ lines = 2, withTitle = true, style }) {
  return (
    <div className="skeleton-list" style={{ margin: 0, ...style }}>
      {withTitle && <div className="skeleton skeleton-title" />}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton skeleton-line${i === lines - 1 ? ' short' : ''}`} />
      ))}
    </div>
  );
}

export function CardError({ message }) {
  if (!message) return null;
  return <p className="card-error">{message}</p>;
}
