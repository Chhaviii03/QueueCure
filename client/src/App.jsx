import { Routes, Route, Navigate } from 'react-router-dom';
import Receptionist from './pages/Receptionist';
import Display from './pages/Display';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/receptionist" replace />} />
      <Route path="/receptionist" element={<Receptionist />} />
      <Route path="/display" element={<Display />} />
    </Routes>
  );
}
