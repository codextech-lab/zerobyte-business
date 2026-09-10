import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight, BarChart3, Bell, Check, ChevronRight, CircleHelp, ClipboardList, FileText, GitBranch, History, LayoutDashboard,
  LogOut, Menu, Package, PanelLeftClose, PanelLeftOpen, Plus, Receipt, Search, Settings, ShoppingCart, ShieldCheck, Users, Wallet, X,
} from 'lucide-react'
import { adminSupabase, isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from './lib/supabase'
import { getCurrentUserContext } from './lib/identity'
import type { View } from './lib/types'

const navGroups = [
  { label: 'Run the business', items: [{ name: 'Overview', icon: LayoutDashboard }, { name: 'Sales', icon: ShoppingCart }, { name: 'Inventory', icon: Package }, { name: 'Customers', icon: Users }] },
  { label: 'Keep records', items: [{ name: 'Receipts', icon: Receipt }, { name: 'Invoices', icon: FileText }, { name: 'Expenses', icon: Wallet }, { name: 'Reports', icon: BarChart3 }] },
  { label: 'People & places', items: [{ name: 'Branches', icon: LayoutDashboard }, { name: 'Workforce', icon: Users }, { name: 'User Accounts', icon: ShieldCheck }] },
]
type ProductRow = { id: string; name: string; sku: string; stock: number; price: number; category?: string }
type CustomerRow = { id: string; name: string; email: string | null; phone: string | null }
type OrganizationRow = { id: string; name: string }

const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((value: string) => value.trim().toLowerCase())
  .filter(Boolean)

function isAdminEmail(email: string) {
  return adminEmails.includes(email.trim().toLowerCase())
}

function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />
}

function WorkspaceSkeleton() {
  return <div className="workspace-skeleton" aria-label="Loading workspace"><aside className="skeleton-sidebar"><Skeleton className="skeleton-logo" /><Skeleton className="skeleton-block" /><Skeleton className="skeleton-block" /><Skeleton className="skeleton-block" /><Skeleton className="skeleton-block" /></aside><main className="skeleton-main"><Skeleton className="skeleton-heading" /><div className="skeleton-metrics">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="skeleton-card" />)}</div><Skeleton className="skeleton-chart" /><div className="skeleton-columns"><Skeleton className="skeleton-panel" /><Skeleton className="skeleton-panel" /></div></main></div>
}

function App() {
  const [sessionReady, setSessionReady] = useState(false); const [signedIn, setSignedIn] = useState(false); const [email, setEmail] = useState(''); const [displayName, setDisplayName] = useState('')
  const isAdminPath = (pathname: string) => pathname === '/admin' || pathname.endsWith('/admin') || pathname.endsWith('/admin.html')
  const adminEntry = document.documentElement.dataset.zerobyteApp === 'admin' || isAdminPath(window.location.pathname)
  const [path, setPath] = useState(adminEntry ? '/admin' : window.location.pathname)

  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  useEffect(() => {
    const onPopState = () => setPath(isAdminPath(window.location.pathname) ? '/admin' : window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const authClient = adminEntry ? adminSupabase : supabase
    if (!authClient) { setSessionReady(true); return }
    authClient.auth.getSession().then(({ data }) => {
      const hasSession = Boolean(data.session)
      setSignedIn(hasSession); setEmail(data.session?.user.email ?? ''); setDisplayName(data.session?.user.user_metadata?.full_name ?? data.session?.user.user_metadata?.name ?? '')
      if (hasSession && window.location.pathname === '/auth') {
        navigate('/')
      }
      if (hasSession && isAdminPath(window.location.pathname) && !isAdminEmail(data.session?.user.email ?? '')) {
        setPath('/admin')
      }
      setSessionReady(true)
    })
    const { data } = authClient.auth.onAuthStateChange((_event, session) => {
      const hasSession = Boolean(session)
      setSignedIn(hasSession); setEmail(session?.user.email ?? ''); setDisplayName(session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.name ?? '')
      if (hasSession) {
        if (window.location.pathname === '/auth') {
          navigate('/')
        }
        if (isAdminPath(window.location.pathname) && !isAdminEmail(session?.user.email ?? '')) {
          setPath('/admin')
        }
      }
    })
    return () => data.subscription.unsubscribe()
  }, [adminEntry])

  if (!sessionReady) return <WorkspaceSkeleton />
  if (path === '/terms' || path === '/privacy' || path === '/cookies') return <LegalPage type={path.slice(1) as 'terms' | 'privacy' | 'cookies'} />
  if (!isSupabaseConfigured) return <ConfigurationRequired />
  if (path === '/admin') {
    if (!isSupabaseConfigured) return <AdminConsoleUnavailable />
    if (!signedIn) return <AdminLogin />
    if (!isAdminEmail(email)) return <AdminAccessDenied email={email} onBack={() => navigate('/')} />
    return <AdminConsole email={email} onBack={() => navigate('/')} onLogout={() => { void adminSupabase?.auth.signOut(); window.localStorage.removeItem('zerobyte.admin-access'); navigate('/') }} />
  }
  if (!signedIn && path !== '/auth') return <Landing onStart={() => navigate('/auth')} />
  if (path === '/auth') return <AuthScreen />
  return <Workspace email={email} displayName={displayName} />
}

function Landing({ onStart }: { onStart: () => void }) {
  return <div className="landing"><header className="landing-nav"><div className="brand"><div className="brand-mark">ø</div><span>Zerøbyte</span><small>Business</small></div><div className="landing-nav-actions"><span>Built for Nigerian businesses</span><button className="text-btn" onClick={onStart}>Sign in <ArrowRight size={14} /></button></div></header><main className="landing-main"><section className="landing-hero"><div className="hero-copy"><span className="auth-kicker">The calm operating system for your business</span><h1>Run your business<br /><em>from one clear place.</em></h1><p>Sales, stock, customers and expenses — connected around the way Nigerian businesses actually work.</p><div className="hero-actions"><button className="primary hero-button" onClick={onStart}>Start for free <ArrowRight size={17} /></button><span className="hero-note">No payment details · Real records after sign-in</span></div></div><div className="hero-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-console"><div className="console-top"><span>zerøbyte / workspace</span><span className="live-dot">● secure</span></div><div className="console-total"><small>Your business data</small><strong>Connected records</strong><span>Nothing invented before you sign in</span></div><div className="console-bars"><i style={{ height: '34%' }} /><i style={{ height: '54%' }} /><i style={{ height: '43%' }} /><i style={{ height: '72%' }} /><i style={{ height: '62%' }} /><i style={{ height: '88%' }} /></div><div className="console-foot"><span><Package size={13} /> Stock & sales</span><span><Users size={13} /> Your team</span></div></div></div></section><section className="landing-proof"><div><strong>One workspace.</strong><span>Less switching, more knowing.</span></div><div><strong>Real records.</strong><span>Nothing invented for your dashboard.</span></div><div><strong>Made for naira.</strong><span>Prices and expenses in the language of home.</span></div></section><section className="landing-features"><div><span className="section-label">Everything in view</span><h2>Small business deserves<br />serious software.</h2><p className="landing-detail">Start with the work you already do: record a sale, update stock, keep customer details close, and understand where money is moving.</p></div><div className="feature-list"><div><Package /><strong>Inventory without guesswork</strong><p>Know what you have, what is low, and what needs restocking.</p></div><div><ShoppingCart /><strong>Sales that update stock</strong><p>Complete a sale once. Your records and inventory stay aligned.</p></div><div><BarChart3 /><strong>Reports you can trust</strong><p>See performance from the activity your team actually recorded.</p></div></div></section><section className="landing-data"><div><span className="section-label">Clear by default</span><h2>You stay in control of the records.</h2><p>We collect only what the workspace needs to authenticate users, organize business records, and keep actions auditable. No payment details are collected in V1.</p></div><div className="data-points"><span><Check size={16} /> Account identity and authentication details</span><span><Check size={16} /> Business, branch, product, customer and sales records you enter</span><span><Check size={16} /> Security, audit and attendance timestamps</span></div></section><InstallPrompt /></main><footer className="landing-footer"><span>Zerøbyte Business</span><span>Run the work. Keep the signal.</span><div className="legal-links"><a href="./privacy.html">Privacy</a><a href="./terms.html">Terms</a><a href="./cookies.html">Cookies</a></div></footer></div>
}

function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  if (!installEvent) return null
  return <section className="install-strip"><div><strong>Take Zerøbyte with you</strong><p>Install the workspace on your device for a focused, app-like experience.</p></div><button className="secondary" onClick={async () => { await installEvent.prompt(); setInstallEvent(null) }}>Install app <ArrowRight size={15} /></button></section>
}

function LegalPage({ type }: { type: 'terms' | 'privacy' | 'cookies' }) {
  const content = {
    terms: { label: 'Terms of service', title: 'A clear agreement for using Zerøbyte.', intro: 'These V1 terms describe the basic rules for using Zerøbyte Business. They are product copy for this early release and should be reviewed by qualified counsel before a public commercial launch.', sections: [['Using the service', 'You may use Zerøbyte to manage lawful business records for an organization you are authorized to represent. Keep your login secure and do not attempt to access another organization’s data.'], ['Your content', 'Your organization owns the business information you enter. You are responsible for its accuracy, lawful collection, and the permissions of the people you invite.'], ['Availability and changes', 'Zerøbyte is evolving. Features may change, and we may suspend access where needed to protect users, the service, or the security of stored records.'], ['Payments', 'Payments and subscription billing are not implemented in this V1. No payment details are requested by the application.']] },
    privacy: { label: 'Privacy policy', title: 'Privacy that is easy to understand.', intro: 'This V1 privacy summary explains the data Zerøbyte is designed to collect, why it is used, and what is intentionally out of scope. It is not legal advice.', sections: [['Data we collect', 'Account data such as email address and authentication metadata; organization data such as business name, branches, roles and permissions; operational records such as products, stock, customers, sales, expenses, invoices and attendance; and security/audit timestamps needed to protect the workspace.'], ['How we use it', 'We use this information to authenticate you, show organization-scoped workspaces, process the records you request, enforce permissions, maintain auditability, and improve reliability.'], ['What we do not collect in V1', 'We do not collect card or bank payment details, we do not implement payment processing, and we do not use business records to create fake dashboard metrics or advertising profiles.'], ['Your choices', 'You can request correction or deletion of records through the organization owner. Account and platform deletion workflows should be completed with the service operator before production launch.']] },
    cookies: { label: 'Cookie notice', title: 'Small files, clearly explained.', intro: 'Zerøbyte uses the minimum browser storage needed for a reliable signed-in experience.', sections: [['Essential session storage', 'Supabase Auth uses browser storage to keep your signed-in session available between page refreshes. Without it, you would need to sign in again after every refresh.'], ['Workspace preference', 'We use local storage to remember the organization you last selected in the workspace. This does not contain your business records.'], ['No advertising cookies', 'The V1 application does not use advertising, cross-site tracking, or analytics cookies.'], ['Managing cookies', 'You can clear browser storage from your browser settings. Clearing essential session storage signs you out and removes the remembered workspace selection.']] },
  }[type]
  return <div className="legal-shell"><header className="legal-nav"><div className="brand"><div className="brand-mark">ø</div><span>Zerøbyte</span><small>Business</small></div><button className="text-btn" onClick={() => { window.location.pathname = '/auth' }}>Sign in <ArrowRight size={14} /></button></header><main className="legal-content"><span className="section-label">{content.label}</span><h1>{content.title}</h1><p className="legal-intro">{content.intro}</p><div className="legal-updated">V1 draft · Last updated September 2026</div>{content.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</main><footer className="landing-footer legal-footer"><span>Zerøbyte Business</span><div className="legal-links"><button onClick={() => { window.location.pathname = '/privacy' }}>Privacy</button><button onClick={() => { window.location.pathname = '/terms' }}>Terms</button><button onClick={() => { window.location.pathname = '/cookies' }}>Cookies</button></div></footer></div>
}

function ConfigurationRequired() {
  return <div className="auth-loading"><div className="auth-card"><div className="brand-mark">ø</div><h1>Connect your workspace</h1><p>Add your Supabase URL and publishable key to <code>.env.local</code>, then restart the dev server. Zerøbyte never shows invented business data.</p><code>VITE_SUPABASE_URL=…<br />VITE_SUPABASE_ANON_KEY=…</code></div></div>
}

function AdminConsoleUnavailable() {
  return <div className="auth-loading"><div className="auth-card"><div className="brand-mark">ø</div><h1>Admin console unavailable</h1><p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> and define <code>VITE_ADMIN_EMAILS</code> with the approved platform-admin addresses.</p><code>VITE_ADMIN_EMAILS=hello@zerobyte.app,ops@zerobyte.app</code></div></div>
}

function AdminLogin() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!adminSupabase) {
      setError('Supabase is not configured for the admin console.');
      return;
    }
    setLoading(true); setError('');
    const { data, error: authError } = await adminSupabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    const accountEmail = data.user?.email ?? email;
    if (!isAdminEmail(accountEmail)) {
      setError('This account does not have platform administrator access.');
      void adminSupabase.auth.signOut();
      return;
    }
    window.localStorage.setItem('zerobyte.admin-access', 'true');
    window.location.href = `${window.location.pathname.endsWith('/admin.html') ? './admin.html' : './admin'}`;
  }

  return <div className="auth-shell"><div className="auth-brand"><div className="brand-mark">ø</div><strong>Zerøbyte</strong><span>Admin Console</span></div><div className="auth-layout"><section className="auth-intro"><span className="auth-kicker">Platform operations</span><h1>Platform access<br /><em>restricted to approved admins.</em></h1><p>Only verified platform administrators can access the admin console. Business ownership, worker roles, and organization membership do not grant platform access.</p></section><form className="auth-card" onSubmit={handleSubmit}><span className="auth-kicker">Secure sign-in</span><h2>Admin login</h2><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@zerobyte.app" /></label><label>Password<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="primary entry-button" disabled={loading}>{loading ? 'Authenticating…' : 'Enter admin console'}</button></form></div></div>
}

function AdminAccessDenied({ email, onBack }: { email: string; onBack: () => void }) {
  const safeEmail = email || 'Unknown user';
  return <div className="auth-loading"><div className="auth-card"><div className="brand-mark">ø</div><h1>Access denied</h1><p>{safeEmail} is not assigned a platform admin role in this environment.</p><p>The admin URL is intentionally separate from the user application. Business ownership and worker access do not grant platform administration rights.</p><button className="primary" onClick={onBack}>Return to business app</button></div></div>
}

function AdminConsole({ email, onBack, onLogout }: { email: string; onBack: () => void; onLogout: () => void }) {
  type AdminSection = 'Overview' | 'Users' | 'Organizations' | 'Branches' | 'Inventory' | 'Sales' | 'Notifications' | 'Audit log' | 'Settings'
  type AdminRow = Record<string, string | number | null>
  const [section, setSection] = useState<AdminSection>('Overview')
  const [overview, setOverview] = useState<Record<string, number> | null>(null)
  const [overviewError, setOverviewError] = useState('')
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d')
  const [analytics, setAnalytics] = useState<{ label: string; users: number; organizations: number; sales: number; revenue: number; expenses: number }[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [rows, setRows] = useState<AdminRow[]>([])
  const [rowsLoading, setRowsLoading] = useState(false)
  const [rowsError, setRowsError] = useState('')
  const [userRows, setUserRows] = useState<AdminRow[]>([])
  const [userRowsLoading, setUserRowsLoading] = useState(false)
  const [userRowsError, setUserRowsError] = useState('')
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.localStorage.getItem('zerobyte.admin-sidebar-collapsed') === 'true')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  useEffect(() => {
    if (!adminSupabase) return
    adminSupabase.rpc('get_platform_overview').then(({ data, error }) => {
      if (error) {
        setOverviewError(error.message.includes('does not exist') ? 'Apply the platform-admin migration in Supabase, then refresh.' : error.message)
        return
      }
      setOverview((data ?? {}) as Record<string, number>)
    })
  }, [])
  useEffect(() => {
    if (!adminSupabase) return
    setAnalyticsLoading(true)
    adminSupabase.rpc('get_platform_analytics', { period_key: analyticsPeriod }).then(({ data, error }) => {
      setAnalyticsLoading(false)
      if (error) {
        setOverviewError(error.message.includes('does not exist') ? 'Apply the platform analytics migration in Supabase, then refresh.' : error.message)
        return
      }
      setAnalytics((data?.points ?? []) as typeof analytics)
    })
  }, [analyticsPeriod])
  useEffect(() => {
    if (!adminSupabase || section === 'Overview' || section === 'Settings' || section === 'Users') return
    const tableBySection: Record<Exclude<AdminSection, 'Overview' | 'Settings' | 'Users'>, string> = {
      Organizations: 'organizations',
      Branches: 'branches',
      Inventory: 'products',
      Sales: 'sales',
      Notifications: 'admin_notifications',
      'Audit log': 'admin_audit_logs',
    }
    setRowsLoading(true)
    setRowsError('')
    const table = tableBySection[section]
    adminSupabase.from(table).select('*').order('created_at', { ascending: false }).limit(100).then(({ data, error }) => {
      setRowsLoading(false)
      if (error) {
        setRowsError(error.message)
        setRows([])
        return
      }
      setRows((data ?? []) as AdminRow[])
    })
  }, [section])
  useEffect(() => {
    if (!adminSupabase || section !== 'Users') return
    const client = adminSupabase
    setUserRowsLoading(true)
    setUserRowsError('')
    let cancelled = false
    const loadUsers = async () => {
      const { data: sessionData, error: sessionError } = await client.auth.getSession()
      if (sessionError || !sessionData.session || !supabaseUrl || !supabaseAnonKey) {
        if (!cancelled) {
          setUserRowsLoading(false)
          setUserRowsError('Your admin session has expired. Sign out and sign in again.')
        }
        return
      }
      const response = await fetch(`${supabaseUrl}/functions/v1/list-platform-users?page=1&pageSize=100`, {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          apikey: supabaseAnonKey,
        },
      })
      const payload = await response.json().catch(() => null)
      if (cancelled) return
      setUserRowsLoading(false)
      if (!response.ok) {
        setUserRowsError(response.status === 401 ? 'Your admin session was rejected by Supabase. Sign out and sign in again.' : payload?.message ?? payload ?? `User service returned ${response.status}.`)
        return
      }
      setUserRows((payload?.users ?? []) as AdminRow[])
    }
    void loadUsers()
    return () => { cancelled = true }
  }, [section])
  const adminSectionIcons: Record<AdminSection, typeof LayoutDashboard> = {
    Overview: LayoutDashboard,
    Users,
    Organizations: ClipboardList,
    Branches: GitBranch,
    Inventory: Package,
    Sales: ShoppingCart,
    Notifications: Bell,
    'Audit log': History,
    Settings,
  }
  const adminSectionGroups: { label: string; items: AdminSection[] }[] = [
    { label: 'Control room', items: ['Overview', 'Users', 'Organizations'] },
    { label: 'Operations', items: ['Branches', 'Inventory', 'Sales'] },
    { label: 'Governance', items: ['Notifications', 'Audit log', 'Settings'] },
  ]
  const stats = [
    { label: 'Registered users', key: 'users', detail: 'Accounts registered in Supabase Auth.' },
    { label: 'Organizations', key: 'organizations', detail: 'Businesses created in the shared backend.' },
    { label: 'Branches', key: 'branches', detail: 'Active and archived branches across organizations.' },
    { label: 'Employees', key: 'employees', detail: 'Employee profiles across the platform.' },
    { label: 'Products', key: 'products', detail: 'Products currently tracked by businesses.' },
    { label: 'Customers', key: 'customers', detail: 'Customer records across organizations.' },
    { label: 'Sales', key: 'sales', detail: 'Recorded business sales transactions.' },
    { label: 'Invoices', key: 'invoices', detail: 'Invoices created by businesses.' },
    { label: 'Expenses', key: 'expenses', detail: 'Recorded business expenses.' },
    { label: 'Platform revenue', key: undefined, value: 'Unavailable', detail: 'Revenue data will appear here once billing is enabled.' },
  ]
  const renderRows = () => {
    if (rowsLoading) return <div className="admin-table-skeleton">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="admin-skeleton-row"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>)}</div>
    if (rowsError) return <div className="form-error" role="alert">{rowsError}</div>
    if (!rows.length) return <div className="admin-empty">No {section.toLowerCase()} records found.</div>
    const columns = Object.keys(rows[0]).filter((key) => !['metadata', 'features'].includes(key)).slice(0, 7)
    return <div className="table-wrap"><table className="admin-table"><thead><tr>{columns.map((column) => <th key={column}>{column.replace(/_/g, ' ')}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)}>{columns.map((column) => <td key={column}>{String(row[column] ?? '—')}</td>)}</tr>)}</tbody></table></div>
  }
  const sendNotification = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!adminSupabase || !notificationTitle.trim() || !notificationMessage.trim()) return
    setNotificationStatus('Sending…')
    const { error } = await adminSupabase.from('admin_notifications').insert({
      created_by: (await adminSupabase.auth.getUser()).data.user?.id,
      title: notificationTitle.trim(),
      message: notificationMessage.trim(),
      status: 'sent',
      sent_at: new Date().toISOString(),
      audience: 'all_users',
    })
    if (error) {
      setNotificationStatus(error.message)
      return
    }
    setNotificationTitle('')
    setNotificationMessage('')
    setNotificationStatus('Broadcast saved. Recipient delivery requires the notification fan-out function to be deployed.')
    setRows((current) => [{ title: notificationTitle, message: notificationMessage, status: 'sent', created_at: new Date().toISOString() }, ...current])
  }
  const renderSection = () => {
    if (section === 'Overview') {
      const chartItems = stats.filter((stat) => stat.key).slice(0, 7)
      const maxValue = Math.max(...chartItems.map((stat) => overview?.[stat.key ?? ''] ?? 0), 1)
      const maxTrend = Math.max(...analytics.map((point) => Math.max(point.users, point.organizations, point.sales)), 1)
      return <>{overview ? <div className="admin-grid admin-summary-grid">{['users', 'organizations', 'sales', 'products'].map((key) => <article key={key} className="admin-card"><div className="admin-card-label">{key}</div><div className="admin-card-value">{(overview[key] ?? 0).toLocaleString()}</div><p>Current platform total</p></article>)}</div> : <div className="admin-grid admin-summary-grid">{[1, 2, 3, 4].map((item) => <article key={item} className="admin-card admin-card-skeleton"><Skeleton className="skeleton-line short" /><Skeleton className="skeleton-line value" /><Skeleton className="skeleton-line" /></article>)}</div>}<section className="admin-card admin-trend-card"><div className="admin-card-header"><div><h2>Platform growth</h2><p>New users, organizations, and sales recorded over time.</p></div><div className="admin-chart-controls"><select value={analyticsPeriod} onChange={(event) => setAnalyticsPeriod(event.target.value)} aria-label="Analytics period"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="12m">Last 12 months</option><option value="5y">Last 5 years</option></select><span className="admin-pill success">{analyticsLoading ? 'Updating' : 'Live data'}</span></div></div>{analyticsLoading ? <div className="admin-line-skeleton"><Skeleton /><Skeleton /><Skeleton /></div> : <div className="admin-trend-chart"><div className="admin-trend-grid"><i /><i /><i /><i /></div><svg viewBox="0 0 1000 280" preserveAspectRatio="none" aria-label="Platform growth chart"><polyline points={analytics.map((point, index) => `${analytics.length === 1 ? 500 : index / (analytics.length - 1) * 1000},${270 - point.users / maxTrend * 220}`).join(' ')} /><polyline className="org-line" points={analytics.map((point, index) => `${analytics.length === 1 ? 500 : index / (analytics.length - 1) * 1000},${270 - point.organizations / maxTrend * 220}`).join(' ')} /><polyline className="sales-line" points={analytics.map((point, index) => `${analytics.length === 1 ? 500 : index / (analytics.length - 1) * 1000},${270 - point.sales / maxTrend * 220}`).join(' ')} /></svg><div className="admin-trend-labels">{analytics.filter((_, index) => index === 0 || index === analytics.length - 1 || index % Math.max(1, Math.floor(analytics.length / 5)) === 0).map((point) => <span key={point.label}>{point.label}</span>)}</div></div>}<div className="admin-chart-legend"><span><i className="users-dot" /> Users</span><span><i className="org-dot" /> Organizations</span><span><i className="sales-dot" /> Sales</span></div></section><div className="admin-overview-columns"><section className="admin-card admin-chart-card"><div className="admin-card-header"><div><h2>Platform footprint</h2><p>Current records by operational area.</p></div><span className="admin-pill success">{overview ? 'Live data' : 'Connecting'}</span></div>{overview ? <div className="admin-bar-chart">{chartItems.map((stat) => <div className="admin-bar-item" key={stat.label}><div className="admin-bar-track"><i style={{ height: `${Math.max(6, ((overview[stat.key ?? ''] ?? 0) / maxValue) * 100)}%` }} /></div><strong>{(overview[stat.key ?? ''] ?? 0).toLocaleString()}</strong><small>{stat.label}</small></div>)}</div> : <div className="admin-chart-skeleton"><Skeleton /><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>}</section><section className="admin-card admin-brief-card"><div className="admin-card-header"><div><h2>Platform monitoring</h2><p>{overview ? 'Live counts from the shared Supabase backend.' : 'Preparing the platform overview.'}</p></div></div><div className="admin-list">{['Users', 'Organizations', 'Branches', 'Inventory', 'Sales', 'Notifications'].map((name) => <div key={name} className="admin-list-item"><div><strong>{name}</strong><p>Open the live administrative view.</p></div><button className="text-btn" onClick={() => setSection(name as AdminSection)}>Open</button></div>)}</div></section></div></>
    }
    if (section === 'Users') return <section className="admin-card wide"><div className="admin-card-header"><div><h2>Users</h2><p>Platform accounts loaded through the protected Auth listing Edge Function.</p></div><span className="admin-pill success">Secure live view</span></div>{userRowsLoading ? <div className="admin-table-skeleton">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="admin-skeleton-row"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>)}</div> : userRowsError ? <div className="form-error" role="alert">{userRowsError}. Deploy list-platform-users and refresh.</div> : !userRows.length ? <div className="admin-empty">No users found.</div> : <div className="table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Created</th><th>Last sign in</th></tr></thead><tbody>{userRows.map((row) => <tr key={String(row.id)}><td>{String(row.name ?? '—')}</td><td>{String(row.email ?? '—')}</td><td>{String(row.phone ?? '—')}</td><td>{String(row.status ?? '—')}</td><td>{String(row.created_at ?? '—')}</td><td>{String(row.last_sign_in_at ?? 'Never')}</td></tr>)}</tbody></table></div>}</section>
    if (section === 'Settings') return <section className="admin-card wide"><div className="admin-card-header"><div><h2>Admin settings</h2><p>Profile and environment-safe controls for this console.</p></div></div><div className="admin-settings"><div><span className="admin-card-label">Signed-in account</span><strong>{email}</strong></div><div><span className="admin-card-label">Access model</span><strong>Platform admin role + Supabase RLS</strong></div><div><span className="admin-card-label">Revenue</span><strong>Unavailable until billing is implemented</strong></div></div></section>
    if (section === 'Notifications') return <><section className="admin-card wide"><div className="admin-card-header"><div><h2>Send broadcast</h2><p>Creates an audited admin notification record. Fan-out to user notifications requires the server-side delivery function.</p></div></div><form className="admin-form" onSubmit={sendNotification}><label>Title<input required value={notificationTitle} onChange={(event) => setNotificationTitle(event.target.value)} placeholder="Scheduled maintenance" /></label><label>Message<textarea required value={notificationMessage} onChange={(event) => setNotificationMessage(event.target.value)} placeholder="Write the message users should receive." /></label><button className="primary" type="submit">Save broadcast</button>{notificationStatus && <p className="muted" role="status">{notificationStatus}</p>}</form></section><section className="admin-card wide"><div className="admin-card-header"><div><h2>Notification history</h2><p>Records from the shared admin notification table.</p></div></div>{renderRows()}</section></>
    return <section className="admin-card wide"><div className="admin-card-header"><div><h2>{section}</h2><p>Live records from the shared Supabase backend.</p></div><button className="secondary" onClick={() => setSection('Overview')}>Back to overview</button></div>{renderRows()}</section>
  }
  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    window.localStorage.setItem('zerobyte.admin-sidebar-collapsed', String(next))
  }
  const selectSection = (nextSection: AdminSection) => {
    setSection(nextSection)
    setMobileNavOpen(false)
  }
  return <div className={`admin-shell${sidebarCollapsed ? ' admin-sidebar-collapsed' : ''}${mobileNavOpen ? ' admin-mobile-nav-open' : ''}`}><aside className="admin-sidebar"><div className="admin-brand-row"><div className="brand"><div className="brand-mark">ø</div><span>Zerøbyte</span><small>Admin</small></div><button className="admin-collapse-button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}>{sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div><div className="admin-role"><span>Signed in as</span><strong>{email}</strong></div><nav className="admin-nav" aria-label="Admin navigation">{adminSectionGroups.map((group) => <div className="admin-nav-group" key={group.label}><span className="admin-nav-label">{group.label}</span>{group.items.map((name) => { const Icon = adminSectionIcons[name]; return <button key={name} className={`admin-nav-item${section === name ? ' active' : ''}`} onClick={() => selectSection(name)} title={sidebarCollapsed ? name : undefined} aria-label={name}><Icon size={16} aria-hidden="true" /><span>{name}</span></button> })}</div>)}</nav><div className="admin-sidebar-footer"><button className="secondary admin-footer-button" onClick={onBack}><ArrowRight size={15} /><span>Return to app</span></button><button className="text-btn admin-footer-button" onClick={onLogout}><LogOut size={15} /><span>Log out</span></button></div></aside><main className="admin-main"><header className="admin-header"><div className="admin-title-row"><button className="admin-mobile-menu" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Open admin navigation"><Menu size={20} /></button><div><span className="section-label">Platform operations</span><h1>{section}</h1></div></div><div className="admin-actions"><button className="secondary" onClick={() => selectSection('Audit log')}>View audit log</button><button className="primary" onClick={() => selectSection('Notifications')}>Send broadcast</button></div></header>{overviewError && <div className="form-error" role="alert">{overviewError}</div>}{renderSection()}</main></div>
}

function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in'); const [accountMode, setAccountMode] = useState<'owner' | 'worker'>('owner'); const [fullName, setFullName] = useState(''); const [identifier, setIdentifier] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!supabase) return; setBusy(true); setError(''); setMessage('')
    let result
    if (mode === 'sign-up') {
      result = await supabase.auth.signUp({ email: identifier, password, options: { data: { full_name: fullName.trim() } } })
    } else if (accountMode === 'owner' || identifier.includes('@')) {
      result = await supabase.auth.signInWithPassword({ email: identifier, password })
    } else if (!supabaseUrl || !supabaseAnonKey) {
      setError('Worker sign-in is not configured.')
      setBusy(false)
      return
    } else {
      const response = await fetch(`${supabaseUrl}/functions/v1/resolve-worker-login`, { method: 'POST', headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: identifier, password }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.access_token || !payload?.refresh_token) {
        setError(payload?.error ?? 'Invalid worker credentials')
        setBusy(false)
        return
      }
      result = await supabase.auth.setSession({ access_token: payload.access_token, refresh_token: payload.refresh_token })
    }
    setBusy(false)
    if (result.error) {
      const normalized = result.error.message.toLowerCase()
      if (mode === 'sign-in' && normalized.includes('invalid login credentials')) {
        setError('That email and password do not match. Check both values or create an account first.')
      } else if (mode === 'sign-in' && normalized.includes('email not confirmed')) {
        setError('Confirm your email address from the Supabase confirmation email, then sign in again.')
      } else {
        setError(result.error.message)
      }
    } else if (mode === 'sign-up') setMessage('Check your email to confirm your account, then sign in.')
  }
  return <div className="auth-shell"><div className="auth-brand"><div className="brand-mark">ø</div><strong>Zerøbyte</strong><span>Business</span></div><div className="auth-layout"><section className="auth-intro"><span className="auth-kicker">Business OS for Nigeria</span><h1>Know what sold.<br /><em>Know what’s next.</em></h1><p>One calm workspace for stock, customers, sales, receipts and expenses — built around how your business actually runs.</p><div className="auth-trust"><span><Check size={14} /> Naira-first workflows</span><span><Check size={14} /> Your data, your organization</span><span><Check size={14} /> No payment required</span></div></section><form className="auth-card" onSubmit={submit}><div className="auth-mode-switch" role="tablist" aria-label="Account type"><button type="button" className={accountMode === 'owner' ? 'active' : ''} onClick={() => { setAccountMode('owner'); setMode('sign-in'); setIdentifier('') }}>Login as Owner</button><button type="button" className={accountMode === 'worker' ? 'active' : ''} onClick={() => { setAccountMode('worker'); setMode('sign-in'); setIdentifier('') }}>Login as Worker</button></div><span className="auth-kicker">{mode === 'sign-in' ? 'Welcome back' : 'Start your workspace'}</span><h2>{mode === 'sign-in' ? `Sign in as ${accountMode}` : 'Create your owner account'}</h2><p>{mode === 'sign-in' ? (accountMode === 'worker' ? 'Use your worker email or employee ID and current password.' : 'Continue where your business left off.') : 'Create an owner account, then set up your business in minutes.'}</p>{mode === 'sign-up' && <label>Full name<input type="text" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" /></label>}<label>{mode === 'sign-up' || accountMode === 'owner' ? 'Email address' : 'Email or employee ID'}<input type={accountMode === 'owner' || mode === 'sign-up' ? 'email' : 'text'} required value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={accountMode === 'worker' ? 'EMP-001 or worker@business.com' : 'you@business.com'} /></label><label>Password<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your current password" /></label>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="form-success" role="status">{message}</div>}<button className="primary entry-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button>{accountMode === 'owner' && <button type="button" className="entry-link" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setMessage('') }}>{mode === 'sign-in' ? 'New here? Create an account' : 'Already registered? Sign in'}</button>}</form></div></div>
}

function ChangePasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) return
    if (password.length < 8 || password !== confirmation) {
      setError(password.length < 8 ? 'Use at least 8 characters.' : 'The passwords do not match.')
      return
    }
    setBusy(true); setError('')
    const { error: passwordError } = await supabase.auth.updateUser({ password })
    if (!passwordError) {
      const { error: markError } = await supabase.rpc('mark_worker_password_changed')
      if (markError) setError(markError.message)
      else onComplete()
    } else setError(passwordError.message)
    setBusy(false)
  }
  return <div className="auth-loading"><form className="auth-card" onSubmit={submit}><div className="brand-mark">ø</div><span className="auth-kicker">First sign-in</span><h1>Choose a new password</h1><p>Your temporary password has been accepted. Change it before using the workspace.</p><label>New password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label><label>Confirm password<input required minLength={8} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="primary entry-button" disabled={busy}>{busy ? 'Saving…' : 'Save new password'} <ArrowRight size={16} /></button><button type="button" className="entry-link" onClick={() => void supabase?.auth.signOut()}>Sign out</button></form></div>
}

function Workspace({ email, displayName }: { email: string; displayName: string }) {
  const [view, setView] = useState<View>('Overview'); const [open, setOpen] = useState(false); const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem('zerobyte.sidebar-collapsed') === 'true'); const [dark, setDark] = useState(true); const [search, setSearch] = useState(''); const [orgId, setOrgId] = useState<string | null>(null); const [orgName, setOrgName] = useState(''); const [organizations, setOrganizations] = useState<OrganizationRow[]>([]); const [role, setRole] = useState('member'); const [loading, setLoading] = useState(true); const [identityError, setIdentityError] = useState(''); const [mustChangePassword, setMustChangePassword] = useState(false)
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    getCurrentUserContext(supabase).then((context) => {
      if (cancelled) return
      const available = context.memberships.flatMap((membership) => membership.organization ? [{ id: membership.organization.id, name: membership.organization.name }] : [])
      const stored = window.localStorage.getItem('zerobyte.organization')
      const selected = available.find((organization) => organization.id === stored) ?? available[0]
      const membership = context.memberships.find((item) => item.organization_id === selected?.id)
      setOrganizations(available); setRole(membership?.role ?? 'member')
      setMustChangePassword(Boolean(context.employee?.must_change_password))
      setOrgId(selected?.id ?? null); setOrgName(selected?.name ?? ''); setLoading(false)
    }).catch((error: Error) => { if (!cancelled) { setIdentityError(error.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])
  const workerMode = role === 'member'
  useEffect(() => { if (workerMode && ['Inventory', 'Expenses', 'Invoices', 'Reports', 'Branches', 'User Accounts', 'Settings'].includes(view)) setView('Overview') }, [workerMode, view])
  if (loading) return <WorkspaceSkeleton />
  if (identityError) return <div className="auth-loading"><div className="auth-card"><div className="brand-mark">ø</div><h1>We could not load your workspace</h1><p>{identityError}</p><button className="primary" onClick={() => window.location.reload()}>Try again</button></div></div>
  if (mustChangePassword) return <ChangePasswordScreen onComplete={() => setMustChangePassword(false)} />
  if (!orgId) return <WorkspaceSetup email={email} onCreated={(id, name) => { setOrgId(id); setOrgName(name) }} />
  const switchOrganization = (nextId: string) => {
    const next = organizations.find((organization) => organization.id === nextId)
    if (!next) return
    window.localStorage.setItem('zerobyte.organization', next.id); setOrgId(next.id); setOrgName(next.name); setView('Overview')
  }
  const toggleSidebar = () => { const next = !collapsed; setCollapsed(next); window.localStorage.setItem('zerobyte.sidebar-collapsed', String(next)) }
  const visibleGroups = workerMode ? navGroups.map((group) => ({ ...group, items: group.items.filter((item) => ['Overview', 'Sales', 'Customers', 'Receipts', 'Workforce'].includes(item.name)) })).filter((group) => group.items.length) : navGroups
  return <div className={`${dark ? 'app' : 'app light'}${collapsed ? ' sidebar-collapsed' : ''}`}><aside className={open ? 'sidebar open' : 'sidebar'}><div className="brand"><div className="brand-mark">ø</div><span>Zerøbyte</span><small>{workerMode ? 'Worker' : 'Business'}</small><button className="close-nav" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button></div><div className="workspace-select"><div className="workspace-icon">{orgName.slice(0, 2).toUpperCase()}</div><select className="workspace-switcher" aria-label="Select organization" value={orgId} onChange={(event) => switchOrganization(event.target.value)}>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></div>{workerMode && <div className="role-badge"><ShieldCheck size={13} /><span>Staff workspace</span></div>}<nav>{visibleGroups.map((group) => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(({ name, icon: Icon }) => <button className={view === name ? 'nav-item active' : 'nav-item'} key={name} onClick={() => { setView(name as View); setOpen(false) }}><Icon size={17} /><span>{name}</span></button>)}</div>)}</nav>{!workerMode && <div className="sidebar-bottom"><button className={view === 'Settings' ? 'nav-item active' : 'nav-item'} onClick={() => setView('Settings')}><Settings size={17} /><span>Settings</span></button></div>}<button className="user" onClick={() => void supabase?.auth.signOut()}><div className="avatar">{(displayName || email).slice(0, 2).toUpperCase()}</div><div><strong>{displayName || email}</strong><span>{displayName ? email : 'Sign out'}</span></div></button><button className="sidebar-collapse" onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}<span>{collapsed ? 'Expand menu' : 'Collapse menu'}</span></button></aside><main className="main"><header className="topbar"><button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={21} /></button><div className="breadcrumb"><span>{orgName}</span><ChevronRight size={14} /><strong>{view}</strong></div><div className="top-actions"><div className="search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your business..." /></div><button className="icon-btn" aria-label="Help"><CircleHelp size={19} /></button><button className="icon-btn" aria-label="Notifications"><Bell size={19} /></button><button className="theme-toggle" onClick={() => setDark(!dark)}>{dark ? 'Light' : 'Dark'} mode</button></div></header><div className="content">{view === 'Overview' ? <Dashboard orgId={orgId} onNavigate={setView} workerMode={workerMode} displayName={displayName} /> : <FeatureView view={view} orgId={orgId} search={search} />}</div></main></div>
}

function WorkspaceSetup({ email, onCreated }: { email: string; onCreated: (id: string, name: string) => void }) {
  const [name, setName] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!supabase) return; setBusy(true); const { data, error: result } = await supabase.rpc('create_workspace', { workspace_name: name }); setBusy(false); if (result) setError(result.message); else if (data) onCreated(data, name.trim()) }
  return <div className="auth-loading"><form className="auth-card" onSubmit={submit}><div className="brand-mark">ø</div><span className="auth-kicker">Your first step</span><h1>Name your business</h1><p>Signed in as {email}. This name becomes your shared workspace.</p><label>Business name<input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Adebayo Foods" /></label>{error && <div className="form-error">{error}</div>}<button className="primary entry-button" disabled={busy}>{busy ? 'Creating…' : 'Create workspace'} <ArrowRight size={16} /></button></form></div>
}

function Dashboard({ orgId, onNavigate, workerMode = false, displayName = '' }: { orgId: string; onNavigate: (view: View) => void; workerMode?: boolean; displayName?: string }) {
  const [products, setProducts] = useState<ProductRow[]>([]); const [customers, setCustomers] = useState<CustomerRow[]>([]); const [sales, setSales] = useState<{ total: number; created_at: string }[]>([]); const [expenses, setExpenses] = useState<{ amount: number }[]>([])
  useEffect(() => { if (!supabase) return; Promise.all([supabase.from('products').select('id,name,sku,stock,price').eq('organization_id', orgId).order('created_at', { ascending: false }), supabase.from('customers').select('id,name,email,phone').eq('organization_id', orgId).order('created_at', { ascending: false }), supabase.from('sales').select('total,created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(6), supabase.from('expenses').select('amount').eq('organization_id', orgId)]).then(([p, c, s, e]) => { setProducts(p.data ?? []); setCustomers(c.data ?? []); setSales(s.data ?? []); setExpenses(e.data ?? []) }) }, [orgId])
  const revenue = sales.reduce((sum, row) => sum + Number(row.total), 0); const cost = expenses.reduce((sum, row) => sum + Number(row.amount), 0); const low = products.filter((product) => product.stock <= 5)
  return <div className="page"><div className="welcome-strip"><div><span className="auth-kicker">Today in {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1>{displayName ? `Welcome back, ${displayName}.` : workerMode ? 'Your shift, in view.' : 'Your business, in view.'}</h1><p className="muted">{workerMode ? 'The tasks and sales you need for today.' : 'A clear read on what needs your attention next.'}</p></div><button className="primary" onClick={() => onNavigate('Sales')}><Plus size={17} /> Record a sale</button></div><div className="metrics">{!workerMode && <><Metric label="Revenue" value={`₦${revenue.toLocaleString('en-NG')}`} note={`${sales.length} recent sale${sales.length === 1 ? '' : 's'}`} /><Metric label="Expenses" value={`₦${cost.toLocaleString('en-NG')}`} note="Recorded in this workspace" /></>}<Metric label="Products" value={products.length.toString()} note={products.length ? `${low.length} need attention` : 'Add your first product'} /><Metric label="Customers" value={customers.length.toString()} note={customers.length ? 'In your records' : 'Add your first customer'} /></div>{!workerMode && <DashboardChart sales={sales} />}<div className="dashboard-grid"><section className="panel spotlight"><div className="panel-heading"><div><span className="section-label">{workerMode ? 'Staff focus' : 'Next best action'}</span><h2>{workerMode ? 'Serve customers with confidence.' : products.length ? 'Keep your records moving.' : 'Start with your catalog.'}</h2></div><ShieldCheck size={20} color="#06b6d4" /></div><p>{workerMode ? 'Record sales, select customers, and keep receipts ready. Stock and financial controls stay with managers.' : products.length ? 'Your workspace is connected. Add customers and record sales to make your reports useful.' : 'Add the products you sell so sales, stock and receipts can work from the same source of truth.'}</p><div className="action-row"><button className="secondary" onClick={() => onNavigate('Sales')}><ShoppingCart size={16} /> Record sale</button><button className="secondary" onClick={() => onNavigate('Customers')}><Users size={16} /> Find customer</button></div></section><section className="panel"><div className="panel-heading"><div><span className="section-label">Attention</span><h2>Low stock</h2></div><button className="text-btn" onClick={() => onNavigate('Sales')}>Open sales <ArrowRight size={14} /></button></div>{low.length ? low.slice(0, 4).map((product) => <div className="list-row" key={product.id}><span className="row-icon"><Package size={15} /></span><div><strong>{product.name}</strong><small>{product.sku}</small></div><b className="warning-text">{product.stock} left</b></div>) : <div className="quiet-empty">{workerMode ? 'Stock alerts are managed by your manager.' : <><Check size={16} /> No low-stock products yet.</>}</div>}</section></div><section className="panel activity-panel"><div className="panel-heading"><div><span className="section-label">Live activity</span><h2>Recent sales</h2></div><button className="text-btn" onClick={() => onNavigate('Sales')}>View sales <ArrowRight size={14} /></button></div>{sales.length ? sales.map((sale) => <div className="list-row" key={sale.created_at}><span className="row-icon sale"><ShoppingCart size={15} /></span><div><strong>Completed sale</strong><small>{new Date(sale.created_at).toLocaleString('en-NG')}</small></div><b>{workerMode ? 'Recorded' : `₦${Number(sale.total).toLocaleString('en-NG')}`}</b></div>) : <div className="quiet-empty">No sales recorded yet. Your first completed sale will appear here.</div>}</section></div>
}

function DashboardChart({ sales }: { sales: { total: number; created_at: string }[] }) {
  const points = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index))
    return sales.filter((sale) => new Date(sale.created_at).toDateString() === day.toDateString()).reduce((sum, sale) => sum + Number(sale.total), 0)
  })
  const max = Math.max(...points, 1)
  return <section className="panel dashboard-chart"><div className="panel-heading"><div><span className="section-label">Revenue trend</span><h2>Last 7 days</h2></div><span className="muted">Live records</span></div><div className="chart-bars">{points.map((point, index) => <div className="chart-bar-column" key={index}><span className="chart-bar-value">{point ? `₦${point.toLocaleString('en-NG')}` : '—'}</span><div className="chart-bar-track"><i style={{ height: `${Math.max(point ? 8 : 3, point / max * 100)}%` }} /></div><small>{new Intl.DateTimeFormat('en-NG', { weekday: 'short' }).format(new Date(Date.now() - (6 - index) * 86400000))}</small></div>)}</div></section>
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div> }

function FeatureView({ view, orgId, search }: { view: View; orgId: string; search: string }) {
  if (view === 'Inventory') return <Inventory orgId={orgId} search={search} />
  if (view === 'Customers') return <Customers orgId={orgId} search={search} />
  if (view === 'Expenses') return <Expenses orgId={orgId} />
  if (view === 'Sales') return <Sales orgId={orgId} />
  if (view === 'Receipts') return <Receipts orgId={orgId} />
  if (view === 'Invoices') return <Invoices orgId={orgId} />
  if (view === 'Reports') return <Reports orgId={orgId} />
  if (view === 'Branches') return <Branches orgId={orgId} />
  if (view === 'Workforce') return <Workforce orgId={orgId} />
  if (view === 'User Accounts') return <UserAccounts orgId={orgId} />
  if (view === 'Settings') return <SettingsPage orgId={orgId} />
  const titles: Record<string, [string, string]> = { Receipts: ['Receipts', 'Receipts generated from completed sales.'], Invoices: ['Invoices', 'Create and track invoices for your customers.'], Reports: ['Reports', 'A considered view of your real business activity.'], Settings: ['Settings', 'Business profile and workspace preferences.'] }
  const [title, subtitle] = titles[view]
  return <div className="page"><div className="page-heading"><div><span className="section-label">{view}</span><h1>{title}</h1><p className="muted">{subtitle}</p></div></div><section className="panel product-placeholder"><div className="empty-icon"><Settings /></div><h2>{title} is ready.</h2><p>This section is connected to your business workspace. Keep building your records here.</p><button className="secondary" onClick={() => window.alert('This workflow is connected to Supabase and ready for the next record type.')}>Learn about this workflow <ArrowRight size={14} /></button></section></div>
}

function Branches({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<{ id: string; name: string; code: string; address: string | null; status: string }[]>([])
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '' }); const [error, setError] = useState('')
  const load = useCallback(() => { supabase?.from('branches').select('id,name,code,address,status').eq('organization_id', orgId).order('created_at', { ascending: false }).then(({ data }) => setRows(data ?? [])) }, [orgId])
  useEffect(() => { load() }, [load])
  async function add(event: React.FormEvent) { event.preventDefault(); if (!supabase) return; setError(''); const { error: result } = await supabase.from('branches').insert({ organization_id: orgId, ...form }); if (result) setError(result.code === '23505' ? 'That branch code is already in use.' : result.message); else { setForm({ name: '', code: '', address: '', phone: '' }); load() } }
  return <div className="page"><PageIntro label="Branches" title="Know where work happens." description="Create and manage the places your organization operates." /><form className="panel record-form three" onSubmit={add}><label>Branch name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ikeja store" /></label><label>Branch code<input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="IKE-01" /></label><label>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street and city" /></label><label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234..." /></label><button className="primary"><Plus size={16} /> Add branch</button>{error && <div className="form-error">{error}</div>}</form><section className="panel table-panel">{rows.length ? <div className="table-wrap"><table><thead><tr><th>Branch</th><th>Code</th><th>Address</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td className="mono">{row.code}</td><td>{row.address || '—'}</td><td><span className="status completed">{row.status}</span></td></tr>)}</tbody></table></div> : <EmptyInline title="No branches yet" text="Create the first branch for this organization above." />}</section></div>
}

function Workforce({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<{ id: string; employee_id: string; full_name: string; email: string | null; phone: string | null; job_title: string | null; employment_status: string; monthly_salary: number | null; branch_id: string | null; hired_on: string | null; user_id: string | null }[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [self, setSelf] = useState<{ id: string; full_name: string; branch_id: string | null } | null>(null)
  const [attendance, setAttendance] = useState<{ id: string; work_date: string; clocked_in_at: string | null; clocked_out_at: string | null } | null>(null)
  const [form, setForm] = useState({ employee_id: '', full_name: '', email: '', phone: '', job_title: '', hired_on: new Date().toISOString().slice(0, 10), monthly_salary: '', branch_id: '' })
  const [error, setError] = useState(''); const [temporaryPassword, setTemporaryPassword] = useState(''); const [copyState, setCopyState] = useState('')
  const load = useCallback(() => { if (!supabase) return; Promise.all([supabase.from('employee_profiles').select('id,employee_id,full_name,email,phone,job_title,employment_status,monthly_salary,branch_id,hired_on,user_id').eq('organization_id', orgId).order('created_at', { ascending: false }), supabase.from('branches').select('id,name').eq('organization_id', orgId).eq('status', 'active').order('name'), getCurrentUserContext(supabase)]).then(([people, branchResult, context]) => { setRows(people.data ?? []); setBranches(branchResult.data ?? []); const own = people.data?.find((person) => person.user_id === context.userId); setSelf(own ? { id: own.id, full_name: own.full_name, branch_id: own.branch_id } : null) }).catch((reason: Error) => setError(reason.message)) }, [orgId])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (!supabase || !self) return; supabase.from('attendance').select('id,work_date,clocked_in_at,clocked_out_at').eq('employee_id', self.id).eq('work_date', new Date().toISOString().slice(0, 10)).maybeSingle().then(({ data }) => setAttendance(data)) }, [self])
  async function add(event: React.FormEvent) { event.preventDefault(); if (!supabase || !supabaseUrl || !supabaseAnonKey) return; setError(''); setTemporaryPassword(''); const { data: sessionData } = await supabase.auth.getSession(); const token = sessionData.session?.access_token; if (!token) { setError('Your owner session has expired. Sign in again.'); return } const response = await fetch(`${supabaseUrl}/functions/v1/provision-worker`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId: orgId, ...form, branchId: form.branch_id || null, jobTitle: form.job_title || null, hiredOn: form.hired_on || null, monthlySalary: form.monthly_salary || null }) }); const payload = await response.json().catch(() => null); if (!response.ok) { setError(payload?.error ?? 'Could not create the worker account.'); return } setTemporaryPassword(payload.temporaryPassword); setCopyState(''); setForm({ employee_id: '', full_name: '', email: '', phone: '', job_title: '', hired_on: new Date().toISOString().slice(0, 10), monthly_salary: '', branch_id: '' }); load() }
  async function archive(id: string) { if (!supabase) return; const { error: result } = await supabase.from('employee_profiles').update({ employment_status: 'archived' }).eq('id', id).eq('organization_id', orgId); if (result) setError(result.message); else load() }
  async function clock(kind: 'in' | 'out') { if (!supabase || !self) return; const result = kind === 'in' ? await supabase.from('attendance').insert({ organization_id: orgId, employee_id: self.id, branch_id: self.branch_id, work_date: new Date().toISOString().slice(0, 10), clocked_in_at: new Date().toISOString(), status: 'present' }) : await supabase.from('attendance').update({ clocked_out_at: new Date().toISOString() }).eq('id', attendance?.id ?? ''); if (result.error) setError(result.error.message); else load() }
  if (self) return <div className="page"><PageIntro label="Workforce" title={`Your shift, ${self.full_name}.`} description="Attendance is part of your worker profile and stays scoped to your assigned branch." /><section className="panel record-form three"><div><span className="section-label">Today</span><strong>{attendance?.clocked_in_at ? `Clocked in at ${new Date(attendance.clocked_in_at).toLocaleTimeString('en-NG')}` : 'Not clocked in yet'}</strong></div><button className="primary" disabled={Boolean(attendance?.clocked_in_at)} onClick={() => clock('in')}><Check size={16} /> Clock in</button><button className="secondary" disabled={!attendance?.clocked_in_at || Boolean(attendance.clocked_out_at)} onClick={() => clock('out')}>Clock out</button>{error && <div className="form-error">{error}</div>}</section></div>
  return <div className="page"><PageIntro label="Workforce" title="Keep your team in view." description="Create the employee record and secure application account together. The temporary password is shown once." /><form className="panel record-form three" onSubmit={add}><label>Employee ID<input required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="EMP-001" /></label><label>Full name<input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Employee name" /></label><label>Email address<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="worker@business.com" /></label><label>Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234..." /></label><label>Job role/title<input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="Sales associate" /></label><label>Branch<select required value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label>Hire date<input required type="date" value={form.hired_on} onChange={(e) => setForm({ ...form, hired_on: e.target.value })} /></label><label>Monthly salary<input type="number" min="0" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })} placeholder="Optional" /></label><button className="primary"><Plus size={16} /> Create worker account</button>{error && <div className="form-error">{error}</div>}</form>{temporaryPassword && <section className="panel temporary-password"><h2>Worker account created</h2><p>Copy this temporary password now. It is not stored and will not be shown again.</p><code>{temporaryPassword}</code><button className="secondary" onClick={() => { void navigator.clipboard?.writeText(temporaryPassword); setCopyState('Copied') }}>{copyState || 'Copy temporary password'}</button></section>}<section className="panel table-panel">{rows.length ? <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Contact</th><th>Role</th><th>Branch</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.full_name}</strong><small className="table-sub">{row.employee_id}</small></td><td>{row.email || '—'}<small className="table-sub">{row.phone || ''}</small></td><td>{row.job_title || '—'}</td><td>{branches.find((branch) => branch.id === row.branch_id)?.name || '—'}</td><td><span className={`status ${row.employment_status === 'archived' ? 'refunded' : 'completed'}`}>{row.employment_status}</span></td><td>{row.employment_status !== 'archived' && <button className="text-btn" type="button" onClick={() => archive(row.id)}>Deactivate</button>}</td></tr>)}</tbody></table></div> : <EmptyInline title="No employees yet" text="Create the first worker account above." />}</section></div>
}

function UserAccounts({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<{ id: string; employee_id: string; full_name: string; email: string | null; job_title: string | null; employment_status: string; branch_id: string | null; created_at: string; user_id: string | null }[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState('')
  async function setStatus(id: string, status: string) {
    if (!supabase) return
    const { error: result } = await supabase.from('employee_profiles').update({ employment_status: status }).eq('id', id).eq('organization_id', orgId)
    if (result) setError(result.message); else setRows((current) => current.map((row) => row.id === id ? { ...row, employment_status: status } : row))
  }
  useEffect(() => {
    if (!supabase) return
    Promise.all([
      supabase.from('employee_profiles').select('id,employee_id,full_name,email,job_title,employment_status,branch_id,created_at,user_id').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('branches').select('id,name').eq('organization_id', orgId),
    ]).then(([accounts, branchResult]) => { if (accounts.error) setError(accounts.error.message); setRows(accounts.data ?? []); setBranches(branchResult.data ?? []) })
  }, [orgId])
  return <div className="page"><PageIntro label="User accounts" title="Know who can sign in." description="Organization accounts are linked to employee records. Platform administrator accounts remain separate and are never managed here." />{error && <div className="form-error" role="alert">{error}</div>}<section className="panel table-panel">{rows.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Employee ID</th><th>Role</th><th>Branch</th><th>Status</th><th>Created</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.full_name}</strong></td><td>{row.email || '—'}</td><td className="mono">{row.employee_id}</td><td>{row.job_title || 'Worker'}</td><td>{branches.find((branch) => branch.id === row.branch_id)?.name || '—'}</td><td><span className={`status ${row.employment_status === 'active' ? 'completed' : 'refunded'}`}>{row.employment_status}</span></td><td>{new Date(row.created_at).toLocaleDateString('en-NG')}</td><td><button className="text-btn" onClick={() => void setStatus(row.id, row.employment_status === 'active' ? 'archived' : 'active')}>{row.employment_status === 'active' ? 'Deactivate' : 'Reactivate'}</button></td></tr>)}</tbody></table></div> : <EmptyInline title="No linked accounts yet" text="Create a worker from Workforce to provision an account safely." />}</section></div>
}

type ReceiptRow = { id: string; receipt_number: string | null; total: number; payment_method: string; created_at: string; customer: { name: string; phone: string | null; email: string | null } | null; sale_items: { id: string; quantity: number; unit_price: number; line_total: number; products: { name: string; sku: string } | null }[] }

const numberWords = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tensWords = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
function wordsUnderThousand(value: number): string {
  if (value < 20) return numberWords[value]
  if (value < 100) return `${tensWords[Math.floor(value / 10)]}${value % 10 ? `-${numberWords[value % 10].toLowerCase()}` : ''}`
  return `${numberWords[Math.floor(value / 100)]} Hundred${value % 100 ? ` and ${wordsUnderThousand(value % 100)}` : ''}`
}
function amountInWords(value: number) {
  const whole = Math.floor(Math.abs(value)); const kobo = Math.round((Math.abs(value) - whole) * 100)
  if (whole === 0 && kobo === 0) return 'Zero Naira Only'
  const groups = [{ value: 1_000_000_000, label: 'Billion' }, { value: 1_000_000, label: 'Million' }, { value: 1_000, label: 'Thousand' }]
  let remaining = whole; const parts: string[] = []
  groups.forEach((group) => { if (remaining >= group.value) { const count = Math.floor(remaining / group.value); parts.push(`${wordsUnderThousand(count)} ${group.label}`); remaining %= group.value } })
  if (remaining) parts.push(wordsUnderThousand(remaining))
  return `${parts.join(' ')} Naira${kobo ? ` and ${wordsUnderThousand(kobo)} Kobo` : ''} Only`
}
function receiptText(row: ReceiptRow, businessName: string) {
  const lines = row.sale_items.map((item, index) => `ITEM ${index + 1}. ${item.products?.name ?? 'Item'} | Qty ${item.quantity} | Unit NGN ${Number(item.unit_price).toLocaleString('en-NG')} | Total NGN ${Number(item.line_total).toLocaleString('en-NG')}`)
  return [businessName, 'SALES RECEIPT', `Receipt No: ${row.receipt_number ?? `RC-${row.id.slice(0, 8).toUpperCase()}`}`, `Date: ${new Date(row.created_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}`, `Time: ${new Date(row.created_at).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}`, row.customer ? `Customer: ${row.customer.name}${row.customer.phone ? ` | ${row.customer.phone}` : ''}` : 'Customer: Walk-in Customer', ...lines, `Subtotal: NGN ${Number(row.total).toLocaleString('en-NG')}`, `Payment method: ${row.payment_method}`, `Total: NGN ${Number(row.total).toLocaleString('en-NG')}`, `Amount in words: ${amountInWords(Number(row.total))}`].filter(Boolean).join('\n')
}

function buildReceiptPdf(text: string) {
  const escapePdf = (value: string) => value.replace(/[^\x20-\x7e]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const sourceLines = text.replace(/₦/g, 'NGN ').split('\n').flatMap((line) => {
    const value = line.trim()
    return value.length > 50 ? [value.slice(0, 50), value.slice(50)] : [value]
  })
  const height = Math.max(470, 188 + sourceLines.length * 18)
  const commands: string[] = []
  const fill = (r: number, g: number, b: number) => commands.push(`${r} ${g} ${b} rg`)
  const textAt = (value: string, x: number, y: number, size: number, font = 'F1', color = [0.12, 0.16, 0.21]) => {
    commands.push(`${color[0]} ${color[1]} ${color[2]} rg BT /${font} ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`)
  }
  fill(0.06, 0.15, 0.24); commands.push(`0 0 ${226} ${height} re f`)
  fill(1, 1, 1); commands.push(`14 ${height - 78} 198 64 re f`)
  textAt(sourceLines[0] || 'Zerobyte Business', 24, height - 42, 16, 'F2', [0.06, 0.15, 0.24])
  textAt('SALES RECEIPT', 24, height - 62, 8, 'F2', [0.08, 0.56, 0.72])
  let y = height - 108
  const receiptLines = sourceLines.slice(1)
  receiptLines.forEach((value, index) => {
    if (value.startsWith('ITEM ') && (index === 1 || !receiptLines[index - 1]?.startsWith('ITEM '))) {
      fill(0.08, 0.56, 0.72); commands.push(`14 ${y + 11} 198 1 re f`)
      textAt('ITEMS AND PAYMENT', 14, y - 6, 7, 'F2', [0.45, 0.76, 0.83]); y -= 24
    }
    const displayValue = value.startsWith('ITEM ') ? value.slice(5) : value
    const isTotal = value.toLowerCase().startsWith('total:')
    textAt(displayValue, isTotal ? 20 : 18, y, isTotal ? 13 : 9, isTotal ? 'F2' : 'F1', isTotal ? [0.08, 0.56, 0.72] : [0.86, 0.9, 0.93])
    y -= isTotal ? 25 : 17
  })
  fill(0.08, 0.56, 0.72); commands.push(`14 ${y + 6} 198 1 re f`)
  textAt('Thank you for your business.', 18, y - 18, 8, 'F1', [0.55, 0.65, 0.71])
  const stream = commands.join('\n')
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 226 ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

function Receipts({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<ReceiptRow[]>([])
  const [businessName, setBusinessName] = useState('Zerøbyte Business'); const [preview, setPreview] = useState<ReceiptRow | null>(null); const [error, setError] = useState('')
  useEffect(() => { if (!supabase) return; Promise.all([supabase.from('sales').select('id,receipt_number,total,payment_method,created_at,customers(name,phone,email),sale_items(id,quantity,unit_price,line_total,products(name,sku))').eq('organization_id', orgId).order('created_at', { ascending: false }), supabase.from('organizations').select('name').eq('id', orgId).single()]).then(([salesResult, orgResult]) => { if (salesResult.error) setError(salesResult.error.message); setRows((salesResult.data ?? []) as unknown as ReceiptRow[]); setBusinessName(orgResult.data?.name ?? 'Zerøbyte Business') }) }, [orgId])
  function download(row: ReceiptRow) { const url = URL.createObjectURL(buildReceiptPdf(receiptText(row, businessName))); const link = document.createElement('a'); link.href = url; link.download = `receipt-${row.id.slice(0, 8)}.pdf`; link.click(); URL.revokeObjectURL(url) }
  async function share(row: ReceiptRow) { const blob = buildReceiptPdf(receiptText(row, businessName)); const file = new File([blob], `receipt-${row.id.slice(0, 8)}.pdf`, { type: 'application/pdf' }); if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) { await navigator.share({ title: `Receipt RC-${row.id.slice(0, 8).toUpperCase()}`, text: receiptText(row, businessName), files: [file] }); return } download(row); const phone = window.prompt('Optional WhatsApp number, including country code. The PDF has been downloaded for you to attach manually:'); if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Receipt RC-${row.id.slice(0, 8).toUpperCase()} from ${businessName}. Total: ₦${Number(row.total).toLocaleString('en-NG')}`)}`, '_blank', 'noopener,noreferrer') }
  return <div className="page"><PageIntro label="Receipts" title="Every sale, ready to prove." description="Receipt items and totals come from the persisted sale and sale_items records." />{error && <div className="form-error" role="alert">{error}</div>}<section className="panel table-panel">{rows.length ? <div className="table-wrap"><table><thead><tr><th>Receipt</th><th>Customer</th><th>Date</th><th>Total</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="mono">{row.receipt_number ?? `RC-${row.id.slice(0, 8).toUpperCase()}`}</td><td>{row.customer?.name || 'Walk-in customer'}</td><td>{new Date(row.created_at).toLocaleString('en-NG')}</td><td className="amount">₦{Number(row.total).toLocaleString('en-NG')}</td><td><button className="text-btn" onClick={() => setPreview(row)}>Preview</button><button className="text-btn" onClick={() => download(row)}>PDF</button><button className="text-btn" onClick={() => void share(row)}>Share</button></td></tr>)}</tbody></table></div> : <EmptyInline title="No receipts yet" text="Complete a sale and its receipt will appear here." />}</section>{preview && <div className="receipt-preview-backdrop" onClick={() => setPreview(null)}><article className="receipt-preview" onClick={(event) => event.stopPropagation()}><button className="icon-btn receipt-close" onClick={() => setPreview(null)} aria-label="Close receipt"><X size={16} /></button><header className="receipt-document-header"><div className="receipt-brand-mark">ø</div><div><h2>{businessName}</h2><span>SALES RECEIPT</span></div></header><div className="receipt-meta-grid"><div><small>Receipt No.</small><strong>{preview.receipt_number ?? `RC-${preview.id.slice(0, 8).toUpperCase()}`}</strong></div><div><small>Date & time</small><strong>{new Date(preview.created_at).toLocaleString('en-NG')}</strong></div></div><div className="receipt-customer"><small>CUSTOMER</small><strong>{preview.customer?.name || 'Walk-in Customer'}</strong>{preview.customer?.phone && <span>{preview.customer.phone}</span>}{preview.customer?.email && <span>{preview.customer.email}</span>}</div><div className="receipt-table-wrap"><table className="receipt-table"><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>{preview.sale_items.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td><strong>{item.products?.name ?? 'Item'}</strong>{item.products?.sku && <small>{item.products.sku}</small>}</td><td>{item.quantity}</td><td>₦{Number(item.unit_price).toLocaleString('en-NG')}</td><td>₦{Number(item.line_total).toLocaleString('en-NG')}</td></tr>)}</tbody></table></div><div className="receipt-summary"><div><span>Subtotal</span><strong>₦{Number(preview.total).toLocaleString('en-NG')}</strong></div><div className="receipt-grand-total"><span>Total</span><strong>₦{Number(preview.total).toLocaleString('en-NG')}</strong></div></div><div className="receipt-payment"><span>Payment method</span><strong>{preview.payment_method}</strong></div><div className="receipt-words"><small>AMOUNT IN WORDS</small><p>{amountInWords(Number(preview.total))}</p></div><footer className="receipt-document-footer">Thank you for your business.<span>Powered by Zerøbyte</span></footer><div className="action-row receipt-actions"><button className="primary receipt-print" onClick={() => window.print()}>Print / save PDF</button><button className="secondary" onClick={() => download(preview)}>Download PDF</button><button className="secondary" onClick={() => void share(preview)}>Share / WhatsApp</button></div></article></div>}</div>
}

function Invoices({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<{ id: string; invoice_number: string; status: string; total: number; created_at: string }[]>([])
  const [form, setForm] = useState({ invoice_number: '', total: '' }); const [error, setError] = useState('')
  const load = useCallback(() => { supabase?.from('invoices').select('id,invoice_number,status,total,created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).then(({ data }) => setRows(data ?? [])) }, [orgId])
  useEffect(() => { load() }, [load])
  async function add(event: React.FormEvent) { event.preventDefault(); if (!supabase) return; const { error: result } = await supabase.from('invoices').insert({ organization_id: orgId, invoice_number: form.invoice_number, total: Number(form.total) }); if (result) setError(result.code === '23505' ? 'That invoice number already exists.' : result.message); else { setForm({ invoice_number: '', total: '' }); load() } }
  return <div className="page"><PageIntro label="Invoices" title="Keep billing clear." description="Create simple invoice records in naira and track their status." /><form className="panel record-form three" onSubmit={add}><div><label>Invoice number<input required value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="INV-0001" /></label></div><div><label>Total amount<input required type="number" min="0" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} placeholder="₦0.00" /></label></div><button className="primary"><Plus size={16} /> Create draft</button>{error && <div className="form-error">{error}</div>}</form><section className="panel table-panel">{rows.length ? <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Status</th><th>Date</th><th>Total</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.invoice_number}</strong></td><td><span className="status pending">{row.status}</span></td><td>{new Date(row.created_at).toLocaleDateString('en-NG')}</td><td className="amount">₦{Number(row.total).toLocaleString('en-NG')}</td></tr>)}</tbody></table></div> : <EmptyInline title="No invoices yet" text="Create your first draft invoice above." />}</section></div>
}

function Reports({ orgId }: { orgId: string }) {
  const [sales, setSales] = useState(0); const [expenses, setExpenses] = useState(0); const [products, setProducts] = useState(0); const [customers, setCustomers] = useState(0)
  useEffect(() => { if (!supabase) return; Promise.all([supabase.from('sales').select('total').eq('organization_id', orgId), supabase.from('expenses').select('amount').eq('organization_id', orgId), supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', orgId), supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)]).then(([s, e, p, c]) => { setSales((s.data ?? []).reduce((sum, row) => sum + Number(row.total), 0)); setExpenses((e.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)); setProducts(p.count ?? 0); setCustomers(c.count ?? 0) }) }, [orgId])
  return <div className="page"><PageIntro label="Reports" title="Understand the signal." description="A live summary of the activity your organization has recorded." /><div className="metrics"><Metric label="Sales revenue" value={`₦${sales.toLocaleString('en-NG')}`} note="From completed sales" /><Metric label="Expenses" value={`₦${expenses.toLocaleString('en-NG')}`} note="Recorded expenses" /><Metric label="Products" value={products.toString()} note="Catalog size" /><Metric label="Customers" value={customers.toString()} note="Customer records" /></div><section className="panel report-note"><BarChart3 size={22} color="#06b6d4" /><h2>Net movement</h2><strong>₦{(sales - expenses).toLocaleString('en-NG')}</strong><p>Calculated from your real sales and expense records.</p></section></div>
}

function SettingsPage({ orgId }: { orgId: string }) {
  const [name, setName] = useState(''); const [saved, setSaved] = useState(false); const [error, setError] = useState('')
  useEffect(() => { supabase?.from('organizations').select('name').eq('id', orgId).single().then(({ data }) => setName(data?.name ?? '')) }, [orgId])
  async function save(event: React.FormEvent) { event.preventDefault(); if (!supabase) return; const { error: result } = await supabase.from('organizations').update({ name }).eq('id', orgId); if (result) setError(result.message); else setSaved(true) }
  return <div className="page"><PageIntro label="Settings" title="Make it yours." description="Keep your business identity and workspace details current." /><form className="panel settings-form" onSubmit={save}><label>Business name<input required minLength={2} value={name} onChange={(e) => { setName(e.target.value); setSaved(false) }} /></label><label>Currency<select disabled><option>Nigerian naira (₦)</option></select></label><div className="settings-actions"><button className="primary">Save changes</button>{saved && <span className="form-success">Saved to your organization.</span>}{error && <span className="form-error">{error}</span>}</div></form><section className="panel settings-info"><span className="section-label">Security</span><h2>Organization-scoped by default.</h2><p>Every product, customer, sale and expense is protected by Supabase Row Level Security and tied to this workspace.</p></section></div>
}

function Inventory({ orgId, search }: { orgId: string; search: string }) {
  const [rows, setRows] = useState<ProductRow[]>([]); const [form, setForm] = useState({ name: '', sku: '', category: '', price: '', stock: '' }); const [receive, setReceive] = useState({ productId: '', quantity: '', cost: '', selling: '' }); const [editing, setEditing] = useState<string | null>(null); const [error, setError] = useState('')
  const [movements, setMovements] = useState<{ id: string; product_id: string; movement_type: string; quantity: number; created_at: string }[]>([])
  const load = useCallback(() => { if (!supabase) return; Promise.all([supabase.from('products').select('id,name,sku,stock,price,category').eq('organization_id', orgId).order('created_at', { ascending: false }), supabase.from('stock_movements').select('id,product_id,movement_type,quantity,created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(20)]).then(([productResult, movementResult]) => { setRows(productResult.data ?? []); setMovements(movementResult.data ?? []) }) }, [orgId])
  useEffect(() => { load() }, [load])
  async function add(event: React.FormEvent) { event.preventDefault(); if (!supabase) return; setError(''); const payload = { name: form.name, sku: form.sku, category: form.category || 'Uncategorized', price: Number(form.price), stock: Number(form.stock) }; const result = editing ? await supabase.from('products').update(payload).eq('id', editing).eq('organization_id', orgId) : await supabase.from('products').insert({ organization_id: orgId, ...payload }); if (result.error) setError(result.error.code === '23505' ? 'That SKU is already in use in this workspace.' : result.error.message); else { setForm({ name: '', sku: '', category: '', price: '', stock: '' }); setEditing(null); load() } }
  async function remove(id: string) { if (!supabase || !window.confirm('Delete this product? This cannot be undone.')) return; const { error: result } = await supabase.from('products').delete().eq('id', id).eq('organization_id', orgId); if (result) setError(result.message); else load() }
  async function receiveStock(event: React.FormEvent) { event.preventDefault(); if (!supabase) return; const { error: result } = await supabase.rpc('receive_stock', { target_org: orgId, target_product: receive.productId, quantity_to_add: Number(receive.quantity), new_cost: receive.cost ? Number(receive.cost) : null, new_selling: receive.selling ? Number(receive.selling) : null, target_branch: null }); if (result) setError(result.message); else { setReceive({ productId: '', quantity: '', cost: '', selling: '' }); load() } }
  function edit(row: ProductRow) { setEditing(row.id); setForm({ name: row.name, sku: row.sku, category: row.category ?? '', price: String(row.price), stock: String(row.stock) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const filtered = rows.filter((row) => `${row.name} ${row.sku} ${row.category}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page"><PageIntro label="Inventory" title="Know what is in stock." description="Edit mistakes, receive new stock into an existing SKU, and keep a traceable catalog." /><form className="panel record-form" onSubmit={add}><label>Product name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 5kg Rice" /></label><label>SKU<input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="RICE-005" /></label><label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Groceries" /></label><label>Selling price<input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="₦0.00" /></label><label>{editing ? 'Current stock' : 'Opening stock'}<input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" /></label><button className="primary"><Plus size={16} /> {editing ? 'Save product' : 'Add product'}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm({ name: '', sku: '', category: '', price: '', stock: '' }) }}>Cancel</button>}{error && <div className="form-error">{error}</div>}</form><form className="panel receive-form" onSubmit={receiveStock}><div className="receive-heading"><span className="section-label">Stock receiving</span><h2>Add stock without duplicating the product</h2><p>Choose an existing SKU, add units, and optionally update its prices.</p></div><label>Product<select required value={receive.productId} onChange={(e) => setReceive({ ...receive, productId: e.target.value })}><option value="">Choose product</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.stock} units</option>)}</select></label><label>Quantity<input required type="number" min="1" value={receive.quantity} onChange={(e) => setReceive({ ...receive, quantity: e.target.value })} /></label><label>New cost (optional)<input type="number" min="0" value={receive.cost} onChange={(e) => setReceive({ ...receive, cost: e.target.value })} placeholder="Keep current" /></label><label>New selling price (optional)<input type="number" min="0" value={receive.selling} onChange={(e) => setReceive({ ...receive, selling: e.target.value })} placeholder="Keep current" /></label><button className="secondary">Receive stock</button></form><section className="panel table-panel catalog-panel"><div className="panel-heading"><div><span className="section-label">Your catalog</span><h2>{rows.length} product{rows.length === 1 ? '' : 's'}</h2></div></div>{filtered.length ? <div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Price</th><th>Actions</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td className="mono">{row.sku}</td><td>{row.category}</td><td className={row.stock <= 5 ? 'warning-text' : ''}>{row.stock}</td><td className="amount">₦{Number(row.price).toLocaleString('en-NG')}</td><td><button type="button" className="text-btn" onClick={() => edit(row)}>Edit</button><button type="button" className="text-btn danger-text" onClick={() => remove(row.id)}>Delete</button></td></tr>)}</tbody></table></div> : <EmptyInline title="No products yet" text="Add your first product above. It will become available to sales and stock workflows." />}</section><section className="panel table-panel stock-history"><div className="panel-heading"><div><span className="section-label">Stock history</span><h2>Recent movements</h2></div></div>{movements.length ? <div className="table-wrap"><table><thead><tr><th>Product</th><th>Movement</th><th>Quantity</th><th>Date</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td>{rows.find((row) => row.id === movement.product_id)?.name || 'Product'}</td><td><span className="status completed">{movement.movement_type}</span></td><td className={movement.quantity < 0 ? 'danger-text' : 'stock-low'}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</td><td>{new Date(movement.created_at).toLocaleString('en-NG')}</td></tr>)}</tbody></table></div> : <EmptyInline title="No stock movements yet" text="Receiving stock and completing sales will create an auditable history here." />}</section></div>
}

function Customers({ orgId, search }: { orgId: string; search: string }) {
  const [rows, setRows] = useState<CustomerRow[]>([]); const [form, setForm] = useState({ name: '', email: '', phone: '' }); const [error, setError] = useState('')
  const load = useCallback(() => { supabase?.from('customers').select('id,name,email,phone').eq('organization_id', orgId).order('created_at', { ascending: false }).then(({ data }) => setRows(data ?? [])) }, [orgId])
  useEffect(() => { load() }, [load])
  async function add(event: React.FormEvent) { event.preventDefault(); if (!supabase) return; const { error: result } = await supabase.rpc('create_customer', { target_org: orgId, target_branch: null, customer_name: form.name, customer_email: form.email || null, customer_phone: form.phone || null }); if (result) setError(result.message); else { setForm({ name: '', email: '', phone: '' }); load() } }
  const filtered = rows.filter((row) => `${row.name} ${row.email ?? ''} ${row.phone ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page"><PageIntro label="Customers" title="Keep people close." description="A clean customer book for repeat business and better follow-up." /><form className="panel record-form three" onSubmit={add}><div><label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" /></label></div><div><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="customer@email.com" /></label></div><div><label>Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234..." /></label></div><button className="primary"><Plus size={16} /> Add customer</button>{error && <div className="form-error">{error}</div>}</form><section className="panel table-panel">{filtered.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.email || '—'}</td><td>{row.phone || '—'}</td></tr>)}</tbody></table></div> : <EmptyInline title="No customers yet" text="Your customer records will appear here as you add them." />}</section></div>
}

function Expenses({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<{ id: string; title: string; category: string; amount: number; expense_date: string }[]>([]); const [form, setForm] = useState({ title: '', category: 'General', amount: '', expense_date: new Date().toISOString().slice(0, 10) }); const [error, setError] = useState('')
  const load = useCallback(() => { supabase?.from('expenses').select('id,title,category,amount,expense_date').eq('organization_id', orgId).order('expense_date', { ascending: false }).then(({ data }) => setRows(data ?? [])) }, [orgId])
  useEffect(() => { load() }, [load])
  async function add(event: React.FormEvent) { event.preventDefault(); if (!supabase) return; const { error: result } = await supabase.from('expenses').insert({ organization_id: orgId, ...form, amount: Number(form.amount) }); if (result) setError(result.message); else { setForm({ ...form, title: '', amount: '' }); load() } }
  return <div className="page"><PageIntro label="Expenses" title="See where money goes." description="Record operating costs in naira and keep your picture honest." /><form className="panel record-form three" onSubmit={add}><div><label>Expense title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Shop rent" /></label></div><div><label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Operations" /></label></div><div><label>Amount<input required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="₦0.00" /></label></div><div><label>Date<input required type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></label></div><button className="primary"><Plus size={16} /> Add expense</button>{error && <div className="form-error">{error}</div>}</form><section className="panel table-panel">{rows.length ? <div className="table-wrap"><table><thead><tr><th>Expense</th><th>Category</th><th>Date</th><th>Amount</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.title}</strong></td><td>{row.category}</td><td>{row.expense_date}</td><td className="amount">₦{Number(row.amount).toLocaleString('en-NG')}</td></tr>)}</tbody></table></div> : <EmptyInline title="No expenses yet" text="Record your first operating expense above." />}</section></div>
}

function Sales({ orgId }: { orgId: string }) {
  const [products, setProducts] = useState<ProductRow[]>([]); const [customers, setCustomers] = useState<CustomerRow[]>([]); const [selected, setSelected] = useState(''); const [customer, setCustomer] = useState(''); const [quantity, setQuantity] = useState('1'); const [message, setMessage] = useState('')
  useEffect(() => { if (!supabase) return; Promise.all([supabase.from('products').select('id,name,sku,stock,price').eq('organization_id', orgId).gt('stock', 0).order('name'), supabase.from('customers').select('id,name,email,phone').eq('organization_id', orgId).order('name')]).then(([productResult, customerResult]) => { setProducts(productResult.data ?? []); setCustomers(customerResult.data ?? []) }) }, [orgId])
  async function complete(event: React.FormEvent) { event.preventDefault(); if (!supabase || !selected) return; const item = products.find((product) => product.id === selected); if (!item) return; const count = Number(quantity); if (count < 1 || count > item.stock) { setMessage(`Only ${item.stock} units are available.`); return } const { error } = await supabase.rpc('create_sale', { target_org: orgId, target_customer: customer || null, items: [{ product_id: item.id, quantity: count }], target_branch: null, payment_method: 'cash' }); if (error) setMessage(error.message); else { setMessage('Sale completed and stock updated.'); setProducts(products.map((product) => product.id === item.id ? { ...product, stock: product.stock - count } : product)) } }
  const item = products.find((product) => product.id === selected); const total = item ? item.price * Number(quantity || 0) : 0
  return <div className="page"><PageIntro label="Sales" title="Make a sale, cleanly." description="Select a product, confirm quantity, and let the trusted transaction update stock." /><section className="sales-layout"><form className="panel sale-form" onSubmit={complete}><label>Product<select required value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Choose a product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.stock} available</option>)}</select></label><label>Customer<select value={customer} onChange={(e) => setCustomer(e.target.value)}><option value="">Walk-in customer</option>{customers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Quantity<input required type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label><div className="sale-total"><span>Total</span><strong>₦{total.toLocaleString('en-NG')}</strong></div>{message && <div className="form-success">{message}</div>}<button className="primary" disabled={!selected}>Complete sale <ArrowRight size={16} /></button></form><section className="panel sale-note"><span className="section-label">Trusted calculation</span><h2>Stock changes on the server.</h2><p>Your browser never decides the final total or bypasses inventory checks. The Supabase transaction calculates the sale and records the audit event.</p></section></section></div>
}

function PageIntro({ label, title, description }: { label: string; title: string; description: string }) { return <div className="page-heading"><div><span className="section-label">{label}</span><h1>{title}</h1><p className="muted">{description}</p></div></div> }
function EmptyInline({ title, text }: { title: string; text: string }) { return <div className="empty-inline"><strong>{title}</strong><span>{text}</span></div> }

export default App
