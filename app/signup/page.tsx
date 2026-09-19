'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();

  // Current Step
  const [currentStep, setCurrentStep] = useState(1);

  // Form Fields
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const [pin, setPin] = useState(['', '', '', '']);
  const [cpin, setCpin] = useState(['', '', '', '']);

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [occupation, setOccupation] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [terms, setTerms] = useState(false);

  // UI / Error State
  const [errors, setErrors] = useState<{ [key: string]: string | boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [age, setAge] = useState<number | null>(null);

  // Pin Refs
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const cpinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Age calculation
  useEffect(() => {
    if (year) {
      const d = parseInt(day) || 1;
      const m = parseInt(month) || 1;
      const y = parseInt(year);
      const dob = new Date(y, m - 1, d);
      const calculatedAge = Math.floor(
        (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)
      );
      setAge(calculatedAge);
    } else {
      setAge(null);
    }
  }, [day, month, year]);

  // Validation: Step 1
  const validateStep1 = () => {
    const newErrors: { [key: string]: boolean } = {};
    if (!firstname.trim()) newErrors.firstname = true;
    if (!lastname.trim()) newErrors.lastname = true;

    const unOk = /^[a-zA-Z0-9_]{3,20}$/.test(username.trim());
    if (!unOk) newErrors.username = true;

    const emOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emOk) newErrors.email = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validation: Step 2
  const validateStep2 = () => {
    const rawPin = pin.join('');
    const rawCpin = cpin.join('');
    const newErrors: { [key: string]: boolean } = {};

    if (rawPin.length !== 4) newErrors.pin = true;
    if (rawPin !== rawCpin) newErrors.cpin = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (from: number) => {
    if (from === 1 && !validateStep1()) return;
    if (from === 2 && !validateStep2()) return;
    setCurrentStep(from + 1);
  };

  // PIN inputs handler
  const handlePinChange = (idx: number, val: string, isConfirm = false) => {
    if (!val.match(/^\d?$/)) return;
    const targetArr = isConfirm ? [...cpin] : [...pin];
    const targetRefs = isConfirm ? cpinRefs : pinRefs;

    targetArr[idx] = val;
    if (isConfirm) setCpin(targetArr);
    else setPin(targetArr);

    if (val && idx < 3) {
      targetRefs[idx + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    isConfirm = false
  ) => {
    const targetArr = isConfirm ? cpin : pin;
    const targetRefs = isConfirm ? cpinRefs : pinRefs;
    if (e.key === 'Backspace' && !targetArr[idx] && idx > 0) {
      targetRefs[idx - 1].current?.focus();
    }
  };

  // PIN Strength calculation
  const rawPinStr = pin.join('');
  const pinLength = rawPinStr.length;
  const colors = ['#5a7060', '#ef4444', '#f59e0b', '#f59e0b', '#00c97a'];
  const labels = ['Enter PIN', 'Weak', 'Fair', 'Good', 'Strong ✓'];

  // Submit Registration
  const handleCreateAccount = async () => {
    const newErrors: { [key: string]: boolean } = {};
    if (!day || !month || !year) newErrors.dob = true;
    if (!occupation) newErrors.occupation = true;

    const phoneClean = phone.replace(/\s/g, '');
    const phoneOk = /^0[789][01]\d{8}$/.test(phoneClean);
    if (!phoneOk) newErrors.phone = true;

    if (!terms) {
      alert('Please agree to the Terms of Service.');
      return;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const dobStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const pin_hash = btoa(rawPinStr + username.toLowerCase());

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          username: username.trim(),
          email: email.trim(),
          phone: phoneClean,
          pin_hash,
          dob: dobStr,
          age,
          occupation,
          state,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsSubmitting(false);
        if (data.error === 'Username already taken') {
          setErrors({ username: 'Username already taken — choose another' });
          setCurrentStep(1);
        } else if (data.error === 'Email already registered') {
          setErrors({ email: 'Email already registered — sign in instead' });
          setCurrentStep(1);
        } else {
          alert('Signup failed: ' + data.error);
        }
        return;
      }

      // Store local auth state
      localStorage.setItem('pv_user', JSON.stringify(data.user));
      localStorage.setItem('pv_logged_in', 'true');
      localStorage.setItem('pv_user_name', `${firstname} ${lastname}`);
      localStorage.setItem('pv_username', username);

      setIsSuccess(true);
    } catch {
      setIsSubmitting(false);
      alert('Connection error. Check your internet and try again.');
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear - 5; y >= 1930; y--) {
    yearOptions.push(y);
  }

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--void:#040a06;--deep:#080f0a;--surface:#0c1510;--card:#101c14;--line:rgba(255,255,255,0.07);--line2:rgba(255,255,255,0.12);--jade:#00c97a;--jade-dim:#00a362;--jade-pale:rgba(0,201,122,0.07);--blood:#ef4444;--blood-pale:rgba(239,68,68,0.08);--ember:#f59e0b;--text:#e8f0ea;--text2:#9ab0a0;--text3:#5a7060;--white:#ffffff}
        body{font-family:'Epilogue',sans-serif;background:var(--void);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
        .bg-glow{position:fixed;top:0;left:50%;transform:translateX(-50%);width:700px;height:400px;background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(0,201,122,0.07),transparent 70%);pointer-events:none;z-index:0}
        nav{position:sticky;top:0;z-index:100;background:rgba(4,10,6,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--line);padding:0 2rem;height:64px;display:flex;align-items:center;justify-content:space-between}
        .nav-logo{font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:var(--white);text-decoration:none;display:flex;align-items:center;gap:10px}
        .logo-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--jade),var(--jade-dim));border-radius:8px;display:flex;align-items:center;justify-content:center}
        .logo-icon svg{width:16px;height:16px}
        .nav-right{font-size:13px;color:var(--text3)}
        .nav-right a{color:var(--jade);text-decoration:none;font-weight:600}
        .page-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:3rem 1.5rem;position:relative;z-index:1}
        .auth-card{width:100%;max-width:520px;background:var(--card);border:1px solid var(--line2);border-radius:24px;overflow:hidden;position:relative;z-index:1;animation:fadeUp 0.4s ease}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .card-head{padding:2rem 2rem 1.5rem;border-bottom:1px solid var(--line);text-align:center}
        .head-badge{display:inline-flex;align-items:center;gap:7px;background:var(--jade-pale);border:1px solid rgba(0,201,122,0.2);color:var(--jade);font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:20px;margin-bottom:1.25rem}
        .card-head h1{font-family:'Fraunces',serif;font-size:26px;font-weight:700;color:var(--white);letter-spacing:-0.5px;margin-bottom:0.4rem}
        .card-head p{font-size:13.5px;color:var(--text3)}
        .steps-bar{display:flex;align-items:center;padding:1.25rem 2rem;border-bottom:1px solid var(--line)}
        .step{display:flex;align-items:center;gap:8px;flex:1}
        .step-num{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;transition:all 0.3s}
        .step-num.done{background:var(--jade);color:var(--void)}
        .step-num.active{background:var(--jade);color:var(--void);box-shadow:0 0 0 4px rgba(0,201,122,0.2)}
        .step-num.pending{background:var(--surface);border:1px solid var(--line2);color:var(--text3)}
        .step-label{font-size:11.5px;font-weight:600;color:var(--text3);transition:color 0.3s}
        .step-label.active{color:var(--jade)}
        .step-label.done{color:var(--text2)}
        .step-line{flex:1;height:1px;background:var(--line2);margin:0 8px;transition:background 0.3s}
        .step-line.done{background:var(--jade)}
        .card-body{padding:1.75rem 2rem}
        .field{margin-bottom:1.1rem}
        .field label{display:block;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:7px}
        .req{color:var(--jade);margin-left:2px}
        .field input,.field select{font-family:'Epilogue',sans-serif;font-size:14px;color:var(--text);background:var(--surface);border:1px solid var(--line2);border-radius:10px;padding:12px 14px;width:100%;outline:none;transition:all 0.2s}
        .field input:focus,.field select:focus{border-color:var(--jade);box-shadow:0 0 0 3px var(--jade-pale)}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .field-hint{font-size:11.5px;color:var(--text3);margin-top:6px;line-height:1.5}
        .dob-row{display:grid;grid-template-columns:2fr 2fr 3fr;gap:10px}
        .pin-wrap{display:flex;gap:10px;justify-content:center;margin:0.5rem 0}
        .pin-box{width:52px;height:60px;background:var(--surface);border:1.5px solid var(--line2);border-radius:12px;font-family:'Fraunces',serif;font-size:24px;font-weight:700;color:var(--white);text-align:center;outline:none;transition:all 0.2s;caret-color:var(--jade)}
        .pin-box:focus{border-color:var(--jade);box-shadow:0 0 0 3px var(--jade-pale);background:var(--deep)}
        .pin-box.filled{border-color:rgba(0,201,122,0.4)}
        .pin-strength{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:var(--text3)}
        .pin-strength-bars{display:flex;gap:4px}
        .ps-bar{width:28px;height:4px;border-radius:4px;background:var(--line2);transition:background 0.3s}
        .age-notice{padding:10px 14px;border-radius:10px;font-size:12.5px;line-height:1.6;margin-top:10px}
        .age-notice.minor{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);color:var(--ember)}
        .age-notice.senior{background:var(--jade-pale);border:1px solid rgba(0,201,122,0.2);color:var(--jade)}
        .info-box{background:var(--jade-pale);border:1px solid rgba(0,201,122,0.15);border-radius:12px;padding:14px 16px;margin-top:10px;font-size:12.5px;color:var(--text2);line-height:1.7}
        .info-box strong{color:var(--jade);display:block;margin-bottom:4px;font-size:13px}
        .terms-box{display:flex;align-items:flex-start;gap:10px;background:var(--surface);border:1px solid var(--line2);border-radius:10px;padding:12px 14px;margin-bottom:1.25rem}
        .terms-box input[type=checkbox]{width:16px;height:16px;accent-color:var(--jade);flex-shrink:0;margin-top:2px}
        .terms-box p{font-size:12.5px;color:var(--text2);line-height:1.6}
        .terms-box a{color:var(--jade);text-decoration:none}
        .btn-full{width:100%;padding:14px;border-radius:12px;font-family:'Fraunces',serif;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s;border:none;display:flex;align-items:center;justify-content:center;gap:8px}
        .btn-jade{background:var(--jade);color:var(--void)}
        .btn-jade:hover{background:#00e68a;box-shadow:0 10px 30px rgba(0,201,122,0.3);transform:translateY(-1px)}
        .btn-jade:disabled{background:#1a3326;color:#2a5040;cursor:not-allowed}
        .btn-ghost{background:transparent;border:1px solid var(--line2);border-radius:12px;color:var(--text2);font-family:'Epilogue',sans-serif;font-size:14px;font-weight:600;cursor:pointer;padding:14px;width:100%;transition:all 0.2s}
        .btn-ghost:hover{border-color:var(--jade);color:var(--jade)}
        .btn-row{display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-top:1.5rem}
        .btn-row.single{grid-template-columns:1fr}
        .err-msg{font-size:12px;color:var(--blood);margin-top:6px}
        .success-screen{text-align:center;padding:2.5rem 2rem}
        .success-icon{width:72px;height:72px;background:var(--jade);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:28px}
        .success-screen h2{font-family:'Fraunces',serif;font-size:24px;font-weight:700;color:var(--white);margin-bottom:0.75rem}
        .success-screen p{font-size:14px;color:var(--text2);line-height:1.7;margin-bottom:1.5rem}
        .user-pill{display:inline-flex;align-items:center;gap:10px;background:var(--jade-pale);border:1px solid rgba(0,201,122,0.2);border-radius:30px;padding:8px 18px 8px 10px;margin-bottom:1.5rem}
        .user-pill-avatar{width:34px;height:34px;background:var(--jade);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:14px;font-weight:800;color:var(--void)}
        .user-pill-name{font-size:14px;font-weight:600;color:var(--text)}
        .signin-row{text-align:center;margin-top:1.25rem;font-size:13px;color:var(--text3)}
        .signin-row a{color:var(--jade);text-decoration:none;font-weight:600}
        @media(max-width:520px){.auth-card{border-radius:16px}.card-body,.card-head{padding:1.5rem}.pin-box{width:44px;height:52px;font-size:20px}.dob-row,.field-row{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="bg-glow" />
      <nav>
        <Link href="/" className="nav-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#040a06" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          PharmaVerify<sup style={{ fontSize: '10px', verticalAlign: 'super' }}>NG</sup>
        </Link>
        <div className="nav-right">
          Already have an account? <Link href="/signin">Sign in →</Link>
        </div>
      </nav>

      <div className="page-wrap">
        <div className="auth-card">
          <div style={{ width: '100%', maxWidth: '420px', marginTop: '1rem', marginBottom: '0.5rem', paddingLeft: '1.5rem' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                color: '#6b7280',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#00c97a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
            >
              <span>←</span> Back to home
            </Link>
          </div>
          <div className="card-head">
            <div className="head-badge">Create Account</div>
            <h1>
              Join PharmaVerify<sup style={{ fontSize: '14px', verticalAlign: 'super' }}>NG</sup>
            </h1>
            <p>Protect yourself from counterfeit drugs across Nigeria</p>
          </div>

          {!isSuccess && (
            <div className="steps-bar">
              <div className="step">
                <div className={`step-num ${currentStep > 1 ? 'done' : currentStep === 1 ? 'active' : 'pending'}`}>
                  {currentStep > 1 ? '✓' : 1}
                </div>
                <div className={`step-label ${currentStep === 1 ? 'active' : currentStep > 1 ? 'done' : ''}`}>
                  Identity
                </div>
              </div>
              <div className={`step-line ${currentStep > 1 ? 'done' : ''}`} />
              <div className="step">
                <div className={`step-num ${currentStep > 2 ? 'done' : currentStep === 2 ? 'active' : 'pending'}`}>
                  {currentStep > 2 ? '✓' : 2}
                </div>
                <div className={`step-label ${currentStep === 2 ? 'active' : currentStep > 2 ? 'done' : ''}`}>
                  Security
                </div>
              </div>
              <div className={`step-line ${currentStep > 2 ? 'done' : ''}`} />
              <div className="step">
                <div className={`step-num ${currentStep === 3 ? 'active' : 'pending'}`}>3</div>
                <div className={`step-label ${currentStep === 3 ? 'active' : ''}`}>Profile</div>
              </div>
            </div>
          )}

          <div className="card-body">
            {/* STEP 1: IDENTITY */}
            {currentStep === 1 && !isSuccess && (
              <div>
                <div className="field-row">
                  <div className="field">
                    <label>
                      First Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Chidi"
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                    />
                    {errors.firstname && <div className="err-msg">Please enter your first name</div>}
                  </div>
                  <div className="field">
                    <label>
                      Last Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Okafor"
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                    />
                    {errors.lastname && <div className="err-msg">Please enter your last name</div>}
                  </div>
                </div>

                <div className="field">
                  <label>
                    Username <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. chidi_pharm"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <div className="field-hint">Shows on your dashboard. Letters, numbers, underscore only. 3-20 chars.</div>
                  {errors.username && (
                    <div className="err-msg">
                      {typeof errors.username === 'string' ? errors.username : 'Username taken or invalid'}
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="chidi@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="field-hint">Used for account verification and drug safety alerts.</div>
                  {errors.email && (
                    <div className="err-msg">
                      {typeof errors.email === 'string' ? errors.email : 'Please enter a valid email address'}
                    </div>
                  )}
                </div>

                <div className="btn-row single">
                  <button className="btn-full btn-jade" onClick={() => handleNext(1)}>
                    Continue →
                  </button>
                </div>
                <div className="signin-row">
                  Already have an account? <Link href="/signin">Sign in</Link>
                </div>
              </div>
            )}

            {/* STEP 2: SECURITY */}
            {currentStep === 2 && !isSuccess && (
              <div>
                <div className="field">
                  <label>
                    Set Your 4-Digit PIN <span className="req">*</span>
                  </label>
                  <div className="pin-wrap">
                    {pin.map((digit, i) => (
                      <input
                        key={i}
                        ref={pinRefs[i]}
                        className={`pin-box ${digit ? 'filled' : ''}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(i, e.target.value, false)}
                        onKeyDown={(e) => handlePinKeyDown(i, e, false)}
                      />
                    ))}
                  </div>
                  <div className="pin-strength">
                    <div className="pin-strength-bars">
                      {[1, 2, 3, 4].map((v) => (
                        <div
                          key={v}
                          className="ps-bar"
                          style={{
                            background: v <= pinLength ? colors[pinLength] : 'rgba(255,255,255,0.06)',
                          }}
                        />
                      ))}
                    </div>
                    <span>{labels[pinLength]}</span>
                  </div>
                  {errors.pin && <div className="err-msg">Please enter a 4-digit PIN</div>}
                </div>

                <div className="field" style={{ marginTop: '1.5rem' }}>
                  <label>
                    Confirm PIN <span className="req">*</span>
                  </label>
                  <div className="pin-wrap">
                    {cpin.map((digit, i) => (
                      <input
                        key={i}
                        ref={cpinRefs[i]}
                        className={`pin-box ${digit ? 'filled' : ''}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(i, e.target.value, true)}
                        onKeyDown={(e) => handlePinKeyDown(i, e, true)}
                      />
                    ))}
                  </div>
                  {errors.cpin && <div className="err-msg">PINs do not match</div>}
                </div>

                <div className="btn-row">
                  <button className="btn-ghost" onClick={() => setCurrentStep(1)}>
                    ← Back
                  </button>
                  <button className="btn-full btn-jade" onClick={() => handleNext(2)}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PROFILE */}
            {currentStep === 3 && !isSuccess && (
              <div>
                <div className="field">
                  <label>
                    Date of Birth <span className="req">*</span>
                  </label>
                  <div className="dob-row">
                    <select value={day} onChange={(e) => setDay(e.target.value)}>
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>

                    <select value={month} onChange={(e) => setMonth(e.target.value)}>
                      <option value="">Month</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>

                    <select value={year} onChange={(e) => setYear(e.target.value)}>
                      <option value="">Year</option>
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {age !== null && age < 18 && (
                    <div className="age-notice minor">
                      ⚠️ <strong>Under 18 detected.</strong> Results will be age-adjusted and medications flagged where needed.
                    </div>
                  )}

                  {age !== null && age >= 60 && (
                    <div className="age-notice senior">
                      ✅ <strong>Senior profile detected.</strong> PharmaBot will flag dose-adjustment needs for users above 60.
                    </div>
                  )}

                  {errors.dob && <div className="err-msg">Please enter your date of birth</div>}
                </div>

                <div className="field">
                  <label>
                    Occupation <span className="req">*</span>
                  </label>
                  <select value={occupation} onChange={(e) => setOccupation(e.target.value)}>
                    <option value="">Select your occupation</option>
                    <optgroup label="Healthcare">
                      <option value="pharmacy_student">Pharmacy Student</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="doctor">Medical Doctor</option>
                      <option value="nurse">Nurse / Midwife</option>
                      <option value="medical_student">Medical Student</option>
                      <option value="lab_scientist">Laboratory Scientist</option>
                      <option value="community_health">Community Health Worker</option>
                    </optgroup>
                    <optgroup label="General">
                      <option value="student">Student (Non-medical)</option>
                      <option value="teacher">Teacher / Lecturer</option>
                      <option value="civil_servant">Civil Servant</option>
                      <option value="trader">Trader / Business owner</option>
                      <option value="farmer">Farmer</option>
                      <option value="engineer">Engineer / Tech</option>
                      <option value="lawyer">Lawyer</option>
                      <option value="artisan">Artisan / Skilled trade</option>
                      <option value="unemployed">Unemployed / Seeking work</option>
                      <option value="retired">Retired</option>
                      <option value="other">Other</option>
                    </optgroup>
                  </select>
                  {errors.occupation && <div className="err-msg">Please select your occupation</div>}
                </div>

                <div className="field">
                  <label>
                    Phone Number <span className="req">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <div className="info-box">
                    <strong>📋 Why we need your phone number</strong>
                    When you report a counterfeit drug to NAFDAC, your number is used by their enforcement team to follow up.
                    NAFDAC toll-free: <strong>0800-162-3322</strong>. Never shared for marketing.
                  </div>
                  {errors.phone && (
                    <div className="err-msg">Please enter a valid Nigerian phone number (e.g. 08012345678)</div>
                  )}
                </div>

                <div className="field">
                  <label>State of Residence</label>
                  <select value={state} onChange={(e) => setState(e.target.value)}>
                    <option value="">Select state</option>
                    <option>Abia</option><option>Adamawa</option><option>Akwa Ibom</option><option>Anambra</option><option>Bauchi</option><option>Bayelsa</option><option>Benue</option><option>Borno</option><option>Cross River</option><option>Delta</option><option>Ebonyi</option><option>Edo</option><option>Ekiti</option><option>Enugu</option><option>FCT — Abuja</option><option>Gombe</option><option>Imo</option><option>Jigawa</option><option>Kaduna</option><option>Kano</option><option>Katsina</option><option>Kebbi</option><option>Kogi</option><option>Kwara</option><option>Lagos</option><option>Nasarawa</option><option>Niger</option><option>Ogun</option><option>Ondo</option><option>Osun</option><option>Oyo</option><option>Plateau</option><option>Rivers</option><option>Sokoto</option><option>Taraba</option><option>Yobe</option><option>Zamfara</option>
                  </select>
                </div>

                <div className="terms-box">
                  <input
                    type="checkbox"
                    id="terms-check"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                  />
                  <p>
                    I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>. I understand my
                    phone number may be shared with NAFDAC only when I initiate a counterfeit drug report.
                  </p>
                </div>

                <div className="btn-row">
                  <button className="btn-ghost" onClick={() => setCurrentStep(2)}>
                    ← Back
                  </button>
                  <button
                    className="btn-full btn-jade"
                    onClick={handleCreateAccount}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating account...' : 'Create Account ✓'}
                  </button>
                </div>
              </div>
            )}

            {/* SUCCESS SCREEN */}
            {isSuccess && (
              <div className="success-screen">
                <div className="success-icon">✓</div>
                <h2>You&apos;re in!</h2>
                <div className="user-pill">
                  <div className="user-pill-avatar">{firstname[0]?.toUpperCase()}</div>
                  <div className="user-pill-name">@{username}</div>
                </div>
                <p>
                  Welcome, <strong>{firstname}</strong>! Your PharmaVerify<sup style={{ fontSize: '9px' }}>NG</sup> account is ready.
                </p>
                <button
                  className="btn-full btn-jade"
                  onClick={() => router.push('/dashboard')}
                  style={{ marginBottom: '10px' }}
                >
                  Go to my Dashboard →
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => router.push('/')}
                  style={{ marginTop: 0 }}
                >
                  Back to Home
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}