'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    Chart: any;
  }
}

// Interfaces mapping to Supabase structure
interface Report {
  id: string;
  date: string;
  user: string;
  location: string;
  category: string;
  productName: string;
  nafdacNum: string;
  batchNum: string;
  description: string;
  status: 'pending' | 'dismissed' | 'escalated';
  evidenceUrl: string;
}

interface UserDirectoryMember {
  id: string;
  firstname: string;
  lastname?: string;
  username: string;
  email: string;
  role: 'user' | 'staff' | 'admin';
  phone?: string;
  created_at?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [activeView, setActiveView] = useState<'overview' | 'triage' | 'escalations' | 'team' | 'users' | 'account'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'staff' | 'admin'>('admin');
  
  // Profile State
  const [profile, setProfile] = useState({ firstname: 'Admin', lastname: 'User', email: 'admin@pharmaverify.ng', phone: '' });
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Modals & Charts
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [nafdacCheck, setNafdacCheck] = useState<{ loading: boolean; data: any }>({ loading: false, data: null });
  const [aiAudit, setAiAudit] = useState<{ loading: boolean; data: any }>({ loading: false, data: null });
  const [chartReady, setChartReady] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const chartInst = useRef<any>(null);

  // Email Dispatch States
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Live Database State
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Live User Directory State
  const [allUsers, setAllUsers] = useState<UserDirectoryMember[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Open Report & Check NAFDAC Local DB
  const openReport = async (report: Report) => {
    setSelectedReport(report);
    setNafdacCheck({ loading: true, data: null });
    setAiAudit({ loading: false, data: null });
    setIsEditingEmail(false);
    
    if (report.nafdacNum && report.nafdacNum !== 'N/A') {
      try {
        const res = await fetch('/api/nafdac', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nrn: report.nafdacNum })
        });
        const data = await res.json();
        setNafdacCheck({ loading: false, data: data.found ? data.record : null });
      } catch {
        setNafdacCheck({ loading: false, data: null });
      }
    } else {
      setNafdacCheck({ loading: false, data: null });
    }
  };

  // The Live Scraper & Gemini AI Audit Function
  const runLiveScrape = async (report: Report) => {
    const nrn = report.nafdacNum;
    if (!nrn || nrn === 'N/A') {
      alert("No NRN provided to scrape.");
      return;
    }
    
    setIsScraping(true);
    setAiAudit({ loading: true, data: null });
    try {
      const res = await fetch('/api/scrape-nafdac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nrn })
      });
      const result = await res.json();
      
      if (result.found && result.record) {
        setNafdacCheck({ loading: false, data: result.record });
        
        const auditRes = await fetch('/api/audit-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userReport: report, nafdacRecord: result.record })
        });
        const auditResult = await auditRes.json();
        if (auditResult.success) {
          setAiAudit({ loading: false, data: auditResult.audit });
          if (auditResult.audit.escalationEmail) {
            setEmailSubject(auditResult.audit.escalationEmail.subject);
            setEmailBody(auditResult.audit.escalationEmail.body);
          }
        } else {
          setAiAudit({ loading: false, data: { riskLevel: 'UNKNOWN', auditSummary: 'AI audit generation failed.' } });
        }
      } else {
        alert(`Scrape Failed: ${result.error || 'Product not found on NAPAMS.'}`);
        setAiAudit({ loading: false, data: null });
      }
    } catch {
      alert('Scraper execution failed.');
      setAiAudit({ loading: false, data: null });
    } finally {
      setIsScraping(false);
    }
  };

  const loadLiveReports = async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_get_reports' }),
      });
      const data = await res.json();
      
      if (data.success && data.reports) {
        const formattedReports: Report[] = data.reports.map((r: any) => {
          const rawName = r.drug_name || '';
          const cleanName = rawName.replace('[REPORTED DEFECT]', '').trim();
          
          let currentStatus: 'pending' | 'dismissed' | 'escalated' = 'pending';
          if (r.summary && r.summary.includes('DISMISSED')) currentStatus = 'dismissed';
          if (r.summary && r.summary.includes('ESCALATED')) currentStatus = 'escalated';

          return {
            id: r.id.toString(),
            date: r.created_at ? r.created_at.split('T')[0] : 'Unknown Date',
            user: r.user_id ? r.user_id.substring(0, 8) + '...' : 'Anonymous',
            location: r.source || 'Unknown Location',
            category: r.drug_form || 'Unknown Category',
            productName: cleanName,
            nafdacNum: r.nafdac_num || 'N/A',
            batchNum: r.batch_num || 'N/A',
            description: r.observations || 'No description provided',
            status: currentStatus,
            evidenceUrl: r.evidence_url || 'https://via.placeholder.com/400x200?text=No+Evidence+Attached',
          };
        });
        setReports(formattedReports);
      }
    } catch (err) {
      console.error("Failed to load live reports:", err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const loadAllUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_users' }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setAllUsers(data.users);
      }
    } catch {
      // Fallback mock if API endpoint is pending creation
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'user' | 'staff' | 'admin') => {
    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', user_id: userId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setAllUsers(allUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
        alert(`User role successfully updated to ${newRole.toUpperCase()}`);
      } else {
        alert('Failed to update role: ' + (data.error || 'Unknown error'));
      }
    } catch {
      alert('Error updating user role.');
    }
  };

  // Auth Check & Load Data
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (localStorage.getItem('pv_logged_in') !== 'true') {
      router.push('/signin');
      return;
    }

    const savedRole = localStorage.getItem('pv_dev_role') || 'user';
    if (savedRole === 'user') {
      router.push('/dashboard');
      return;
    }
    
    setUserRole(savedRole as 'staff' | 'admin');

    // Pull both the explicit profile save AND the actual authenticated session data
    const storedProfile = JSON.parse(localStorage.getItem('pv_profile') || '{}');
    const storedUser = JSON.parse(localStorage.getItem('pv_user') || '{}');

    // Prefer explicitly saved profile data, otherwise fallback to the real user session data
    const fname = storedProfile['pf-firstname'] || storedUser.firstname || 'Admin';
    const lname = storedProfile['pf-lastname'] || storedUser.lastname || '';
    const email = storedProfile['pf-email'] || storedUser.email || 'admin@pharmaverify.ng';
    const phone = storedProfile['pf-phone'] || storedUser.phone || '';

    setProfile({
      firstname: fname,
      lastname: lname,
      email: email,
      phone: phone
    });

    loadLiveReports();
    loadAllUsers();
  }, [router]);

  // Render Charts for Overview
  useEffect(() => {
    if (!chartReady || activeView !== 'overview' || typeof window === 'undefined' || !window.Chart) return;

    const ctx = document.getElementById('adminOverviewChart') as HTMLCanvasElement;
    if (ctx) {
      if (chartInst.current) chartInst.current.destroy();
      
      chartInst.current = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
          datasets: [
            {
              label: 'Nationwide Scans',
              data: [1200, 1900, 3000, 5000, 8500, 12450],
              backgroundColor: 'rgba(0,201,122,0.8)',
              borderRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
          },
        }
      });
    }
  }, [chartReady, activeView]);

  const handleNavClick = (view: any) => {
    setActiveView(view);
    if (window.innerWidth <= 900) setSidebarOpen(false);
  };

  const handleAction = async (id: string, action: 'dismiss' | 'escalate') => {
    setReports(reports.map(r => r.id === id ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'escalated' } : r));
    setSelectedReport(null);
    
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'admin_update_report', 
          report_id: id, 
          new_status: action 
        }),
      });
    } catch {}
  };

  const handleSendEscalation = async () => {
    if (!selectedReport) return;
    setIsSending(true);
    
    try {
      const res = await fetch('/api/send-escalation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: 'krizzyworld9@gmail.com',
          subject: emailSubject,
          body: emailBody
        })
      });
      
      if (!res.ok) throw new Error('Dispatch failed');
      
      alert('Escalation dispatched successfully to krizzyworld9@gmail.com!');
      handleAction(selectedReport.id, 'escalate');
    } catch {
      alert('Failed to send escalation.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" onLoad={() => setChartReady(true)} />
      
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --void:#040a06;--deep:#080f0a;--surface:#0c1510;--card:#101c14;--card2:#141f18;
          --line:rgba(255,255,255,0.07);--line2:rgba(255,255,255,0.12);
          --jade:#00c97a;--jade-dim:#00a362;--jade-pale:rgba(0,201,122,0.07);
          --ember:#f59e0b;--blood:#ef4444;--text:#e8f0ea;--text2:#9ab0a0;--text3:#5a7060;--white:#ffffff;
          --sidebar-w:240px;
        }
        html,body{font-family:'Epilogue',sans-serif;background:var(--void);color:var(--text);min-height:100vh;}
        
        .topbar{background:rgba(4,10,6,0.97);border-bottom:1px solid var(--line);padding:0 1.5rem;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:600;}
        .nav-logo{font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:var(--white);display:flex;align-items:center;gap:8px;text-decoration:none}
        .logo-icon{width:30px;height:30px;background:linear-gradient(135deg,var(--blood),#b91c1c);border-radius:8px;display:flex;align-items:center;justify-content:center}
        
        .menu-toggle{width:36px;height:36px;border:1px solid var(--line2);border-radius:8px;background:transparent;color:var(--text2);cursor:pointer;display:none;align-items:center;justify-content:center;}
        
        .layout{display:flex;min-height:calc(100vh - 60px);}
        .sidebar{width:var(--sidebar-w);background:var(--deep);border-right:1px solid var(--line);display:flex;flex-direction:column;padding-top:1rem;}
        .main{flex:1;padding:2rem 2.5rem;overflow-y:auto;max-width:100vw;}
        
        .sidebar-section{padding:1.5rem 1rem 0.5rem;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text3)}
        .sidebar-nav{list-style:none;padding:0 0.75rem}
        .sidebar-nav li{margin-bottom:2px}
        .sidebar-nav a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;font-size:13.5px;font-weight:500;color:var(--text2);cursor:pointer;transition:all 0.2s}
        .sidebar-nav a:hover{background:rgba(255,255,255,0.06);color:var(--text)}
        .sidebar-nav a.active{background:rgba(239,68,68,0.1);color:var(--blood);font-weight:600}

        .stat-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:1rem;margin-bottom:2rem;}
        .stat-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:1.5rem;position:relative}
        .stat-num{font-family:'Fraunces',serif;font-size:32px;font-weight:700;line-height:1;color:var(--white)}
        .stat-label{font-size:12px;color:var(--text3);margin-top:5px;font-weight:500}

        .admin-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:1.5rem;}
        table{width:100%;border-collapse:collapse;}
        th{padding:12px;text-align:left;font-size:11px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--line);}
        td{padding:14px 12px;font-size:13.5px;border-bottom:1px solid var(--line);color:var(--text2);}
        
        .badge{padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;}
        .b-pending{background:rgba(245,158,11,0.15);color:var(--ember);}
        .b-escalated{background:rgba(0,201,122,0.15);color:var(--jade);}
        .b-dismissed{background:rgba(255,255,255,0.05);color:var(--text3);}

        .btn-red{background:var(--blood);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:600;cursor:pointer;}
        .btn-jade{background:var(--jade);color:var(--void);border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;}
        .btn-outline{background:transparent;border:1px solid var(--line2);color:var(--text2);padding:8px 16px;border-radius:8px;font-weight:600;cursor:pointer;}
        
        .field{display:flex;flex-direction:column;gap:6px;margin-bottom:1rem;}
        .field label{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:1px}
        .field input,.field select{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:10px 14px;color:var(--text);font-size:13.5px;outline:none;}
        .field input:focus{border-color:var(--blood);}

        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:900;display:flex;align-items:center;justify-content:center;padding:1.5rem;backdrop-filter:blur(4px)}
        .modal{background:var(--card);border:1px solid var(--line2);border-radius:20px;width:100%;max-width:600px;max-height:85vh;overflow-y:auto;padding:2rem;}

        @media(max-width:900px){
          .menu-toggle{display:flex;}
          .sidebar{position:fixed;top:60px;left:0;bottom:0;z-index:700;transform:translateX(-100%);transition:transform 0.3s ease;}
          .sidebar.open{transform:translateX(0);}
          .main{margin-left:0;padding:1.5rem 1rem;}
          .stat-grid{grid-template-columns:1fr 1fr;}
        }
      `}</style>

      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link href="/" className="nav-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            PharmaVerify<sup style={{ fontSize: '10px' }}>NG</sup>
          </Link>
          <span style={{ fontSize: 13, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            Admin Command Center
            <span
              style={{ fontSize: 9, color: 'var(--ember)', cursor: 'pointer', padding: '2px 6px', border: '1px dashed var(--ember)', borderRadius: 4, textTransform: 'uppercase', fontWeight: 700 }}
              onClick={() => {
                const newRole = prompt('Switch Role To (user / staff / admin):', userRole);
                if (newRole && ['user', 'staff', 'admin'].includes(newRole.trim().toLowerCase())) {
                  const role = newRole.trim().toLowerCase();
                  localStorage.setItem('pv_dev_role', role);
                  setUserRole(role as any);
                  if (role === 'user') router.push('/dashboard');
                }
              }}
            >
              Dev: {userRole}
            </span>
          </span>
        </div>
      </header>

      <div className="layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-section">Main</div>
          <ul className="sidebar-nav">
            <li><a className={activeView === 'overview' ? 'active' : ''} onClick={() => handleNavClick('overview')}>📊 System Overview</a></li>
            <li>
              <a className={activeView === 'triage' ? 'active' : ''} onClick={() => handleNavClick('triage')} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>📥 Triage Inbox</span>
                {reports.filter(r => r.status === 'pending').length > 0 && (
                  <span style={{ background: 'var(--ember)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>{reports.filter(r => r.status === 'pending').length}</span>
                )}
              </a>
            </li>
            <li><a className={activeView === 'escalations' ? 'active' : ''} onClick={() => handleNavClick('escalations')}>🚨 Escalations</a></li>
          </ul>

          <div className="sidebar-section">Management</div>
          <ul className="sidebar-nav">
            {userRole === 'admin' && (
              <>
                <li><a className={activeView === 'team' ? 'active' : ''} onClick={() => handleNavClick('team')}>👥 Team & Roles</a></li>
                <li><a className={activeView === 'users' ? 'active' : ''} onClick={() => handleNavClick('users')}>📂 User Directory</a></li>
              </>
            )}
            <li><a className={activeView === 'account' ? 'active' : ''} onClick={() => handleNavClick('account')}>⚙️ My Profile</a></li>
          </ul>

          <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--line)' }}>
            <button
              onClick={() => {
                if (confirm('Sign out of Admin Portal?')) {
                  localStorage.removeItem('pv_logged_in');
                  router.push('/signin');
                }
              }}
              style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text2)', textAlign: 'left', cursor: 'pointer', padding: '8px 12px', fontSize: 13, fontWeight: 600 }}
            >
              Sign Out →
            </button>
          </div>
        </aside>

        <main className="main" onClick={() => { if(window.innerWidth <= 900) setSidebarOpen(false) }}>
          {activeView === 'overview' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>System Overview</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text3)' }}>National verification statistics and platform health.</p>
              </div>

              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-num">12,450</div>
                  <div className="stat-label">Nationwide Scans</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: 'var(--ember)' }}>{reports.filter(r => r.status === 'pending').length}</div>
                  <div className="stat-label">Pending Defect Reports</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: 'var(--jade)' }}>34</div>
                  <div className="stat-label">Escalated to NAFDAC</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: '#8b5cf6' }}>{allUsers.length}</div>
                  <div className="stat-label">Registered Users</div>
                </div>
              </div>

              <div className="admin-card">
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700, color: 'var(--white)' }}>Verification Volume (Last 6 Months)</h3>
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>Total products verified across all categories nationwide.</p>
                </div>
                <div style={{ height: 250, width: '100%' }}>
                  <canvas id="adminOverviewChart"></canvas>
                </div>
              </div>
            </div>
          )}

          {activeView === 'triage' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>Triage Inbox</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text3)' }}>Review and verify defect reports from users across Nigeria.</p>
              </div>

              <div className="admin-card" style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th>Report ID / Date</th>
                      <th>Product</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.filter(r => r.status === 'pending').map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.id}</strong><br/><span style={{fontSize: 11}}>{r.date}</span></td>
                        <td><strong>{r.productName}</strong><br/><span style={{fontSize: 11, textTransform: 'uppercase'}}>{r.category}</span></td>
                        <td>{r.location}</td>
                        <td><span className={`badge b-${r.status}`}>{r.status}</span></td>
                        <td><button className="btn-outline" onClick={() => openReport(r)}>Review</button></td>
                      </tr>
                    ))}
                    {reports.filter(r => r.status === 'pending').length === 0 && (
                      <tr><td colSpan={5} style={{textAlign:'center', padding:'2rem'}}>No pending reports.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'escalations' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>Active Escalations</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text3)' }}>Reports officially forwarded to NAFDAC for enforcement.</p>
              </div>
              <div className="admin-card" style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 600 }}>
                  <thead>
                    <tr><th>Report ID</th><th>Product</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {reports.filter(r => r.status === 'escalated').map(r => (
                      <tr key={r.id}>
                        <td>{r.id}</td><td>{r.productName}</td>
                        <td><span className={`badge b-${r.status}`}>Sent to NAFDAC</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'team' && userRole === 'admin' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>Team & Roles</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text3)' }}>Promote registered users to staff or admin roles.</p>
              </div>
              <div className="admin-card" style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 600 }}>
                  <thead>
                    <tr><th>Name</th><th>Username</th><th>Email</th><th>Role Action</th></tr>
                  </thead>
                  <tbody>
                    {allUsers.filter(u => u.role === 'admin' || u.role === 'staff').map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.firstname} {u.lastname || ''}</strong></td>
                        <td>@{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                            style={{ background: 'var(--surface)', color: '#fff', border: '1px solid var(--line)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                          >
                            <option value="user">User</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'users' && userRole === 'admin' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>User Directory</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text3)' }}>View and manage registered public users and assign roles.</p>
              </div>
              <div className="admin-card" style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 650 }}>
                  <thead>
                    <tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Current Role</th><th>Change Role</th></tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.firstname} {u.lastname || ''}</strong></td>
                        <td>@{u.username}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || 'N/A'}</td>
                        <td><span className={`badge ${u.role === 'admin' ? 'b-escalated' : u.role === 'staff' ? 'b-pending' : 'b-dismissed'}`}>{u.role}</span></td>
                        <td>
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                            style={{ background: 'var(--surface)', color: '#fff', border: '1px solid var(--line)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                          >
                            <option value="user">User</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {allUsers.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>{isLoadingUsers ? 'Loading directory...' : 'No users found.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'account' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>My Profile</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text3)' }}>Manage your staff/admin details for audit accountability.</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="admin-card" style={{ alignSelf: 'start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: 64, height: 64, background: 'var(--blood)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff' }}>
                      {profile.firstname[0]}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 18, color: '#fff' }}>{profile.firstname} {profile.lastname}</h3>
                      <p style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                        Role: {userRole}
                      </p>
                    </div>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '1rem 0' }} />
                  <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
                    Your name and email are attached to any reports you dismiss or escalate to NAFDAC. Ensure your details are accurate.
                  </p>
                </div>

                <div className="admin-card">
                  <div className="field">
                    <label>First Name</label>
                    <input type="text" value={profile.firstname} onChange={e => setProfile({...profile, firstname: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>Last Name</label>
                    <input type="text" value={profile.lastname} onChange={e => setProfile({...profile, lastname: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>Official Email</label>
                    <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>Phone Number</label>
                    <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                  </div>
                  <button 
                    className="btn-jade" 
                    style={{ width: '100%', marginTop: '1rem' }}
                    onClick={async () => {
                      const currentProfile = JSON.parse(localStorage.getItem('pv_profile') || '{}');
                      const updatedProfile = {
                        ...currentProfile,
                        'pf-firstname': profile.firstname,
                        'pf-lastname': profile.lastname,
                        'pf-email': profile.email,
                        'pf-phone': profile.phone,
                      };
                      localStorage.setItem('pv_profile', JSON.stringify(updatedProfile));
                      
                      const storedUser = JSON.parse(localStorage.getItem('pv_user') || '{}');
                      if (storedUser.id) {
                        try {
                          await fetch('/api/auth', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'update',
                              id: storedUser.id,
                              firstname: profile.firstname,
                              lastname: profile.lastname,
                              email: profile.email,
                              phone: profile.phone,
                            }),
                          });
                        } catch {}
                      }

                      setProfileSavedToast(true);
                      setTimeout(() => setProfileSavedToast(false), 3000);
                    }}
                  >
                    Save Profile
                  </button>
                  {profileSavedToast && (
                    <div style={{ color: 'var(--jade)', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
                      ✓ Profile details updated.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* REPORT DETAIL MODAL */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Fraunces', fontSize: 22 }}>Review Report: {selectedReport.id}</h2>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: 13 }}>
              <div><strong style={{color:'var(--text3)'}}>Product:</strong><br/>{selectedReport.productName}</div>
              <div><strong style={{color:'var(--text3)'}}>Batch / NAFDAC:</strong><br/>{selectedReport.batchNum} / {selectedReport.nafdacNum}</div>
              <div><strong style={{color:'var(--text3)'}}>Location:</strong><br/>{selectedReport.location}</div>
              <div><strong style={{color:'var(--text3)'}}>Reported By:</strong><br/>{selectedReport.user}</div>
            </div>

            <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 12, marginBottom: '1.5rem' }}>
              <strong style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase' }}>User Description</strong>
              <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.5 }}>"{selectedReport.description}"</p>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '1rem', borderRadius: 12, marginBottom: '1.5rem' }}>
              <strong style={{ color: 'var(--blood)', fontSize: 11, textTransform: 'uppercase' }}>🔍 Official NAFDAC Database Check</strong>
              
              {nafdacCheck.loading ? (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>Querying NAFDAC official registry...</div>
              ) : nafdacCheck.data ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 8, fontSize: 12 }}>
                  <div>
                    <div style={{ color: 'var(--text3)', marginBottom: 4 }}>User Report Entered:</div>
                    <strong style={{ color: '#fff' }}>NRN: {selectedReport.nafdacNum}</strong><br/>
                    <span style={{ color: 'var(--text2)' }}>Product: {selectedReport.productName}</span><br/>
                    <span style={{ color: selectedReport.category.toLowerCase() !== (nafdacCheck.data.category || '').toLowerCase() ? 'var(--blood)' : 'var(--jade)' }}>
                      Category: {selectedReport.category}
                    </span>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text3)', marginBottom: 4 }}>Official Registry DB:</div>
                    <strong style={{ color: '#fff' }}>NRN: {nafdacCheck.data.nrn || selectedReport.nafdacNum}</strong><br/>
                    <span style={{ color: nafdacCheck.data.productName?.toLowerCase() !== selectedReport.productName.toLowerCase() ? 'var(--ember)' : 'var(--jade)' }}>
                      Product: {nafdacCheck.data.productName}
                    </span><br/>
                    <span style={{ color: 'var(--text2)' }}>Category: {nafdacCheck.data.category || 'N/A'}</span><br/>
                    <span style={{ color: 'var(--text2)' }}>Company: {nafdacCheck.data.manufacturer}</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 8, fontSize: 12 }}>
                  <div>
                    <div style={{ color: 'var(--text3)', marginBottom: 4 }}>User Entered:</div>
                    <strong style={{ color: '#fff' }}>NRN: {selectedReport.nafdacNum}</strong><br/>
                    <span style={{ color: 'var(--text2)' }}>Product: {selectedReport.productName}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ color: 'var(--text3)' }}>Record Not Found in Local DB</div>
                    <button 
                      className="btn-outline" 
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: 11, 
                        borderColor: isScraping ? 'var(--line2)' : 'var(--ember)',
                        color: isScraping ? 'var(--text3)' : 'var(--ember)'
                      }} 
                      onClick={() => runLiveScrape(selectedReport)}
                      disabled={isScraping}
                    >
                      {isScraping ? 'Initiating Headless Browser...' : 'Run Live NAPAMS Scrape ⚡'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {aiAudit.loading && (
              <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', padding: '1rem', borderRadius: 12, marginBottom: '1.5rem', fontSize: 12, color: '#c4b5fd' }}>
                🤖 Gemini AI Auditor is analyzing registry mismatch and drafting NAFDAC enforcement packet...
              </div>
            )}

            {aiAudit.data && (
              <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.3)', padding: '1.25rem', borderRadius: 12, marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#c4b5fd', fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    🤖 Gemini AI Regulatory Audit
                  </strong>
                  <span className="badge" style={{ background: aiAudit.data.riskLevel === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: aiAudit.data.riskLevel === 'CRITICAL' ? 'var(--blood)' : 'var(--ember)' }}>
                    Risk: {aiAudit.data.riskLevel}
                  </span>
                </div>
                
                <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text)', marginBottom: '1rem' }}>
                  {aiAudit.data.auditSummary}
                </p>

                {aiAudit.data.escalationEmail && (
                  <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>
                        Generated NAFDAC Enforcement Email Draft
                      </div>
                      <button 
                        onClick={() => setIsEditingEmail(true)}
                        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✏️ Full Screen Edit
                      </button>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, marginBottom: 8 }}>
                        Subject: {emailSubject}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {emailBody}
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleSendEscalation}
                      disabled={isSending}
                      className="btn-red"
                      style={{ width: '100%', marginTop: 16, opacity: isSending ? 0.7 : 1, cursor: isSending ? 'not-allowed' : 'pointer' }}
                    >
                      {isSending ? 'Sending Escalation via Resend...' : 'Verify & Escalate to NAFDAC →'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '2rem' }}>
              <strong style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase' }}>Evidence Attached</strong>
              <div style={{ marginTop: 8, height: 200, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <img src={selectedReport.evidenceUrl} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
              <button className="btn-outline" onClick={() => handleAction(selectedReport.id, 'dismiss')}>Dismiss (False Alarm)</button>
              {!aiAudit.data && (
                <button className="btn-red" onClick={() => handleAction(selectedReport.id, 'escalate')}>Manual Override: Escalate</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN EMAIL EDITOR OVERLAY */}
      {isEditingEmail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4, 10, 6, 0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 20, width: '100%', maxWidth: 800, height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', borderBottom: '1px solid var(--line)' }}>
              <div>
                <h2 style={{ fontFamily: 'Fraunces', fontSize: 20, color: '#fff' }}>Review & Edit Enforcement Dispatch</h2>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Modify the AI-generated draft before sending to NAFDAC compliance.</p>
              </div>
              <button onClick={() => setIsEditingEmail(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem', overflowY: 'auto' }}>
              <div className="field">
                <label>Email Subject</label>
                <input 
                  type="text" 
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  style={{ fontSize: 14, fontWeight: 600, background: 'var(--void)' }}
                />
              </div>
              <div className="field" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label>Email Body</label>
                <textarea 
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  style={{ flex: 1, padding: '14px', background: 'var(--void)', color: '#fff', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'none', lineHeight: 1.6 }}
                />
              </div>
            </div>

            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(0,0,0,0.2)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
              <button className="btn-outline" onClick={() => setIsEditingEmail(false)}>Cancel</button>
              <button className="btn-jade" onClick={() => setIsEditingEmail(false)}>Save Changes & Close Editor</button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}