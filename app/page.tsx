'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ARTICLES, Article } from '../data/articles';

interface Flag {
  type: 'ok' | 'warn' | 'bad';
  message: string;
}

interface VerificationResult {
  status: 'SAFE' | 'CAUTION' | 'UNSAFE' | 'UNKNOWN';
  safetyScore: number;
  summary: string;
  flags?: Flag[];
  recommendation: string;
  proTip?: string;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'home' | 'verify' | 'services' | 'about' | 'resources' | 'contact'>('home');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Background Hero Slideshow State
  const [heroSlide, setHeroSlide] = useState(0);
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % 4);
    }, 6000);
    return () => clearInterval(slideTimer);
  }, []);

  // Synchronized Process Step State (6-second auto-cycle with 3D spin trigger)
  const [activeStep, setActiveStep] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);

  // Dynamic 3D Pressure Tilt States
  const [phoneTilt, setPhoneTilt] = useState({ x: 0, y: 0, active: false });
  const [laptopTilt, setLaptopTilt] = useState({ x: 0, y: 0, active: false });

  const handleDeviceMove = (
    e: React.MouseEvent<HTMLDivElement>,
    setter: React.Dispatch<React.SetStateAction<{ x: number; y: number; active: boolean }>>,
    maxDeg = 16
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPct = (x / rect.width - 0.5) * 2;
    const yPct = (y / rect.height - 0.5) * 2;

    setter({
      x: -yPct * maxDeg,
      y: xPct * maxDeg,
      active: true,
    });
  };

  const handleDeviceLeave = (
    setter: React.Dispatch<React.SetStateAction<{ x: number; y: number; active: boolean }>>
  ) => {
    setter({ x: 0, y: 0, active: false });
  };

  const triggerStepChange = (newStep: number) => {
    if (newStep === activeStep) return;
    setIsSpinning(true);
    setTimeout(() => {
      setActiveStep(newStep);
    }, 380);
    setTimeout(() => {
      setIsSpinning(false);
    }, 850);
  };

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep((prev) => {
        const next = prev === 4 ? 1 : prev + 1;
        setIsSpinning(true);
        setTimeout(() => setIsSpinning(false), 850);
        return next;
      });
    }, 6000);
    return () => clearInterval(stepTimer);
  }, []);

  // Verification Form State
  const [drugName, setDrugName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [nafdacNum, setNafdacNum] = useState('');
  const [batchNum, setBatchNum] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [storageTemp, setStorageTemp] = useState('');
  const [packaging, setPackaging] = useState('');
  const [drugForm, setDrugForm] = useState('');
  const [source, setSource] = useState('');
  const [observations, setObservations] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  // Verification State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [verifiedDrug, setVerifiedDrug] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Selected Article for In-App Reader Modal
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Legal Modal State (Stores the active legal document object)
  const [activeLegalDoc, setActiveLegalDoc] = useState<{ title: string; tag: string; summary: string; content: string[] } | null>(null);

  const legalContentMap: Record<string, { title: string; tag: string; summary: string; content: string[] }> = {
    privacy: {
      title: 'Privacy Policy',
      tag: 'Legal · Data Protection',
      summary: 'How PharmaVerify NG collects, utilizes, and safeguards your personal and health-related verification data.',
      content: [
        '1. Information We Collect: We collect information you explicitly provide when submitting medication details (such as drug names, NAFDAC registration numbers, batch numbers, and visual observations) or when contacting our team.',
        '2. Use of Data: All verification data is processed through secure clinical and AI intelligence models strictly to evaluate NAFDAC Greenbook conformity, expiration status, and packaging integrity.',
        '3. Data Security: We deploy robust encryption standards and secure cloud infrastructure (Firebase/Supabase) to ensure your health inquiries and logs remain confidential.',
        '4. Third-Party Services: Verification prompts are processed securely via encrypted API endpoints. We never sell, rent, or trade your personal health data to third-party advertisers.'
      ]
    },
    terms: {
      title: 'Terms of Service',
      tag: 'Legal · User Agreement',
      summary: 'Rules, guidelines, and responsibilities governing your use of the PharmaVerify NG platform and APIs.',
      content: [
        '1. Acceptance of Terms: By accessing or utilizing PharmaVerify NG, you agree to be bound by these Terms of Service and all applicable local pharmaceutical regulations.',
        '2. Educational Scope: PharmaVerify NG is designed as an auxiliary safety screening tool. Users agree not to rely solely on automated outputs for critical medical purchasing or emergency decisions.',
        '3. Prohibited Conduct: Users must not attempt to scrape our verification databases, reverse-engineer our AI assessment prompts, or submit fraudulent counterfeit reports with malicious intent.',
        '4. Service Modifications: We reserve the right to modify, suspend, or update platform features, API limits, or subscription tiers at any time with appropriate notification.'
      ]
    },
    disclaimer: {
      title: 'Legal Disclaimer',
      tag: 'Legal · Medical Notice',
      summary: 'Important limitations of liability regarding medical guidance and automated verification scores.',
      content: [
        '1. Not a Substitute for Professional Medical Advice: PharmaVerify NG provides informational and preliminary risk scores. It is not a certified laboratory testing facility nor an official arm of NAFDAC.',
        '2. No Medical Diagnosis: The automated reports, safety scores, and AI summaries do not constitute formal medical diagnoses or prescriptions. Always consult a licensed pharmacist or physician.',
        '3. Limitation of Liability: PharmaVerify NG, its founders, and affiliated institutions shall not be held liable for any direct, indirect, or consequential damages resulting from medication use.',
        '4. Regulatory Status: Official confirmation of drug authenticity requires certified chemical and pharmacopeial laboratory assays.'
      ]
    },
    cookies: {
      title: 'Cookie Policy',
      tag: 'Legal · Tracking & Storage',
      summary: 'Information regarding local session storage, preferences, and cookie utilization on our platform.',
      content: [
        '1. What Are Cookies: Cookies are small data text files stored on your device when loading web pages to remember your preferences and improve performance.',
        '2. Essential Storage: We utilize secure local storage flags to maintain your active UI theme (Dark Mode), navigation state, and authentication tokens when signed in.',
        '3. Analytics: Minimal performance telemetry is maintained exclusively to monitor uptime, loading speeds, and network error frequencies.',
        '4. Managing Cookies: You can disable cookies directly through your browser settings, though certain interactive features like user authentication may require cookies to function correctly.'
      ]
    }
  };

  // Contact Form States
  const [contactName, setContactName] = useState('');
  const [contactOrg, setContactOrg] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactType, setContactType] = useState('General enquiry');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Custom Cursor
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [ringPos, setRingPos] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      setTimeout(() => {
        setRingPos({ x: e.clientX, y: e.clientY });
      }, 80);
    };

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Check URL query on load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['home', 'verify', 'services', 'about', 'resources', 'contact'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, []);

  const showPage = (pageName: typeof activeTab) => {
    setActiveTab(pageName);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWarningToggle = (val: string) => {
    if (val === 'none') {
      setWarnings(['none']);
      return;
    }
    const filtered = warnings.filter((w) => w !== 'none');
    if (filtered.includes(val)) {
      setWarnings(filtered.filter((w) => w !== val));
    } else {
      setWarnings([...filtered, val]);
    }
  };

  const runVerification = async () => {
    if (!drugName.trim()) {
      alert('Please enter a drug or medication name.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResult(null);

    const today = new Date();
    let expiryStatus = 'not provided';
    if (expiryDate) {
      const exp = new Date(expiryDate + '-01');
      const diff = (exp.getFullYear() - today.getFullYear()) * 12 + (exp.getMonth() - today.getMonth());
      expiryStatus =
        diff < 0
          ? `EXPIRED (${Math.abs(diff)} months ago)`
          : diff === 0
          ? 'expires this month'
          : diff <= 3
          ? `expires in ${diff} month(s) — soon`
          : `valid for ${diff} months`;
    }

    const activeWarnings = warnings.filter((w) => w !== 'none');
    const prompt = `You are a pharmaceutical safety expert in Nigeria. Analyse these medication details and cross-check NAFDAC registration conformity, expiration validity, and packaging integrity. Return ONLY valid JSON, no markdown, no extra text.

Details:
- Name: ${drugName}
- Manufacturer: ${manufacturer || 'Not given'}
- NAFDAC Reg Number: ${nafdacNum || 'Not provided'}
- Batch (optional): ${batchNum || 'Not given'}
- Expiry: ${expiryDate || 'Not given'} (${expiryStatus})
- Storage: ${storageTemp || 'Not given'}
- Packaging: ${packaging || 'Not given'}
- Drug form: ${drugForm || 'Not given'}
- Source: ${source || 'Not given'}
- Visual observations: ${observations || 'None'}
- Warning signs: ${activeWarnings.length ? activeWarnings.join(', ') : 'None'}

Return exactly:
{"status":"SAFE"|"CAUTION"|"UNSAFE"|"UNKNOWN","safetyScore":<0-100>,"summary":"<2-3 sentences>","flags":[{"type":"ok"|"warn"|"bad","message":"<specific finding>"}],"recommendation":"<clear actionable advice>","proTip":"<one expert tip>"}

Rules: Expired=UNSAFE. Open market source=CAUTION at minimum. Damaged packaging+physical changes=UNSAFE. Standard valid format for NAFDAC NRN is A4-XXXX, 04-XXXX, B4-XXXX. Missing key information=UNKNOWN. Always recommend consulting a licensed pharmacist or physician.`;

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, isChat: false }),
      });
      const data = await res.json();
      let clean = (data.text || '').replace(/```json|```/g, '').trim();
      const first = clean.indexOf('{');
      const last = clean.lastIndexOf('}');
      if (first !== -1 && last !== -1) {
        clean = clean.substring(first, last + 1);
      }
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setVerifiedDrug(drugName);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendContact = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMsg.trim()) {
      alert('Please fill out your name, email, and message.');
      return;
    }
    setContactSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: contactName,
          organisation: contactOrg,
          email: contactEmail,
          enquiryType: contactType,
          message: contactMsg,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned status ${res.status}. Check terminal logs.`);
      }

      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setContactSuccess(true);
      setContactName('');
      setContactOrg('');
      setContactEmail('');
      setContactMsg('');
      setTimeout(() => setContactSuccess(false), 5000);
    } catch (err: any) {
      alert(err.message || 'Error sending message. Please check your credentials.');
    } finally {
      setContactSending(false);
    }
  };

  const statusMap = {
    SAFE: { chip: 'chip-safe', dot: 'dot-safe', label: 'Safe to use', bar: '#00c97a', cls: 'rt-safe' },
    CAUTION: { chip: 'chip-caution', dot: 'dot-caution', label: 'Use with caution', bar: '#f59e0b', cls: 'rt-caution' },
    UNSAFE: { chip: 'chip-unsafe', dot: 'dot-unsafe', label: 'Do NOT use', bar: '#ef4444', cls: 'rt-unsafe' },
    UNKNOWN: { chip: 'chip-unknown', dot: 'dot-unknown', label: 'Unable to determine', bar: '#5a7060', cls: '' },
  };

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --void:#08100c;
          --deep:#0b1711;
          --surface:#0f1f17;
          --card:#13241b;
          --card2:#172a20;
          --glass:rgba(255,255,255,0.03);
          --glass2:rgba(255,255,255,0.06);
          --line:rgba(0,201,122,0.09);
          --line2:rgba(255,255,255,0.12);
          --jade:#00c97a;
          --jade-dim:#00a362;
          --jade-glow:rgba(0,201,122,0.15);
          --jade-pale:rgba(0,201,122,0.07);
          --ember:#f59e0b;
          --ember-glow:rgba(245,158,11,0.15);
          --blood:#ef4444;
          --blood-glow:rgba(239,68,68,0.15);
          --text:#e8f0ea;
          --text2:#9ab0a0;
          --text3:#607968;
          --white:#ffffff;
        }

        /* Hide scrollbars across all browsers for modals and snap containers */
        ::-webkit-scrollbar { display: none !important; }
        html[data-scroll-behavior="smooth"]{scroll-behavior:smooth}
        body{font-family:'Epilogue',sans-serif;background:var(--void);color:var(--text);min-height:100vh;overflow-x:hidden;cursor:default}

        /* ═══ CURSOR ═══ */
        .cursor,.cursor-ring{display:none}
        @media (hover:hover) and (pointer:fine){
          .cursor{display:block;width:10px;height:10px;background:var(--jade);border-radius:50%;position:fixed;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:transform 0.1s,width 0.2s,height 0.2s,opacity 0.2s;mix-blend-mode:screen}
          .cursor-ring{display:block;width:36px;height:36px;border:1px solid rgba(0,201,122,0.4);border-radius:50%;position:fixed;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:all 0.15s ease}
        }

        /* ═══ NOISE OVERLAY ═══ */
        body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:9997;opacity:0.4}

        /* ═══ HEADER CONTAINER (PERMANENTLY PINNED TO TOP) ═══ */
        .header-fixed-wrap{
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          z-index: 900 !important;
        }

        /* ═══ TOPBAR ═══ */
        .topbar{
          background: rgba(8, 16, 12, 0.98);
          border-bottom: 1px solid var(--line);
          padding: 8px 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
          color: var(--text3);
          width: 100%;
        }
        .topbar-left{display: flex; align-items: center; gap: 12px}

        /* ═══ NAV ═══ */
        nav{
          background: rgba(8, 16, 12, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--line);
          padding: 0 2.5rem;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .nav-logo-group{display:inline-flex;align-items:center;gap:11px}
        .nav-tabs{display:flex;align-items:center;gap:0}
        .nav-tab{padding:0 18px;height:68px;display:flex;align-items:center;font-size:13.5px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.2s;letter-spacing:0.1px;position:relative}
        .nav-tab:hover{color:var(--text)}
        .nav-tab.active{color:var(--jade);border-bottom-color:var(--jade)}
        .nav-right{display:flex;align-items:center;gap:12px}
        .menu-toggle{display:none;width:36px;height:36px;border:1px solid var(--line2);border-radius:8px;background:transparent;color:var(--text2);cursor:pointer;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s}
        .nav-mobile-actions{display:none}
        .menu-toggle:hover{border-color:var(--jade);color:var(--jade)}
        .btn-ghost{padding:8px 18px;border:1px solid var(--line2);border-radius:8px;background:transparent;color:var(--text2);font-family:'Epilogue',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s}
        .btn-ghost:hover{border-color:var(--jade);color:var(--jade)}
        .btn-primary{padding:9px 20px;border:none;border-radius:8px;background:var(--jade);color:var(--void);font-family:'Epilogue',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:0.2px}
        .btn-primary:hover{background:#00e68a;transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,201,122,0.3)}

        /* ═══ PAGE SYSTEM ═══ */
        .page{display:none;animation:pageIn 0.35s ease}
        .page.active{display:block}
        @keyframes pageIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

        /* ═══ HERO & SLIDESHOW (ADDED TOP PADDING TO PREVENT OVERLAP) ═══ */
        .hero{position:relative;min-height:86vh;display:flex;flex-direction:column;justify-content:center;overflow:hidden;padding:140px 2.5rem 0 2.5rem}
        .hero-slides-wrapper{position:absolute;inset:0;pointer-events:none;z-index:0}
        .hero-slide{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;filter:brightness(1.1) contrast(1.05);transition:opacity 1.6s ease-in-out, transform 8s ease-out;transform:scale(1.04)}
        .hero-slide.active{opacity:0.52;transform:scale(1)}
        .hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse 85% 75% at 50% 50%,rgba(8,16,12,0.38) 0%,rgba(8,16,12,0.85) 100%);pointer-events:none;z-index:1}
        .hero-grid{position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 80% 80% at center,black 20%,transparent 80%);pointer-events:none;opacity:0.25;z-index:1}
        .hero h1{font-family:'Fraunces',serif;font-size:clamp(3rem,7vw,5.5rem);font-weight:700;line-height:1.03;letter-spacing:-2px;margin-bottom:1.5rem;text-shadow:0 4px 24px rgba(0,0,0,0.75);animation:fadeUp 0.6s 0.2s both}
        .hero h1 em{font-style:italic;color:var(--jade)}
        .hero-sub{font-size:17px;line-height:1.75;color:var(--text2);font-weight:300;max-width:540px;margin:0 auto 2.5rem;text-shadow:0 2px 14px rgba(0,0,0,0.8);animation:fadeUp 0.6s 0.3s both}
        .hero-content{position:relative;z-index:2;max-width:760px;margin:0 auto;text-align:center;padding:2rem 0}
        .hero-kicker{display:inline-flex;align-items:center;gap:8px;background:var(--jade-pale);border:1px solid rgba(0,201,122,0.2);color:var(--jade);font-size:11.5px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:6px 16px;border-radius:20px;margin-bottom:2rem;animation:fadeUp 0.6s 0.1s both}
        .hero-scroll{position:absolute;bottom:2.5rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--text3);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;animation:fadeUp 0.6s 0.6s both}
        .hero-scroll-line{width:1px;height:48px;background:linear-gradient(to bottom,var(--jade),transparent);animation:scrollLine 1.5s ease infinite}
        @keyframes scrollLine{0%,100%{opacity:0.3;transform:scaleY(1)}50%{opacity:1}}

        /* stats bar */
        .stats-bar{background:var(--card);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:1.5rem 2.5rem;display:flex;justify-content:center;gap:0;animation:fadeUp 0.6s 0.5s both}
        .stat-item{padding:0 3rem;text-align:center;border-right:1px solid var(--line)}
        .stat-item:last-child{border-right:none}
        .stat-num{font-family:'Fraunces',serif;font-size:32px;font-weight:700;color:var(--jade);letter-spacing:-1px;line-height:1}
        .stat-label{font-size:12px;color:var(--text3);margin-top:4px;letter-spacing:0.3px}

        /* ═══ SECTIONS ═══ */
        section{padding:6rem 2.5rem}
        .section-inner{max-width:1100px;margin:0 auto}
        .section-kicker{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--jade);margin-bottom:0.75rem}
        .section-title{font-family:'Fraunces',serif;font-size:clamp(2rem,4vw,3rem);font-weight:700;color:var(--white);letter-spacing:-1px;line-height:1.15;margin-bottom:1rem}
        .section-sub{font-size:16px;color:var(--text2);font-weight:300;line-height:1.7;max-width:500px}

        /* ═══ PROCESS INTERACTIVE STAGE & DUAL-DEVICE 3D DISPLAY ═══ */
        .process-stage-section {
          position: relative;
          overflow: hidden;
          background: var(--surface);
          padding: 6rem 2.5rem;
        }

        .process-backdrop-slides {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .process-bg-slide {
          position: absolute;
          inset: -40px;
          background-size: cover;
          background-position: center;
          filter: blur(28px) brightness(0.28) saturate(1.2);
          opacity: 0;
          transition: opacity 1.8s ease-in-out;
        }

        .process-bg-slide.active {
          opacity: 1;
        }

        .process-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 70% at 50% 50%, rgba(8,16,12,0.6) 0%, rgba(8,16,12,0.96) 100%);
          pointer-events: none;
          z-index: 1;
        }

        .step-node{cursor:pointer;transition:all 0.3s ease;user-select:none}
        .step-circle{
          width:56px;
          height:56px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          margin:0 auto 1.25rem;
          font-family:'Fraunces',serif;
          font-size:20px;
          font-weight:700;
          transition:all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .step-node.active .step-circle{
          background:var(--jade) !important;
          color:var(--void) !important;
          box-shadow:0 0 24px rgba(0,201,122,0.45);
          transform:scale(1.12);
        }
        .step-node:not(.active) .step-circle{
          background:var(--card);
          border:2px solid rgba(0,201,122,0.25);
          color:var(--text3);
        }
        .step-node.active h4{color:var(--jade) !important}

        /* Desktop Dual Device Row */
        .dual-devices-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 3rem;
          margin: 3.5rem auto 2.5rem;
          max-width: 1050px;
          position: relative;
          z-index: 2;
        }

        /* 3D Phone Chassis on the Left */
        .stage-phone-perspective {
          perspective: 1200px;
          display: flex;
          justify-content: center;
          flex-shrink: 0;
        }

        .stage-phone-wrapper {
          position: relative;
          width: 290px;
          padding: 10px;
          background: linear-gradient(145deg, #1a2f22 0%, #0d1812 50%, #080f0b 100%);
          border: 1.5px solid rgba(0, 201, 122, 0.45);
          border-radius: 36px;
          transform-style: preserve-3d;
          box-shadow: 
            0 30px 60px rgba(0, 0, 0, 0.8),
            0 0 35px rgba(0, 201, 122, 0.18),
            inset 0 1px 2px rgba(255, 255, 255, 0.2);
          transition: transform 0.18s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.25s ease;
          cursor: grab;
          will-change: transform;
        }

        .stage-phone-wrapper.floating {
          animation: phoneIdleFloat 6s ease-in-out infinite alternate;
        }

        .stage-phone-wrapper.spinning {
          animation: phoneSpinStep 0.85s cubic-bezier(0.2, 0.85, 0.35, 1.2) forwards !important;
        }

        @keyframes phoneIdleFloat {
          0% { transform: rotateY(-8deg) rotateX(5deg) translateY(0px); }
          100% { transform: rotateY(6deg) rotateX(-3deg) translateY(-8px); }
        }

        @keyframes phoneSpinStep {
          0% { transform: rotateY(0deg) scale(0.96); }
          50% { transform: rotateY(180deg) scale(1.05); }
          100% { transform: rotateY(360deg) scale(1); }
        }

        .stage-phone-wrapper::before{
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 60%;
          border-top-left-radius: 34px;
          border-top-right-radius: 34px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%);
          pointer-events: none;
          z-index: 5;
        }

        .stage-phone-inner {
          background: #060d09;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 26px;
          overflow: hidden;
          min-height: 360px;
          position: relative;
          display: flex;
          flex-direction: column;
          backface-visibility: hidden;
        }

        .stage-phone-notch {
          width: 90px;
          height: 16px;
          background: #0c1510;
          border-bottom-left-radius: 10px;
          border-bottom-right-radius: 10px;
          margin: 0 auto 12px;
        }

        /* Laptop / Tablet Perspective & Pressure Tilt */
        .stage-laptop-perspective {
          perspective: 1400px;
          display: flex;
          justify-content: center;
          flex: 1 1 480px;
          max-width: 520px;
        }

        .stage-laptop-wrapper {
          position: relative;
          background: #0d1812;
          border: 1.5px solid rgba(0, 201, 122, 0.35);
          border-radius: 18px;
          padding: 8px 8px 12px;
          transform-style: preserve-3d;
          box-shadow: 
            0 25px 50px rgba(0,0,0,0.7),
            0 0 30px rgba(0, 201, 122, 0.12);
          transition: transform 0.18s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.25s ease;
          cursor: pointer;
          will-change: transform;
          width: 100%;
        }

        .stage-laptop-screen {
          background: #060d09;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
          min-height: 290px;
          display: flex;
          flex-direction: column;
        }

        .laptop-topbar {
          background: #0d1812;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .laptop-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .screen-fade {
          flex: 1;
          padding: 0 1.25rem 1.25rem;
          display: flex;
          flex-direction: column;
          animation: fadeUp 0.45s ease both;
        }

        /* ═══ VERIFY PAGE ═══ */
        .verify-layout{display:grid;grid-template-columns:1fr 400px;gap:2rem;max-width:1100px;margin:0 auto}
        .form-panel{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:2.5rem;position:relative;overflow:hidden}
        .form-panel::before{content:'';position:absolute;top:-80px;right:-80px;width:200px;height:200px;background:radial-gradient(circle,var(--jade-glow),transparent 70%);pointer-events:none}
        .panel-head{display:flex;align-items:center;gap:12px;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--line)}
        .panel-head-icon{width:40px;height:40px;background:var(--jade-pale);border:1px solid rgba(0,201,122,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .panel-head h2{font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:var(--white);letter-spacing:-0.3px}
        .panel-head p{font-size:12.5px;color:var(--text3);margin-top:2px}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .field{display:flex;flex-direction:column;gap:6px}
        .field.full{grid-column:1/-1}
        .field label{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:1px}
        .field input,.field select,.field textarea{font-family:'Epilogue',sans-serif;font-size:13.5px;color:var(--text);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:11px 14px;outline:none;transition:all 0.2s;width:100%}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--jade);box-shadow:0 0 0 3px var(--jade-pale);background:var(--deep)}
        .field input::placeholder,.field textarea::placeholder{color:var(--text3)}
        .field textarea{resize:vertical;min-height:95px;line-height:1.6}
        .field select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a7060' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px;cursor:pointer}
        .field select option{background:var(--card)}
        .divider{font-size:10.5px;font-weight:700;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase;margin:1.5rem 0 1rem;padding-top:1.5rem;border-top:1px solid var(--line);display:flex;align-items:center;gap:10px}
        .divider::after{content:'';flex:1;height:1px;background:var(--line)}
        .checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .check-box{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--text2);padding:9px 12px;border-radius:9px;border:1px solid var(--line);background:var(--surface);cursor:pointer;transition:all 0.15s;user-select:none}
        .check-box:hover{border-color:rgba(0,201,122,0.3);background:var(--jade-pale);color:var(--text)}
        .check-box input[type=checkbox]{width:15px;height:15px;accent-color:var(--jade);cursor:pointer;flex-shrink:0}
        .verify-btn{width:100%;margin-top:1.75rem;background:var(--jade);color:var(--void);border:none;border-radius:12px;padding:15px;font-family:'Fraunces',serif;font-size:16px;font-weight:700;letter-spacing:0.2px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.2s;position:relative;overflow:hidden}
        .verify-btn:hover{background:#00e68a;box-shadow:0 12px 36px rgba(0,201,122,0.35);transform:translateY(-1px)}
        .verify-btn:active{transform:scale(0.99)}
        .verify-btn:disabled{background:#1a3326;color:#2a5040;cursor:not-allowed}

        /* sidebar */
        .sidebar{display:flex;flex-direction:column;gap:1.5rem}
        .result-placeholder{background:var(--card);border:1px dashed var(--line2);border-radius:20px;padding:3rem 2rem;text-align:center;color:var(--text3)}
        .result-placeholder .ph-icon{width:56px;height:56px;background:var(--jade-pale);border:1px solid rgba(0,201,122,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem}
        .result-placeholder h3{font-family:'Fraunces',serif;font-size:16px;font-weight:600;color:var(--text2);margin-bottom:0.5rem}
        .result-placeholder p{font-size:13px;line-height:1.65}

        /* result card */
        .result-card{background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden;animation:fadeUp 0.35s ease}
        .result-top{padding:1.75rem;border-bottom:1px solid var(--line);position:relative;overflow:hidden}
        .result-top::before{content:'';position:absolute;top:-60px;right:-60px;width:160px;height:160px;border-radius:50%;pointer-events:none}
        .rt-safe::before{background:radial-gradient(circle,var(--jade-glow),transparent 70%)}
        .rt-caution::before{background:radial-gradient(circle,var(--ember-glow),transparent 70%)}
        .rt-unsafe::before{background:radial-gradient(circle,var(--blood-glow),transparent 70%)}
        .result-status-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem}
        .status-chip{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;font-family:'Epilogue',sans-serif;letter-spacing:0.5px;text-transform:uppercase}
        .chip-safe{background:rgba(0,201,122,0.12);color:var(--jade);border:1px solid rgba(0,201,122,0.2)}
        .chip-caution{background:rgba(245,158,11,0.12);color:var(--ember);border:1px solid rgba(245,158,11,0.2)}
        .chip-unsafe{background:rgba(239,68,68,0.12);color:var(--blood);border:1px solid rgba(239,68,68,0.2)}
        .chip-unknown{background:var(--glass2);color:var(--text3);border:1px solid var(--line2)}
        .chip-dot{width:7px;height:7px;border-radius:50%}
        .dot-safe{background:var(--jade)}
        .dot-caution{background:var(--ember)}
        .dot-unsafe{background:var(--blood)}
        .dot-unknown{background:var(--text3)}
        .result-drug-name{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:var(--white);letter-spacing:-0.5px}
        .score-section{margin-top:1.25rem}
        .score-meta{display:flex;justify-content:space-between;font-size:11.5px;color:var(--text3);margin-bottom:6px;font-weight:500}
        .score-track{height:8px;background:rgba(255,255,255,0.06);border-radius:20px;overflow:hidden}
        .score-fill{height:100%;border-radius:20px;transition:width 1.2s cubic-bezier(0.34,1.56,0.64,1)}
        .result-body{padding:1.5rem}
        .r-section{margin-bottom:1.25rem;padding-bottom:1.25rem;border-bottom:1px solid var(--line)}
        .r-section:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none}
        .r-section h4{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:0.6rem}
        .r-section p{font-size:13.5px;color:var(--text2);line-height:1.7}
        .flag-list{list-style:none;display:flex;flex-direction:column;gap:8px}
        .flag-row{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--text2);line-height:1.55}
        .flag-ico{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;margin-top:1px}
        .fi-ok{background:rgba(0,201,122,0.15);color:var(--jade)}
        .fi-warn{background:rgba(245,158,11,0.15);color:var(--ember)}
        .fi-bad{background:rgba(239,68,68,0.15);color:var(--blood)}
        .pro-tip-box{background:var(--jade-pale);border:1px solid rgba(0,201,122,0.15);border-radius:10px;padding:12px 15px;font-size:12.5px;color:var(--jade);line-height:1.65;font-style:italic;margin-top:0.5rem}
        .info-widget{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:1.5rem}
        .info-widget h3{font-family:'Fraunces',serif;font-size:15px;font-weight:700;color:var(--white);margin-bottom:1.25rem}
        .check-list{list-style:none;display:flex;flex-direction:column;gap:10px}
        .check-list li{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--text2);line-height:1.5}
        .cl-num{width:22px;height:22px;background:var(--jade);color:var(--void);border-radius:50%;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        .warn-box{background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:14px 16px;font-size:12.5px;color:#d4a83a;line-height:1.65}
        .warn-box strong{display:block;font-family:'Fraunces',serif;font-size:13px;margin-bottom:3px;color:var(--ember)}
        .error-box{background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:14px 16px;color:var(--blood);font-size:13.5px;line-height:1.6}

        /* ═══ SERVICES PAGE ═══ */
        .services-hero{background:var(--card);border-bottom:1px solid var(--line);padding:5rem 2.5rem 4rem}
        .services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:4rem}
        .service-card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:2rem;transition:all 0.3s;position:relative;overflow:hidden;cursor:default}
        .service-card::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,var(--jade-glow),transparent 60%);opacity:0;transition:opacity 0.3s}
        .service-card:hover{border-color:rgba(0,201,122,0.25);transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,0.4)}
        .service-card:hover::before{opacity:1}
        .service-icon{width:50px;height:50px;background:var(--jade-pale);border:1px solid rgba(0,201,122,0.2);border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem}
        .service-card h3{font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:var(--white);margin-bottom:0.75rem;letter-spacing:-0.3px}
        .service-card p{font-size:13.5px;color:var(--text2);line-height:1.7}
        .service-tag{display:inline-block;margin-top:1.25rem;font-size:11px;font-weight:600;color:var(--jade);letter-spacing:0.5px;text-transform:uppercase}

        /* features strip */
        .features-strip{padding:5rem 2.5rem;background:var(--surface)}
        .features-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:20px;overflow:hidden;margin-top:3rem}
        .feat-cell{background:var(--card);padding:2rem 1.75rem}
        .feat-cell h4{font-family:'Fraunces',serif;font-size:16px;font-weight:700;color:var(--white);margin-bottom:0.5rem}
        .feat-cell p{font-size:13px;color:var(--text2);line-height:1.65}
        .feat-num{font-family:'Fraunces',serif;font-size:40px;font-weight:700;color:rgba(0,201,122,0.15);line-height:1;margin-bottom:0.5rem}

        /* pricing */
        .pricing-section{padding:5rem 2.5rem;background:var(--deep)}
        .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:3rem}
        .price-card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:2.5rem;position:relative;overflow:hidden}
        .price-card.featured{border-color:rgba(0,201,122,0.3);background:linear-gradient(145deg,var(--card),rgba(0,201,122,0.04))}
        .price-card.featured::before{content:'Most Popular';position:absolute;top:1.25rem;right:1.25rem;background:var(--jade);color:var(--void);font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:20px}
        .price-name{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:1rem}
        .price-amount{font-family:'Fraunces',serif;font-size:44px;font-weight:700;color:var(--white);letter-spacing:-2px;line-height:1}
        .price-period{font-size:13px;color:var(--text3)}
        .price-desc{font-size:13.5px;color:var(--text2);line-height:1.6;margin:1.25rem 0 1.5rem;padding:1.25rem 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
        .price-features{list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:2rem}
        .price-features li{display:flex;gap:10px;font-size:13px;color:var(--text2)}
        .price-features li::before{content:'✓';color:var(--jade);font-weight:700;flex-shrink:0}
        .price-btn{width:100%;padding:13px;border-radius:10px;font-family:'Epilogue',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;border:1px solid var(--line2);background:transparent;color:var(--text)}
        .price-btn:hover{border-color:var(--jade);color:var(--jade)}
        .price-btn.featured-btn{background:var(--jade);color:var(--void);border-color:var(--jade)}
        .price-btn.featured-btn:hover{background:#00e68a;box-shadow:0 8px 24px rgba(0,201,122,0.3)}

        /* ═══ ABOUT PAGE ═══ */
        .about-hero{background:var(--card);border-bottom:1px solid var(--line);padding:5rem 2.5rem 4rem;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;max-width:1100px;margin:0 auto}
        .about-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:3rem}
        .about-stat{background:var(--card2);border:1px solid var(--line);border-radius:16px;padding:1.5rem}
        .about-stat .big{font-family:'Fraunces',serif;font-size:36px;font-weight:700;color:var(--jade);letter-spacing:-1px}
        .about-stat .label{font-size:12.5px;color:var(--text3);margin-top:4px}
        .team-section{padding:5rem 2.5rem}
        .team-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;margin-top:3rem}
        .team-card{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:transform 0.3s,box-shadow 0.3s}
        .team-card:hover{transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,0.4)}
        .team-avatar{height:160px;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:40px;font-weight:700;color:var(--jade);background:var(--jade-pale)}
        .team-info{padding:1.25rem}
        .team-info h4{font-family:'Fraunces',serif;font-size:16px;font-weight:700;color:var(--white);margin-bottom:3px}
        .team-info .role{font-size:12px;color:var(--jade);font-weight:600;letter-spacing:0.3px}
        .team-info p{font-size:12.5px;color:var(--text3);line-height:1.6;margin-top:8px}
        .mission-section{background:var(--surface);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:5rem 2.5rem}
        .mission-inner{max-width:800px;margin:0 auto;text-align:center}
        .mission-quote{font-family:'Fraunces',serif;font-style:italic;font-size:clamp(1.4rem,3vw,2rem);font-weight:300;color:var(--text);line-height:1.6;letter-spacing:-0.3px}
        .mission-quote em{color:var(--jade);font-style:normal}

        /* ═══ RESOURCES PAGE ═══ */
        .resources-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:3rem}
        .resource-card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:2rem;transition:all 0.3s;cursor:pointer}
        .resource-card:hover{border-color:rgba(0,201,122,0.25);transform:translateY(-3px)}
        .resource-tag{font-size:10.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--jade);margin-bottom:0.75rem}
        .resource-card h3{font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:var(--white);margin-bottom:0.75rem;letter-spacing:-0.3px}
        .resource-card p{font-size:13.5px;color:var(--text2);line-height:1.7}
        .resource-meta{margin-top:1.25rem;font-size:12px;color:var(--text3);display:flex;align-items:center;gap:8px}
        .resource-meta::before{content:'';flex:1;height:1px;background:var(--line)}
        .faq-section{margin-top:4rem}
        .faq-item{border-bottom:1px solid var(--line);overflow:hidden}
        .faq-q{padding:1.25rem 0;font-size:15px;font-weight:600;color:var(--text);cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:color 0.2s}
        .faq-q:hover{color:var(--jade)}
        .faq-q .arrow{width:20px;height:20px;border:1px solid var(--line2);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.25s;font-size:11px}
        .faq-q.open{color:var(--jade)}
        .faq-q.open .arrow{background:var(--jade);border-color:var(--jade);color:var(--void);transform:rotate(45deg)}
        .faq-a{max-height:0;overflow:hidden;transition:max-height 0.35s ease,padding 0.25s}
        .faq-a.open{max-height:200px;padding-bottom:1.25rem}
        .faq-a p{font-size:13.5px;color:var(--text2);line-height:1.75}

        /* ═══ CONTACT PAGE ═══ */
        .contact-layout{display:grid;grid-template-columns:1fr 1fr;gap:3rem;max-width:1000px;margin:0 auto}
        .contact-info h2{font-family:'Fraunces',serif;font-size:2.5rem;font-weight:700;color:var(--white);letter-spacing:-1px;margin-bottom:1rem}
        .contact-info p{font-size:15px;color:var(--text2);line-height:1.75;font-weight:300}
        .contact-methods{display:flex;flex-direction:column;gap:1rem;margin-top:2rem}
        .contact-method{display:flex;gap:14px;align-items:flex-start;padding:1.25rem;background:var(--card);border:1px solid var(--line);border-radius:14px}
        .cm-icon{width:40px;height:40px;background:var(--jade-pale);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .cm-label{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:3px}
        .cm-val{font-size:14px;color:var(--text);font-weight:500}
        .contact-form{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:2.5rem}
        .contact-form h3{font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:var(--white);margin-bottom:1.5rem;letter-spacing:-0.3px}
        .submit-btn{width:100%;margin-top:1rem;background:var(--jade);color:var(--void);border:none;border-radius:10px;padding:14px;font-family:'Epilogue',sans-serif;font-size:14.5px;font-weight:700;cursor:pointer;transition:all 0.2s}
        .submit-btn:hover{background:#00e68a;box-shadow:0 10px 30px rgba(0,201,122,0.3);transform:translateY(-1px)}

        /* ═══ TRUST STRIP ═══ */
        .trust-strip{background:var(--deep);border-top:1px solid var(--line);padding:3rem 2.5rem;text-align:center}
        .trust-label{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text3);margin-bottom:2rem}
        .trust-logos{display:flex;justify-content:center;align-items:center;gap:3rem;flex-wrap:wrap}
        .trust-logo{font-family:'Fraunces',serif;font-size:16px;font-weight:700;color:var(--text3);opacity:0.5;letter-spacing:0.5px;transition:opacity 0.2s;cursor:default}
        .trust-logo:hover{opacity:0.9;color:var(--text)}

        /* ═══ FOOTER ═══ */
        .footer{background:var(--void);border-top:1px solid var(--line);padding:4rem 2.5rem 2rem}
        .footer-inner{max-width:1100px;margin:0 auto}
        .footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:3rem;padding-bottom:3rem;border-bottom:1px solid var(--line);margin-bottom:2rem}
        .footer-brand p{font-size:13px;color:var(--text3);line-height:1.7;max-width:280px}
        .footer-col h4{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:1rem}
        .footer-col ul{list-style:none;display:flex;flex-direction:column;gap:8px}
        .footer-col ul li a{font-size:13.5px;color:var(--text2);text-decoration:none;transition:color 0.15s}
        .footer-col ul li a:hover{color:var(--jade)}
        .footer-bottom{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text3)}
        .footer-bottom a{color:var(--text3);text-decoration:none;transition:color 0.15s}
        .footer-bottom a:hover{color:var(--jade)}

        /* ═══ ANIMATIONS ═══ */
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeUp 0.6s ease both}

        /* ═══ MOBILE HORIZONTAL SCROLL SNAP SYSTEM ═══ */
        .mobile-swipe-indicator {
          display: none;
        }

        @media (max-width: 600px) {
          .mobile-swipe-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            color: var(--jade);
            letter-spacing: 0.5px;
            margin-bottom: 1rem;
            text-transform: uppercase;
            font-weight: 600;
          }

          .mobile-scroll-snap {
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            scroll-snap-type: x mandatory !important;
            -webkit-overflow-scrolling: touch !important;
            gap: 14px !important;
            padding: 0.5rem 1.25rem 1.5rem 1.25rem !important;
            margin-left: -1.25rem !important;
            margin-right: -1.25rem !important;
            scrollbar-width: none;
          }
          .mobile-scroll-snap::-webkit-scrollbar {
            display: none;
          }

          .mobile-snap-item {
            flex: 0 0 82% !important;
            max-width: 82% !important;
            scroll-snap-align: center !important;
            scroll-snap-stop: normal !important;
            box-sizing: border-box !important;
          }

          .steps-connector-line {
            display: none !important;
          }

          .steps-mobile-card {
            background: var(--card);
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 1.75rem 1.25rem;
            text-align: center;
          }
        }

        /* ═══ RESPONSIVE ═══ */
        @media(max-width:900px){
          .verify-layout,.about-hero,.contact-layout{grid-template-columns:1fr}
          .services-grid,.features-grid,.pricing-grid,.team-grid,.resources-grid{grid-template-columns:1fr 1fr}
          .footer-top{grid-template-columns:1fr 1fr}
          .form-grid{grid-template-columns:1fr}
          .checks{grid-template-columns:1fr}
          .stats-bar{flex-wrap:wrap;gap:1rem}
          .stat-item{border-right:none;border-bottom:1px solid var(--line);padding:1rem 2rem;width:50%}
        }
        @media(max-width:600px){
          .services-grid,.features-grid,.pricing-grid,.team-grid,.resources-grid,.footer-top{grid-template-columns:1fr}
          nav{padding:0 1rem}
          .menu-toggle{display:flex}
          .nav-tabs{display:${mobileNavOpen ? 'flex' : 'none'};position:absolute;top:68px;left:0;right:0;background:var(--card);border-bottom:1px solid var(--line);flex-direction:column;padding:0.5rem 0;z-index:499;box-shadow:0 20px 40px rgba(0,0,0,0.4)}
          .nav-tab{height:auto;padding:14px 1.5rem;border-bottom:1px solid var(--line);width:100%}
          .nav-right .btn-ghost{display:none !important}
          .nav-mobile-actions{display:flex;flex-direction:column;gap:8px;padding:1rem 1.5rem;border-top:1px solid var(--line);margin-top:0.5rem}
          .nav-mobile-actions a{width:100%;text-align:center;text-decoration:none;padding:12px;border-radius:8px;font-family:'epilogue',sans-serif;font-size:14px;font-weight:600;cursor:pointer}
          .topbar{flex-direction:column;align-items:center;gap:5px;padding:10px 1rem;text-align:center}
          .topbar-left{flex-direction:column;gap:4px;align-items:center}
        }
      `}</style>

      {/* CURSOR */}
      <div className="cursor" style={{ left: cursorPos.x, top: cursorPos.y }} />
      <div className="cursor-ring" style={{ left: ringPos.x, top: ringPos.y }} />

      {/* FIXED HEADER WRAPPER */}
      <div className="header-fixed-wrap">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-left">
            <span style={{ color: 'var(--jade)', fontWeight: 600 }}>National Drug Safety Initiative</span>
            <span style={{ opacity: 0.35 }}>|</span>
            <span>Aligned with NAFDAC Greenbook Guidelines</span>
          </div>
          <div>Verified Dispensary Standards · PSN Aligned</div>
        </div>

        {/* NAV */}
        <nav>
          <button className="menu-toggle" onClick={() => setMobileNavOpen(!mobileNavOpen)} title="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div
            onClick={() => showPage('home')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '11px',
              cursor: 'pointer',
              userSelect: 'none',
              textDecoration: 'none'
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                background: 'linear-gradient(180deg, #14281d 0%, #0b1711 100%)',
                border: '1.2px solid rgba(0, 201, 122, 0.55)',
                borderRadius: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0, 201, 122, 0.18)',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
                <path d="M12 2.5 L20 5.5 V12.5 C20 17.5 16.5 20.8 12 22 C7.5 20.8 4 17.5 4 12.5 V5.5 Z" stroke="rgba(0,201,122,0.4)" strokeWidth="1.4" />
                <path d="M12 7 V16 M7.5 11.5 H16.5" stroke="#00c97a" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="12" cy="11.5" r="1.8" fill="#00e68a" />
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontFamily: "'Epilogue', sans-serif", fontSize: '21px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
                Pharma
              </span>
              <span style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: '24px', fontWeight: 700, color: '#00c97a', letterSpacing: '-0.2px', marginLeft: '1px' }}>
                Verify
              </span>
              <span style={{ fontFamily: "'Epilogue', sans-serif", fontSize: '8.5px', fontWeight: 800, letterSpacing: '0.8px', color: '#00c97a', background: 'rgba(0,201,122,0.08)', border: '1px solid rgba(0,201,122,0.3)', borderRadius: '4px', padding: '2px 5px', marginLeft: '6px', lineHeight: 1 }}>
                NG
              </span>
            </div>
          </div>

          <div className={`nav-tabs ${mobileNavOpen ? 'mobile-open' : ''}`}>
            <div className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => showPage('home')}>Home</div>
            <div className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`} onClick={() => showPage('about')}>About Us</div>
            <div className={`nav-tab ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => showPage('resources')}>Resources</div>
            <div className={`nav-tab ${activeTab === 'contact' ? 'active' : ''}`} onClick={() => showPage('contact')}>Contact</div>

            <div className="nav-mobile-actions">
              <Link href="/signup" style={{ border: '1px solid var(--line2)', color: 'var(--text2)', background: 'transparent' }}>Sign Up</Link>
              <Link href="/signin" style={{ border: '1px solid var(--jade)', color: 'var(--jade)', background: 'transparent' }}>Sign In</Link>
            </div>
          </div>

          <div className="nav-right">
            <Link href="/signup" className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>Sign Up</Link>
            <Link href="/signin" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
              Sign In
            </Link>
          </div>
        </nav>
      </div>

      {/* ════════════════════════ PAGE: HOME ════════════════════════ */}
      <div className={`page ${activeTab === 'home' ? 'active' : ''}`}>
        <div className="hero">
          {/* 4-Scene Pharmaceutical Background Slideshow */}
          <div className="hero-slides-wrapper">
            <div
              className={`hero-slide ${heroSlide === 0 ? 'active' : ''}`}
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1586015555751-63c20994301a?q=80&w=1600&auto=format&fit=crop')` }}
            />
            <div
              className={`hero-slide ${heroSlide === 1 ? 'active' : ''}`}
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=1600&auto=format&fit=crop')` }}
            />
            <div
              className={`hero-slide ${heroSlide === 2 ? 'active' : ''}`}
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1471864190281-a93a3070b6de?q=80&w=1600&auto=format&fit=crop')` }}
            />
            <div
              className={`hero-slide ${heroSlide === 3 ? 'active' : ''}`}
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1579165466741-7f35e4755660?q=80&w=1600&auto=format&fit=crop')` }}
            />
          </div>

          <div className="hero-bg"></div>
          <div className="hero-grid"></div>

          <div className="hero-content">
            <div className="hero-kicker">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              Pharmaceutical Safety Authority
            </div>
            <h1>Drug Verification<br />You Can <em>Trust</em></h1>
            <p className="hero-sub" style={{ marginBottom: 0 }}>
              PharmaVerify<sup style={{ fontSize: '10px', verticalAlign: 'super' }}>NG</sup> cross-checks medication details, NAFDAC registration alignment, and storage conditions with clinical intelligence.
            </p>
          </div>

          <div className="hero-scroll" style={{ cursor: 'pointer' }} onClick={() => {
            const el = document.querySelector('.stats-bar');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>
            <div className="hero-scroll-line"></div>
            Explore
          </div>
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-num">98.4%</div>
            <div className="stat-label">Verification accuracy</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">2M+</div>
            <div className="stat-label">Drugs checked</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">50+</div>
            <div className="stat-label">Partner hospitals</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">&lt;5s</div>
            <div className="stat-label">Average check time</div>
          </div>
        </div>

        {/* WHY PHARMAVERIFY */}
        <section style={{ background: 'var(--deep)' }}>
          <div className="section-inner">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
              <div>
                <div className="section-kicker">Why PharmaVerify<sup style={{ fontSize: '10px', verticalAlign: 'super' }}>NG</sup></div>
                <h2 className="section-title">Counterfeit drugs are<br />a silent epidemic</h2>
                <p className="section-sub">Over 100,000 deaths occur annually due to substandard and counterfeit medicines in Africa. PharmaVerify<sup style={{ fontSize: '10px', verticalAlign: 'super' }}>NG</sup> gives patients, pharmacies, and healthcare providers an immediate, intelligent layer of verification.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2.5rem' }}>
                  <div style={{ padding: '1.5rem', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14 }}>
                    <div style={{ fontFamily: 'Fraunces', fontSize: '28px', fontWeight: 700, color: 'var(--blood)' }}>1 in 10</div>
                    <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: 4 }}>medicines in developing countries are substandard</div>
                  </div>
                  <div style={{ padding: '1.5rem', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14 }}>
                    <div style={{ fontFamily: 'Fraunces', fontSize: '28px', fontWeight: 700, color: 'var(--ember)' }}>$200B</div>
                    <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: 4 }}>annual global market for counterfeit pharmaceuticals</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '1.5rem', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--jade-pale)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>NAFDAC &amp; Regulatory Alignment</div>
                    <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6 }}>Validates NAFDAC registration numbers (NRN) and ensures the drug name and licensed manufacturer match official databases.</div>
                  </div>
                </div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '1.5rem', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--jade-pale)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>Condition &amp; Integrity Analysis</div>
                    <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6 }}>Evaluates physical tablet/liquid state, packaging integrity, storage temperature suitability, and observed degradation signs.</div>
                  </div>
                </div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '1.5rem', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--jade-pale)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>Instant Safety Assessment</div>
                    <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6 }}>Receive a clear safety status, numerical safety score, specific risk findings, and actionable pharmacist recommendations.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ PROCESS WITH BLURRED ROTATING BACKDROP & DUAL-DEVICE 3D SHOWCASE ═══ */}
        <section className="process-stage-section">
          {/* Blurred Rotating Pharmaceutical Backdrop */}
          <div className="process-backdrop-slides">
            <div
              className={`process-bg-slide ${activeStep === 1 ? 'active' : ''}`}
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1586015555751-63c20994301a?q=80&w=1600&auto=format&fit=crop')` }}
            />
            <div
              className={`process-bg-slide ${activeStep === 2 ? 'active' : ''}`}
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=1600&auto=format&fit=crop')` }}
            />
            <div
              className={`process-bg-slide ${activeStep === 3 ? 'active' : ''}`}
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1471864190281-a93a3070b6de?q=80&w=1600&auto=format&fit=crop')` }}
            />
            <div
              className={`process-bg-slide ${activeStep === 4 ? 'active' : ''}`}
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1579165466741-7f35e4755660?q=80&w=1600&auto=format&fit=crop')` }}
            />
          </div>

          <div className="process-vignette" />

          <div className="section-inner" style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div className="section-kicker">Multi-Device Clinical Verification</div>
              <h2 className="section-title" style={{ margin: '0 auto' }}>How Verification Works</h2>
              <div className="mobile-swipe-indicator">Swipe steps ↔</div>
            </div>

            {/* 4 Interactive Steps with 6s Sync */}
            <div className="mobile-scroll-snap" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, position: 'relative' }}>
              <div className="steps-connector-line" style={{ position: 'absolute', top: 28, left: '12.5%', right: '12.5%', height: 1, background: 'linear-gradient(90deg,var(--jade),rgba(0,201,122,0.2))', zIndex: 0 }}></div>

              <div
                className={`mobile-snap-item steps-mobile-card step-node ${activeStep === 1 ? 'active' : ''}`}
                onClick={() => triggerStepChange(1)}
                style={{ textAlign: 'center', padding: '0 1rem', position: 'relative', zIndex: 1 }}
              >
                <div className="step-circle">1</div>
                <h4 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700, color: 'var(--white)', marginBottom: '0.5rem' }}>Enter Details</h4>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>Input the drug name, manufacturer, expiry, and NAFDAC number.</p>
              </div>

              <div
                className={`mobile-snap-item steps-mobile-card step-node ${activeStep === 2 ? 'active' : ''}`}
                onClick={() => triggerStepChange(2)}
                style={{ textAlign: 'center', padding: '0 1rem', position: 'relative', zIndex: 1 }}
              >
                <div className="step-circle">2</div>
                <h4 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700, color: 'var(--white)', marginBottom: '0.5rem' }}>Describe Condition</h4>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>Check observed packaging, seals, and visual discoloration.</p>
              </div>

              <div
                className={`mobile-snap-item steps-mobile-card step-node ${activeStep === 3 ? 'active' : ''}`}
                onClick={() => triggerStepChange(3)}
                style={{ textAlign: 'center', padding: '0 1rem', position: 'relative', zIndex: 1 }}
              >
                <div className="step-circle">3</div>
                <h4 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700, color: 'var(--white)', marginBottom: '0.5rem' }}>AI Analysis</h4>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>System cross-checks NAFDAC registry and storage parameters.</p>
              </div>

              <div
                className={`mobile-snap-item steps-mobile-card step-node ${activeStep === 4 ? 'active' : ''}`}
                onClick={() => triggerStepChange(4)}
                style={{ textAlign: 'center', padding: '0 1rem', position: 'relative', zIndex: 1 }}
              >
                <div className="step-circle">4</div>
                <h4 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700, color: 'var(--white)', marginBottom: '0.5rem' }}>Get Report</h4>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>Receive a verified safety score and clinical pharmacist guidance.</p>
              </div>
            </div>

            {/* DUAL DEVICES ROW (STACKS VERTICALLY ON MOBILE SO PHONE IS FULLY VISIBLE) */}
            <div className="dual-devices-row">
              {/* LEFT: 3D DANCING SMARTPHONE */}
              <div 
                className="stage-phone-perspective"
                onMouseMove={(e) => handleDeviceMove(e, setPhoneTilt, 18)}
                onMouseLeave={() => handleDeviceLeave(setPhoneTilt)}
              >
                <div 
                  className={`stage-phone-wrapper ${!phoneTilt.active && !isSpinning ? 'floating' : ''} ${isSpinning ? 'spinning' : ''}`}
                  style={{
                    transform: phoneTilt.active && !isSpinning
                      ? `rotateX(${phoneTilt.x}deg) rotateY(${phoneTilt.y}deg) translateZ(18px) scale(1.03)`
                      : undefined,
                  }}
                >
                  <div className="stage-phone-inner">
                    <div className="stage-phone-notch"></div>

                    {activeStep === 1 && (
                      <div className="screen-fade">
                        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--jade)', letterSpacing: 1, marginBottom: 8 }}>
                          Step 1 · Mobile Scan
                        </div>
                        <div style={{ background: '#0e1812', border: '1px solid var(--line)', borderRadius: 9, padding: '7px 9px', marginBottom: 7 }}>
                          <div style={{ fontSize: 9, color: 'var(--text3)' }}>DRUG NAME</div>
                          <div style={{ fontSize: 11.5, color: '#fff', fontWeight: 600 }}>Emzor Paracetamol 500mg</div>
                        </div>
                        <div style={{ background: '#0e1812', border: '1px solid var(--line)', borderRadius: 9, padding: '7px 9px', marginBottom: 7 }}>
                          <div style={{ fontSize: 9, color: 'var(--text3)' }}>NAFDAC REG (NRN)</div>
                          <div style={{ fontSize: 11.5, color: 'var(--jade)', fontWeight: 700 }}>04-5808</div>
                        </div>
                        <div style={{ background: '#0e1812', border: '1px solid var(--line)', borderRadius: 9, padding: '7px 9px', marginBottom: 10 }}>
                          <div style={{ fontSize: 9, color: 'var(--text3)' }}>BATCH NO</div>
                          <div style={{ fontSize: 11.5, color: '#fff' }}>EMZ-2024-B12</div>
                        </div>
                        <div style={{ marginTop: 'auto', background: 'var(--jade)', color: '#040a06', borderRadius: 8, padding: '7px', textAlign: 'center', fontSize: 11, fontWeight: 700 }}>
                          Next: Inspection →
                        </div>
                      </div>
                    )}

                    {activeStep === 2 && (
                      <div className="screen-fade">
                        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--jade)', letterSpacing: 1, marginBottom: 8 }}>
                          Step 2 · Condition
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                          {[
                            'Factory seal intact',
                            'Blister unbroken',
                            'Color uniform',
                            'Room temperature ok',
                          ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0e1812', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--line)' }}>
                              <span style={{ color: 'var(--jade)', fontSize: 10, fontWeight: 800 }}>✓</span>
                              <span style={{ fontSize: 10.5, color: 'var(--text2)' }}>{item}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 'auto', background: 'var(--jade)', color: '#040a06', borderRadius: 8, padding: '7px', textAlign: 'center', fontSize: 11, fontWeight: 700 }}>
                          Run Analysis ⚡
                        </div>
                      </div>
                    )}

                    {activeStep === 3 && (
                      <div className="screen-fade" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px dashed var(--jade)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 8s linear infinite', marginBottom: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--jade-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                            🔬
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                          Cross-Referencing...
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4, maxWidth: 170 }}>
                          Matching NRN against official NAFDAC database.
                        </div>
                      </div>
                    )}

                    {activeStep === 4 && (
                      <div className="screen-fade">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ background: 'rgba(0,201,122,0.15)', color: 'var(--jade)', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 10 }}>
                            ● SAFE
                          </span>
                          <span style={{ fontSize: 9, color: 'var(--text3)' }}>Mobile Verified</span>
                        </div>
                        <div style={{ fontFamily: 'Fraunces', fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                          Emzor Paracetamol
                        </div>
                        <div style={{ background: '#0e1812', border: '1px solid var(--line)', borderRadius: 10, padding: '8px', textAlign: 'center', margin: '6px 0' }}>
                          <div style={{ fontSize: 8.5, color: 'var(--text3)' }}>SAFETY SCORE</div>
                          <div style={{ fontFamily: 'Fraunces', fontSize: 24, fontWeight: 800, color: 'var(--jade)', lineHeight: 1.1 }}>
                            98<span style={{ fontSize: 10, color: 'var(--text3)' }}>/100</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', lineHeight: 1.4, background: 'rgba(0,201,122,0.06)', padding: '5px 7px', borderRadius: 6 }}>
                          ✓ Genuine formulation.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: WIDESCREEN TABLET / PC */}
              <div 
                className="stage-laptop-perspective"
                onMouseMove={(e) => handleDeviceMove(e, setLaptopTilt, 12)}
                onMouseLeave={() => handleDeviceLeave(setLaptopTilt)}
              >
                <div 
                  className="stage-laptop-wrapper"
                  style={{
                    transform: laptopTilt.active
                      ? `rotateX(${laptopTilt.x}deg) rotateY(${laptopTilt.y}deg) translateZ(15px) scale(1.02)`
                      : 'rotateX(0deg) rotateY(0deg)',
                  }}
                >
                  <div className="stage-laptop-screen">
                    <div className="laptop-topbar">
                      <div className="laptop-dot" style={{ background: '#ef4444' }} />
                      <div className="laptop-dot" style={{ background: '#f59e0b' }} />
                      <div className="laptop-dot" style={{ background: '#00c97a' }} />
                      <div style={{ marginLeft: 8, fontSize: 9.5, color: 'var(--text3)', fontFamily: 'monospace' }}>
                        portal.pharmaverify.ng/verify?step={activeStep}
                      </div>
                    </div>

                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--jade)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#000', fontWeight: 800 }}>
                            PV
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Clinical Workspace</span>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--jade)', background: 'rgba(0,201,122,0.1)', padding: '3px 10px', borderRadius: 12, fontWeight: 700 }}>
                          Active Registry Node
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12, flex: 1 }}>
                        <div style={{ background: '#0e1812', borderRadius: 10, padding: 12, border: '1px solid var(--line)' }}>
                          <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                            Registry Verification
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Emzor Paracetamol 500mg</div>
                          <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 3 }}>Manufacturer: Emzor Pharmaceuticals Ltd.</div>
                          <div style={{ fontSize: 10.5, color: 'var(--jade)', marginTop: 5, fontWeight: 600 }}>NRN: 04-5808 · Validated</div>
                        </div>

                        <div style={{ background: '#0e1812', borderRadius: 10, padding: 12, border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase' }}>Safety Score</div>
                          <div style={{ fontFamily: 'Fraunces', fontSize: 30, fontWeight: 800, color: 'var(--jade)', lineHeight: 1.1 }}>
                            {activeStep === 4 ? '98' : activeStep === 3 ? '...' : '95+'}
                          </div>
                          <div style={{ fontSize: 9.5, color: 'var(--text3)', marginTop: 2 }}>Pharmacopeia Standard</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text3)' }}>
                        <span style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: 6 }}>✓ Packaging Sealed</span>
                        <span style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: 6 }}>✓ Exp: 2027</span>
                        <span style={{ background: 'rgba(0,201,122,0.1)', color: 'var(--jade)', padding: '4px 10px', borderRadius: 6 }}>● WHO GMP Aligned</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CENTERED BUTTON ANCHORED UNDERNEATH BOTH DEVICES */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginTop: '1.5rem', position: 'relative', zIndex: 2 }}>
              <button
                className="btn-primary"
                style={{
                  padding: '16px 36px',
                  fontSize: 15,
                  borderRadius: 12,
                  boxShadow: '0 8px 28px rgba(0,201,122,0.35)',
                  minWidth: 240,
                }}
                onClick={() => showPage('verify')}
              >
                Try It Now — It&apos;s Free →
              </button>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 8 }}>
                Instant verification on <strong style={{ color: 'var(--text2)' }}>Mobile, Tablet &amp; Desktop</strong>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <div className="trust-strip">
          <div className="trust-label">Aligned with healthcare standards across Africa</div>
          <div className="trust-logos">
            <div className="trust-logo">NAFDAC</div>
            <div className="trust-logo">WHO Africa</div>
            <div className="trust-logo">NMA Nigeria</div>
            <div className="trust-logo">LUTH</div>
            <div className="trust-logo">UCH Ibadan</div>
            <div className="trust-logo">PSN</div>
          </div>
        </div>
      </div>

      {/* ════════════════════════ PAGE: VERIFY ════════════════════════ */}
      <div className={`page ${activeTab === 'verify' ? 'active' : ''}`}>
        <section>
          <div className="verify-layout">
            <div className="form-panel">
              <div className="panel-head">
                <div className="panel-head-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                </div>
                <div>
                  <h2>Drug Verification Form</h2>
                  <p>Complete all fields for the most accurate assessment</p>
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Drug / Medication Name *</label>
                  <input type="text" placeholder="e.g. Paracetamol 500mg" value={drugName} onChange={(e) => setDrugName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Manufacturer / Brand</label>
                  <input type="text" placeholder="e.g. Emzor, GSK, Pfizer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
                </div>
                <div className="field">
                  <label>NAFDAC Registration Number (NRN)</label>
                  <input type="text" placeholder="e.g. 04-5808 or A4-0123" value={nafdacNum} onChange={(e) => setNafdacNum(e.target.value)} />
                </div>
                <div className="field">
                  <label>Batch / Lot Number (Optional)</label>
                  <input type="text" placeholder="e.g. BTX-2023-441" value={batchNum} onChange={(e) => setBatchNum(e.target.value)} />
                </div>
                <div className="field">
                  <label>Expiry Date</label>
                  <input type="month" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Storage Condition</label>
                  <select value={storageTemp} onChange={(e) => setStorageTemp(e.target.value)}>
                    <option value="">Select storage type</option>
                    <option value="room">Room temperature (15–25°C)</option>
                    <option value="cool">Cool / Dry (8–15°C)</option>
                    <option value="refrigerated">Refrigerated (2–8°C)</option>
                    <option value="frozen">Frozen (below 0°C)</option>
                    <option value="hot">Exposed to heat / sunlight</option>
                    <option value="humid">Humid environment</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div className="field">
                  <label>Packaging Condition</label>
                  <select value={packaging} onChange={(e) => setPackaging(e.target.value)}>
                    <option value="">Select condition</option>
                    <option value="intact">Intact & factory sealed</option>
                    <option value="opened">Opened but undamaged</option>
                    <option value="damaged">Damaged / torn / wet</option>
                    <option value="repackaged">Repackaged / suspicious</option>
                    <option value="missing">No packaging / loose</option>
                  </select>
                </div>
                <div className="field">
                  <label>Drug Form</label>
                  <select value={drugForm} onChange={(e) => setDrugForm(e.target.value)}>
                    <option value="">Select form</option>
                    <option value="tablet">Tablet / Capsule</option>
                    <option value="liquid">Liquid / Syrup</option>
                    <option value="injection">Injection / Ampoule</option>
                    <option value="cream">Cream / Ointment</option>
                    <option value="powder">Powder / Sachet</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field full">
                  <label>Source of Acquisition</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)}>
                    <option value="">Where was it purchased?</option>
                    <option value="pharmacy">Licensed pharmacy</option>
                    <option value="hospital">Hospital / clinic</option>
                    <option value="market">Open market / hawker</option>
                    <option value="online">Online store</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field full">
                  <label>Visual Observations</label>
                  <textarea placeholder="Describe any changes — discoloration, unusual smell, crumbling tablets, cloudiness in liquid, mold, unexpected taste, cracks, etc." value={observations} onChange={(e) => setObservations(e.target.value)}></textarea>
                </div>
              </div>
              <div className="divider">Observed Warning Signs (check all that apply)</div>
              <div className="checks">
                {[
                  { id: 'discolored', label: 'Unusual / changed color' },
                  { id: 'smell', label: 'Strange or foul odor' },
                  { id: 'texture', label: 'Changed texture / crumbling' },
                  { id: 'cloudy', label: 'Cloudy liquid / particles' },
                  { id: 'mold', label: 'Mold or fungal growth' },
                  { id: 'leaking', label: 'Leaking or broken seal' },
                  { id: 'label', label: 'Label damaged or missing' },
                  { id: 'counterfeit', label: 'Suspected counterfeit' },
                  { id: 'wrong_size', label: 'Unusual pill size/shape' },
                  { id: 'none', label: 'None observed' },
                ].map((item) => (
                  <label key={item.id} className="check-box">
                    <input type="checkbox" checked={warnings.includes(item.id)} onChange={() => handleWarningToggle(item.id)} />
                    {item.label}
                  </label>
                ))}
              </div>
              <button className="verify-btn" onClick={runVerification} disabled={loading}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {loading ? 'Analysing...' : 'Run Verification Analysis'}
              </button>
            </div>

            {/* SIDEBAR */}
            <div className="sidebar">
              {errorMsg && (
                <div className="error-box">
                  <strong>Verification failed.</strong><br />
                  Check your connection and try again.<br />
                  <small style={{ opacity: 0.6 }}>{errorMsg}</small>
                </div>
              )}

              {!result && !errorMsg && (
                <div className="result-placeholder">
                  <div className="ph-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3>Awaiting Submission</h3>
                  <p>Complete the form and click <strong style={{ color: 'var(--jade)' }}>Run Verification</strong> to receive your AI-powered safety report.</p>
                </div>
              )}

              {result && (
                <div className="result-card">
                  <div className={`result-top ${statusMap[result.status]?.cls || ''}`}>
                    <div className="result-status-row">
                      <span className={`status-chip ${statusMap[result.status]?.chip || ''}`}>
                        <span className={`chip-dot ${statusMap[result.status]?.dot || ''}`}></span>
                        {statusMap[result.status]?.label || result.status}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'Epilogue' }}>AI Assessment</span>
                    </div>
                    <div className="result-drug-name">{verifiedDrug}</div>
                    <div className="score-section">
                      <div className="score-meta">
                        <span>Safety Score</span>
                        <span style={{ fontFamily: 'Fraunces', fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>{result.safetyScore}<span style={{ fontSize: 11, fontFamily: 'Epilogue', color: 'var(--text3)' }}>/100</span></span>
                      </div>
                      <div className="score-track">
                        <div className="score-fill" style={{ width: `${result.safetyScore}%`, background: statusMap[result.status]?.bar || '#00c97a' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="result-body">
                    <div className="r-section">
                      <h4>Assessment</h4>
                      <p>{result.summary || 'No summary provided.'}</p>
                    </div>
                    {result.flags && result.flags.length > 0 && (
                      <div className="r-section">
                        <h4>Key Findings</h4>
                        <ul className="flag-list">
                          {result.flags.map((f, i) => (
                            <li key={i} className="flag-row">
                              <div className={`flag-ico fi-${f.type}`}>{f.type === 'ok' ? '✓' : f.type === 'bad' ? '✕' : '!'}</div>
                              <span>{f.message}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="r-section">
                      <h4>Recommendation</h4>
                      <p>{result.recommendation || 'Consult a pharmacist.'}</p>
                    </div>
                    {result.proTip && <div className="pro-tip-box">{result.proTip}</div>}
                  </div>
                </div>
              )}

              <div className="info-widget">
                <h3>What We Assess</h3>
                <ul className="check-list">
                  <li><div className="cl-num">1</div><span>NAFDAC registration &amp; manufacturer alignment</span></li>
                  <li><div className="cl-num">2</div><span>Expiry validity — expired or approaching end-of-life</span></li>
                  <li><div className="cl-num">3</div><span>Temperature &amp; storage suitability</span></li>
                  <li><div className="cl-num">4</div><span>Packaging integrity &amp; tamper evidence</span></li>
                  <li><div className="cl-num">5</div><span>Physical appearance — color, odor, texture</span></li>
                  <li><div className="cl-num">6</div><span>Acquisition source risk assessment</span></li>
                </ul>
              </div>
              <div className="warn-box">
                <strong>⚠ Educational Tool</strong>
                Results are informational and not a substitute for professional medical advice. Always consult a licensed pharmacist or physician before using any medication.
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ════════════════════════ PAGE: SERVICES ════════════════════════ */}
      <div className={`page ${activeTab === 'services' ? 'active' : ''}`}>
        <div className="services-hero">
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div className="section-kicker">What We Offer</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(2.5rem,5vw,4rem)', maxWidth: 600 }}>Comprehensive Pharmaceutical Safety Services</h1>
            <p className="section-sub">From individual NAFDAC verification to enterprise pharmacy compliance systems, PharmaVerify<sup style={{ fontSize: '10px', verticalAlign: 'super' }}>NG</sup> provides a full suite of pharmaceutical safety tools.</p>
          </div>
        </div>
        <section style={{ background: 'var(--deep)' }}>
          <div className="section-inner">
            <div className="mobile-swipe-indicator">Swipe services ↔</div>
            <div className="services-grid mobile-scroll-snap">
              <div className="service-card mobile-snap-item">
                <div className="service-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div>
                <h3>Drug Safety Verification</h3>
                <p>Submit medication details and receive an instant AI-powered safety score covering NAFDAC registry alignment, expiry, storage, and packaging condition.</p>
                <div className="service-tag">Free · Instant</div>
              </div>
              <div className="service-card mobile-snap-item">
                <div className="service-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg></div>
                <h3>Registry Verification API</h3>
                <p>Integrate our verification engine into your pharmacy or hospital management system via REST API to automatically cross-check medications with regulatory registries.</p>
                <div className="service-tag">Enterprise · API</div>
              </div>
              <div className="service-card mobile-snap-item">
                <div className="service-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg></div>
                <h3>Regulatory Compliance Reports</h3>
                <p>Generate official pharmaceutical compliance documentation aligned with NAFDAC, WHO, and international pharmacovigilance standards.</p>
                <div className="service-tag">Professional · PDF Reports</div>
              </div>
              <div className="service-card mobile-snap-item">
                <div className="service-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6" /></svg></div>
                <h3>Pharmacy Inventory Insights</h3>
                <p>Monitor dispensary safety and inventory integrity with real-time analytics, expiry tracking, and automated alerts for at-risk stock.</p>
                <div className="service-tag">Dashboard · Analytics</div>
              </div>
              <div className="service-card mobile-snap-item">
                <div className="service-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg></div>
                <h3>Counterfeit Risk Detection</h3>
                <p>Advanced AI pattern recognition identifies potential counterfeit indicators by cross-referencing packaging anomalies, mislabeled strengths, and NAFDAC registry mismatches.</p>
                <div className="service-tag">AI-Powered · Advanced</div>
              </div>
              <div className="service-card mobile-snap-item">
                <div className="service-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg></div>
                <h3>Training &amp; Certification</h3>
                <p>Equip your dispensary team with pharmaceutical safety training programs, including visual inspection techniques and regulatory counterfeit awareness.</p>
                <div className="service-tag">Training · Certification</div>
              </div>
            </div>
          </div>
        </section>

        <div className="features-strip">
          <div className="section-inner">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div className="section-kicker">Platform Capabilities</div>
              <h2 className="section-title" style={{ margin: '0 auto' }}>Built for Precision</h2>
            </div>
            <div className="features-grid">
              <div className="feat-cell"><div className="feat-num">01</div><h4>AI-Powered</h4><p>High-precision neural analysis trained on pharmaceutical safety data and clinical guidelines.</p></div>
              <div className="feat-cell"><div className="feat-num">02</div><h4>NAFDAC Aligned</h4><p>All assessments reference Nigerian and international pharmaceutical regulatory standards.</p></div>
              <div className="feat-cell"><div className="feat-num">03</div><h4>Audit Trail</h4><p>Every verification is logged with timestamps for compliance and personal health records.</p></div>
              <div className="feat-cell"><div className="feat-num">04</div><h4>Multi-language</h4><p>Educational materials and guidance available in English, French, and Hausa.</p></div>
            </div>
          </div>
        </div>

        <div className="pricing-section" id="pricing">
          <div className="section-inner">
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div className="section-kicker">Pricing</div>
              <h2 className="section-title" style={{ margin: '0 auto' }}>Simple, Transparent Plans</h2>
              <p className="section-sub" style={{ margin: '0.75rem auto 0', textAlign: 'center', maxWidth: 400 }}>Start free. Scale as you grow. No hidden fees.</p>
              <div className="mobile-swipe-indicator">Swipe plans ↔</div>
            </div>
            <div className="pricing-grid mobile-scroll-snap">
              <div className="price-card mobile-snap-item">
                <div className="price-name">Starter</div>
                <div className="price-amount">Free<span className="price-period" style={{ fontSize: 16, fontFamily: 'Epilogue' }}> forever</span></div>
                <div className="price-desc">For individuals and patients verifying personal medications.</div>
                <ul className="price-features">
                  <li>20 verifications per month</li>
                  <li>Basic safety report</li>
                  <li>NAFDAC number &amp; condition check</li>
                  <li>Email support</li>
                </ul>
                <button className="price-btn" onClick={() => showPage('verify')}>Get Started →</button>
              </div>
              <div className="price-card featured mobile-snap-item">
                <div className="price-name">Professional</div>
                <div className="price-amount">₦15,000<span className="price-period">/month</span></div>
                <div className="price-desc">For community pharmacies and healthcare clinics running frequent checks.</div>
                <ul className="price-features">
                  <li>Unlimited verifications</li>
                  <li>Full AI safety report + PDF</li>
                  <li>NAFDAC registry cross-matching</li>
                  <li>Drug interaction checker tool</li>
                  <li>Priority support</li>
                </ul>
                <button className="price-btn featured-btn">Start Free Trial →</button>
              </div>
              <div className="price-card mobile-snap-item">
                <div className="price-name">Enterprise</div>
                <div className="price-amount">Custom</div>
                <div className="price-desc">For hospitals, pharmaceutical distributors, and regulatory bodies requiring API access.</div>
                <ul className="price-features">
                  <li>REST API access</li>
                  <li>White-label reports</li>
                  <li>Regulatory compliance docs</li>
                  <li>Dedicated account manager</li>
                  <li>SLA guarantee</li>
                </ul>
                <button className="price-btn" onClick={() => showPage('contact')}>Contact Sales →</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════ PAGE: ABOUT ════════════════════════ */}
      <div className={`page ${activeTab === 'about' ? 'active' : ''}`}>
        <section style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)' }}>
          <div className="about-hero" style={{ padding: 0 }}>
            <div>
              <div className="section-kicker">Our Story</div>
              <h1 className="section-title" style={{ fontSize: 'clamp(2.2rem,5vw,3.8rem)' }}>Born from a crisis.<br />Built for protection.</h1>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, fontWeight: 300, marginTop: '1rem' }}>PharmaVerify<sup style={{ fontSize: '10px', verticalAlign: 'super' }}>NG</sup> was founded in 2021 after witnessing first-hand the devastating impact of substandard and counterfeit medicines in Nigerian healthcare. Our mission is simple: make pharmaceutical verification accessible to everyone.</p>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, fontWeight: 300, marginTop: '1rem' }}>Today, we work with over 50 healthcare institutions, process millions of verifications annually, and are expanding across Sub-Saharan Africa.</p>
            </div>
            <div className="about-stat-grid">
              <div className="about-stat"><div className="big">2021</div><div className="label">Founded in Lagos, Nigeria</div></div>
              <div className="about-stat"><div className="big">50+</div><div className="label">Partner institutions</div></div>
              <div className="about-stat"><div className="big">2M+</div><div className="label">Verifications completed</div></div>
              <div className="about-stat"><div className="big">12</div><div className="label">Countries served</div></div>
            </div>
          </div>
        </section>
        <div className="mission-section">
          <div className="mission-inner">
            <div className="section-kicker" style={{ textAlign: 'center' }}>Our Mission</div>
            <p className="mission-quote">&ldquo;Every person deserves to know that the medicine they take is <em>safe, genuine, and effective</em>. We exist to make that certainty universally accessible.&rdquo;</p>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: '1.5rem' }}>— Leadership Team, PharmaVerify NG</p>
          </div>
        </div>
        <div className="team-section">
          <div className="section-inner">
            <div className="section-kicker">The Team</div>
            <h2 className="section-title">People Behind PharmaVerify<sup style={{ fontSize: '10px', verticalAlign: 'super' }}>NG</sup></h2>
            <div className="team-grid">
              <div className="team-card">
                <div className="team-avatar">EB</div>
                <div className="team-info">
                  <h4>Dr. Emmanuel Bamigboye</h4>
                  <div className="role">CEO &amp; Co-founder</div>
                  <p>PharmD, 15 years in pharmaceutical regulation and public health policy.</p>
                </div>
              </div>
              <div className="team-card">
                <div className="team-avatar">KI</div>
                <div className="team-info">
                  <h4>Kofi Ibrahim</h4>
                  <div className="role">CTO &amp; Co-founder</div>
                  <p>ML engineer, formerly at Google Health. Leads AI model development.</p>
                </div>
              </div>
              <div className="team-card">
                <div className="team-avatar">FA</div>
                <div className="team-info">
                  <h4>Dr. Fatima Aliyu</h4>
                  <div className="role">Head of Regulatory Affairs</div>
                  <p>Former NAFDAC senior analyst with expertise in pharmaceutical law.</p>
                </div>
              </div>
              <div className="team-card">
                <div className="team-avatar">EB</div>
                <div className="team-info">
                  <h4>Emmanuel Boateng</h4>
                  <div className="role">Head of Partnerships</div>
                  <p>Built healthcare networks across 8 African countries in the last decade.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <section style={{ background: 'var(--deep)' }}>
          <div className="section-inner">
            <div className="section-kicker">Certifications &amp; Standards</div>
            <h2 className="section-title">Compliance &amp; Accreditation</h2>
            <div className="mobile-swipe-indicator">Swipe horizontally ↔</div>
            
            <div className="mobile-scroll-snap" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem', marginTop: '2rem' }}>
              <div className="mobile-snap-item" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700, color: 'var(--jade)', marginBottom: '0.5rem' }}>NAFDAC</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>Aligned with guidelines and registration data from Nigeria&apos;s National Agency for Food and Drug Administration and Control.</div>
              </div>
              <div className="mobile-snap-item" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700, color: 'var(--jade)', marginBottom: '0.5rem' }}>WHO GMP</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>Assessment methodology aligned with WHO Good Manufacturing Practice guidelines.</div>
              </div>
              <div className="mobile-snap-item" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700, color: 'var(--jade)', marginBottom: '0.5rem' }}>ISO 27001</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>Information security management certified, ensuring your data is always protected.</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ════════════════════════ PAGE: RESOURCES ════════════════════════ */}
      <div className={`page ${activeTab === 'resources' ? 'active' : ''}`}>
        <section style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)' }}>
          <div className="section-inner">
            <div className="section-kicker">Knowledge Hub</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(2.2rem,5vw,3.5rem)' }}>Resources &amp; Education</h1>
            <p className="section-sub">Evidence-based guides, safety checklists, and expert articles to help you make informed pharmaceutical decisions.</p>
            
            <div className="resources-grid">
              {ARTICLES.map((art) => (
                <div key={art.slug} className="resource-card" onClick={() => setSelectedArticle(art)}>
                  <div className="resource-tag">{art.tag}</div>
                  <h3>{art.title}</h3>
                  <p>{art.summary}</p>
                  <div className="resource-meta">{art.readTime} · Read Article →</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: 'var(--deep)' }}>
          <div className="section-inner">
            <div className="section-kicker">FAQ</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
            <div className="faq-section">
              {[
                {
                  q: 'Is PharmaVerify NG a replacement for a pharmacist or doctor?',
                  a: 'No. PharmaVerify NG is an educational and informational tool designed to give you preliminary guidance. It should always be used alongside — never instead of — advice from a licensed pharmacist or physician. If you have serious concerns about a medication, consult a healthcare professional immediately.',
                },
                {
                  q: 'How accurate is the AI verification?',
                  a: 'Our AI achieves 98.4% accuracy on standard verification scenarios when complete information is provided. Accuracy decreases when key fields like expiry date and manufacturer are left blank. We continuously train and improve our models using real-world pharmaceutical data.',
                },
                {
                  q: 'How do you verify drug authenticity without manufacturer batch data?',
                  a: 'We cross-reference the drug name, dosage form, and licensed manufacturer directly against official NAFDAC registration records. By verifying that the NAFDAC Registration Number (NRN) legitimately belongs to the specific product and manufacturer, we flag unauthorized, unapproved, or misbranded medications.',
                },
                {
                  q: 'Can PharmaVerify NG detect all types of counterfeit drugs?',
                  a: 'PharmaVerify NG flags high-risk indicators associated with counterfeit drugs — such as NRN registration mismatches, visual tablet irregularities, suspicious acquisition channels, and packaging tampering. However, definitive chemical purity analysis requires laboratory assays.',
                },
                {
                  q: 'Do you offer an API for hospitals and pharmacies?',
                  a: 'Yes. Our Enterprise plan includes REST API access for integrating drug verification into pharmacy management systems, dispensary software, and procurement workflows. Contact our team for documentation.',
                },
              ].map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="faq-item">
                    <div className={`faq-q ${isOpen ? 'open' : ''}`} onClick={() => setOpenFaq(isOpen ? null : idx)}>
                      {item.q} <span className="arrow">+</span>
                    </div>
                    <div className={`faq-a ${isOpen ? 'open' : ''}`}>
                      <p>{item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ════════════════════════ FOOTER ════════════════════════ */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem', cursor: 'pointer' }} onClick={() => showPage('home')}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'linear-gradient(180deg, #14281d 0%, #0b1711 100%)',
                    border: '1.2px solid rgba(0, 201, 122, 0.55)',
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
                    <path d="M12 2.5 L20 5.5 V12.5 C20 17.5 16.5 20.8 12 22 C7.5 20.8 4 17.5 4 12.5 V5.5 Z" stroke="rgba(0,201,122,0.4)" strokeWidth="1.2" />
                    <path d="M12 7 V16 M7.5 11.5 H16.5" stroke="#00c97a" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="12" cy="11.5" r="1.6" fill="#00e68a" />
                  </svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{ fontFamily: "'Epilogue', sans-serif", fontSize: '18px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
                    Pharma
                  </span>
                  <span style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: '20px', fontWeight: 700, color: '#00c97a', letterSpacing: '-0.2px', marginLeft: '1px' }}>
                    Verify
                  </span>
                  <span style={{ fontFamily: "'Epilogue', sans-serif", fontSize: '7.5px', fontWeight: 800, letterSpacing: '0.8px', color: '#00c97a', background: 'rgba(0,201,122,0.08)', border: '1px solid rgba(0,201,122,0.3)', borderRadius: '3px', padding: '1px 4px', marginLeft: '5px', lineHeight: 1 }}>
                    NG
                  </span>
                </div>
              </div>
              <p>Africa&apos;s leading pharmaceutical verification platform. Protecting patients and healthcare workers from substandard and counterfeit medicines since 2021.</p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); showPage('verify'); }}>Verify Drug</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); showPage('services'); }}>Services</a></li>
                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      showPage('services');
                      setTimeout(() => {
                        const el = document.getElementById('pricing') || document.querySelector('.pricing-section');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); showPage('about'); }}>About Us</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); showPage('contact'); }}>Contact</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); showPage('resources'); }}>Press</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveLegalDoc(legalContentMap.privacy); }}>Privacy Policy</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveLegalDoc(legalContentMap.terms); }}>Terms of Service</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveLegalDoc(legalContentMap.disclaimer); }}>Disclaimer</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveLegalDoc(legalContentMap.cookies); }}>Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>© 2026 PharmaVerify<sup style={{ fontSize: '10px', verticalAlign: 'super' }}>NG</sup> Technologies Ltd. All rights reserved. RC 1234567 · Lagos, Nigeria.</div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="https://x.com/buayokunmi0">Twitter / X</a>
              <a href="https://www.linkedin.com/in/emmanuel-bamigboye-a5b13a289/">LinkedIn</a>
              <a href="#">Instagram</a>
            </div>
          </div>
        </div>
      </footer>

      {/* IN-APP ARTICLE READER MODAL */}
      {selectedArticle && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(5px)' }}
          onClick={() => setSelectedArticle(null)}
        >
          <div
            style={{ background: '#101c14', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '85vh', overflowY: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none', padding: '2rem', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: '#00c97a', letterSpacing: 1.2 }}>
                  {selectedArticle.tag} · {selectedArticle.readTime}
                </span>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: '#fff', marginTop: 4, lineHeight: 1.3 }}>
                  {selectedArticle.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                style={{ background: 'none', border: 'none', color: '#9ab0a0', fontSize: 20, cursor: 'pointer', padding: 4 }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 14, color: '#9ab0a0', fontStyle: 'italic', marginBottom: '1.5rem', borderLeft: '3px solid #00c97a', paddingLeft: 10, lineHeight: 1.6 }}>
              {selectedArticle.summary}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: 13.5, color: '#d0ddd4', lineHeight: 1.75 }}>
              {selectedArticle.content.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link
                href={`/resources/${selectedArticle.slug}`}
                style={{ fontSize: 12.5, color: '#00c97a', textDecoration: 'none', fontWeight: 600 }}
              >
                Open Full Page ↗
              </Link>
              <button
                onClick={() => setSelectedArticle(null)}
                style={{ background: '#00c97a', border: 'none', color: '#040a06', fontWeight: 700, borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 12.5 }}
              >
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP LEGAL READER MODAL */}
      {activeLegalDoc && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(5px)' }}
          onClick={() => setActiveLegalDoc(null)}
        >
          <div
            style={{ background: '#101c14', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '85vh', overflowY: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none', padding: '2rem', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: '#00c97a', letterSpacing: 1.2 }}>
                  {activeLegalDoc.tag}
                </span>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: '#fff', marginTop: 4, lineHeight: 1.3 }}>
                  {activeLegalDoc.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveLegalDoc(null)}
                style={{ background: 'none', border: 'none', color: '#9ab0a0', fontSize: 20, cursor: 'pointer', padding: 4 }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 14, color: '#9ab0a0', fontStyle: 'italic', marginBottom: '1.5rem', borderLeft: '3px solid #00c97a', paddingLeft: 10, lineHeight: 1.6 }}>
              {activeLegalDoc.summary}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: 13.5, color: '#d0ddd4', lineHeight: 1.75 }}>
              {activeLegalDoc.content.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                onClick={() => setActiveLegalDoc(null)}
                style={{ background: '#00c97a', border: 'none', color: '#040a06', fontWeight: 700, borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 12.5 }}
              >
                Close Document
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}