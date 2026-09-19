'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserProfile {
  username: string;
  firstname: string;
  lastname?: string;
  email?: string;
  role?: string;
  avatar?: string;
}

export default function SignInPage() {
  const router = useRouter();

  // Component State
  const [username, setUsername] = useState('');
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [savedUser, setSavedUser] = useState<{ name: string; username: string } | null>(null);
  const [pins, setPins] = useState(['', '', '', '']);
  const [userError, setUserError] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [attempts, setAttempts] = useState(3);
  const [isLocked, setIsLocked] = useState(false);
  const [lockdownTimer, setLockdownTimer] = useState(30);
  const [shakePin, setShakePin] = useState(false);
  const [flashSuccess, setFlashSuccess] = useState(false);

  // Role Selection Modal State for Admin / Staff
  const [roleModalData, setRoleModalData] = useState<{ user: any; options: ('admin' | 'staff' | 'user')[] } | null>(null);

  // Input refs for automatic PIN focus jumping
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Check if user has an existing session on this device
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('pv_username');
      const storedName = localStorage.getItem('pv_user_name');
      if (storedUsername && storedName) {
        setSavedUser({ name: storedName, username: storedUsername });
      }
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLocked && lockdownTimer > 0) {
      interval = setInterval(() => {
        setLockdownTimer((prev) => prev - 1);
      }, 1000);
    } else if (lockdownTimer <= 0 && isLocked) {
      setIsLocked(false);
      setLockdownTimer(30);
      setPins(['', '', '', '']);
      setTimeout(() => pinRefs[0].current?.focus(), 100);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockdownTimer]);

  // Step 1: Lookup User by Username
  const handleLookup = async () => {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setUserError(true);
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup', username: cleanUsername }),
      });
      const data = await res.json();

      if (!res.ok || !data.found) {
        setUserError(true);
        return;
      }

      setFoundUser(data.user);
      setUserError(false);
      setTimeout(() => pinRefs[0].current?.focus(), 100);
    } catch {
      setUserError(true);
    }
  };

  // Switch / Reset User
  const handleReset = () => {
    setFoundUser(null);
    setPins(['', '', '', '']);
    setPinError(false);
    setUserError(false);
    setAttempts(3);
    setTimeout(() => usernameInputRef.current?.focus(), 100);
  };

  // Quick Continue Handler for saved device sessions
  const handleQuickContinue = async () => {
    if (!savedUser?.username) {
      router.push('/dashboard');
      return;
    }
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup', username: savedUser.username.toLowerCase() }),
      });
      const data = await res.json();
      if (data.found && data.user) {
        localStorage.setItem('pv_user', JSON.stringify(data.user));
        localStorage.setItem('pv_logged_in', 'true');
        localStorage.setItem('pv_user_name', `${data.user.firstname} ${data.user.lastname || ''}`.trim());
        localStorage.setItem('pv_username', data.user.username);
        localStorage.setItem('pv_avatar', data.user.avatar || '');
        
        const email = (data.user.email || '').toLowerCase().trim();
        const dbRole = (data.user.role || 'user').toLowerCase().trim();
        
        if (email === 'krizzyworld9@gmail.com' || dbRole === 'admin') {
          setRoleModalData({ user: data.user, options: ['admin', 'staff', 'user'] });
          return;
        }
        if (dbRole === 'staff') {
          setRoleModalData({ user: data.user, options: ['staff', 'user'] });
          return;
        }
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch {
      router.push('/dashboard');
    }
  };

  // Step 2: Handle individual PIN digit inputs
  const handlePinChange = (idx: number, val: string) => {
    if (!val.match(/^\d?$/)) return;

    const newPins = [...pins];
    newPins[idx] = val;
    setPins(newPins);

    if (val && idx < 3) {
      pinRefs[idx + 1].current?.focus();
    }

    if (val && idx === 3 && newPins.every((p) => p !== '')) {
      verifyPin(newPins.join(''));
    }
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pins[idx] && idx > 0) {
      pinRefs[idx - 1].current?.focus();
    }
  };

  // Step 3: Complete sign-in process with chosen role
  const finalizeSignIn = (userObj: any, chosenRole: 'admin' | 'staff' | 'user') => {
    localStorage.setItem('pv_user', JSON.stringify(userObj));
    localStorage.setItem('pv_logged_in', 'true');
    localStorage.setItem('pv_user_name', `${userObj.firstname} ${userObj.lastname || ''}`.trim());
    localStorage.setItem('pv_username', userObj.username);
    localStorage.setItem('pv_dev_role', chosenRole);

    setFlashSuccess(true);
    setTimeout(() => {
      if (chosenRole === 'admin' || chosenRole === 'staff') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }, 500);
  };

  // Step 3: Verify PIN with the API
  const verifyPin = async (completedPin: string) => {
    if (completedPin.length < 4 || isLocked || !foundUser) return;

    const pin_hash = btoa(completedPin + foundUser.username.toLowerCase());

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signin',
          username: foundUser.username,
          pin_hash,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const loggedUser = data.user;
        const email = (loggedUser.email || '').toLowerCase().trim();
        const dbRole = (loggedUser.role || 'user').toLowerCase().trim();

        // Master Admin or DB Admin Role Check -> Gets all 3 options (Admin, Staff, User)
        if (email === 'krizzyworld9@gmail.com' || dbRole === 'admin') {
          setRoleModalData({ user: loggedUser, options: ['admin', 'staff', 'user'] });
          return;
        }

        // Staff Check -> Gets Staff and User options
        if (dbRole === 'staff') {
          setRoleModalData({ user: loggedUser, options: ['staff', 'user'] });
          return;
        }

        // Standard User
        finalizeSignIn(loggedUser, 'user');
      } else {
        const remaining = attempts - 1;
        setAttempts(remaining);
        setPins(['', '', '', '']);
        setShakePin(true);
        setTimeout(() => setShakePin(false), 400);

        if (remaining <= 0) {
          setIsLocked(true);
          setAttempts(3);
          setPinError(false);
        } else {
          setPinError(true);
          setTimeout(() => pinRefs[0].current?.focus(), 100);
        }
      }
    } catch {
      setPinError(true);
    }
  };

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --void:#040a06; --deep:#080f0a; --surface:#0c1510; --card:#101c14;
          --line:rgba(255,255,255,0.07); --line2:rgba(255,255,255,0.12);
          --jade:#00c97a; --jade-dim:#00a362; --jade-glow:rgba(0,201,122,0.15); --jade-pale:rgba(0,201,122,0.07);
          --blood:#ef4444; --blood-pale:rgba(239,68,68,0.08);
          --text:#e8f0ea; --text2:#9ab0a0; --text3:#5a7060; --white:#ffffff;
        }
        body{font-family:'Epilogue',sans-serif;background:var(--deep);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
        .bg-glow{position:fixed;top:0;left:50%;transform:translateX(-50%);width:700px;height:400px;background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(0,201,122,0.07),transparent 70%);pointer-events:none;z-index:0}

        nav{position:sticky;top:0;z-index:100;background:rgba(8,15,10,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--line);padding:0 2rem;height:64px;display:flex;align-items:center;justify-content:space-between}
        .nav-logo{font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:var(--white);text-decoration:none;display:flex;align-items:center;gap:10px}
        .logo-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--jade),var(--jade-dim));border-radius:8px;display:flex;align-items:center;justify-content:center}
        .logo-icon svg{width:16px;height:16px}
        .nav-right{font-size:13px;color:var(--text3)}
        .nav-right a{color:var(--jade);text-decoration:none;font-weight:600}
        .nav-right a:hover{text-decoration:underline}

        .page-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5rem 1.5rem;position:relative;z-index:1}
        .auth-card{width:100%;max-width:420px;background:var(--card);border:1px solid var(--line2);border-radius:24px;overflow:hidden;position:relative;z-index:1;animation:fadeUp 0.4s ease}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

        .user-found{text-align:center;padding:1.5rem 2rem;background:var(--surface);border-bottom:1px solid var(--line);animation:fadeUp 0.3s ease}
        .uf-avatar{width:64px;height:64px;background:var(--jade);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:24px;font-weight:800;color:var(--void);margin:0 auto 0.75rem;overflow:hidden;border:2px solid var(--line2)}
        .uf-name{font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:var(--white)}
        .uf-username{font-size:13px;color:var(--text3);margin-top:2px}
        .uf-change{font-size:12px;color:var(--jade);cursor:pointer;margin-top:8px;display:inline-block}
        .uf-change:hover{text-decoration:underline}

        .card-head{padding:2rem 2rem 1.5rem;border-bottom:1px solid var(--line);text-align:center}
        .head-badge{display:inline-flex;align-items:center;gap:7px;background:var(--jade-pale);border:1px solid rgba(0,201,122,0.2);color:var(--jade);font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:20px;margin-bottom:1.25rem}
        .card-head h1{font-family:'Fraunces',serif;font-size:26px;font-weight:700;color:var(--white);letter-spacing:-0.5px;margin-bottom:0.4rem}
        .card-head p{font-size:13.5px;color:var(--text3)}

        .card-body{padding:1.75rem 2rem}
        .field{margin-bottom:1.1rem}
        .field label{display:block;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:7px}
        .field input{font-family:'Epilogue',sans-serif;font-size:14px;color:var(--text);background:var(--surface);border:1px solid var(--line2);border-radius:10px;padding:12px 14px;width:100%;outline:none;transition:all 0.2s}
        .field input:focus{border-color:var(--jade);box-shadow:0 0 0 3px var(--jade-pale)}
        .field input::placeholder{color:var(--text3)}

        .pin-label{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:10px}
        .pin-wrap{display:flex;gap:10px;justify-content:center;margin-bottom:8px}
        .pin-box{width:60px;height:68px;background:var(--surface);border:1.5px solid var(--line2);border-radius:14px;font-family:'Fraunces',serif;font-size:26px;font-weight:700;color:var(--white);text-align:center;outline:none;transition:all 0.2s;caret-color:var(--jade)}
        .pin-box:focus{border-color:var(--jade);box-shadow:0 0 0 3px var(--jade-pale);background:var(--deep)}
        .pin-box.filled{border-color:rgba(0,201,122,0.4)}
        .pin-box.shake{animation:shake 0.4s ease}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}

        .attempts-warn{font-size:12px;color:#f59e0b;text-align:center;margin-top:8px}
        .err-msg{font-size:12px;color:var(--blood);text-align:center;margin-top:8px}

        .btn-full{width:100%;padding:14px;border-radius:12px;font-family:'Fraunces',serif;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s;border:none;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:0.2px;margin-top:1.25rem}
        .btn-jade{background:var(--jade);color:var(--void)}
        .btn-jade:hover{background:#00e68a;box-shadow:0 10px 30px rgba(0,201,122,0.3);transform:translateY(-1px)}
        .btn-ghost-full{background:transparent;border:1px solid var(--line2);color:var(--text2);font-family:'Epilogue',sans-serif;font-size:13.5px;font-weight:600;margin-top:10px}
        .btn-ghost-full:hover{border-color:var(--jade);color:var(--jade)}

        .divider{display:flex;align-items:center;gap:10px;margin:1.25rem 0;font-size:11.5px;color:var(--text3)}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--line)}

        .signup-row{text-align:center;font-size:13px;color:var(--text3);margin-top:1rem}
        .signup-row a{color:var(--jade);text-decoration:none;font-weight:600}
        .signup-row a:hover{text-decoration:underline}

        .forgot-row{text-align:center;font-size:12px;color:var(--text3);margin-top:8px}
        .forgot-row button{background:none;border:none;color:var(--text3);cursor:pointer}
        .forgot-row button:hover{color:var(--jade)}

        .locked-msg{background:var(--blood-pale);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--blood);text-align:center;margin-bottom:1rem;line-height:1.6}

        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:999;display:flex;align-items:center;justify-content:center;padding:1.5rem;backdrop-filter:blur(4px)}
        .modal{background:var(--card);border:1px solid var(--line2);border-radius:20px;width:100%;max-width:400px;padding:2rem;text-align:center}
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
          No account? <Link href="/signup">Sign up free →</Link>
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
              color: 'var(--text2)',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--jade)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text2)')}
          >
            <span>←</span>Back
          </Link>
        </div>

          {/* SAVED ACCOUNT QUICK ACCESS */}
          {savedUser && !foundUser && (
            <div style={{
              background: 'rgba(0, 201, 122, 0.05)',
              border: '1px solid rgba(0, 201, 122, 0.25)',
              borderRadius: '20px',
              padding: '1.75rem 1.25rem',
              width: '100%',
              maxWidth: '280px',
              margin: '0 auto 1.75rem auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}>
              <div style={{ width: 64, height: 64, background: 'var(--jade)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces', fontSize: 24, fontWeight: 800, color: 'var(--void)', marginBottom: '0.75rem', overflow: 'hidden', border: '2px solid var(--line2)' }}>
                {typeof window !== 'undefined' && localStorage.getItem('pv_avatar') ? (
                  <img src={localStorage.getItem('pv_avatar') || ''} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  savedUser.name?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                Signed in previously on this device
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                {savedUser.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#00c97a', marginBottom: '1rem' }}>
                @{savedUser.username}
              </div>
              <button
                className="btn-full btn-jade"
                onClick={handleQuickContinue}
                style={{ marginBottom: '0.75rem' }}
              >
                Continue as {savedUser.name.split(' ')[0]} →
              </button>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                onClick={() => {
                  localStorage.removeItem('pv_logged_in');
                  localStorage.removeItem('pv_user');
                  localStorage.removeItem('pv_user_name');
                  localStorage.removeItem('pv_username');
                  setSavedUser(null);
                }}
              >
                Not you? Switch account
              </button>
            </div>
          )}

          {/* USER FOUND PREVIEW */}
          {foundUser && (
            <div className="user-found">
              <div className="uf-avatar">
                {foundUser.avatar ? (
                  <img src={foundUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  foundUser.firstname?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div className="uf-name">{`${foundUser.firstname} ${foundUser.lastname || ''}`.trim()}</div>
              <div className="uf-username">@{foundUser.username}</div>
              <span className="uf-change" onClick={handleReset}>
                Not you? Switch account
              </span>
            </div>
          )}

          {!foundUser && (
            <div className="card-head">
              <div className="head-badge">Welcome Back</div>
              <h1>Sign In</h1>
              <p>Your drug verification dashboard awaits</p>
            </div>
          )}

          <div className="card-body">
            {isLocked && (
              <div className="locked-msg">
                🔒 Too many failed attempts. Please wait <strong>{lockdownTimer}</strong> seconds before trying again.
              </div>
            )}

            {/* USERNAME SECTION */}
            {!foundUser && (
              <div>
                <div className="field">
                  <label>Username</label>
                  <input
                    ref={usernameInputRef}
                    type="text"
                    placeholder="e.g. chidi_pharm"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLookup();
                    }}
                    autoComplete="username"
                  />
                </div>
                {userError && (
                  <div className="err-msg">
                    No account found with that username.{' '}
                    <Link href="/signup" style={{ color: 'var(--jade)' }}>
                      Sign up?
                    </Link>
                  </div>
                )}
                <button className="btn-full btn-jade" onClick={handleLookup}>
                  Continue →
                </button>
                <div className="divider">or</div>
                <div className="signup-row">
                  New to PharmaVerify NG? <Link href="/signup">Create a free account</Link>
                </div>
              </div>
            )}

            {/* PIN SECTION */}
            {foundUser && (
              <div style={{ opacity: isLocked ? 0.3 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
                <div className="pin-label">Enter your 4-digit PIN</div>
                <div className="pin-wrap">
                  {pins.map((pinDigit, i) => (
                    <input
                      key={i}
                      ref={pinRefs[i]}
                      className={`pin-box ${pinDigit ? 'filled' : ''} ${shakePin ? 'shake' : ''}`}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={pinDigit}
                      style={{
                        borderColor: flashSuccess ? '#00c97a' : undefined,
                        background: flashSuccess ? 'rgba(0,201,122,0.1)' : undefined,
                      }}
                      onChange={(e) => handlePinChange(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                    />
                  ))}
                </div>
                {pinError && <div className="err-msg">Incorrect PIN. Please try again.</div>}
                {attempts < 3 && attempts > 0 && (
                  <div className="attempts-warn">
                    ⚠ {attempts} attempt(s) remaining before lockout
                  </div>
                )}
                <div className="forgot-row">
                  <button
                    onClick={() =>
                      alert('PIN reset is not yet available.\n\nContact support at hello@pharmaverify.ng\n\nAlternatively, create a new account.')
                    }
                  >
                    Forgot your PIN?
                  </button>
                </div>
                <button className="btn-full btn-ghost-full" onClick={handleReset} style={{ marginTop: '1rem' }}>
                  ← Change username
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MULTI-ROLE SELECTION MODAL */}
      {roleModalData && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 12, color: '#fff' }}>Select Login Role</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
              Choose how you would like to sign into PharmaVerify NG for this session:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {roleModalData.options.includes('admin') && (
                <button
                  className="btn-full btn-jade"
                  style={{ marginTop: 0 }}
                  onClick={() => finalizeSignIn(roleModalData.user, 'admin')}
                >
                  Log in as Admin 🛡️
                </button>
              )}
              {roleModalData.options.includes('staff') && (
                <button
                  className="btn-full"
                  style={{ marginTop: 0, background: 'rgba(0,201,122,0.15)', color: 'var(--jade)', border: '1px solid rgba(0,201,122,0.3)' }}
                  onClick={() => finalizeSignIn(roleModalData.user, 'staff')}
                >
                  Log in as Staff 📋
                </button>
              )}
              <button
                className="btn-full btn-ghost-full"
                style={{ marginTop: 0 }}
                onClick={() => finalizeSignIn(roleModalData.user, 'user')}
              >
                Log in as User 👤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}