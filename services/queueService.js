const ClinicState = require('../models/ClinicState');

const SINGLETON_ID = 'singleton';
const HISTORY_WINDOW = 20;

const defaultState = () => ({
  _id: SINGLETON_ID,
  currentToken: null,
  nextTokenNumber: 1,
  manualAvgMinutes: null,
  patients: [],
  consultationHistory: [],
  lastUpdated: new Date(),
});

let memoryState = defaultState();
let useMemory = false;

function setMemoryMode(enabled) {
  useMemory = enabled;
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

async function getState() {
  if (useMemory) {
    return cloneState(memoryState);
  }
  let state = await ClinicState.findById(SINGLETON_ID);
  if (!state) {
    state = await ClinicState.create({ _id: SINGLETON_ID });
  }
  return state.toObject ? state.toObject() : state;
}

async function saveState(state) {
  state.lastUpdated = new Date();
  if (useMemory) {
    memoryState = cloneState(state);
    return memoryState;
  }
  await ClinicState.findByIdAndUpdate(SINGLETON_ID, state, { upsert: true, new: true });
  return state;
}

function computeAvgConsultMinutes(state) {
  const recent = state.consultationHistory.slice(-HISTORY_WINDOW);
  if (recent.length > 0) {
    const sum = recent.reduce((acc, r) => acc + r.durationMinutes, 0);
    return Math.round((sum / recent.length) * 10) / 10;
  }
  if (state.manualAvgMinutes != null) {
    return state.manualAvgMinutes;
  }
  return 10;
}

function buildPublicState(state) {
  const waiting = state.patients.filter((p) => p.status === 'waiting');
  const inConsultation = state.patients.find((p) => p.status === 'in_consultation');
  const avgMinutes = computeAvgConsultMinutes(state);
  const dataDrivenAvg = state.consultationHistory.length > 0;

  return {
    currentToken: state.currentToken,
    currentPatient: inConsultation
      ? { token: inConsultation.token, name: inConsultation.name }
      : null,
    waitingCount: waiting.length,
    waitingTokens: waiting.map((p) => p.token),
    nextTokenNumber: state.nextTokenNumber,
    avgConsultMinutes: avgMinutes,
    avgSource: dataDrivenAvg ? 'historical' : 'manual',
    consultationSamples: state.consultationHistory.length,
    lastUpdated: state.lastUpdated,
  };
}

async function addPatient(name = '') {
  const state = await getState();
  const token = state.nextTokenNumber;

  state.patients.push({
    token,
    name: name.trim(),
    status: 'waiting',
    joinedAt: new Date(),
  });
  state.nextTokenNumber += 1;
  await saveState(state);

  return { token, state: buildPublicState(state) };
}

async function callNext() {
  const state = await getState();

  const current = state.patients.find((p) => p.status === 'in_consultation');
  if (current) {
    current.status = 'completed';
    current.completedAt = new Date();
    if (current.calledAt) {
      const calledAt = new Date(current.calledAt);
      const durationMs = current.completedAt - calledAt;
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
      state.consultationHistory.push({
        token: current.token,
        durationMinutes,
        recordedAt: new Date(),
      });
    }
  }

  const next = state.patients
    .filter((p) => p.status === 'waiting')
    .sort((a, b) => a.token - b.token)[0];

  if (!next) {
    state.currentToken = null;
    await saveState(state);
    return { called: null, state: buildPublicState(state) };
  }

  next.status = 'in_consultation';
  next.calledAt = new Date();
  state.currentToken = next.token;
  await saveState(state);

  return { called: next.token, state: buildPublicState(state) };
}

async function setManualAvg(minutes) {
  const state = await getState();
  const parsed = Number(minutes);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 120) {
    throw new Error('Average must be between 1 and 120 minutes');
  }
  state.manualAvgMinutes = parsed;
  await saveState(state);
  return buildPublicState(state);
}

async function getPatientView(tokenNumber) {
  const state = await getState();
  const publicState = buildPublicState(state);
  const patient = state.patients.find((p) => p.token === tokenNumber);

  if (!patient) {
    return { ...publicState, yourToken: null, tokensAhead: 0, estimatedWaitMinutes: 0 };
  }

  let tokensAhead = 0;
  if (patient.status === 'waiting') {
    tokensAhead = state.patients.filter(
      (p) => p.status === 'waiting' && p.token < tokenNumber
    ).length;
    if (publicState.currentToken != null && publicState.currentToken < tokenNumber) {
      tokensAhead += 1;
    }
  }

  const avg = publicState.avgConsultMinutes;
  const estimatedWaitMinutes =
    patient.status === 'in_consultation'
      ? 0
      : patient.status === 'completed'
        ? 0
        : Math.round(tokensAhead * avg);

  return {
    ...publicState,
    yourToken: tokenNumber,
    yourStatus: patient.status,
    yourName: patient.name,
    tokensAhead,
    estimatedWaitMinutes,
  };
}

async function resetQueue() {
  const fresh = defaultState();
  await saveState(fresh);
  return buildPublicState(fresh);
}

module.exports = {
  setMemoryMode,
  getState,
  buildPublicState,
  addPatient,
  callNext,
  setManualAvg,
  getPatientView,
  resetQueue,
};
