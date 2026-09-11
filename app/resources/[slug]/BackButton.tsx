'use client';

import React from 'react';
import Link from 'next/link';

export default function BackButton() {
  return (
    <Link
      href="/?tab=resources"
      style={{
        color: '#00c97a',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: "'Epilogue', sans-serif",
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      ← Back to Resources
    </Link>
  );
}