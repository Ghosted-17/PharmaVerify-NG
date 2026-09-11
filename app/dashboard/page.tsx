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

interface HistoryRecord {
  id: number;
  drugName: string;
  manufacturer?: string;
  batchNum?: string;
  nafdacNum?: string;
  expiryDate?: string;
  storageTemp?: string;
  packaging?: string;
  drugForm?: string;
  source?: string;
  observations?: string;
  warnings?: string[];
  status: 'SAFE' | 'CAUTION' | 'UNSAFE' | 'UNKNOWN';
  safetyScore: number;
  summary: string;
  flags?: { type: 'ok' | 'warn' | 'bad'; message: string }[];
  recommendation?: string;
  proTip?: string;
  foodInteractions?: { item: string; risk: string }[];
  date: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  is_pinned?: boolean;
  updated_at: string;
}

interface NotificationItem {
  id: string;
  title: string;
  summary?: string;
  type: string;
  published_at?: string;
  url?: string;
  is_read?: boolean;
  is_pinned?: boolean;
}

interface CropState {
  natW: number;
  natH: number;
  baseScale: number;
  scaleMult: number;
  offsetX: number;
  offsetY: number;
  dragging: boolean;
  startX: number;
  startY: number;
  startOffX: number;
  startOffY: number;
}

interface SavedInteractionItem {
  id: string;
  date: string;
  drugs: string[];
  summary: string;
  has_interactions: boolean;
  interactions: Array<{
    drug_pair: string;
    severity: string;
    mechanism: string;
    clinical_effect: string;
    recommendation: string;
    co_prescription_context?: {
      clinical_intent: string;
      safety_precautions: string;
      patient_advice: string;
    };
  }>;
}

const DYK_TOPICS = [
  'why you must complete your antibiotic course even when feeling better',
  'dangers of buying antibiotics without prescription in Nigeria',
  'why malaria drugs fail sometimes in Nigeria',
  'the difference between viral and bacterial infections and why antibiotics dont work for viruses',
  'typhoid fever treatment mistakes Nigerians make',
  'paracetamol overdose dangers — how much is too much',
  'why ibuprofen should not be taken on empty stomach',
  'dangers of mixing paracetamol and ibuprofen without guidance',
  'why codeine-containing drugs are now restricted in Nigeria',
  'oral rehydration therapy and how to make it at home',
  'why antacids should not be taken with other medications',
  'dangers of using flagyl metronidazole without prescription',
  'signs your stomach ulcer needs medical attention not just drugs',
  'why hypertension patients must never stop their medication suddenly',
  'salt and blood pressure — what Nigerians need to know',
  'dangers of herbal remedies for hypertension in Nigeria',
  'how to spot counterfeit drugs in Nigeria',
  'what NAFDAC registration numbers mean and how to verify them',
  'why drugs bought from roadside hawkers are dangerous',
  'how storage temperature affects drug effectiveness',
  'dangers of using expired drugs',
  'why drugs should never be shared with others even for same symptoms',
  'folic acid importance before and during pregnancy',
  'why pregnant women should avoid self-medication in first trimester',
  'iron deficiency anaemia in Nigerian women and how to treat it',
  'why mental health medication should never be stopped abruptly',
  'dangers of using tramadol recreationally',
  'why you must weigh children before giving medication doses',
  'dangers of giving aspirin to children under 16',
  'why artemisinin combination therapy ACT is the recommended malaria treatment in Nigeria',
  'why you should not drink grapefruit juice with certain medications',
  'why alcohol and metronidazole flagyl is a dangerous combination',
  'foods that interfere with blood pressure medications',
  'why milk reduces the effectiveness of some antibiotics',
  'why vitamin C improves iron absorption when taken together',
  'dangers of taking too many vitamin supplements',
  'how pain killers can damage kidneys when overused',
  'why people with liver disease must be careful with paracetamol',
  'signs your kidneys may be struggling that you should not ignore',
  'what to do immediately if someone swallows the wrong medication',
  'signs of drug allergy and when to go to emergency',
  'how to safely dispose of unused or expired medications in Nigeria',
];

export default function DashboardPage() {
  const router = useRouter();

  // Navigation & Drawer State
  const [activeView, setActiveView] = useState<'overview' | 'verify' | 'interactions' | 'history' | 'analytics' | 'account' | 'assistant' | 'chat-history'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close sidebar on view change on mobile screens
  const handleNavClick = (view: typeof activeView) => {
    setActiveView(view);
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  };
  const [chartReady, setChartReady] = useState(false);
  const [period, setPeriod] = useState<'6m' | '3m' | '1m'>('6m');

  // Notifications State
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  // User Profile State
  const [user, setUser] = useState<any>({});
  const [profile, setProfile] = useState<{ [key: string]: string }>({
    'pf-firstname': '',
    'pf-lastname': '',
    'pf-age': '',
    'pf-occupation': '',
    'pf-email': '',
    'pf-phone': '',
    'pf-state': '',
    'pf-city': '',
    'pf-allergies': '',
    'pf-conditions': '',
  });
  const [avatar, setAvatar] = useState<string>('');
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Avatar Cropper State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(100);
  const cropViewportRef = useRef<HTMLDivElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const cropStateRef = useRef<CropState>({
    natW: 0,
    natH: 0,
    baseScale: 1,
    scaleMult: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    startOffX: 0,
    startOffY: 0,
  });

  // Did You Know State
  const [dykTip, setDykTip] = useState('Loading today’s medical tip...');
  const [dykMeta, setDykMeta] = useState('');
  const [dykLoading, setDykLoading] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const PAGE_SIZE = 7;

  // Verification Form State
  const [dvDrugName, setDvDrugName] = useState('');
  const [dvManufacturer, setDvManufacturer] = useState('');
  const [dvNafdacNum, setDvNafdacNum] = useState('');
  const [dvBatchNum, setDvBatchNum] = useState('');
  const [dvExpiryDate, setDvExpiryDate] = useState('');
  const [dvStorageTemp, setDvStorageTemp] = useState('');
  const [dvPackaging, setDvPackaging] = useState('');
  const [dvDrugForm, setDvDrugForm] = useState('');
  const [dvSource, setDvSource] = useState('');
  const [dvObservations, setDvObservations] = useState('');
  const [dvWarnings, setDvWarnings] = useState<string[]>([]);
  const [dvLoading, setDvLoading] = useState(false);
  const [dvResult, setDvResult] = useState<any>(null);
  const [dvError, setDvError] = useState('');
  const [nafdacCheckResult, setNafdacCheckResult] = useState<{ found: boolean; message?: string; greenbook_url?: string } | null>(null);
  const [nafdacFormatHint, setNafdacFormatHint] = useState<string>('');

  // Chat State (PharmaBot)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [useHistoryInChat, setUseHistoryInChat] = useState(true);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSidebarCollapsed, setChatSidebarCollapsed] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Chart Instances
  const lineChartInst = useRef<any>(null);
  const donutChartInst = useRef<any>(null);
  const barChartInst = useRef<any>(null);
  const formChartInst = useRef<any>(null);
  const trendChartInst = useRef<any>(null);

  // Drug Interaction Checker State
  const [interactionDrugs, setInteractionDrugs] = useState<string[]>(['', '']);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [doctorCertified, setDoctorCertified] = useState<{ [key: number]: boolean }>({});
  const [savedInteractions, setSavedInteractions] = useState<SavedInteractionItem[]>([]);
  const [interactionResult, setInteractionResult] = useState<{
    summary: string;
    has_interactions: boolean;
    interactions: Array<{
      drug_pair: string;
      severity: string;
      mechanism: string;
      clinical_effect: string;
      recommendation: string;
      co_prescription_context?: {
        clinical_intent: string;
        safety_precautions: string;
        patient_advice: string;
      };
    }>;
  } | null>(null);

  const handleCheckInteractions = async () => {
    const valid = interactionDrugs.map((d) => d.trim()).filter(Boolean);
    if (valid.length < 2) {
      alert('Please enter at least 2 medications to check.');
      return;
    }
    setInteractionLoading(true);
    setInteractionResult(null);
    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs: valid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check failed');
      setInteractionResult(data);

      // Auto-save to Local Storage
      const newSavedItem: SavedInteractionItem = {
        id: String(Date.now()),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        drugs: valid,
        summary: data.summary,
        has_interactions: data.has_interactions,
        interactions: data.interactions,
      };

      const updatedHistory = [newSavedItem, ...savedInteractions.filter((it) => it.drugs.join(', ') !== valid.join(', '))].slice(0, 5);
      setSavedInteractions(updatedHistory);
      localStorage.setItem('pv_interaction_history', JSON.stringify(updatedHistory));
    } catch (err: any) {
      alert(err.message || 'Error checking interactions');
    } finally {
      setInteractionLoading(false);
    }
  };

  const handleLoadSavedInteraction = (item: SavedInteractionItem) => {
    setInteractionDrugs(item.drugs);
    setInteractionResult({
      summary: item.summary,
      has_interactions: item.has_interactions,
      interactions: item.interactions,
    });
  };

  const handleDeleteSavedInteraction = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedInteractions.filter((i) => i.id !== id);
    setSavedInteractions(updated);
    localStorage.setItem('pv_interaction_history', JSON.stringify(updated));
  };

  // Initial Load & Auth Check
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (localStorage.getItem('pv_logged_in') !== 'true') {
      router.push('/signin');
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem('pv_user') || '{}');
    const storedProfile = JSON.parse(localStorage.getItem('pv_profile') || '{}');

    const merged = {
      'pf-firstname': storedProfile['pf-firstname'] || storedUser.firstname || '',
      'pf-lastname': storedProfile['pf-lastname'] || storedUser.lastname || '',
      'pf-age': storedProfile['pf-age'] || (storedUser.age != null ? String(storedUser.age) : ''),
      'pf-occupation': storedProfile['pf-occupation'] || storedUser.occupation || '',
      'pf-email': storedProfile['pf-email'] || storedUser.email || '',
      'pf-phone': storedProfile['pf-phone'] || storedUser.phone || '',
      'pf-state': storedProfile['pf-state'] || storedUser.state || '',
      'pf-city': storedProfile['pf-city'] || storedUser.city || '',
      'pf-allergies': storedProfile['pf-allergies'] || storedUser.allergies || '',
      'pf-conditions': storedProfile['pf-conditions'] || storedUser.conditions || '',
    };

    setUser(storedUser);
    setProfile(merged);
    if (storedUser.avatar) {
      setAvatar(storedUser.avatar);
    }

    // Load saved interactions
    try {
      const storedInteractions = JSON.parse(localStorage.getItem('pv_interaction_history') || '[]');
      if (Array.isArray(storedInteractions)) {
        setSavedInteractions(storedInteractions);
      }
    } catch {}

    if (storedUser.id) {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', user_id: storedUser.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.history) && data.history.length > 0) {
            const mapped: HistoryRecord[] = data.history.map((r: any) => ({
              id: r.id,
              drugName: r.drug_name,
              manufacturer: r.manufacturer,
              batchNum: r.batch_num,
              nafdacNum: r.nafdac_num,
              expiryDate: r.expiry_date,
              storageTemp: r.storage,
              packaging: r.packaging,
              drugForm: r.drug_form,
              source: r.source,
              observations: r.observations,
              warnings: r.warnings || [],
              status: r.status,
              safetyScore: r.safety_score,
              summary: r.summary,
              flags: r.flags || [],
              recommendation: r.recommendation,
              proTip: r.pro_tip,
              foodInteractions: r.food_interactions || [],
              date: r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            }));
            setHistory(mapped);
            localStorage.setItem('pv_history', JSON.stringify(mapped));
          } else {
            const localHistory = JSON.parse(localStorage.getItem('pv_history') || '[]');
            if (Array.isArray(localHistory) && localHistory.length > 0) setHistory(localHistory);
          }
        })
        .catch(() => {
          const localHistory = JSON.parse(localStorage.getItem('pv_history') || '[]');
          if (Array.isArray(localHistory)) setHistory(localHistory);
        });

      loadChatSessions(storedUser.id);
      loadNotifications(storedUser.id);
    }

    loadDykTip();
  }, [router]);

  // Notifications
  const loadNotifications = async (userId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', user_id: userId }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch {}
  };

  const markAllNotificationsRead = async () => {
    if (!user.id) return;
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read', user_id: user.id }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  // Clean raw Tip format
  const cleanTipText = (raw: string): string => {
    let text = raw.replace(/```json|```/g, '').trim();
    try {
      const parsed = JSON.parse(text);
      if (parsed.tip) return parsed.tip;
      if (parsed.summary) return parsed.summary;
      if (parsed.message) return parsed.message;
      if (typeof parsed === 'string') return parsed;
    } catch {}
    text = text.replace(/^{"tip":\s*"/, '').replace(/^{"message":\s*"/, '').replace(/"}$/, '').replace(/^"/, '').replace(/"$/, '').trim();
    return text;
  };

  const loadDykTip = async (forceRefresh = false) => {
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem('pv_dyk') || '{}');

    if (!forceRefresh && stored.date === today && stored.tip) {
      setDykTip(cleanTipText(stored.tip));
      setDykMeta(stored.meta || `Tip for ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`);
      return;
    }

    setDykLoading(true);
    setDykTip('Fetching a fresh medical tip...');
    const randomTopic = DYK_TOPICS[Math.floor(Math.random() * DYK_TOPICS.length)];

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a pharmacist in Nigeria. Give ONE short "Did You Know?" medical or drug safety tip relevant to Nigerian patients regarding: ${randomTopic}.
Rules:
- Maximum 2 sentences.
- Plain text only.
- DO NOT return JSON.
- DO NOT output curly brackets, quotes or formatting.
- Practical and actionable.`,
          isChat: true,
        }),
      });
      const data = await res.json();
      const cleaned = cleanTipText(data.text || '');
      const finalTip = cleaned || 'Always check the NAFDAC registration number (NRN) and scratch-off MAS code on your medicine before use.';
      const meta = `Tip for ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`;

      setDykTip(finalTip);
      setDykMeta(meta);
      localStorage.setItem('pv_dyk', JSON.stringify({ date: today, tip: finalTip, meta }));
    } catch {
      setDykTip('Always verify your drugs on PharmaVerify NG before use. Counterfeit drugs are a major health risk in Nigeria.');
      setDykMeta(`Tip for ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`);
    } finally {
      setDykLoading(false);
    }
  };

  // Chat Session Methods
  const loadChatSessions = async (userId: string) => {
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_sessions', user_id: userId }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setChatSessions(data.sessions);
        if (data.sessions.length > 0 && !currentSessionId) {
          loadSession(data.sessions[0].id, userId);
        } else if (data.sessions.length === 0) {
          resetToDefaultChat();
        }
      }
    } catch {}
  };

  const resetToDefaultChat = () => {
    setCurrentSessionId(null);
    setChatMessages([
      {
        role: 'assistant',
        content: `Hello! I'm **PharmaBot**, your pharmaceutical AI assistant. Ask me about drug interactions, contraindications, side effects, food warnings, or medication administration instructions.`,
      },
    ]);
  };

  const loadSession = async (sessionId: string, userId?: string) => {
    const uid = userId || user.id;
    if (!uid) return;
    setCurrentSessionId(sessionId);
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_messages', user_id: uid, session_id: sessionId }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
        setChatMessages(data.messages);
      } else {
        resetToDefaultChat();
      }
    } catch {
      resetToDefaultChat();
    }
  };

  const newChatSession = async () => {
    if (!user.id) return;
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_session', user_id: user.id, title: 'New conversation' }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSessionId(data.session.id);
        resetToDefaultChat();
        loadChatSessions(user.id);
      }
    } catch {}
  };

  const renameChatSession = async (sessionId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTitle = prompt('Rename conversation:', currentTitle);
    if (!newTitle || !newTitle.trim() || newTitle.trim() === currentTitle) return;
    if (!user.id) return;

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_title', user_id: user.id, session_id: sessionId, title: newTitle.trim() }),
      });
      setChatSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s)));
    } catch {}
  };

  const deleteChatSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    if (!user.id) return;
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_session', user_id: user.id, session_id: sessionId }),
      });
      if (currentSessionId === sessionId) resetToDefaultChat();
      loadChatSessions(user.id);
    } catch {}
  };

  const togglePinSession = async (sessionId: string, isPinned: boolean | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user.id) return;
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_pin_session', user_id: user.id, session_id: sessionId, is_pinned: !isPinned }),
      });
      loadChatSessions(user.id);
    } catch {}
  };

  const handleDeleteRecord = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this scan record?')) return;

    const updated = history.filter((r) => r.id !== id);
    setHistory(updated);
    localStorage.setItem('pv_history', JSON.stringify(updated));

    if (user.id) {
      try {
        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', user_id: user.id, scan_id: id }),
        });
      } catch {}
    }
  };

  const handleDeleteAccount = async () => {
    if (!user.id) return;
    if (!confirm('Delete your account permanently? This will erase your profile and all scan history. This cannot be undone.')) return;
    const typed = prompt('Type DELETE to confirm:');
    if (typed !== 'DELETE') return;

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_account', id: user.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert('Could not delete account: ' + (data.error || 'unknown error'));
        return;
      }
      localStorage.clear();
      alert('Your account has been deleted.');
      router.push('/signin');
    } catch {
      alert('Connection error while deleting account.');
    }
  };

  // Render Charts
  useEffect(() => {
    if (!chartReady || typeof window === 'undefined' || !window.Chart) return;
    if (activeView === 'overview') renderOverviewCharts();
    else if (activeView === 'analytics') renderAnalyticsCharts();
  }, [chartReady, activeView, history, period]);

  const renderOverviewCharts = () => {
    const ctxLine = document.getElementById('dashLineChart') as HTMLCanvasElement;
    if (ctxLine) {
      if (lineChartInst.current) lineChartInst.current.destroy();
      const months = getMonthsArray(period);
      const labels = months.map((m) => m.label);
      const totalCounts = months.map((m) => history.filter((r) => r.date.startsWith(m.key)).length);
      const safeCounts = months.map((m) => history.filter((r) => r.date.startsWith(m.key) && r.status === 'SAFE').length);
      const unsafeCounts = months.map((m) => history.filter((r) => r.date.startsWith(m.key) && r.status === 'UNSAFE').length);

      lineChartInst.current = new window.Chart(ctxLine, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Total', data: totalCounts, borderColor: '#00c97a', backgroundColor: 'rgba(0,201,122,0.08)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#00c97a' },
            { label: 'Safe', data: safeCounts, borderColor: 'rgba(0,201,122,0.4)', borderDash: [4, 4], fill: false, tension: 0.4, pointRadius: 3, pointBackgroundColor: 'rgba(0,201,122,0.4)' },
            { label: 'Unsafe', data: unsafeCounts, borderColor: 'rgba(239,68,68,0.6)', borderDash: [4, 4], fill: false, tension: 0.4, pointRadius: 3, pointBackgroundColor: 'rgba(239,68,68,0.6)' },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Epilogue', size: 11 }, boxWidth: 10 } } },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
          },
        },
      });
    }

    const ctxDonut = document.getElementById('dashDonutChart') as HTMLCanvasElement;
    if (ctxDonut) {
      if (donutChartInst.current) donutChartInst.current.destroy();
      const safe = history.filter((r) => r.status === 'SAFE').length;
      const caution = history.filter((r) => r.status === 'CAUTION').length;
      const unsafe = history.filter((r) => r.status === 'UNSAFE').length;
      const unknown = history.filter((r) => r.status === 'UNKNOWN').length;

      donutChartInst.current = new window.Chart(ctxDonut, {
        type: 'doughnut',
        data: {
          labels: ['Safe', 'Caution', 'Unsafe', 'Unknown'],
          datasets: [{
            data: [safe, caution, unsafe, unknown],
            backgroundColor: ['rgba(0,201,122,0.8)', 'rgba(245,158,11,0.8)', 'rgba(239,68,68,0.8)', 'rgba(90,112,96,0.5)'],
            borderColor: ['#040a06'],
            borderWidth: 3,
          }],
        },
        options: {
          responsive: false,
          cutout: '70%',
          plugins: { legend: { display: false } },
        },
      });
    }
  };

  const renderAnalyticsCharts = () => {
    const months6 = getMonthsArray('6m');

    const ctxBar = document.getElementById('analyticsBarChart') as HTMLCanvasElement;
    if (ctxBar) {
      if (barChartInst.current) barChartInst.current.destroy();
      barChartInst.current = new window.Chart(ctxBar, {
        type: 'bar',
        data: {
          labels: months6.map((m) => m.label),
          datasets: [
            { label: 'Safe', data: months6.map((m) => history.filter((r) => r.date.startsWith(m.key) && r.status === 'SAFE').length), backgroundColor: 'rgba(0,201,122,0.7)', borderRadius: 4 },
            { label: 'Caution', data: months6.map((m) => history.filter((r) => r.date.startsWith(m.key) && r.status === 'CAUTION').length), backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4 },
            { label: 'Unsafe', data: months6.map((m) => history.filter((r) => r.date.startsWith(m.key) && r.status === 'UNSAFE').length), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Epilogue', size: 11 }, boxWidth: 10 } } },
          scales: {
            x: { stacked: true, ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { stacked: true, ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
          },
        },
      });
    }

    const ctxForm = document.getElementById('analyticsFormChart') as HTMLCanvasElement;
    if (ctxForm) {
      if (formChartInst.current) formChartInst.current.destroy();
      const formCounts: { [key: string]: number } = {};
      const formLabels: { [key: string]: string } = { tablet: 'Tablet/Capsule', capsule: 'Capsule', liquid: 'Liquid', injection: 'Injection', cream: 'Cream', powder: 'Powder', other: 'Other' };
      history.forEach((r) => {
        const k = r.drugForm || 'other';
        formCounts[k] = (formCounts[k] || 0) + 1;
      });
      const fKeys = Object.keys(formCounts);

      formChartInst.current = new window.Chart(ctxForm, {
        type: 'doughnut',
        data: {
          labels: fKeys.map((k) => formLabels[k] || k),
          datasets: [{
            data: fKeys.map((k) => formCounts[k]),
            backgroundColor: ['rgba(0,201,122,0.8)', 'rgba(96,165,250,0.8)', 'rgba(245,158,11,0.8)', 'rgba(239,68,68,0.8)', 'rgba(139,92,246,0.8)', 'rgba(249,115,22,0.8)'],
            borderColor: '#040a06',
            borderWidth: 3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '55%',
          plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Epilogue', size: 11 }, boxWidth: 10 } } },
        },
      });
    }

    const ctxTrend = document.getElementById('analyticsTrendChart') as HTMLCanvasElement;
    if (ctxTrend) {
      if (trendChartInst.current) trendChartInst.current.destroy();
      const avgScores = months6.map((m) => {
        const monthItems = history.filter((r) => r.date.startsWith(m.key));
        return monthItems.length ? Math.round(monthItems.reduce((s, r) => s + (r.safetyScore || 0), 0) / monthItems.length) : null;
      });

      trendChartInst.current = new window.Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: months6.map((m) => m.label),
          datasets: [{
            label: 'Avg Safety Score',
            data: avgScores,
            borderColor: '#00c97a',
            backgroundColor: 'rgba(0,201,122,0.06)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#00c97a',
            spanGaps: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Epilogue', size: 11 } } } },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { min: 0, max: 100, ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          },
        },
      });
    }
  };

  function getMonthsArray(p: '6m' | '3m' | '1m') {
    const count = p === '6m' ? 6 : p === '3m' ? 3 : 1;
    const res: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      res.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      });
    }
    return res;
  }

  // Avatar Cropping Logic
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      setCropImageSrc(res);
      setCropZoom(100);
      setTimeout(() => {
        const img = cropImgRef.current;
        if (!img) return;
        const CROP_VIEWPORT = 200;
        const state = cropStateRef.current;
        state.natW = img.naturalWidth;
        state.natH = img.naturalHeight;
        state.baseScale = CROP_VIEWPORT / Math.min(state.natW, state.natH);
        state.scaleMult = 1;
        const scale = state.baseScale;
        state.offsetX = (CROP_VIEWPORT - state.natW * scale) / 2;
        state.offsetY = (CROP_VIEWPORT - state.natH * scale) / 2;
        applyCropTransform();
      }, 50);
    };
    reader.readAsDataURL(file);
  };

  const applyCropTransform = () => {
    const state = cropStateRef.current;
    const scale = state.baseScale * state.scaleMult;
    const dispW = state.natW * scale;
    const dispH = state.natH * scale;
    const minX = Math.min(0, 200 - dispW);
    const minY = Math.min(0, 200 - dispH);
    state.offsetX = Math.max(minX, Math.min(0, state.offsetX));
    state.offsetY = Math.max(minY, Math.min(0, state.offsetY));

    const img = cropImgRef.current;
    if (img) {
      img.style.width = dispW + 'px';
      img.style.height = dispH + 'px';
      img.style.left = state.offsetX + 'px';
      img.style.top = state.offsetY + 'px';
    }
  };

  const handleCropZoomChange = (val: number) => {
    const state = cropStateRef.current;
    const oldScale = state.baseScale * state.scaleMult;
    const centerImgX = (100 - state.offsetX) / oldScale;
    const centerImgY = (100 - state.offsetY) / oldScale;
    state.scaleMult = val / 100;
    setCropZoom(val);
    const newScale = state.baseScale * state.scaleMult;
    state.offsetX = 100 - centerImgX * newScale;
    state.offsetY = 100 - centerImgY * newScale;
    applyCropTransform();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const state = cropStateRef.current;
    state.dragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startOffX = state.offsetX;
    state.startOffY = state.offsetY;
    if (cropViewportRef.current) {
      cropViewportRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = cropStateRef.current;
    if (!state.dragging) return;
    state.offsetX = state.startOffX + (e.clientX - state.startX);
    state.offsetY = state.startOffY + (e.clientY - state.startY);
    applyCropTransform();
  };

  const handlePointerUp = () => {
    cropStateRef.current.dragging = false;
  };

  const saveCroppedPhoto = () => {
    const img = cropImgRef.current;
    if (!img) return;
    const factor = 400 / 200;
    const state = cropStateRef.current;
    const scale = state.baseScale * state.scaleMult;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        img,
        state.offsetX * factor,
        state.offsetY * factor,
        state.natW * scale * factor,
        state.natH * scale * factor
      );
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      selectAvatar(dataUrl);
    }
  };

  const selectAvatar = async (val: string) => {
    setAvatar(val);
    const updatedUser = { ...user, avatar: val };
    setUser(updatedUser);
    localStorage.setItem('pv_user', JSON.stringify(updatedUser));

    if (user.id) {
      try {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', id: user.id, avatar: val }),
        });
      } catch {}
    }
    setAvatarModalOpen(false);
    setCropImageSrc(null);
  };

  const handleWarningToggle = (val: string) => {
    if (val === 'none') {
      setDvWarnings(['none']);
      return;
    }
    const filtered = dvWarnings.filter((w) => w !== 'none');
    if (filtered.includes(val)) {
      setDvWarnings(filtered.filter((w) => w !== val));
    } else {
      setDvWarnings([...filtered, val]);
    }
  };

  // Verification Form Handler
  const handleRunVerification = async () => {
    if (!dvDrugName.trim()) {
      alert('Please enter a drug or medication name.');
      return;
    }

    setDvLoading(true);
    setDvError('');
    setDvResult(null);
    setNafdacCheckResult(null);

    const today = new Date();
    let expiryStatus = 'not provided';
    if (dvExpiryDate) {
      const exp = new Date(dvExpiryDate + '-01');
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

    let nafdacContext = 'No NAFDAC number provided.';
    if (dvNafdacNum || dvDrugName) {
      try {
        const nRes = await fetch('/api/nafdac', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nrn: dvNafdacNum, drugName: dvDrugName, manufacturer: dvManufacturer }),
        });
        const nData = await nRes.json();
        setNafdacCheckResult(nData);
        if (nData.found) {
          nafdacContext = `NAFDAC DATABASE CHECK: ${nData.verdict}. Active ingredient: ${nData.record.activeIngredient}, Form: ${nData.record.form}, Manufacturer: ${nData.record.manufacturer}.`;
        } else {
          nafdacContext = `NAFDAC DATABASE CHECK: NRN ${dvNafdacNum || 'N/A'} was not found in local verified database. Advise checking NAFDAC Greenbook manually.`;
        }
      } catch {
        setNafdacCheckResult({
          found: false,
          message: 'Local database check unavailable. Please verify manually on the Greenbook portal.',
          greenbook_url: `https://greenbook.nafdac.gov.ng/?search=${encodeURIComponent(dvNafdacNum || dvDrugName)}`,
        });
      }
    }

    const activeWarnings = dvWarnings.filter((w) => w !== 'none');
    const prompt = `You are a pharmaceutical safety expert. User profile: ${profile['pf-occupation'] || 'Patient'}, age: ${profile['pf-age'] || 'unspecified'}. Known Allergies: ${profile['pf-allergies'] || 'None reported'}. Routine medications / conditions: ${profile['pf-conditions'] || 'None reported'}.

Analyse these medication details and return ONLY valid JSON:
- Name: ${dvDrugName}
- Manufacturer: ${dvManufacturer || 'Not provided'}
- Batch: ${dvBatchNum || 'Not provided'}
- NAFDAC NRN: ${dvNafdacNum || 'Not provided'} (${nafdacContext})
- Expiry: ${dvExpiryDate || 'Not provided'} (${expiryStatus})
- Storage: ${dvStorageTemp || 'Not provided'}
- Packaging: ${dvPackaging || 'Not provided'}
- Drug Form: ${dvDrugForm || 'Not provided'}
- Source: ${dvSource || 'Not provided'}
- Visual Observations: ${dvObservations || 'None'}
- Warnings: ${activeWarnings.length ? activeWarnings.join(', ') : 'None'}

Return ONLY valid JSON structure:
{"status":"SAFE"|"CAUTION"|"UNSAFE"|"UNKNOWN","safetyScore":<0-100>,"summary":"<2-3 sentences>","flags":[{"type":"ok"|"warn"|"bad","message":"<specific finding>"}],"recommendation":"<clear actionable advice>","proTip":"<one expert tip>"}`;

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
      if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);
      const parsed = JSON.parse(clean);
      setDvResult(parsed);

      const newRec: HistoryRecord = {
        id: Date.now(),
        drugName: dvDrugName,
        manufacturer: dvManufacturer,
        batchNum: dvBatchNum,
        nafdacNum: dvNafdacNum,
        expiryDate: dvExpiryDate,
        storageTemp: dvStorageTemp,
        packaging: dvPackaging,
        drugForm: dvDrugForm,
        source: dvSource,
        observations: dvObservations,
        warnings: dvWarnings,
        status: parsed.status,
        safetyScore: parsed.safetyScore,
        summary: parsed.summary,
        flags: parsed.flags || [],
        recommendation: parsed.recommendation,
        proTip: parsed.proTip,
        date: new Date().toISOString().split('T')[0],
      };

      const updated = [newRec, ...history];
      setHistory(updated);
      localStorage.setItem('pv_history', JSON.stringify(updated.slice(0, 100)));

      if (user.id) {
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            user_id: user.id,
            drug_name: dvDrugName,
            manufacturer: dvManufacturer,
            batch_num: dvBatchNum,
            nafdac_num: dvNafdacNum,
            expiry_date: dvExpiryDate,
            storage: dvStorageTemp,
            packaging: dvPackaging,
            drug_form: dvDrugForm,
            source: dvSource,
            observations: dvObservations,
            warnings: dvWarnings,
            status: parsed.status,
            safety_score: parsed.safetyScore,
            summary: parsed.summary,
            flags: parsed.flags,
            recommendation: parsed.recommendation,
            pro_tip: parsed.proTip,
          }),
        }).catch(() => {});
      }
    } catch (err: any) {
      setDvError(err.message || 'Verification could not complete.');
    } finally {
      setDvLoading(false);
    }
  };

  // PharmaBot Chat Handler
  const sendChatMessage = async (presetText?: string) => {
    const text = (presetText || chatInput).trim();
    if (!text) return;

    let sessId = currentSessionId;
    if (!sessId && user.id) {
      try {
        const sRes = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_session', user_id: user.id, title: text.length > 30 ? text.substring(0, 30) + '...' : text }),
        });
        const sData = await sRes.json();
        if (sData.success) {
          sessId = sData.session.id;
          setCurrentSessionId(sessId);
        }
      } catch {}
    }

    const newMsgs: ChatMessage[] = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(newMsgs);
    setChatInput('');
    setChatLoading(true);

    if (sessId && user.id) {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_message', user_id: user.id, session_id: sessId, role: 'user', content: text }),
      }).catch(() => {});
    }

    const historySummary = useHistoryInChat
      ? history.slice(0, 4).map((h) => h.drugName).join(', ') || 'none'
      : 'User opted out';

    const systemPrompt = `You are PharmaBot, an AI pharmaceutical safety assistant in Nigeria. User: ${profile['pf-occupation'] || 'Patient'}, age: ${profile['pf-age'] || 'Unspecified'}. Known Allergies: ${profile['pf-allergies'] || 'None'}. Routine medications / conditions: ${profile['pf-conditions'] || 'None'}. User recent checks: ${historySummary}.
Give clear, sound pharmaceutical advice regarding interactions, contraindications, dosage cautions, and NAFDAC guidelines. Format using markdown. Always recommend consulting a licensed pharmacist or physician.`;

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          systemPrompt,
          history: newMsgs.slice(-6),
          isChat: true,
        }),
      });
      const data = await res.json();
      const reply = data.text || 'I am here to assist.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);

      if (sessId && user.id) {
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_message', user_id: user.id, session_id: sessId, role: 'assistant', content: reply }),
        }).catch(() => {});
        loadChatSessions(user.id);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Connection error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Profile Update
  const handleSaveProfile = async () => {
    if (!profile['pf-firstname']) {
      alert('First name is required.');
      return;
    }

    localStorage.setItem('pv_profile', JSON.stringify(profile));
    localStorage.setItem('pv_user_name', `${profile['pf-firstname']} ${profile['pf-lastname'] || ''}`.trim());

    if (user.id) {
      try {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            id: user.id,
            firstname: profile['pf-firstname'],
            lastname: profile['pf-lastname'],
            age: profile['pf-age'] ? parseInt(profile['pf-age']) : null,
            occupation: profile['pf-occupation'],
            email: profile['pf-email'],
            phone: profile['pf-phone'],
            state: profile['pf-state'],
            city: profile['pf-city'],
            allergies: profile['pf-allergies'],
            conditions: profile['pf-conditions'],
          }),
        });
      } catch {}
    }

    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 3000);
  };

  // Filtered History
  const filteredHistory = history.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || r.drugName.toLowerCase().includes(q) || (r.manufacturer || '').toLowerCase().includes(q);
    const matchS = !filterStatus || r.status === filterStatus;
    const matchSrc = !filterSource || r.source === filterSource;
    return matchQ && matchS && matchSrc;
  });

  const paginatedHistory = filteredHistory.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE) || 1;

  const totalScans = history.length;
  const safeScans = history.filter((h) => h.status === 'SAFE').length;
  const cautionScans = history.filter((h) => h.status === 'CAUTION').length;
  const unsafeScans = history.filter((h) => h.status === 'UNSAFE').length;
  const avgScore = totalScans ? Math.round(history.reduce((a, b) => a + (b.safetyScore || 0), 0) / totalScans) : 0;
  const uniqueDrugsCount = new Set(history.map((h) => h.drugName.toLowerCase())).size;

  const drugCounts: { [key: string]: number } = {};
  history.forEach((h) => {
    const name = h.drugName.trim();
    drugCounts[name] = (drugCounts[name] || 0) + 1;
  });
  const topDrugs = Object.entries(drugCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topDrugMax = topDrugs[0]?.[1] || 1;

  const PRESET_AVATARS = [
    { title: 'Young Boy', src: '/avatars/av1.jpg' },
    { title: 'Young Girl', src: '/avatars/av2.jpg' },
    { title: 'Teen Boy', src: '/avatars/av3.jpg' },
    { title: 'Teen Girl', src: '/avatars/av4.jpg' },
    { title: 'Man', src: '/avatars/av5.jpg' },
    { title: 'Woman', src: '/avatars/av6.jpg' },
    { title: 'Middle-aged Man', src: '/avatars/av7.jpg' },
    { title: 'Middle-aged Woman', src: '/avatars/av8.jpg' },
    { title: 'Man 2', src: '/avatars/av9.jpg' },
    { title: 'Elder Man', src: '/avatars/av10.jpg' },
    { title: 'Elder Woman', src: '/avatars/av11.jpg' },
  ];

  const unreadNotifCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"
        onLoad={() => setChartReady(true)}
      />

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --void:#040a06;--deep:#080f0a;--surface:#0c1510;--card:#101c14;--card2:#141f18;
          --line:rgba(255,255,255,0.07);--line2:rgba(255,255,255,0.12);
          --jade:#00c97a;--jade-dim:#00a362;--jade-glow:rgba(0,201,122,0.15);--jade-pale:rgba(0,201,122,0.07);
          --ember:#f59e0b;--blood:#ef4444;--text:#e8f0ea;--text2:#9ab0a0;--text3:#5a7060;--white:#ffffff;
          --sidebar-w:240px;
        }
        html,body{
          font-family:'Epilogue',sans-serif;
          background:var(--void);
          color:var(--text);
          min-height:100vh;
          width:100% !important;
          max-width:100vw !important;
          overflow-x:hidden !important;
          margin:0;
          padding:0;
        }
        .topbar{
          background:rgba(4,10,6,0.97);
          border-bottom:1px solid var(--line);
          padding:0 1.5rem;
          height:60px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          position:sticky;
          top:0;
          z-index:600;
          width:100% !important;
          max-width:100vw !important;
          box-sizing:border-box !important;
        }
        .nav-logo{font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:var(--white);display:flex;align-items:center;gap:8px;text-decoration:none}
        .logo-icon{width:30px;height:30px;background:linear-gradient(135deg,var(--jade),var(--jade-dim));border-radius:8px;display:flex;align-items:center;justify-content:center}
        
        .menu-toggle{width:36px;height:36px;border:1px solid var(--line2);border-radius:8px;background:transparent;color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s}
        .menu-toggle:hover{border-color:var(--jade);color:var(--jade)}

        .user-pill{display:flex;align-items:center;gap:8px;padding:5px 12px 5px 6px;background:var(--card);border:1px solid var(--line2);border-radius:30px;cursor:pointer}
        .user-avatar{width:26px;height:26px;background:var(--jade);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--void);overflow:hidden}

        /* RETRACTABLE DRAWER SIDEBAR */
        .layout{
          display:flex;
          min-height:calc(100vh - 60px);
          position:relative;
          width:100% !important;
          max-width:100vw !important;
          overflow-x:hidden !important;
        }
        .sidebar{
          width:var(--sidebar-w);
          background:var(--deep);
          border-right:1px solid var(--line);
          display:flex;
          flex-direction:column;
          position:fixed;
          top:60px;
          bottom:0;
          left:0;
          height:calc(100vh - 60px);
          overflow-y:auto;
          flex-shrink:0;
          z-index:650;
          transition:transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar.closed{
          transform:translateX(-100%);
        }
        .sidebar-overlay{
          display:none;
          position:fixed;
          inset:60px 0 0 0;
          background:rgba(0,0,0,0.55);
          backdrop-filter:blur(2px);
          z-index:640;
        }
        .sidebar-overlay.show{
          display:block;
        }

        .main{
          flex:1;
          padding:2rem 2.5rem;
          overflow-y:auto;
          overflow-x:hidden;
          transition:margin-left 0.28s ease;
          margin-left:var(--sidebar-w);
          width:calc(100% - var(--sidebar-w));
          min-width:0;
          box-sizing:border-box !important;
        }
        .main.full-width{
          margin-left:0 !important;
          width:100% !important;
          max-width:100% !important;
        }

        .sidebar-section{padding:1.5rem 1rem 0.5rem;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text3)}
        .sidebar-nav{list-style:none;padding:0 0.75rem}
        .sidebar-nav li{margin-bottom:2px}
        .sidebar-nav a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;font-size:13.5px;font-weight:500;color:var(--text2);text-decoration:none;cursor:pointer;transition:all 0.15s}
        .sidebar-nav a:hover{background:rgba(255,255,255,0.06);color:var(--text)}
        .sidebar-nav a.active{background:var(--jade-pale);color:var(--jade);font-weight:600}

        .stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin-bottom:2rem;width:100%}
        .stat-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:1.5rem;position:relative}
        .stat-num{font-family:'Fraunces',serif;font-size:32px;font-weight:700;line-height:1;color:var(--white)}
        .stat-label{font-size:12px;color:var(--text3);margin-top:5px;font-weight:500}

        .chart-row{display:grid;grid-template-columns:2fr 1fr;gap:1rem;margin-bottom:2rem;width:100%}
        .chart-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:1.5rem;min-width:0}
        .chart-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem}
        .chart-head h3{font-family:'Fraunces',serif;font-size:16px;font-weight:700;color:var(--white)}
        .chart-head p{font-size:12px;color:var(--text3);margin-top:2px}

        .period-tabs{display:flex;gap:4px}
        .period-tab{padding:4px 10px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;color:var(--text3);border:1px solid transparent}
        .period-tab.active{background:var(--jade-pale);color:var(--jade);border-color:rgba(0,201,122,0.2)}

        .history-wrap{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;width:100%}
        .history-toolbar{padding:1.25rem 1.5rem;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px}
        .table-responsive{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
        table{width:100%;border-collapse:collapse;min-width:550px}
        thead tr{background:var(--surface)}
        th{padding:10px 16px;font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);text-align:left;border-bottom:1px solid var(--line)}
        td{padding:13px 16px;font-size:13.5px;color:var(--text2);border-bottom:1px solid var(--line)}
        .status-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase}
        .chip-safe{background:rgba(0,201,122,0.1);color:var(--jade);border:1px solid rgba(0,201,122,0.2)}
        .chip-caution{background:rgba(245,158,11,0.1);color:var(--ember);border:1px solid rgba(245,158,11,0.2)}
        .chip-unsafe{background:rgba(239,68,68,0.1);color:var(--blood);border:1px solid rgba(239,68,68,0.2)}

        /* FORM PANEL STYLES */
        .dv-panel{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:2.5rem;position:relative;overflow:hidden;width:100%}
        .dv-panel::before{content:'';position:absolute;top:-80px;right:-80px;width:200px;height:200px;background:radial-gradient(circle,var(--jade-glow),transparent 70%);pointer-events:none}
        .dv-head{display:flex;align-items:center;gap:12px;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--line)}
        .dv-head-icon{width:40px;height:40px;background:var(--jade-pale);border:1px solid rgba(0,201,122,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .dv-head h2{font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:var(--white);letter-spacing:-0.3px}
        .dv-head p{font-size:12.5px;color:var(--text3);margin-top:2px}
        
        .field{display:flex;flex-direction:column;gap:6px}
        .field.full{grid-column:1/-1}
        .field label{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:1px}
        .field input,.field select,.field textarea{font-family:'Epilogue',sans-serif;font-size:13.5px;color:var(--text);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:11px 14px;outline:none;transition:all 0.2s;width:100%}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--jade);box-shadow:0 0 0 3px var(--jade-pale);background:var(--deep)}
        .field input::placeholder,.field textarea::placeholder{color:var(--text3)}
        .field textarea{resize:vertical;min-height:95px;line-height:1.6}
        .field select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a7060' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px;cursor:pointer}

        .checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .check-box{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--text2);padding:9px 12px;border-radius:9px;border:1px solid var(--line);background:var(--surface);cursor:pointer;transition:all 0.15s;user-select:none}
        .check-box:hover{border-color:rgba(0,201,122,0.3);background:var(--jade-pale);color:var(--text)}
        .check-box input[type=checkbox]{width:15px;height:15px;accent-color:var(--jade);cursor:pointer;flex-shrink:0}

        .verify-btn{width:100%;margin-top:1.75rem;background:var(--jade);color:var(--void);border:none;border-radius:12px;padding:15px;font-family:'Fraunces',serif;font-size:16px;font-weight:700;letter-spacing:0.2px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.2s}
        .verify-btn:hover{background:#00e68a;box-shadow:0 12px 36px rgba(0,201,122,0.35);transform:translateY(-1px)}

        /* SIDEBAR IN VERIFY VIEW */
        .dv-aside{display:flex;flex-direction:column;gap:1.5rem;width:100%}
        .result-placeholder{background:var(--card);border:1px dashed var(--line2);border-radius:20px;padding:3rem 2rem;text-align:center;color:var(--text3)}
        .result-placeholder .ph-icon{width:56px;height:56px;background:var(--jade-pale);border:1px solid rgba(0,201,122,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem}
        .result-placeholder h3{font-family:'Fraunces',serif;font-size:16px;font-weight:600;color:var(--text2);margin-bottom:0.5rem}
        .result-placeholder p{font-size:13px;line-height:1.65}

        .info-widget{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:1.5rem;width:100%}
        .info-widget h3{font-family:'Fraunces',serif;font-size:15px;font-weight:700;color:var(--white);margin-bottom:1.25rem}
        .check-list{list-style:none;display:flex;flex-direction:column;gap:10px}
        .check-list li{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--text2);line-height:1.5}
        .cl-num{width:22px;height:22px;background:var(--jade);color:var(--void);border-radius:50%;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        .warn-box{background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:14px 16px;font-size:12.5px;color:#d4a83a;line-height:1.65}
        .warn-box strong{display:block;font-family:'Fraunces',serif;font-size:13px;margin-bottom:3px;color:var(--ember)}

        .btn-jade{background:var(--jade);color:var(--void);border:none;border-radius:10px;padding:12px 24px;font-family:'Fraunces',serif;font-size:15px;font-weight:700;cursor:pointer}

        .chat-panel{background:var(--card);border:1px solid var(--line);border-radius:16px;display:flex;flex-direction:column;min-height:580px;width:100%}
        .chat-messages{flex:1;overflow-y:auto;padding:1.25rem;display:flex;flex-direction:column;gap:1rem}
        .msg{display:flex;gap:10px}
        .msg.user{flex-direction:row-reverse}
        .msg-bubble{max-width:80%;padding:12px 16px;border-radius:14px;font-size:13.5px;line-height:1.6}
        .msg.ai .msg-bubble{background:var(--surface);border:1px solid var(--line);color:var(--text2)}
        .msg.user .msg-bubble{background:var(--jade);color:var(--void);font-weight:500}

        .chat-session-item{padding:8px 10px;border-radius:9px;cursor:pointer;transition:all 0.15s;border:1px solid transparent;position:relative}
        .chat-session-item:hover{background:rgba(255,255,255,0.06);border-color:var(--line)}
        .chat-session-item.active{background:var(--jade-pale);border-color:rgba(0,201,122,0.2)}
        .chat-session-actions{display:none;gap:4px;position:absolute;right:6px;top:50%;transform:translateY(-50%)}
        .chat-session-item:hover .chat-session-actions{display:flex}
        .cs-btn{background:none;border:none;cursor:pointer;font-size:12px;padding:2px 4px;border-radius:4px;color:var(--text2)}

        .action-btn{padding:5px 12px;border-radius:7px;font-family:'Epilogue',sans-serif;font-size:12px;font-weight:600;border:1px solid var(--line2);background:transparent;color:var(--text2);cursor:pointer;transition:all 0.15s}
        .action-btn:hover{border-color:var(--jade);color:var(--jade)}

        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:900;display:flex;align-items:center;justify-content:center;padding:1.5rem;backdrop-filter:blur(4px)}
        .modal{background:var(--card);border:1px solid var(--line2);border-radius:20px;width:100%;max-width:540px;max-height:85vh;overflow-y:auto;padding:1.75rem}

        .interactions-grid-wrap {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 1.75rem;
          align-items: start;
          width: 100%;
        }
        .interaction-actions-row {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        /* ═══ MOBILE FIXES & HORIZONTAL SCROLL SNAP (< 900px) ═══ */
        @media(max-width:900px){
          .topbar{
            padding:0 1rem !important;
            width:100% !important;
            max-width:100vw !important;
          }
          .nav-subtitle{display:none !important}
          
          .layout{
            display:block !important;
            width:100% !important;
            max-width:100vw !important;
            overflow-x:hidden !important;
          }

          .main{
            display:block !important;
            padding:1.25rem 1rem !important;
            margin-left:0 !important;
            width:100% !important;
            max-width:100vw !important;
            box-sizing:border-box !important;
            overflow-x:hidden !important;
          }

          .main > div{
            width:100% !important;
            max-width:100% !important;
            box-sizing:border-box !important;
          }
          
          .sidebar{
            position:fixed !important;
            top:60px !important;
            bottom:0 !important;
            left:0 !important;
            z-index:700 !important;
            transform:translateX(-100%);
          }
          .sidebar:not(.closed){
            transform:translateX(0) !important;
          }

          /* Stat Cards Sideways Scroll Carousel */
          .stat-grid{
            display:flex !important;
            flex-direction:row !important;
            overflow-x:auto !important;
            scroll-snap-type:x mandatory !important;
            -webkit-overflow-scrolling:touch !important;
            gap:12px !important;
            padding-bottom:10px !important;
            margin-left:-1rem !important;
            margin-right:-1rem !important;
            padding-left:1rem !important;
            padding-right:1rem !important;
            scrollbar-width:none !important;
            width:calc(100% + 2rem) !important;
          }
          .stat-grid::-webkit-scrollbar{display:none}
          .stat-card{
            flex:0 0 72% !important;
            max-width:72% !important;
            scroll-snap-align:start !important;
            min-width:200px !important;
          }

          /* Convert all multi-column layouts to stack cleanly */
          .chart-row,
          .assistant-grid,
          .interactions-grid-wrap,
          div[style*="gridTemplateColumns: '1fr 380px'"],
          div[style*="grid-template-columns: 1fr 380px"],
          div[style*="gridTemplateColumns: 'minmax(0, 1fr) 320px'"],
          div[style*="grid-template-columns: minmax(0, 1fr) 320px"],
          div[style*="gridTemplateColumns: '1fr 1fr'"],
          div[style*="grid-template-columns: 1fr 1fr"],
          div[style*="gridTemplateColumns: '280px 1fr'"],
          div[style*="grid-template-columns: 280px 1fr"] {
            display:flex !important;
            flex-direction:column !important;
            grid-template-columns:1fr !important;
            width:100% !important;
            gap:1.25rem !important;
          }

          .interaction-actions-row {
            flex-direction:column !important;
            align-items:stretch !important;
            gap:10px !important;
          }
          .interaction-actions-row button {
            width:100% !important;
            text-align:center !important;
          }

          .dv-panel{padding:1.5rem 1.25rem !important}
          .checks{grid-template-columns:1fr !important}
          .chat-panel{min-height:500px !important}
        }
      `}</style>

      {/* TOPBAR */}
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* HAMBURGER DRAWER BUTTON */}
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Navigation Sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link href="/" className="nav-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#040a06" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>
            PharmaVerify<sup style={{ fontSize: '10px', verticalAlign: 'super' }}>NG</sup>
          </Link>
          <span className="nav-subtitle" style={{ fontSize: 13, color: 'var(--text3)' }}>My Dashboard</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* NOTIFICATION BELL */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              title="NAFDAC Alerts"
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--line2)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unreadNotifCount > 0 && (
                <span style={{ position: 'absolute', top: -3, right: -3, background: 'var(--blood)', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* NOTIFICATIONS POPOVER */}
            {notifOpen && (
              <div style={{ position: 'fixed', top: 64, right: 16, width: 'min(380px, calc(100vw - 2rem))', maxHeight: '80vh', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 750, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)' }}>
                  <div>
                    <div style={{ fontFamily: 'Fraunces', fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>Notifications</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>NAFDAC alerts & safety updates</div>
                  </div>
                  <button onClick={markAllNotificationsRead} style={{ fontSize: 11.5, color: 'var(--jade)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Mark all read
                  </button>
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 380 }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => { setSelectedNotif(n); setNotifOpen(false); }}
                      style={{ padding: '10px 1.25rem', borderBottom: '1px solid var(--line)', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', background: !n.is_read ? 'rgba(0,201,122,0.04)' : 'transparent' }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: !n.is_read ? 'var(--jade)' : 'transparent', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', lineHeight: 1.4 }}>{n.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ textTransform: 'uppercase', padding: '1px 6px', borderRadius: 4, background: n.type === 'recall' ? 'rgba(239,68,68,0.15)' : 'var(--jade-pale)', color: n.type === 'recall' ? 'var(--blood)' : 'var(--jade)', fontSize: 9.5, fontWeight: 700 }}>
                            {n.type}
                          </span>
                          <span>{n.published_at ? new Date(n.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                      No notifications at this time
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="user-pill" onClick={() => setActiveView('account')}>
            <div className="user-avatar">
              {avatar ? (
                <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile['pf-firstname']?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {profile['pf-firstname'] ? `@${profile['pf-firstname'].toLowerCase()}` : '@user'}
            </span>
          </div>

          <Link href="/" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '12.5px', padding: '6px 14px', border: '1px solid var(--line2)', borderRadius: 8 }}>
            Back to site
          </Link>
        </div>
      </header>

      <div className="layout">
        {/* MOBILE OVERLAY */}
        <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* DRAWER SIDEBAR */}
        <aside className={`sidebar ${!sidebarOpen ? 'closed' : ''}`}>
          <div className="sidebar-section">Main</div>
          <ul className="sidebar-nav">
            <li>
              <a className={activeView === 'overview' ? 'active' : ''} onClick={() => handleNavClick('overview')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                Overview
              </a>
            </li>
            <li>
              <a className={activeView === 'verify' ? 'active' : ''} onClick={() => handleNavClick('verify')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Verify Drug
              </a>
            </li>
            <li>
              <a className={activeView === 'interactions' ? 'active' : ''} onClick={() => handleNavClick('interactions')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.5 6h-6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-6" />
                  <path d="M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Drug Interactions
              </a>
            </li>
            <li>
              <a className={activeView === 'history' ? 'active' : ''} onClick={() => handleNavClick('history')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Scan History
              </a>
            </li>
            <li>
              <a className={activeView === 'analytics' ? 'active' : ''} onClick={() => handleNavClick('analytics')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
                Analytics
              </a>
            </li>
          </ul>

          <div className="sidebar-section">Account</div>
          <ul className="sidebar-nav">
            <li>
              <a className={activeView === 'account' ? 'active' : ''} onClick={() => handleNavClick('account')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                My Profile
              </a>
            </li>
            <li>
              <a className={activeView === 'assistant' ? 'active' : ''} onClick={() => handleNavClick('assistant')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                AI Assistant
              </a>
              <ul style={{ listStyle: 'none', paddingLeft: '1.75rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li>
                  <a
                    className={activeView === 'chat-history' ? 'active' : ''}
                    onClick={() => handleNavClick('chat-history')}
                    style={{
                      fontSize: '12px',
                      color: activeView === 'chat-history' ? 'var(--jade, #00c97a)' : 'var(--text3, #6b7280)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Chat History
                  </a>
                </li>
              </ul>
            </li>
          </ul>

          <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--line)' }}>
            <button
              onClick={() => {
                if (confirm('Sign out of PharmaVerify NG?')) {
                  localStorage.removeItem('pv_logged_in');
                  router.push('/signin');
                }
              }}
              style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--blood)', textAlign: 'left', cursor: 'pointer', padding: '8px 12px', fontSize: 13, fontWeight: 600 }}
            >
              Sign Out →
            </button>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <main className={`main ${!sidebarOpen ? 'full-width' : ''}`}>
          {/* ═════════ VIEW 1: OVERVIEW ═════════ */}
          {activeView === 'overview' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                  <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>
                    Good day, {profile['pf-firstname'] || 'there'} 👋
                  </h1>
                  <p style={{ fontSize: 13.5, color: 'var(--text3)', marginTop: 4 }}>
                    Here&apos;s a summary of your verification activity
                  </p>
                </div>
                <button className="btn-jade" onClick={() => handleNavClick('verify')} style={{ padding: '8px 18px', fontSize: 13 }}>
                  + New Verification
                </button>
              </div>

              {/* DID YOU KNOW WITH REFRESH */}
              <div style={{ background: 'var(--jade-pale)', border: '1px solid rgba(0,201,122,0.2)', padding: '1.25rem 1.5rem', borderRadius: 16, marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
                <div style={{ width: 40, height: 40, background: 'var(--jade)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  💡
                </div>
                <div style={{ flex: 1, paddingRight: '2rem' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--jade)', marginBottom: 4 }}>
                    Did You Know?
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.75 }}>
                    {dykTip}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{dykMeta}</div>
                </div>

                <button
                  onClick={() => loadDykTip(true)}
                  disabled={dykLoading}
                  title="Get another random tip"
                  style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, padding: 4, transition: 'all 0.2s', lineHeight: 1 }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--jade)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text3)')}
                >
                  ↻
                </button>
              </div>

              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-num">{totalScans}</div>
                  <div className="stat-label">Total Verifications</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: 'var(--jade)' }}>{safeScans}</div>
                  <div className="stat-label">Safe Results ({totalScans ? Math.round((safeScans / totalScans) * 100) : 0}%)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: 'var(--ember)' }}>{cautionScans}</div>
                  <div className="stat-label">Caution Flags ({totalScans ? Math.round((cautionScans / totalScans) * 100) : 0}%)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: 'var(--blood)' }}>{unsafeScans}</div>
                  <div className="stat-label">Unsafe Detected ({totalScans ? Math.round((unsafeScans / totalScans) * 100) : 0}%)</div>
                </div>
              </div>

              <div className="chart-row">
                <div className="chart-card">
                  <div className="chart-head">
                    <div>
                      <h3>Verifications Over Time</h3>
                      <p>Your scan activity by month</p>
                    </div>
                    <div className="period-tabs">
                      <div className={`period-tab ${period === '6m' ? 'active' : ''}`} onClick={() => setPeriod('6m')}>6M</div>
                      <div className={`period-tab ${period === '3m' ? 'active' : ''}`} onClick={() => setPeriod('3m')}>3M</div>
                      <div className={`period-tab ${period === '1m' ? 'active' : ''}`} onClick={() => setPeriod('1m')}>1M</div>
                    </div>
                  </div>
                  <div style={{ height: 180 }}>
                    <canvas id="dashLineChart"></canvas>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-head">
                    <div>
                      <h3>Result Breakdown</h3>
                      <p>Distribution of outcomes</p>
                    </div>
                  </div>
                  <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
                    <canvas id="dashDonutChart" width="140" height="140"></canvas>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                      <div style={{ fontFamily: 'Fraunces', fontSize: 24, fontWeight: 700, color: '#fff' }}>{totalScans}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>total</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                      <span>🟢 Safe</span> <strong>{safeScans}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                      <span>🟡 Caution</span> <strong>{cautionScans}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                      <span>🔴 Unsafe</span> <strong>{unsafeScans}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="history-wrap">
                <div className="history-toolbar">
                  <h3 style={{ fontFamily: 'Fraunces', fontSize: 16 }}>Recent Verifications</h3>
                  <button onClick={() => handleNavClick('history')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--jade)', cursor: 'pointer', fontSize: 13 }}>
                    View all →
                  </button>
                </div>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Drug</th>
                        <th>Result</th>
                        <th>Score</th>
                        <th>Source</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 5).map((r) => (
                        <tr key={r.id} onClick={() => setSelectedRecord(r)} style={{ cursor: 'pointer' }}>
                          <td>
                            <strong>{r.drugName}</strong>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.manufacturer || '—'}</div>
                          </td>
                          <td><span className={`status-chip chip-${r.status.toLowerCase()}`}>{r.status}</span></td>
                          <td><strong>{r.safetyScore}</strong></td>
                          <td style={{ textTransform: 'capitalize' }}>{r.source || '—'}</td>
                          <td style={{ color: 'var(--text3)' }}>{r.date}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <button className="action-btn" onClick={(e) => { e.stopPropagation(); setSelectedRecord(r); }}>
                                View
                              </button>
                              <button className="action-btn" style={{ color: 'var(--blood)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={(e) => handleDeleteRecord(r.id, e)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                            No verifications run yet. Click &quot;Verify Drug&quot; to test a medication.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ VIEW 2: VERIFY DRUG ═════════ */}
          {activeView === 'verify' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
                {/* LEFT: DRUG VERIFICATION FORM PANEL */}
                <div className="dv-panel">
                  <div className="dv-head">
                    <div className="dv-head-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                      </svg>
                    </div>
                    <div>
                      <h2>Drug Verification Form</h2>
                      <p>Complete all fields for the most accurate assessment</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="field">
                      <label>DRUG / MEDICATION NAME *</label>
                      <input type="text" placeholder="e.g. Paracetamol 500mg" value={dvDrugName} onChange={(e) => setDvDrugName(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>MANUFACTURER / BRAND</label>
                      <input type="text" placeholder="e.g. Emzor, GSK, Pfizer" value={dvManufacturer} onChange={(e) => setDvManufacturer(e.target.value)} />
                    </div>

                    {/* NAFDAC REGISTRATION NUMBER ROW */}
                    <div className="field" style={{ gridColumn: '1/-1' }}>
                      <label>NAFDAC REGISTRATION NUMBER</label>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="e.g. A4-0123 or 04-5808"
                          value={dvNafdacNum}
                          onChange={(e) => {
                            const val = e.target.value.trim().toUpperCase();
                            setDvNafdacNum(val);
                            if (!val) {
                              setNafdacFormatHint('');
                              return;
                            }
                            const valid = /^([A-Z]\d{1,2}|\d{2})-\d{4,7}$/.test(val);
                            if (valid) {
                              const prefixMap: { [key: string]: string } = {
                                A4: 'Imported drug',
                                B4: 'Biologic/vaccine',
                                '04': 'Locally manufactured',
                                C4: 'Cosmetic',
                                D4: 'Medical device',
                                E4: 'Herbal/nutraceutical',
                              };
                              const prefix = val.split('-')[0];
                              setNafdacFormatHint(`✓ Valid format — ${prefixMap[prefix] || 'Registered product'}`);
                            } else {
                              setNafdacFormatHint('⚠ Standard format: A4-XXXX, 04-XXXX, B4-XXXX, etc.');
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const query = dvNafdacNum || dvDrugName;
                            window.open(`https://greenbook.nafdac.gov.ng/?search=${encodeURIComponent(query || '')}`, '_blank');
                          }}
                          className="action-btn"
                          style={{ whiteSpace: 'nowrap', padding: '11px 16px', height: '100%', borderRadius: 10 }}
                          title="Open NAFDAC Greenbook database"
                        >
                          Greenbook ↗
                        </button>
                      </div>
                      {nafdacFormatHint && (
                        <div style={{ fontSize: 11.5, color: nafdacFormatHint.startsWith('✓') ? 'var(--jade)' : 'var(--ember)', marginTop: 2 }}>
                          {nafdacFormatHint}
                        </div>
                      )}
                    </div>

                    <div className="field">
                      <label>BATCH / LOT NUMBER</label>
                      <input type="text" placeholder="e.g. BTX-2023-441" value={dvBatchNum} onChange={(e) => setDvBatchNum(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>EXPIRY DATE</label>
                      <input type="month" value={dvExpiryDate} onChange={(e) => setDvExpiryDate(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>STORAGE CONDITION</label>
                      <select value={dvStorageTemp} onChange={(e) => setDvStorageTemp(e.target.value)}>
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
                      <label>PACKAGING CONDITION</label>
                      <select value={dvPackaging} onChange={(e) => setDvPackaging(e.target.value)}>
                        <option value="">Select condition</option>
                        <option value="intact">Intact & factory sealed</option>
                        <option value="opened">Opened but undamaged</option>
                        <option value="damaged">Damaged / torn / wet</option>
                        <option value="repackaged">Repackaged / suspicious</option>
                        <option value="missing">No packaging / loose</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>DRUG FORM</label>
                      <select value={dvDrugForm} onChange={(e) => setDvDrugForm(e.target.value)}>
                        <option value="">Select form</option>
                        <option value="tablet">Tablet / Capsule</option>
                        <option value="liquid">Liquid / Syrup</option>
                        <option value="injection">Injection / Ampoule</option>
                        <option value="cream">Cream / Ointment</option>
                        <option value="powder">Powder / Sachet</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>SOURCE OF ACQUISITION</label>
                      <select value={dvSource} onChange={(e) => setDvSource(e.target.value)}>
                        <option value="">Where was it purchased?</option>
                        <option value="pharmacy">Licensed pharmacy</option>
                        <option value="hospital">Hospital / clinic</option>
                        <option value="market">Open market / hawker</option>
                        <option value="online">Online store</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="field full">
                      <label>VISUAL OBSERVATIONS</label>
                      <textarea
                        placeholder="Describe any changes — discoloration, unusual smell, crumbling tablets, cloudiness in liquid, mold, unexpected taste, cracks, etc."
                        value={dvObservations}
                        onChange={(e) => setDvObservations(e.target.value)}
                      ></textarea>
                    </div>
                  </div>

                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text3)', letterSpacing: 1.5, textTransform: 'uppercase', margin: '1.5rem 0 1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
                    OBSERVED WARNING SIGNS (CHECK ALL THAT APPLY)
                  </div>

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
                        <input
                          type="checkbox"
                          checked={dvWarnings.includes(item.id)}
                          onChange={() => handleWarningToggle(item.id)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>

                  <button className="verify-btn" onClick={handleRunVerification} disabled={dvLoading}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {dvLoading ? 'Analysing with Gemini AI...' : 'Run Verification Analysis'}
                  </button>
                </div>

                {/* RIGHT SIDEBAR WITH GREENBOOK CONDITIONAL RECOMMENDATION */}
                <div className="dv-aside">
                  {dvError && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--blood)', padding: '1rem', borderRadius: 12, marginBottom: 14 }}>
                      {dvError}
                    </div>
                  )}

                  {!dvResult && !dvError && (
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

                  {dvResult && (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 20, padding: '1.5rem' }}>
                      <span className={`status-chip chip-${dvResult.status.toLowerCase()}`}>{dvResult.status}</span>
                      <h2 style={{ fontFamily: 'Fraunces', fontSize: 20, marginTop: 8 }}>{dvDrugName}</h2>
                      <div style={{ fontSize: 13, color: 'var(--jade)', marginTop: 4 }}>
                        Safety Score: <strong>{dvResult.safetyScore}/100</strong>
                      </div>

                      {/* CONDITIONAL GREENBOOK RECOMMENDATION */}
                      {nafdacCheckResult && !nafdacCheckResult.found && (
                        <div style={{ marginTop: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '12px 14px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ember)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                            ⚠️ NAFDAC Verification Notice
                          </div>
                          <p style={{ fontSize: 12.5, color: '#e5b869', lineHeight: 1.5, marginBottom: 8 }}>
                            {dvNafdacNum ? `NRN "${dvNafdacNum}"` : 'This product'} was not found in our pre-indexed offline database. We strongly recommend verifying the registry entry directly on the official Greenbook portal.
                          </p>
                          <a
                            href={nafdacCheckResult.greenbook_url || `https://greenbook.nafdac.gov.ng/?search=${encodeURIComponent(dvNafdacNum || dvDrugName)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-jade"
                            style={{ display: 'inline-block', textAlign: 'center', width: '100%', fontSize: 12.5, padding: '8px 14px', textDecoration: 'none' }}
                          >
                            Check on NAFDAC Greenbook ↗
                          </a>
                        </div>
                      )}

                      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Summary</div>
                        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, lineHeight: 1.6 }}>{dvResult.summary}</p>
                      </div>

                      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Recommendation</div>
                        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, lineHeight: 1.6 }}>{dvResult.recommendation}</p>
                      </div>

                      {dvResult.proTip && (
                        <div style={{ marginTop: '1rem', background: 'var(--jade-pale)', padding: '10px 14px', borderRadius: 10, color: 'var(--jade)', fontSize: 12.5, fontStyle: 'italic' }}>
                          {dvResult.proTip}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="info-widget">
                    <h3>What We Assess</h3>
                    <ul className="check-list">
                      <li><div className="cl-num">1</div><span>Expiry validity — expired or approaching end-of-life</span></li>
                      <li><div className="cl-num">2</div><span>Temperature & storage suitability</span></li>
                      <li><div className="cl-num">3</div><span>Packaging integrity & tamper evidence</span></li>
                      <li><div className="cl-num">4</div><span>Physical appearance — color, odor, texture</span></li>
                      <li><div className="cl-num">5</div><span>Acquisition source risk assessment</span></li>
                      <li><div className="cl-num">6</div><span>Counterfeit likelihood indicators</span></li>
                    </ul>
                  </div>

                  <div className="warn-box">
                    <strong>⚠ Educational Tool</strong>
                    Results are informational and not a substitute for professional medical advice. Always consult a licensed pharmacist or physician before using any medication.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ VIEW 3: DRUG INTERACTIONS ═════════ */}
          {activeView === 'interactions' && (
            <div>
              <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>Drug Interaction Checker</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text3)', marginTop: 4 }}>
                  Evaluate potential clinical drug-drug interactions, mechanisms, and safety warnings
                </p>
              </div>

              {/* RESPONSIVE LAYOUT: FORM & RESULTS ON TOP/LEFT, RECENT CHECKS ON BOTTOM/RIGHT */}
              <div className="interactions-grid-wrap">
                {/* CHECKER FORM + ACTIVE RESULT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0, width: '100%' }}>
                  {/* INPUT CARD */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '1.5rem', width: '100%' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>
                      Enter Active Ingredients or Brand Names
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      {interactionDrugs.map((drug, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
                          <input
                            type="text"
                            placeholder={`Medication ${idx + 1} (e.g. ${idx === 0 ? 'Augmentin' : 'Cataflam'})`}
                            value={drug}
                            onChange={(e) => {
                              const updated = [...interactionDrugs];
                              updated[idx] = e.target.value;
                              setInteractionDrugs(updated);
                            }}
                            style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', color: '#fff', outline: 'none', fontSize: 13.5 }}
                          />
                          {interactionDrugs.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setInteractionDrugs(interactionDrugs.filter((_, i) => i !== idx))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--blood)', cursor: 'pointer', fontSize: 16, padding: '0 8px', flexShrink: 0 }}
                              title="Remove drug"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="interaction-actions-row">
                      <button
                        type="button"
                        onClick={() => setInteractionDrugs([...interactionDrugs, ''])}
                        style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text2)', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                      >
                        + Add Another Drug
                      </button>

                      <button
                        className="btn-jade"
                        onClick={handleCheckInteractions}
                        disabled={interactionLoading}
                        style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8 }}
                      >
                        {interactionLoading ? 'Analyzing Interactions...' : 'Check Interactions →'}
                      </button>
                    </div>
                  </div>

                  {/* RESULTS AREA */}
                  {interactionResult && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {(() => {
                        const hasContraindicated = interactionResult.interactions.some(
                          (it) => it.severity.toLowerCase() === 'contraindicated'
                        );
                        const themeColor = !interactionResult.has_interactions
                          ? '#00c97a' // Safe (Green)
                          : hasContraindicated
                          ? '#ef4444' // Strict Contraindication only (Red)
                          : '#f59e0b'; // Clinical caution / standard co-prescription (Warm Amber)

                        return (
                          <div
                            style={{
                              padding: '1.25rem 1.5rem',
                              borderRadius: 14,
                              background: `${themeColor}0d`,
                              border: `1px solid ${themeColor}33`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 1.2,
                                color: themeColor,
                                marginBottom: 6,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <span>{hasContraindicated ? '⚠️' : !interactionResult.has_interactions ? '✓' : 'ℹ️'}</span>
                              Clinical Summary & Guidance
                            </div>
                            <div style={{ fontSize: 13.5, color: 'var(--text1)', lineHeight: 1.6 }}>
                              {interactionResult.summary}
                            </div>
                          </div>
                        );
                      })()}

                      {interactionResult.interactions.map((item, i) => {
                        const isCertified = !!doctorCertified[i];
                        const sev = item.severity.toLowerCase();
                        const isSevere = sev === 'contraindicated' || sev === 'major';
                        const badgeColor = isCertified
                          ? '#38bdf8'
                          : isSevere
                          ? '#f59e0b'
                          : sev === 'moderate'
                          ? '#f59e0b'
                          : '#00c97a';

                        return (
                          <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
                              <div style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                                {item.drug_pair}
                              </div>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '4px 10px',
                                borderRadius: 20,
                                background: `${badgeColor}18`,
                                color: badgeColor,
                                border: `1px solid ${badgeColor}40`,
                              }}>
                                {isCertified ? '✓ Prescribed Co-Therapy' : item.severity}
                              </span>
                            </div>

                            {/* DOCTOR / PHARMACIST CERTIFIED CHECKBOX */}
                            <div style={{ background: 'var(--surface)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: 'var(--text2)', fontWeight: 500 }}>
                                <input
                                  type="checkbox"
                                  checked={isCertified}
                                  onChange={(e) => setDoctorCertified({ ...doctorCertified, [i]: e.target.checked })}
                                  style={{ accentColor: 'var(--jade)', width: 16, height: 16, cursor: 'pointer' }}
                                />
                                Prescribed by my Doctor / Dispensed by Pharmacist together
                              </label>
                              {isCertified && (
                                <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>
                                  Protocol Active
                                </span>
                              )}
                            </div>

                            {/* IF OVERRIDDEN: SHOW CO-PRESCRIPTION MANAGEMENT PROTOCOL */}
                            {isCertified && item.co_prescription_context && (
                              <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#38bdf8', marginBottom: 6 }}>
                                  🩺 Co-Prescription Management Protocol
                                </div>
                                
                                <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.5, marginBottom: 10 }}>
                                  <strong style={{ color: '#fff' }}>Why this combination is prescribed:</strong> {item.co_prescription_context.clinical_intent}
                                </div>

                                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 10, background: 'var(--surface)', padding: '10px 12px', borderRadius: 8, borderLeft: '3px solid #38bdf8' }}>
                                  <strong style={{ color: '#38bdf8' }}>Safety Precautions:</strong> {item.co_prescription_context.safety_precautions}
                                </div>

                                <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                                  ℹ️ {item.co_prescription_context.patient_advice}
                                </div>
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
                              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
                                  Mechanism
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                                  {item.mechanism}
                                </div>
                              </div>

                              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
                                  Clinical Effect
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                                  {item.clinical_effect}
                                </div>
                              </div>
                            </div>

                            <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: 10, background: 'rgba(0, 201, 122, 0.05)', border: '1px solid rgba(0, 201, 122, 0.15)' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--jade)', marginBottom: 2 }}>
                                Pharmacist Recommendation
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                                {item.recommendation}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: RECENT INTERACTION CHECKS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
                  <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '1.25rem', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)' }}>
                        Recent Checks
                      </div>
                      {savedInteractions.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--jade)', fontWeight: 600 }}>
                          {savedInteractions.length} saved
                        </span>
                      )}
                    </div>

                    {savedInteractions.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.5, textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                        Your checked drug combinations will appear here for one-click re-testing.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {savedInteractions.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleLoadSavedInteraction(item)}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--line)',
                              borderRadius: 10,
                              padding: '10px 12px',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'all 0.15s',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'rgba(0,201,122,0.3)')}
                            onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', lineHeight: 1.3 }}>
                                {item.drugs.join(' + ')}
                              </div>
                              <button
                                onClick={(e) => handleDeleteSavedInteraction(item.id, e)}
                                title="Remove check"
                                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, padding: 0 }}
                              >
                                ✕
                              </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                              <span style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: item.has_interactions ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 201, 122, 0.15)',
                                color: item.has_interactions ? 'var(--ember)' : 'var(--jade)',
                              }}>
                                {item.has_interactions ? 'Guidance Available' : 'Safe / Minor'}
                              </span>
                              <span style={{ fontSize: 10.5, color: 'var(--text3)' }}>
                                {item.date}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '1.25rem', borderRadius: 16, fontSize: 12, color: '#a07830', lineHeight: 1.6, width: '100%' }}>
                    <strong style={{ display: 'block', color: 'var(--ember)', marginBottom: 4 }}>💡 Clinical Reminder</strong>
                    Brand-name medications may contain multiple active ingredients. Always confirm dosages with your prescriber.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ VIEW 4: SCAN HISTORY ═════════ */}
          {activeView === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>Scan History</h1>
                  <p style={{ fontSize: 13.5, color: 'var(--text3)', marginTop: 4 }}>All your drug verifications in one place</p>
                </div>
                <button
                  onClick={() => {
                    const csvContent = 'data:text/csv;charset=utf-8,' + ['Drug,Status,Score,Source,Date', ...history.map((h) => `"${h.drugName}","${h.status}",${h.safetyScore},"${h.source || ''}","${h.date}"`)].join('\n');
                    const link = document.createElement('a');
                    link.setAttribute('href', encodeURI(csvContent));
                    link.setAttribute('download', 'pharmaverify_history.csv');
                    document.body.appendChild(link);
                    link.click();
                  }}
                  style={{ background: 'transparent', border: '1px solid var(--line2)', color: 'var(--text2)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
                >
                  ↓ Export CSV
                </button>
              </div>

              <div className="history-wrap">
                <div className="history-toolbar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Search drug name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: '1 1 200px', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--line)', color: '#fff', padding: '9px 14px', borderRadius: 8, outline: 'none' }}
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text2)', padding: '9px 14px', borderRadius: 8, outline: 'none' }}
                  >
                    <option value="">All results</option>
                    <option value="SAFE">Safe</option>
                    <option value="CAUTION">Caution</option>
                    <option value="UNSAFE">Unsafe</option>
                  </select>
                </div>

                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Drug</th>
                        <th>Result</th>
                        <th>Score</th>
                        <th>Form</th>
                        <th>Source</th>
                        <th>Expiry</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistory.map((r) => (
                        <tr key={r.id} onClick={() => setSelectedRecord(r)} style={{ cursor: 'pointer' }}>
                          <td>
                            <strong>{r.drugName}</strong>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.manufacturer || '—'}</div>
                          </td>
                          <td><span className={`status-chip chip-${r.status.toLowerCase()}`}>{r.status}</span></td>
                          <td><strong>{r.safetyScore}</strong></td>
                          <td style={{ textTransform: 'capitalize' }}>{r.drugForm || '—'}</td>
                          <td style={{ textTransform: 'capitalize' }}>{r.source || '—'}</td>
                          <td style={{ color: 'var(--text3)' }}>{r.expiryDate || '—'}</td>
                          <td style={{ color: 'var(--text3)' }}>{r.date}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <button className="action-btn" onClick={(e) => { e.stopPropagation(); setSelectedRecord(r); }}>
                                View
                              </button>
                              <button className="action-btn" style={{ color: 'var(--blood)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={(e) => handleDeleteRecord(r.id, e)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedHistory.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>
                            No records match your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', fontSize: 12.5, color: 'var(--text3)', flexWrap: 'wrap', gap: 10 }}>
                  <span>Showing {paginatedHistory.length} of {filteredHistory.length}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--text2)', padding: '5px 12px', borderRadius: 6, cursor: 'pointer' }}>Prev</button>
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--text2)', padding: '5px 12px', borderRadius: 6, cursor: 'pointer' }}>Next</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ VIEW 5: ANALYTICS ═════════ */}
          {activeView === 'analytics' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>Analytics</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text3)', marginTop: 4 }}>Deep insights into your verification patterns</p>
              </div>

              <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                  <div className="stat-num">{avgScore}</div>
                  <div className="stat-label">Avg Safety Score</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: 'var(--ember)' }}>{totalScans}</div>
                  <div className="stat-label">Total Checks</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: 'var(--blood)' }}>{unsafeScans}</div>
                  <div className="stat-label">Drugs Flagged Unsafe</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: '#8b5cf6' }}>{uniqueDrugsCount}</div>
                  <div className="stat-label">Unique Drugs Checked</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="chart-card">
                  <div className="chart-head">
                    <div>
                      <h3>Monthly Activity</h3>
                      <p>Scan volume by month</p>
                    </div>
                  </div>
                  <div style={{ height: 160 }}>
                    <canvas id="analyticsBarChart"></canvas>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-head">
                    <div>
                      <h3>Top 5 Most Checked Drugs</h3>
                      <p>By verification count</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {topDrugs.map(([name, cnt], i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'Fraunces', fontSize: 16, color: 'var(--text3)', width: 20 }}>{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{cnt} verification{cnt > 1 ? 's' : ''}</div>
                        </div>
                        <div style={{ width: 80, height: 6, background: 'var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round((cnt / topDrugMax) * 100)}%`, height: '100%', background: 'var(--jade)' }}></div>
                        </div>
                      </div>
                    ))}
                    {topDrugs.length === 0 && (
                      <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '2rem 0' }}>No drug data yet</div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="chart-card">
                  <div className="chart-head">
                    <div>
                      <h3>Acquisition Sources</h3>
                      <p>Where your drugs come from</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['pharmacy', 'hospital', 'market', 'online'].map((src) => {
                      const count = history.filter((h) => h.source === src).length;
                      return (
                        <div key={src} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--line)', padding: '6px 0' }}>
                          <span style={{ textTransform: 'capitalize', color: 'var(--text2)' }}>{src}</span>
                          <strong style={{ color: '#fff' }}>{count}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-head">
                    <div>
                      <h3>Drug Forms Verified</h3>
                      <p>Breakdown by form type</p>
                    </div>
                  </div>
                  <div style={{ height: 160 }}>
                    <canvas id="analyticsFormChart"></canvas>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-head">
                  <div>
                    <h3>Safety Score Trend</h3>
                    <p>Average score over time</p>
                  </div>
                </div>
                <div style={{ height: 120 }}>
                  <canvas id="analyticsTrendChart"></canvas>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ VIEW 6: MY PROFILE ═════════ */}
          {activeView === 'account' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>My Profile</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text3)', marginTop: 4 }}>Your personal details and account information</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
                {/* AVATAR & INFO CARD */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '2rem 1.5rem', textAlign: 'center', borderBottom: '1px solid var(--line)', background: 'linear-gradient(180deg, var(--jade-pale), transparent)' }}>
                    <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 1.25rem' }}>
                      <div
                        onClick={() => setAvatarModalOpen(true)}
                        style={{ width: 88, height: 88, background: 'var(--jade)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', border: '3px solid var(--line2)' }}
                      >
                        {avatar ? (
                          <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontFamily: 'Fraunces', fontSize: 32, fontWeight: 700, color: 'var(--void)' }}>
                            {profile['pf-firstname']?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div
                        onClick={() => setAvatarModalOpen(true)}
                        title="Change Avatar"
                        style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, background: 'var(--surface)', border: '2px solid var(--jade)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                      >
                        ✏️
                      </div>
                    </div>

                    <div style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700 }}>
                      {profile['pf-firstname'] ? `${profile['pf-firstname']} ${profile['pf-lastname'] || ''}` : '—'}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 4 }}>
                      {profile['pf-email'] || 'No email set'}
                    </div>
                  </div>

                  <ul style={{ listStyle: 'none', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                      <span>Phone:</span> <strong>{profile['pf-phone'] || 'Not set'}</strong>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                      <span>Age:</span> <strong>{profile['pf-age'] || 'Not set'}</strong>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                      <span>Occupation:</span> <strong style={{ textTransform: 'capitalize' }}>{profile['pf-occupation'] || 'Not set'}</strong>
                    </li>
                  </ul>

                  <div style={{ margin: '1rem', background: 'var(--jade-pale)', border: '1px solid rgba(0,201,122,0.2)', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jade)' }}>🔗 NAFDAC / Report ID</div>
                    <div style={{ fontSize: 11.5, color: 'var(--jade)', marginTop: 4, lineHeight: 1.5 }}>
                      Your phone number is used to trace your identity when contacting NAFDAC or filing a counterfeit report.
                    </div>
                  </div>

                  {/* DANGER ZONE */}
                  <div style={{ margin: '0 1rem 1rem', padding: 14, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--blood)', marginBottom: 6 }}>Danger Zone</div>
                    <p style={{ fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 10 }}>
                      Permanently delete your account and all scan history. This cannot be undone.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      style={{ width: '100%', padding: 9, background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, color: 'var(--blood)', fontFamily: 'Epilogue', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>

                {/* EDIT PROFILE FORM */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '2rem' }}>
                  <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700 }}>Edit Profile</h3>
                  <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1.5rem', borderBottom: '1px solid var(--line)', paddingBottom: '1rem' }}>
                    Keep your details accurate — your phone number is required for NAFDAC reporting.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="field">
                      <label>First Name *</label>
                      <input type="text" value={profile['pf-firstname']} onChange={(e) => setProfile({ ...profile, 'pf-firstname': e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Last Name</label>
                      <input type="text" value={profile['pf-lastname']} onChange={(e) => setProfile({ ...profile, 'pf-lastname': e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Age</label>
                      <input type="number" value={profile['pf-age']} onChange={(e) => setProfile({ ...profile, 'pf-age': e.target.value })} />
                    </div>

                    <div className="field">
                      <label>Occupation</label>
                      <input
                        type="text"
                        placeholder="e.g. Pharmacist, Student, Nurse, General Public"
                        value={profile['pf-occupation']}
                        onChange={(e) => setProfile({ ...profile, 'pf-occupation': e.target.value })}
                      />
                    </div>

                    <div className="field" style={{ gridColumn: '1/-1' }}>
                      <label>Email Address *</label>
                      <input type="email" value={profile['pf-email']} onChange={(e) => setProfile({ ...profile, 'pf-email': e.target.value })} />
                    </div>
                    <div className="field" style={{ gridColumn: '1/-1' }}>
                      <label>Phone Number *</label>
                      <input type="tel" value={profile['pf-phone']} onChange={(e) => setProfile({ ...profile, 'pf-phone': e.target.value })} />
                    </div>
                    <div className="field">
                      <label>State</label>
                      <input type="text" value={profile['pf-state']} onChange={(e) => setProfile({ ...profile, 'pf-state': e.target.value })} placeholder="e.g. Lagos, Abuja" />
                    </div>
                    <div className="field">
                      <label>City / LGA</label>
                      <input type="text" value={profile['pf-city']} onChange={(e) => setProfile({ ...profile, 'pf-city': e.target.value })} placeholder="e.g. Ikeja" />
                    </div>

                    <div className="field" style={{ gridColumn: '1/-1' }}>
                      <label>Known Drug Allergies (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Penicillin, Sulfa drugs, Aspirin (helps AI warn you)"
                        value={profile['pf-allergies']}
                        onChange={(e) => setProfile({ ...profile, 'pf-allergies': e.target.value })}
                      />
                    </div>
                    <div className="field" style={{ gridColumn: '1/-1' }}>
                      <label>Chronic Medical Conditions / Routine Meds (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Asthma, Peptic ulcer, Hypertension"
                        value={profile['pf-conditions']}
                        onChange={(e) => setProfile({ ...profile, 'pf-conditions': e.target.value })}
                      />
                    </div>
                  </div>

                  <button className="btn-jade" onClick={handleSaveProfile} style={{ marginTop: '1.5rem', width: '100%', padding: '12px' }}>
                    Save Profile →
                  </button>

                  {profileSavedToast && (
                    <div style={{ color: 'var(--jade)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                      ✓ Profile saved successfully!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═════════ VIEW 7: AI PHARMABOT ═════════ */}
          {activeView === 'assistant' && (
            <div>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>AI Pharma Assistant</h1>
                  <p style={{ fontSize: 13.5, color: 'var(--text3)', marginTop: 4 }}>
                    Ask about drug interactions, contraindications, side effects, and more
                  </p>
                </div>
                <button
                  onClick={newChatSession}
                  className="btn-jade"
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                >
                  + New Chat
                </button>
              </div>

              <div className="assistant-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '1.25rem', alignItems: 'start' }}>
                {/* PRIMARY CHAT PANEL */}
                <div className="chat-panel" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 580 }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: 'var(--jade)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--void)', fontWeight: 800 }}>
                      ⚕
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700 }}>PharmaBot</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>Pharmaceutical AI — contraindications, interactions & advice</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--jade)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      ● Online
                    </div>
                  </div>

                  <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`msg ${msg.role === 'user' ? 'user' : 'ai'}`}>
                        <div className="msg-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="msg ai">
                        <div className="msg-bubble" style={{ color: 'var(--text3)' }}>
                          PharmaBot is reviewing pharmacopeial guidelines...
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <div style={{ padding: '8px 1.25rem', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--text3)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={useHistoryInChat} onChange={(e) => setUseHistoryInChat(e.target.checked)} style={{ accentColor: 'var(--jade)' }} />
                      Include my scan history in clinical advice
                    </label>
                  </div>

                  <div style={{ padding: '1rem', borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      placeholder="Ask about a drug interaction, contraindication, food warning..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') sendChatMessage();
                      }}
                      style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', color: '#fff', outline: 'none' }}
                    />
                    <button className="btn-jade" onClick={() => sendChatMessage()} disabled={chatLoading} style={{ padding: '10px 20px' }}>
                      Send
                    </button>
                  </div>
                </div>

                {/* RIGHT QUICK QUESTIONS & DISCLAIMER */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'var(--card)', border: '1px solid var(--line)', padding: '1.25rem', borderRadius: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>
                      Quick Questions
                    </div>
                    {[
                      'Can I take alcohol with Metronidazole?',
                      'Is it safe to take Creatine while using Diclofenac?',
                      'What are the contraindications of Ciprofloxacin?',
                      'Can I take Paracetamol and Ibuprofen together?',
                      'What foods should I avoid when taking Metformin?',
                      'Can I take Tramadol with Codeine?',
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendChatMessage(q)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text2)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 8, cursor: 'pointer' }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '1.25rem', borderRadius: 16, fontSize: 12, color: '#a07830', lineHeight: 1.6 }}>
                    <strong style={{ display: 'block', color: 'var(--ember)', marginBottom: 4 }}>⚠️ Important Notice</strong>
                    PharmaBot provides educational information only. Always consult a licensed pharmacist or physician before making any medication decisions.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ VIEW 8: CHAT HISTORY ═════════ */}
          {activeView === 'chat-history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>Chat History</h1>
                  <p style={{ fontSize: 13.5, color: 'var(--text3)', marginTop: 4 }}>
                    Review, resume, or manage your previous AI PharmaBot conversations
                  </p>
                </div>
                <button
                  onClick={() => {
                    newChatSession();
                    handleNavClick('assistant');
                  }}
                  className="btn-jade"
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  + Start New Chat
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {chatSessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: 'var(--card)',
                      border: s.id === currentSessionId ? '1px solid var(--jade)' : '1px solid var(--line)',
                      borderRadius: 16,
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 140,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() => {
                      loadSession(s.id);
                      handleNavClick('assistant');
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)' }}>
                          {s.is_pinned && <span style={{ marginRight: 6 }}>📌</span>}
                          {s.title}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="cs-btn"
                            onClick={(e) => togglePinSession(s.id, s.is_pinned, e)}
                            title={s.is_pinned ? 'Unpin' : 'Pin'}
                          >
                            {s.is_pinned ? '📌' : '🔖'}
                          </button>
                          <button
                            className="cs-btn"
                            onClick={(e) => renameChatSession(s.id, s.title, e)}
                            title="Rename"
                          >
                            ✏️
                          </button>
                          <button
                            className="cs-btn"
                            onClick={(e) => deleteChatSession(s.id, e)}
                            title="Delete"
                            style={{ color: 'var(--blood)' }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--line)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>
                        {new Date(s.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--jade)', fontWeight: 600 }}>
                        Open Chat →
                      </span>
                    </div>
                  </div>
                ))}

                {chatSessions.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', background: 'var(--card)', borderRadius: 16, border: '1px solid var(--line)' }}>
                    <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: '1rem' }}>No saved conversations found.</p>
                    <button
                      onClick={() => {
                        newChatSession();
                        handleNavClick('assistant');
                      }}
                      className="btn-jade"
                      style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                    >
                      Start your first chat
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div> 

      {/* MODAL: AVATAR PICKER */}
      {avatarModalOpen && (
        <div className="modal-overlay" onClick={() => setAvatarModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700 }}>Choose Avatar</h3>
              <button onClick={() => setAvatarModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '0.75rem' }}>
              Preset Avatars
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
              {PRESET_AVATARS.map((av, idx) => (
                <div
                  key={idx}
                  onClick={() => selectAvatar(av.src)}
                  style={{ width: '100%', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '2px solid var(--line)', cursor: 'pointer', background: 'var(--surface)' }}
                >
                  <img src={av.src} alt={av.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '0.75rem' }}>
              Upload Your Photo
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--surface)', border: '1px dashed var(--line2)', borderRadius: 12, cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
              <span>📁 Click to upload a photo (JPG or PNG)</span>
              <input type="file" accept="image/jpeg,image/png" onChange={handleAvatarFileUpload} style={{ display: 'none' }} />
            </label>

            {cropImageSrc && (
              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Drag to reposition · use slider to zoom</div>
                <div
                  ref={cropViewportRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  style={{ width: 200, height: 200, borderRadius: '50%', overflow: 'hidden', margin: '0 auto', border: '3px solid var(--jade)', position: 'relative', cursor: 'grab', background: '#000', touchAction: 'none' }}
                >
                  <img
                    ref={cropImgRef}
                    src={cropImageSrc}
                    alt="Crop preview"
                    style={{ position: 'absolute', top: 0, left: 0, userSelect: 'none', pointerEvents: 'none' }}
                  />
                </div>

                <input
                  type="range"
                  min="100"
                  max="300"
                  value={cropZoom}
                  onChange={(e) => handleCropZoomChange(Number(e.target.value))}
                  style={{ width: 200, marginTop: 14, accentColor: 'var(--jade)', cursor: 'pointer' }}
                />

                <div>
                  <button className="btn-jade" onClick={saveCroppedPhoto} style={{ marginTop: 12, padding: '8px 22px', fontSize: 13 }}>
                    Use this photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DETAIL VIEW */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className={`status-chip chip-${selectedRecord.status.toLowerCase()}`}>{selectedRecord.status}</span>
                <h2 style={{ fontFamily: 'Fraunces', fontSize: 22, marginTop: 8 }}>{selectedRecord.drugName}</h2>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{selectedRecord.manufacturer || 'Manufacturer unlisted'} · Verified on {selectedRecord.date}</div>
              </div>
              <button onClick={() => setSelectedRecord(null)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 12, margin: '1rem 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Safety Score</div>
              <div style={{ fontSize: 32, fontFamily: 'Fraunces', color: selectedRecord.safetyScore >= 70 ? 'var(--jade)' : 'var(--blood)', marginTop: 2 }}>
                {selectedRecord.safetyScore}/100
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Assessment</div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{selectedRecord.summary}</p>
            </div>

            {selectedRecord.recommendation && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Recommendation</div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{selectedRecord.recommendation}</p>
              </div>
            )}

            {selectedRecord.proTip && (
              <div style={{ background: 'var(--jade-pale)', padding: '10px 14px', borderRadius: 10, fontSize: 12.5, color: 'var(--jade)', fontStyle: 'italic' }}>
                {selectedRecord.proTip}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: NOTIFICATION DETAIL */}
      {selectedNotif && (
        <div className="modal-overlay" onClick={() => setSelectedNotif(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--jade)' }}>
                NAFDAC Alert Detail
              </div>
              <button onClick={() => setSelectedNotif(null)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <h2 style={{ fontFamily: 'Fraunces', fontSize: 18, lineHeight: 1.4, marginBottom: 10 }}>
              {selectedNotif.title}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
              Published: {selectedNotif.published_at ? new Date(selectedNotif.published_at).toLocaleDateString('en-GB') : 'Recently'}
            </div>
            {selectedNotif.summary && (
              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 12, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
                {selectedNotif.summary}
              </div>
            )}
            {selectedNotif.url && (
              <a href={selectedNotif.url} target="_blank" rel="noreferrer" className="btn-jade" style={{ display: 'inline-block', textAlign: 'center', width: '100%', textDecoration: 'none' }}>
                Read Full Alert on NAFDAC Portal ↗
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}