import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, AlertTriangle, Siren, Play, Square, ShieldCheck, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { deviceAPI, eventAPI, healthCheck } from '../services/api';
import socketClient from '../services/socket';

export default function TamperDashboard() {
  // Static mode toggle to allow immediate interactivity without backend
  const STATIC_MODE = true;

  // Sample devices for static/demo mode
  const [devices, setDevices] = useState([
    { id: 'WS-001', name: 'Digital Scale - Market Plaza', type: 'Digital Scale', sector: 'Trade & Retail', status: 'Normal', voltage: 3.32, current: 125, temp: 24.5, integrity: 98, lastReading: 10.53, historicalMean: 10.19 },
    { id: 'WB-002', name: 'Weighbridge - Steel Mill', type: 'Weighbridge', sector: 'Industrial', status: 'Normal', voltage: 22.8, current: 850, temp: 33.2, integrity: 95, lastReading: 11.32, historicalMean: 11.32 },
    { id: 'FD-003', name: 'Fuel Dispenser - Highway Station', type: 'Fuel Dispenser', sector: 'Transport', status: 'Normal', voltage: 12.5, current: 2800, temp: 28.1, integrity: 92, lastReading: 45.2, historicalMean: 44.8 },
    { id: 'POS-004', name: 'Payment Terminal - Mall', type: 'Payment Terminal', sector: 'Trade & Retail', status: 'Normal', voltage: 5.0, current: 950, temp: 26.8, integrity: 94, lastReading: 245.1, historicalMean: 245.1 },
    { id: 'AG-006', name: 'Livestock Scale - Dairy Farm', type: 'Livestock Scale', sector: 'Agriculture', status: 'Normal', voltage: 12.0, current: 650, temp: 21.5, integrity: 95, lastReading: 385.7, historicalMean: 380.2 },
    { id: 'WM-006', name: 'Water Meter - Residential', type: 'Water Meter', sector: 'Utilities', status: 'Normal', voltage: 3.6, current: 150, temp: 22.8, integrity: 94, lastReading: 1247.3, historicalMean: 1240.5 },
    { id: 'MS-007', name: 'Medical Scale - Hospital', type: 'Medical Scale', sector: 'Healthcare', status: 'Normal', voltage: 5.0, current: 200, temp: 23.2, integrity: 97, lastReading: 68.4, historicalMean: 67.8 }
  ]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [events, setEvents] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [systemStatus, setSystemStatus] = useState('normal');
  const [monitoring, setMonitoring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  // Hash verification state
  const [currentHash, setCurrentHash] = useState('');
  const [hashHistory, setHashHistory] = useState([]);

  // Simple hash generator for demo
  const generateHash = (deviceId, reading, timestamp) => {
    const data = `${deviceId}-${reading}-${timestamp}`;
    let hashNum = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hashNum = ((hashNum << 5) - hashNum) + char;
      hashNum = hashNum & hashNum;
    }
    return 'tptl_' + Math.abs(hashNum).toString(36) + Math.random().toString(36).substr(2, 9);
  };

  useEffect(() => {
    if (STATIC_MODE) return; // backend/socket mode disabled for static demo
    let mounted = true;
    (async () => {
      try {
        await healthCheck();
        const list = await deviceAPI.getAllDevices();
        if (!mounted) return;
        setDevices(list);
        if (list.length) {
          setSelectedDevice(list[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    const offStatus = socketClient.onSystemStatus((s) => setSystemStatus(s.status));
    const offUpdate = socketClient.onDeviceUpdate((u) => {
      // backend-driven updates (disabled in static mode)
    });
    const offAlert = socketClient.onDeviceAlert((e) => setEvents((prev) => [e.event, ...prev].slice(0, 100)));
    const offEvent = socketClient.onTamperEvent((e) => setEvents((prev) => [e, ...prev].slice(0, 100)));
    return () => { offStatus(); offUpdate(); offAlert(); offEvent(); };
  }, []);

  // Analytics generator when monitoring in static mode
  useEffect(() => {
    if (!STATIC_MODE) return;
    if (!selectedDevice || !monitoring) return;
    const base = selectedDevice.historicalMean || 10;
    // Seed with a flat line at base when (re)starting monitoring
    const initial = Array.from({ length: 20 }, (_, i) => ({ time: `${i}s`, value: base }));
    setAnalyticsData(initial);
    const interval = setInterval(() => {
      setAnalyticsData((prev) => {
        const next = prev.slice(1);
        const value = systemStatus === 'alert'
          ? (selectedDevice.lastReading || base) // step/change when tampered
          : base; // flat line when normal
        next.push({ time: `${Date.now() % 100}s`, value });
        return next;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [selectedDevice, monitoring, systemStatus]);

  // Update current hash when device is selected
  useEffect(() => {
    if (selectedDevice) {
      const newHash = generateHash(selectedDevice.id, selectedDevice.lastReading, Date.now());
      setCurrentHash(newHash);
    }
  }, [selectedDevice]);

  const statusColor = useMemo(() => {
    if (!selectedDevice) return 'text-slate-400';
    if (selectedDevice.status === 'Tampered') return 'text-danger-500';
    if (selectedDevice.status === 'Suspicious') return 'text-warning-500';
    if (selectedDevice.status === 'Normal') return 'text-success-500';
    return 'text-slate-400';
  }, [selectedDevice]);

  // Monitoring handlers (static mode)
  const handleStartMonitoring = () => {
    if (!selectedDevice) {
      alert('Please select a device first!');
      return;
    }
    setMonitoring(true);
    console.log('Started monitoring:', selectedDevice.id || selectedDevice.deviceId);
  };

  const handleStopMonitoring = () => {
    setMonitoring(false);
    console.log('Stopped monitoring');
  };

  // Simulation (static mode)
  const simulateTamper = (type) => {
    if (!selectedDevice) {
      alert('Please select a device first!');
      return;
    }
    const tampered = { ...selectedDevice };
    let eventType = '';
    switch (type) {
      case 'physical':
        tampered.lastReading = tampered.lastReading * 1.8;
        tampered.integrity = 25;
        tampered.status = 'Tampered';
        eventType = 'Physical Tamper';
        break;
      case 'firmware':
        tampered.integrity = 15;
        tampered.status = 'Tampered';
        eventType = 'Firmware Tamper';
        break;
      case 'magnetic':
        tampered.lastReading = tampered.lastReading * 0.6;
        tampered.integrity = 30;
        tampered.status = 'Tampered';
        eventType = 'Magnetic Attack';
        break;
      case 'calibration':
        tampered.lastReading = tampered.lastReading * 1.25;
        tampered.integrity = 60;
        tampered.status = 'Suspicious';
        eventType = 'Calibration Fraud';
        break;
      case 'digital':
        tampered.lastReading = Math.random() * 1000;
        tampered.integrity = 10;
        tampered.status = 'Tampered';
        eventType = 'Digital Spoof';
        break;
      default:
        break;
    }
    setDevices((prev) => prev.map((d) => (d.id === (tampered.id) ? tampered : d)));
    setSelectedDevice(tampered);
    setSystemStatus('alert');

    const newEvent = {
      id: Date.now(),
      timestamp: new Date(),
      type: eventType,
      device: tampered.name,
      reading: tampered.lastReading.toFixed(2),
      confidence: 85 + Math.random() * 15,
      hash: Math.random().toString(36).substring(2, 15)
    };
    setEvents((prev) => [newEvent, ...prev]);
    // Update hash and history
    const newHash = generateHash(tampered.id, tampered.lastReading, Date.now());
    setCurrentHash(newHash);
    setHashHistory((prev) => [
      { hash: newHash, timestamp: new Date(), deviceId: tampered.id, reading: tampered.lastReading },
      ...prev.slice(0, 9)
    ]);
    console.log('Tampering simulated:', type, newEvent);
  };

  const crossVerify = async () => {
    setVerifying(true);
    try {
      const r = await eventAPI.verifyChain();
      alert(r.valid ? 'Chain valid' : 'Chain INVALID');
    } finally { setVerifying(false); }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
    {/* Header */}
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              KIMAYA- TAMPER DETECTION DASHBOARD
            </h1>
            <p className="text-sm text-gray-400">TPTL - Advanced IoT Security & Blockchain Verification</p>
          </div>
        </div>
        <div className="flex gap-3 md:justify-end flex-wrap">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm font-medium transition-all flex items-center gap-2 w-full md:w-auto">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
            </svg>
            Audio On
          </button>
          <button className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/30 text-green-400 text-sm font-medium transition-all flex items-center gap-2 w-full md:w-auto">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            System Online
          </button>
        </div>
      </div>
    </div>

    {/* Main Grid */}
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column - Controls (4 columns) */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        {/* Device Selection */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Target Device
          </h3>
          <select 
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
            value={selectedDevice?.id || ''}
            onChange={(e) => {
              const device = devices.find(d => d.id === e.target.value);
              setSelectedDevice(device);
            }}
          >
            <option value="" disabled>Choose a device...</option>
            {devices.map(device => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.id})
              </option>
            ))}
          </select>
        </div>

        {/* Monitoring Controls */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Monitoring</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              monitoring ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
              'bg-slate-700/50 text-gray-400 border border-slate-600'
            }`}>
              {monitoring ? '● Active' : '○ Idle'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button 
              onClick={handleStartMonitoring}
              disabled={!selectedDevice || monitoring}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
              </svg>
              Start
            </button>
            <button 
              onClick={handleStopMonitoring}
              disabled={!monitoring}
              className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
              </svg>
              Stop
            </button>
          </div>

          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Status:</span>
              <span className={`font-medium ${monitoring ? 'text-green-400' : 'text-gray-500'}`}>
                {monitoring ? '🟢 Monitoring Active' : '⚪ Idle'}
              </span>
            </div>
          </div>
        </div>

        {/* Tampering Simulation */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Tampering Simulation
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => simulateTamper('physical')}
              disabled={!selectedDevice}
              className="bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 hover:border-red-600/70 disabled:bg-slate-700/30 disabled:border-slate-600 disabled:cursor-not-allowed py-3 px-4 rounded-lg text-sm font-medium transition-all"
            >
              🔨 Physical
            </button>
            <button 
              onClick={() => simulateTamper('firmware')}
              disabled={!selectedDevice}
              className="bg-orange-600/20 hover:bg-orange-600/30 border border-orange-600/50 hover:border-orange-600/70 disabled:bg-slate-700/30 disabled:border-slate-600 disabled:cursor-not-allowed py-3 px-4 rounded-lg text-sm font-medium transition-all"
            >
              💾 Firmware
            </button>
            <button 
              onClick={() => simulateTamper('magnetic')}
              disabled={!selectedDevice}
              className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/50 hover:border-purple-600/70 disabled:bg-slate-700/30 disabled:border-slate-600 disabled:cursor-not-allowed py-3 px-4 rounded-lg text-sm font-medium transition-all"
            >
              🧲 Magnetic
            </button>
            <button 
              onClick={() => simulateTamper('calibration')}
              disabled={!selectedDevice}
              className="bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-600/50 hover:border-cyan-600/70 disabled:bg-slate-700/30 disabled:border-slate-600 disabled:cursor-not-allowed py-3 px-4 rounded-lg text-sm font-medium transition-all"
            >
              🔧 Calibration
            </button>
            <button 
              onClick={() => simulateTamper('digital')}
              disabled={!selectedDevice}
              className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 hover:border-blue-600/70 disabled:bg-slate-700/30 disabled:border-slate-600 disabled:cursor-not-allowed py-3 px-4 rounded-lg text-sm font-medium transition-all"
            >
              💻 Digital
            </button>
            <button 
              onClick={() => {
                setDevices(devices.map(d => ({ ...d, status: 'Normal', integrity: 95 })));
                setEvents([]);
                setHashHistory([]);
                setSystemStatus('normal');
                setSelectedDevice(null);
                setMonitoring(false);
              }}
              className="bg-slate-600/20 hover:bg-slate-600/30 border border-slate-600/50 hover:border-slate-600/70 py-3 px-4 rounded-lg text-sm font-medium transition-all"
            >
              ↻ Reset
            </button>
          </div>
        </div>

        {/* Current Alert Status */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Current Alert Status</h3>
          
          {systemStatus === 'alert' && selectedDevice ? (
            <div className="bg-red-900/30 border-2 border-red-500/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-400">TAMPERING DETECTED</p>
                  <p className="text-sm text-red-300">{selectedDevice.name}</p>
                </div>
              </div>
            </div>
          ) : monitoring ? (
            <div className="bg-green-900/30 border-2 border-green-500/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-green-400">System Monitoring Active</p>
                  <p className="text-sm text-green-300">All systems normal</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 text-center">
              <p className="text-gray-400">System ready for monitoring</p>
            </div>
          )}
        </div>
      </div>

      {/* Center Column - Status Display (5 columns) */}
      <div className="col-span-12 lg:col-span-5 space-y-6">
        {/* System Status Circle */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50 shadow-lg text-center min-h-[300px] flex flex-col items-center justify-center">
          <div className="mb-6">
            {systemStatus === 'alert' ? (
              <div className="w-40 h-40 rounded-full bg-red-900/30 border-4 border-red-500 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/20">
                <svg className="w-20 h-20 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            ) : (
              <div className="w-40 h-40 rounded-full bg-green-900/30 border-4 border-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                <svg className="w-20 h-20 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
          
          <h2 className="text-3xl font-bold mb-3">
            {systemStatus === 'alert' ? 'Tampering Detected!' : 'All systems normal'}
          </h2>
          
          {selectedDevice && (
            <div className="space-y-1">
              <p className="text-gray-400">Device: <span className="text-white font-medium">{selectedDevice.id}</span></p>
              <p className="text-gray-400">Sector: <span className="text-white font-medium">{selectedDevice.sector}</span></p>
              <p className="text-gray-400">
                Status: <span className={`font-bold ${
                  selectedDevice.status === 'Normal' ? 'text-green-400' :
                  selectedDevice.status === 'Suspicious' ? 'text-orange-400' :
                  'text-red-400'
                }`}>{selectedDevice.status}</span>
              </p>
            </div>
          )}
        </div>

        {/* Realtime Metrics */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold mb-4">Realtime Metrics</h3>
          {selectedDevice ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Last Reading</span>
                <span className="text-xl font-bold">{selectedDevice.lastReading.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Historical Mean</span>
                <span className="text-xl font-bold">{selectedDevice.historicalMean.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Z-Score</span>
                <span className={`text-xl font-bold ${Math.abs((selectedDevice.lastReading - selectedDevice.historicalMean) / (selectedDevice.historicalMean * 0.1)) > 2 ? 'text-red-500' : 'text-green-500'}`}>
                  {Math.abs((selectedDevice.lastReading - selectedDevice.historicalMean) / (selectedDevice.historicalMean * 0.1)).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-slate-700 pt-3 mt-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Voltage:</span>
                    <span className="ml-2 text-white">{selectedDevice.voltage}V</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Current:</span>
                    <span className="ml-2 text-white">{selectedDevice.current}mA</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Temp:</span>
                    <span className="ml-2 text-white">{selectedDevice.temp}°C</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Integrity:</span>
                    <span className={`ml-2 font-bold ${selectedDevice.integrity > 90 ? 'text-green-400' : selectedDevice.integrity > 70 ? 'text-orange-400' : 'text-red-400'}`}>{selectedDevice.integrity}%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">Select a device to view metrics</div>
          )}
        </div>

        {/* Hash Verification */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Hash Verification</h3>
            <span className={`px-2 py-1 rounded text-xs ${systemStatus === 'alert' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {systemStatus === 'alert' ? '⚠ Pending' : '✓ Verified'}
            </span>
          </div>
          {selectedDevice ? (
            <>
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">Current Hash:</p>
                <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <code className="text-xs text-cyan-400 font-mono break-all">{currentHash}</code>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">Recent Hash History:</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {hashHistory.length > 0 ? (
                    hashHistory.map((item, idx) => (
                      <div key={idx} className="bg-slate-900/50 rounded p-2 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-500">{item.timestamp.toLocaleTimeString()}</span>
                          <span className="text-cyan-400">{item.deviceId}</span>
                        </div>
                        <code className="text-gray-600 font-mono break-all">{item.hash}</code>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-600 text-center py-2">No hash history yet</p>
                  )}
                </div>
              </div>

              <button 
                onClick={() => {
                  alert('Hash chain verified! All hashes are valid and properly chained.');
                  console.log('Hash chain verification:', hashHistory);
                }}
                className="w-full bg-cyan-600 hover:bg-cyan-700 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cross-verify
              </button>

              <div className="mt-3 p-3 bg-slate-900/50 rounded border border-slate-700">
                <div className="flex items-center gap-2 text-xs">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-gray-400">Blockchain Secured</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8 text-sm">Select a device to view hash verification</div>
          )}
        </div>
      </div>

      {/* Right Column - Analytics & Events (3 columns) */}
      <div className="col-span-12 lg:col-span-3 space-y-6">
        {/* Analytics Chart */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold mb-4">Analytics</h3>
          {selectedDevice && analyticsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              Start monitoring to see analytics
            </div>
          )}
        </div>

        {/* Event Log */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tamper-Proof Event Log</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs">
                Verify Chain
              </button>
              <button className="px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded text-xs">
                Export
              </button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No events recorded yet. Simulate tampering to see events.
              </div>
            ) : (
              events.map((event, idx) => (
                <div key={event.id} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-red-400">
                      {event.timestamp.toLocaleTimeString()} • {event.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">#{idx + 1}</span>
                  </div>
                  <p className="text-xs text-gray-300 mb-1">{event.device}</p>
                  <p className="text-xs text-gray-400">Reading: {event.reading} • Confidence: {event.confidence.toFixed(1)}%</p>
                  <p className="text-xs text-gray-600 font-mono mt-1">Hash: {event.hash}...</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}


