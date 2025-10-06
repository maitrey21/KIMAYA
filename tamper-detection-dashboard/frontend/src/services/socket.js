import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (this.socket && this.socket.connected) return;
    this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      autoConnect: true,
    });
    this.socket.on('connect', () => console.log('Socket connected', this.socket.id));
    this.socket.on('disconnect', () => console.log('Socket disconnected'));
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  isConnected() {
    return !!this.socket?.connected;
  }

  startMonitoring(deviceId) {
    this.socket?.emit('start-monitoring', { deviceId });
  }

  stopMonitoring(deviceId) {
    this.socket?.emit('stop-monitoring', { deviceId });
  }

  onTamperEvent(cb) {
    const handler = (data) => cb?.(data);
    this.socket?.on('tamper-event', handler);
    return () => this.off('tamper-event', handler);
  }

  onDeviceAlert(cb) {
    const handler = (data) => cb?.(data);
    this.socket?.on('device-alert', handler);
    return () => this.off('device-alert', handler);
  }

  onDeviceUpdate(cb) {
    const handler = (data) => cb?.(data);
    this.socket?.on('device-update', handler);
    return () => this.off('device-update', handler);
  }

  onSystemStatus(cb) {
    const handler = (data) => cb?.(data);
    this.socket?.on('system-status', handler);
    return () => this.off('system-status', handler);
  }

  off(eventName, handler) {
    this.socket?.off(eventName, handler);
  }

  removeAllListeners() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
  }
}

const socketClient = new SocketClient();
export default socketClient;


