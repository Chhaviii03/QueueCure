import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket;

function getSocket() {
  if (!socket) {
    socket = io({ autoConnect: true });
  }
  return socket;
}

export function useQueueState() {
  const [queueState, setQueueState] = useState(null);

  useEffect(() => {
    const s = getSocket();

    const onUpdate = (state) => setQueueState(state);
    s.on('queue:update', onUpdate);

    fetch('/api/queue')
      .then((r) => r.json())
      .then(setQueueState)
      .catch(() => {});

    return () => s.off('queue:update', onUpdate);
  }, []);

  return queueState;
}

export function usePatientView(token) {
  const [patientView, setPatientView] = useState(null);

  useEffect(() => {
    if (!token) {
      setPatientView(null);
      return undefined;
    }

    const s = getSocket();
    const parsed = Number(token);

    const onUpdate = (view) => setPatientView(view);
    s.on('patient:update', onUpdate);
    s.emit('patient:subscribe', parsed);

    fetch(`/api/patient/${parsed}`)
      .then((r) => r.json())
      .then(setPatientView)
      .catch(() => {});

    return () => s.off('patient:update', onUpdate);
  }, [token]);

  return patientView;
}

export { getSocket };
