import React, { useEffect, useMemo, useState } from 'react';
import { deviceAPI } from '../services/api';

const sectors = ['All', 'Trade & Retail', 'Industrial', 'Healthcare', 'Agriculture', 'Transport', 'Utilities'];
const sorters = ['Status Priority', 'Integrity Score', 'Device Name'];

export default function DeviceMonitoringPage() {
  const [devices, setDevices] = useState([]);
  const [sector, setSector] = useState('All');
  const [sortBy, setSortBy] = useState('Status Priority');

  useEffect(() => {
    deviceAPI.getAllDevices().then(setDevices);
  }, []);

  const filtered = useMemo(() => {
    const list = devices.filter((d) => (sector === 'All' ? true : d.sector === sector));
    if (sortBy === 'Integrity Score') return [...list].sort((a, b) => (b.integrity || 0) - (a.integrity || 0));
    if (sortBy === 'Device Name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    const rank = { Tampered: 0, Suspicious: 1, Offline: 2, Normal: 3 };
    return [...list].sort((a, b) => (rank[a.status] ?? 99) - (rank[b.status] ?? 99));
  }, [devices, sector, sortBy]);

  const stats = useMemo(() => {
    return {
      total: devices.length,
      normal: devices.filter((d) => d.status === 'Normal').length,
      tampered: devices.filter((d) => d.status === 'Tampered').length,
      suspicious: devices.filter((d) => d.status === 'Suspicious').length,
      offline: devices.filter((d) => d.status === 'Offline').length,
    };
  }, [devices]);

  const badge = (s) => {
    if (s === 'Tampered') return 'bg-red-500/20 border border-red-500 text-red-300';
    if (s === 'Suspicious') return 'bg-orange-500/20 border border-orange-500 text-orange-300';
    if (s === 'Normal') return 'bg-green-500/20 border border-green-500 text-green-300';
    return 'bg-slate-700 border border-slate-600 text-slate-300';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-2xl font-bold">Device Monitoring</div>
        <div className="text-slate-400">Real-time device status overview</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass p-4 text-center"><div className="text-xs text-slate-400">Total</div><div className="text-xl font-bold">{stats.total}</div></div>
        <div className="glass p-4 text-center"><div className="text-xs text-slate-400">Normal</div><div className="text-xl font-bold text-green-400">{stats.normal}</div></div>
        <div className="glass p-4 text-center"><div className="text-xs text-slate-400">Tampered</div><div className="text-xl font-bold text-red-400">{stats.tampered}</div></div>
        <div className="glass p-4 text-center"><div className="text-xs text-slate-400">Suspicious</div><div className="text-xl font-bold text-orange-400">{stats.suspicious}</div></div>
        <div className="glass p-4 text-center"><div className="text-xs text-slate-400">Offline</div><div className="text-xl font-bold text-slate-300">{stats.offline}</div></div>
      </div>

      <div className="glass p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">Filter by Sector</span>
          <select className="bg-slate-900/60 border border-slate-700 rounded-md p-2" value={sector} onChange={(e) => setSector(e.target.value)}>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">Sort by</span>
          <select className="bg-slate-900/60 border border-slate-700 rounded-md p-2" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {sorters.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((d) => (
          <div key={d._id} className="glass p-4 space-y-2 hover:shadow-glow-cyan transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="text-xs text-slate-400">{d.type} • {d.deviceId}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${badge(d.status)}`}>{d.status}</span>
            </div>
            <div className="text-xs text-slate-400">📍 {d.location}</div>
            <div className="text-xs text-slate-300">Sector: <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">{d.sector}</span></div>
            {(d.status === 'Tampered' || d.status === 'Suspicious') && (
              <div className="text-xs text-red-300 bg-red-500/10 border border-red-500 p-2 rounded">Alert: Check device immediately</div>
            )}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="glass p-2"><div className="text-slate-400">Voltage</div><div className="font-semibold">{d.voltage}</div></div>
              <div className="glass p-2"><div className="text-slate-400">Current</div><div className="font-semibold">{d.current}</div></div>
              <div className="glass p-2"><div className="text-slate-400">Temp</div><div className="font-semibold">{d.temperature}</div></div>
              <div className="glass p-2"><div className="text-slate-400">Integrity</div><div className="font-semibold">{d.integrity}%</div></div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="glass p-2"><div className="text-slate-400">Last</div><div className="font-semibold">{d.lastReading}</div></div>
              <div className="glass p-2"><div className="text-slate-400">Mean</div><div className="font-semibold">{d.historicalMean}</div></div>
              <div className="glass p-2"><div className="text-slate-400">Z-score</div><div className="font-semibold">{(((d.lastReading - (d.historicalMean||1))/((d.historicalMean||1)*0.1))||0).toFixed(2)}</div></div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm">View Details</button>
              <button className="flex-1 bg-primary-500/20 hover:bg-primary-500/30 border border-cyan-600 rounded-md px-3 py-2 text-sm">Analytics</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


