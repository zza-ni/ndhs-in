import React from 'react';

export default function Divider({ className = '', style, ...rest }) {
  return <div className={`divider${className ? ' ' + className : ''}`} style={style} aria-hidden="true" {...rest} />;
}
