import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePatientView } from '../hooks/useSocket';

export default function Display() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const [tokenInput, setTokenInput] = useState(tokenFromUrl ?? '');
  const [activeToken, setActiveToken] = useState(
    tokenFromUrl ? Number(tokenFromUrl) : null
  );

  const patientView = usePatientView(activeToken);

  useEffect(() => {
    if (tokenFromUrl) {
      const parsed = Number(tokenFromUrl);
      if (Number.isFinite(parsed) && parsed > 0) {
        setActiveToken(parsed);
        setTokenInput(tokenFromUrl);
      }
    }
  }, [tokenFromUrl]);

  const handleLookup = () => {
    const token = parseInt(tokenInput, 10);
    if (!token || token < 1) {
      alert('Please enter a valid token number');
      return;
    }
    setActiveToken(token);
    setSearchParams({ token: String(token) });
  };

  if (!activeToken) {
    return (
      <div className="display-page">
        <div className="display-container">
          <div className="display-header">
            <h1>Neighbourhood Clinic</h1>
            <p>Live queue — no refresh needed</p>
          </div>

          <div className="lookup-card">
            <strong>Check your wait time</strong>
            <p style={{ opacity: 0.9, fontSize: '0.9rem', marginTop: 4 }}>
              Enter your token number
            </p>
            <input
              type="number"
              placeholder="e.g. 12"
              min="1"
              inputMode="numeric"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            />
            <button type="button" className="btn" onClick={handleLookup}>
              Show my status
            </button>
          </div>

          <div className="live-indicator">
            <span className="live-dot" />
            Updates live when receptionist calls next
          </div>
        </div>
      </div>
    );
  }

  if (!patientView) {
    return (
      <div className="display-page">
        <div className="display-container">
          <div className="display-header">
            <h1>Neighbourhood Clinic</h1>
            <p>Loading your status…</p>
          </div>
        </div>
      </div>
    );
  }

  if (patientView.yourToken == null) {
    return (
      <div className="display-page">
        <div className="display-container">
          <div className="display-header">
            <h1>Neighbourhood Clinic</h1>
            <p>Live queue — no refresh needed</p>
          </div>
          <div className="lookup-card">
            <strong>Token not found</strong>
            <p style={{ opacity: 0.9, fontSize: '0.9rem', marginTop: 4 }}>
              Check the number on your slip and try again.
            </p>
            <input
              type="number"
              placeholder="e.g. 12"
              min="1"
              inputMode="numeric"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            />
            <button type="button" className="btn" onClick={handleLookup}>
              Show my status
            </button>
          </div>
        </div>
      </div>
    );
  }

  const data = patientView;
  const isConsultation = data.yourStatus === 'in_consultation';
  const isCompleted = data.yourStatus === 'completed';
  const isWaiting = data.yourStatus === 'waiting';

  const waitHint =
    data.avgSource === 'historical'
      ? `Based on ${data.consultationSamples} real consultation time(s), avg ${data.avgConsultMinutes} min each`
      : `Based on clinic average of ${data.avgConsultMinutes} min per visit (set by receptionist)`;

  return (
    <div className="display-page">
      <div className="display-container">
        <div className="display-header">
          <h1>Neighbourhood Clinic</h1>
          <p>Live queue — no refresh needed</p>
        </div>

        {isConsultation && (
          <div className="status-banner status-consultation">You&apos;re being seen now</div>
        )}
        {isCompleted && (
          <div className="status-banner status-done">Your consultation is complete</div>
        )}
        {isWaiting && (
          <div className="status-banner status-waiting">
            {data.tokensAhead} patient(s) ahead of you
          </div>
        )}

        <div className={`hero-card${isConsultation ? ' your-turn' : ''}`}>
          <div className="hero-label">
            {isConsultation ? 'Your token' : 'Now being seen'}
          </div>
          <div className="hero-token">
            {isConsultation ? data.yourToken : (data.currentToken ?? '—')}
          </div>
        </div>

        {!isConsultation && (
          <div className="wait-card">
            <h3>Your token</h3>
            <div className="hero-token" style={{ fontSize: '3.5rem' }}>
              {data.yourToken}
            </div>
          </div>
        )}

        {!isConsultation && !isCompleted && (
          <div className="wait-card">
            <h3>People ahead of you</h3>
            <div className="wait-time">{data.tokensAhead}</div>
          </div>
        )}

        <div className="wait-card">
          <h3>Estimated wait</h3>
          <div className="wait-time">
            {isConsultation && (
              <>0 <span>min — your turn!</span></>
            )}
            {isCompleted && (
              <>— <span>visit complete</span></>
            )}
            {isWaiting && (
              <>
                {data.estimatedWaitMinutes} <span>min</span>
              </>
            )}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            {waitHint}
          </p>
        </div>

        <div className="live-indicator">
          <span className="live-dot" />
          Updates live when receptionist calls next
        </div>
      </div>
    </div>
  );
}
