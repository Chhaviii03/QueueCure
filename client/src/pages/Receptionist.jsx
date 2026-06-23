import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Toast from '../components/Toast';
import { useQueueState } from '../hooks/useSocket';
import { useToast } from '../hooks/useToast';
import '../styles/receptionist.css';

function MiniBars({ values }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mini-bars">
      {values.map((v, i) => (
        <span
          key={i}
          className="mini-bar"
          style={{ height: `${Math.max(20, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function NavIcon({ children }) {
  return <span className="nav-icon">{children}</span>;
}

export default function Receptionist() {
  const queueState = useQueueState();
  const { message, visible, showToast } = useToast();
  const [lastToken, setLastToken] = useState(null);
  const [avgInput, setAvgInput] = useState('10');
  const nameRef = useRef(null);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    const name = nameRef.current?.value ?? '';
    const start = performance.now();

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const elapsed = ((performance.now() - start) / 1000).toFixed(1);
      setLastToken(data.token);
      if (nameRef.current) nameRef.current.value = '';
      nameRef.current?.focus();
      showToast(`Token #${data.token} issued in ${elapsed}s`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleCallNext = async () => {
    try {
      const res = await fetch('/api/call-next', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.called ? `Now serving token #${data.called}` : 'Queue is empty');
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSetAvg = async () => {
    try {
      const res = await fetch('/api/settings/avg-minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: avgInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Average set to ${data.avgConsultMinutes} min`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset the queue for a new day? This clears all patients.')) return;
    try {
      await fetch('/api/reset', { method: 'POST' });
      setLastToken(null);
      showToast('Queue reset');
    } catch (err) {
      showToast(err.message);
    }
  };

  const waiting = queueState?.waitingCount ?? 0;
  const nextToken = queueState?.nextTokenNumber ?? 1;
  const avgMin = queueState?.avgConsultMinutes ?? 10;
  const callNextDisabled = queueState && waiting === 0 && !queueState.currentToken;

  const avgHint =
    queueState?.avgSource === 'historical'
      ? `Auto-calculated from ${queueState.consultationSamples} recent consultation(s).`
      : 'Set manually until real consultation durations are recorded.';

  const estWaitForQueue = waiting * avgMin;

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">Q</div>
          <span className="brand-name">Queue Cure</span>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">Navigation</p>
          <a href="/receptionist" className="nav-item active">
            <NavIcon>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </NavIcon>
            Queue Desk
          </a>
          <Link to="/display" className="nav-item" target="_blank">
            <NavIcon>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </NavIcon>
            Waiting Room
          </Link>
          <button type="button" className="nav-item nav-btn" onClick={handleReset}>
            <NavIcon>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </NavIcon>
            Reset Queue
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">R</div>
          <div>
            <div className="user-name">Reception Desk</div>
            <div className="user-id">Live · Connected</div>
          </div>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1 className="dash-title">Queue Desk</h1>
            <p className="dash-subtitle">Manage patients and call tokens in real time</p>
          </div>
          <div className="dash-header-actions">
            <span className="live-pill">
              <span className="live-dot" />
              Live sync
            </span>
            <button type="button" className="btn-dash-dark" onClick={() => nameRef.current?.focus()}>
              + Add Patient
            </button>
          </div>
        </header>

        <section className="stat-row">
          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-card-label">Patients Waiting</span>
              <MiniBars values={[3, 5, 4, 7, waiting || 2, waiting, Math.max(waiting - 1, 1)]} />
            </div>
            <div className="stat-card-value">{waiting}</div>
            <div className="stat-card-meta">
              <span className="meta-up">↗ {waiting > 0 ? 'Active queue' : 'Queue empty'}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-card-label">Next Token #</span>
              <MiniBars values={[1, 2, 3, 4, 5, nextToken - 1, nextToken].map((n) => Math.min(n, 10))} />
            </div>
            <div className="stat-card-value">{nextToken}</div>
            <div className="stat-card-meta">
              <span>Next to be issued</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-card-label">Avg Consult Time</span>
              <MiniBars values={[8, 9, 10, avgMin, 11, 10, avgMin]} />
            </div>
            <div className="stat-card-value">{avgMin}<span className="unit"> min</span></div>
            <div className="stat-card-meta">
              <span className={`source-pill ${queueState?.avgSource === 'historical' ? 'historical' : ''}`}>
                {queueState?.avgSource ?? 'manual'}
              </span>
            </div>
          </div>
        </section>

        <section className="content-row">
          <div className="panel panel-serving">
            <h3 className="panel-title">Now Serving</h3>
            <div className="serving-ring-wrap">
              <div className="serving-ring">
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" className="ring-bg" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    className="ring-fill"
                    style={{
                      strokeDasharray: `${queueState?.currentToken ? 280 : 0} 327`,
                    }}
                  />
                </svg>
                <div className="serving-number">{queueState?.currentToken ?? '—'}</div>
              </div>
            </div>
            <p className="serving-name">
              {queueState?.currentPatient?.name
                ? queueState.currentPatient.name
                : queueState?.currentToken
                  ? `Token ${queueState.currentToken}`
                  : 'No one being seen'}
            </p>
            <button
              type="button"
              className="btn-call-next"
              onClick={handleCallNext}
              disabled={callNextDisabled}
            >
              Call next token
            </button>
          </div>

          <div className="panel panel-add">
            <h3 className="panel-title">Add Patient</h3>
            <p className="panel-desc">Issue a token in under 10 seconds. Name is optional.</p>
            <form onSubmit={handleAddPatient} autoComplete="off">
              <input
                ref={nameRef}
                type="text"
                className="dash-input"
                placeholder="Patient name (optional)"
                autoFocus
              />
              <button type="submit" className="btn-dash-primary full-width">
                Issue token
              </button>
            </form>
            {lastToken != null && (
              <div className="issued-banner">
                <span className="issued-label">Last issued</span>
                <span className="issued-token">#{lastToken}</span>
              </div>
            )}
          </div>

          <div className="panel panel-settings">
            <h3 className="panel-title">Consultation Settings</h3>
            <p className="panel-desc">{avgHint}</p>
            <div className="settings-inline">
              <input
                type="number"
                className="dash-input compact"
                min="1"
                max="120"
                value={avgInput}
                onChange={(e) => setAvgInput(e.target.value)}
              />
              <span className="settings-unit">min</span>
              <button type="button" className="btn-dash-outline" onClick={handleSetAvg}>
                Set average
              </button>
            </div>
            <div className="settings-stat">
              <span>Est. total wait in queue</span>
              <strong>{estWaitForQueue} min</strong>
            </div>
          </div>
        </section>

        <section className="banner-row">
          <div className="dash-banner">
            <div className="banner-ring">
              <svg viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" className="ring-bg" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="ring-fill light"
                  style={{
                    strokeDasharray: `${Math.min(waiting * 30, 214)} 214`,
                  }}
                />
              </svg>
              <span className="banner-ring-val">{waiting}</span>
            </div>
            <div className="banner-text">
              <h3>Live queue sync active</h3>
              <p>
                Patient screens update instantly when you call the next token — no refresh needed.
                Share the waiting room link with patients on their phones.
              </p>
            </div>
            <Link to="/display" className="btn-dash-light" target="_blank">
              Open waiting room
            </Link>
          </div>
        </section>

        <section className="queue-section">
          <div className="panel panel-queue">
            <div className="panel-head">
              <h3 className="panel-title">Waiting Queue</h3>
              <span className="queue-count">{waiting} patient{waiting !== 1 ? 's' : ''}</span>
            </div>
            <ul className="dash-queue-list">
              {!queueState?.waitingTokens?.length ? (
                <li className="queue-empty">No patients waiting</li>
              ) : (
                queueState.waitingTokens.map((t, i) => (
                  <li key={t} className="queue-item">
                    <div className="queue-item-left">
                      <span className="queue-rank">{i + 1}</span>
                      <span>Token {t}</span>
                    </div>
                    <div className="queue-item-right">
                      <span className="est-wait">~{Math.round((i + (queueState.currentToken ? 1 : 0)) * avgMin)} min</span>
                      <span className="token-chip">#{t}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </main>

      <Toast message={message} visible={visible} />
    </div>
  );
}
