import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import TamperDashboard from './components/TamperDashboard.jsx';
import DeviceMonitoringPage from './components/DeviceMonitoringPage.jsx';
import socketClient from './services/socket';

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    socketClient.connect();
    console.log('Socket connected?', socketClient.isConnected());

    if ('Notification' in window) {
      Notification.requestPermission().catch(() => {});
    }

    const unsubEvent = socketClient.onTamperEvent((event) => {
      console.log('tamper-event', event);
      if (Notification.permission === 'granted') {
        new Notification('Tamper Event', {
          body: `${event.eventType} on ${event.deviceId}`,
        });
      }
    });

    return () => {
      unsubEvent();
      socketClient.removeAllListeners();
      socketClient.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen text-slate-100">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<TamperDashboard />} />
        <Route path="/devices" element={<DeviceMonitoringPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}


