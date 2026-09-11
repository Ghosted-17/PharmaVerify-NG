import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ARTICLES } from '../../../data/articles';

export async function generateStaticParams() {
  return ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#040a06', color: '#e8f0ea', fontFamily: "'Epilogue', sans-serif" }}>
      {/* TOPBAR */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #00c97a, #00a362)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#040a06', fontWeight: 800 }}>⚕</span>
          </div>
          PharmaVerify<sup style={{ fontSize: 10 }}>NG</sup>
        </Link>
        <Link href="/?tab=resources" style={{ color: '#00c97a', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          ← Back to Resources
        </Link>
      </header>

      {/* ARTICLE CONTENT */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '3.5rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ background: 'rgba(0, 201, 122, 0.1)', color: '#00c97a', border: '1px solid rgba(0, 201, 122, 0.25)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
            {article.tag}
          </span>
          <span style={{ fontSize: 12, color: '#5a7060' }}>{article.readTime} · {article.date}</span>
        </div>

        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.2, fontWeight: 700, color: '#fff', marginBottom: '1.5rem' }}>
          {article.title}
        </h1>

        <p style={{ fontSize: 17, color: '#9ab0a0', lineHeight: 1.75, borderLeft: '3px solid #00c97a', paddingLeft: '1rem', marginBottom: '2.5rem', fontStyle: 'italic' }}>
          {article.summary}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: 1.8, fontSize: 15.5, color: '#d8e4dc' }}>
          {article.content.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: '3.5rem', background: '#101c14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: '#fff', marginBottom: 8 }}>Have medications to verify?</h3>
          <p style={{ fontSize: 13.5, color: '#9ab0a0', marginBottom: '1.25rem' }}>
            Cross-check registration details, check drug-drug interactions, and evaluate product authenticity with our AI engine.
          </p>
          <Link href="/signin" style={{ display: 'inline-block', background: '#00c97a', color: '#040a06', fontWeight: 700, padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
            Open PharmaVerify Dashboard →
          </Link>
        </div>
      </main>
    </div>
  );
}