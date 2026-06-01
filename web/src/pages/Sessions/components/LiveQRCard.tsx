import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { sessionsApi } from '../../../api/client';

interface Props {
  sessionId: string;
}

export const LiveQRCard: React.FC<Props> = ({ sessionId }) => {
  const [qrData, setQrData] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const intervalRef = useRef<number | null>(null);

  async function fetchQR() {
    try {
      const res = await sessionsApi.getQR(sessionId);
      const qr = res.data?.qr || JSON.stringify(res.data);
      setQrData(qr);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchAttendance() {
    try {
      const res = await sessionsApi.attendance(sessionId);
      const list = res.data || [];
      setAttendanceCount(list.filter((a: any) => a.present).length);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchQR();
    fetchAttendance();
    setCountdown(30);
    const tick = () => setCountdown((c) => (c <= 1 ? 30 : c - 1));
    const tId = window.setInterval(tick, 1000);
    const pId = window.setInterval(() => { fetchQR(); fetchAttendance(); }, 25000);
    intervalRef.current = pId;
    return () => {
      window.clearInterval(tId);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [sessionId]);

  return (
    <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <div className="p-4 rounded" style={{ background: '#ffffff' }}>
            {qrData ? (
              <QRCode value={qrData} size={256} />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>No QR</div>
            )}
          </div>
          <div className="w-full mt-4">
            <div className="w-full h-3 rounded mb-2" style={{ background: 'var(--primary-light)' }}>
              <div className="h-3 rounded" style={{ background: 'var(--primary)', width: `${(countdown / 30) * 100}%`, transition: 'width 1s linear' }} />
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Refreshes in {countdown}s</div>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
            <div className="font-medium" style={{ color: 'var(--text)' }}>LIVE</div>
          </div>
          <div className="mt-4 text-lg" style={{ color: 'var(--text)' }}>{attendanceCount} students checked in</div>
        </div>
      </div>
    </div>
  );
};

export default LiveQRCard;
