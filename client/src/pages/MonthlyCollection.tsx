import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api';
import type { MonthlyResponse, SeatRow, TrendPoint } from '../types';
import { fmt, MONTHS_SHORT, MONTH_NAMES } from '../utils';
import StatCard from '../components/StatCard';
import TrendChart from '../components/TrendChart';
import CollectModal from '../components/CollectModal';

export default function MonthlyCollection({ onOpenYearly }: { onOpenYearly: () => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<MonthlyResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collecting, setCollecting] = useState<SeatRow | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [m, t] = await Promise.all([
        apiGet<MonthlyResponse>(`/monthly-collection/${year}/${month}`),
        apiGet<TrendPoint[]>(`/trends/${year}`),
      ]);
      setData(m);
      setTrend(t);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  };

  if (loading && !data) return <div className="loading">Loading…</div>;
  if (error && !data) return <div className="error-box">Failed to load: {error}</div>;
  if (!data) return null;

  const s = data.stats;
  const occPct = s.totalSeats ? Math.round((s.occupied / s.totalSeats) * 100) : 0;
  const rate = s.expected ? Math.round((s.collected / s.expected) * 100) : 0;
  const years = [now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Monthly Rent Collection</h2>
          <p className="sub">Track &amp; collect monthly seat rent — {MONTH_NAMES[month - 1]} {year}</p>
        </div>
        <div className="page-controls">
          <select className="select" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="select" value={year} onChange={e => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={onOpenYearly}>Yearly Rent Sheet →</button>
        </div>
      </div>

      <div className="stats">
        <StatCard label="Total Seats" value={String(s.totalSeats)} sub="All seats" color="blue" icon="🪑" />
        <StatCard label="Occupied" value={String(s.occupied)} sub={`${occPct}% occupancy`} color="green" icon="👤" />
        <StatCard label="Vacant" value={String(s.vacant)} sub={`${100 - occPct}% empty`} color="amber" icon="⌂" />
        <StatCard label="Expected Rent" value={fmt(s.expected)} sub={`${MONTH_NAMES[month - 1]} ${year}`} color="violet" icon="🎯" />
        <StatCard label="Collected" value={fmt(s.collected)} sub={`${rate}% of expected`} color="green" icon="✓" />
        <StatCard label="Pending" value={fmt(s.pending)} sub={`${s.pendingCount} member(s) pending`} color="red" icon="⏳" />
      </div>

      <div className="card table-card">
        <div className="card-head">
          <h2>Seat-wise Payment Status — {year}</h2>
          <span className="muted">{s.paidCount} of {s.occupied} paid in {MONTHS_SHORT[month - 1]}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="left">Seat No</th>
                <th className="left">Member Name</th>
                <th className="left">Room</th>
                <th className="left">Monthly Rent</th>
                {MONTHS_SHORT.map((m, i) => (
                  <th key={m} className={i + 1 === month ? 'cur' : ''}>{m}</th>
                ))}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.seats.map(seat => (
                <tr key={seat.seatId} className={seat.memberName ? '' : 'row-vacant'}>
                  <td className="left strong">{seat.seatNo}</td>
                  <td className="left">{seat.memberName ?? <span className="text-vacant">— Vacant —</span>}</td>
                  <td className="left">{seat.roomNo}</td>
                  <td className="left">{fmt(seat.monthlyRent)}</td>
                  {seat.paidMonths.map((paid, i) => {
                    const future = i + 1 > month;
                    const cls = !seat.memberName || future ? 'none' : paid ? 'tick' : 'cross';
                    const txt = !seat.memberName || future ? '–' : paid ? '✓' : '✗';
                    return <td key={i} className={`${cls} ${i + 1 === month ? 'cur' : ''}`}>{txt}</td>;
                  })}
                  <td>
                    {!seat.memberName ? (
                      <span className="badge badge-vacant">Vacant</span>
                    ) : seat.paidMonths[month - 1] ? (
                      <span className="badge badge-paid">✓ Paid</span>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => setCollecting(seat)}>
                        Collect Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card summary-card">
          <h2>{MONTH_NAMES[month - 1]} {year} Summary</h2>
          <div className="big-rate">
            <span className="rate-num">{rate}%</span>
            <span className="rate-label">Collection Rate</span>
          </div>
          <div className="progress"><div style={{ width: `${rate}%` }} /></div>
          <ul className="summary-list">
            <li><span>Collected</span><strong className="green">{fmt(s.collected)}</strong></li>
            <li><span>Expected</span><strong>{fmt(s.expected)}</strong></li>
            <li><span>Pending</span><strong className="red">{fmt(s.pending)}</strong></li>
            <li><span>Members paid</span><strong>{s.paidCount} / {s.occupied}</strong></li>
          </ul>
        </div>
        <div className="card chart-card">
          <div className="card-head"><h2>Monthly Collection Trend — {year}</h2></div>
          <TrendChart data={trend} />
        </div>
      </div>

      {collecting && (
        <CollectModal
          seat={collecting}
          year={year}
          month={month}
          onClose={() => setCollecting(null)}
          onSuccess={async (msg) => {
            setCollecting(null);
            showToast(msg);
            await load();
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}