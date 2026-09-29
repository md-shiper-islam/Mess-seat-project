import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api';
import type { YearlyResponse, TrendPoint } from '../types';
import { fmt, MONTHS_SHORT } from '../utils';
import StatCard from '../components/StatCard';
import TrendChart from '../components/TrendChart';

export default function YearlyRentSheet({ onOpenMonthly }: { onOpenMonthly: () => void }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<YearlyResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sheet, t] = await Promise.all([
        apiGet<YearlyResponse>(`/yearly-sheet/${year}`),
        apiGet<TrendPoint[]>(`/trends/${year}`),
      ]);
      setData(sheet);
      setTrend(t);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div className="loading">Loading…</div>;
  if (error && !data) return <div className="error-box">Failed to load: {error}</div>;
  if (!data) return null;

  const s = data.stats;
  const occPct = s.totalSeats ? Math.round((s.occupied / s.totalSeats) * 100) : 0;
  const rate = s.collectionRate;
  const best = trend.length ? trend.reduce((a, b) => (b.collected > a.collected ? b : a)) : null;
  const years = [year + 1, year, year - 1, year - 2];

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Yearly Rent Sheet</h2>
          <p className="sub">Seat-wise yearly rent status for {year}</p>
        </div>
        <div className="page-controls">
          <select className="select" value={year} onChange={e => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={onOpenMonthly}>← Monthly Collection</button>
        </div>
      </div>

      <div className="stats">
        <StatCard label="Total Seats" value={String(s.totalSeats)} sub="All seats" color="blue" icon="🪑" />
        <StatCard label="Occupied" value={String(s.occupied)} sub={`${occPct}% occupancy`} color="green" icon="👤" />
        <StatCard label="Vacant" value={String(s.vacant)} sub={`${100 - occPct}% empty`} color="amber" icon="⌂" />
        <StatCard label="Expected Total" value={fmt(s.expected)} sub={`${year} full year`} color="violet" icon="🎯" />
        <StatCard label="Collected" value={fmt(s.collected)} sub={`${rate}% of expected`} color="green" icon="✓" />
        <StatCard label="Due" value={fmt(s.pending)} sub={`${100 - rate}% outstanding`} color="red" icon="⏳" />
      </div>

      <div className="card table-card">
        <div className="card-head">
          <h2>Seat-wise Yearly Status — {year}</h2>
          <span className="muted">{s.occupied} occupied • {s.vacant} vacant</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="left">Seat No</th>
                <th className="left">Member Name</th>
                <th className="left">Room No</th>
                <th className="left">Monthly Rent</th>
                {MONTHS_SHORT.map(m => <th key={m}>{m}</th>)}
                <th>Total Paid</th>
                <th>Total Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.seats.map(seat => (
                <tr key={seat.seatId} className={seat.memberName ? '' : 'row-vacant'}>
                  <td className="left strong">{seat.seatNo}</td>
                  <td className="left">{seat.memberName ?? <span className="text-vacant">— Vacant —</span>}</td>
                  <td className="left">{seat.roomNo}</td>
                  <td className="left">{fmt(seat.monthlyRent)}</td>
                  {seat.paidMonths.map((paid, i) => (
                    <td key={i} className={seat.memberName ? (paid ? 'tick' : 'cross') : 'none'}>
                      {seat.memberName ? (paid ? '✓' : '✗') : '–'}
                    </td>
                  ))}
                  <td className="strong green">{seat.memberName ? fmt(seat.totalPaid) : '—'}</td>
                  <td className={seat.totalDue > 0 ? 'red' : ''}>{seat.memberName ? fmt(seat.totalDue) : '—'}</td>
                  <td>
                    <span className={`badge badge-${seat.status}`}>
                      {seat.status === 'paid' ? 'Paid' : seat.status === 'due' ? 'Due' : 'Vacant'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card summary-card">
          <h2>{year} Summary</h2>
          <div className="big-rate">
            <span className="rate-num">{rate}%</span>
            <span className="rate-label">Yearly Collection Rate</span>
          </div>
          <div className="progress"><div style={{ width: `${rate}%` }} /></div>
          <ul className="summary-list">
            <li><span>Expected (12 months)</span><strong>{fmt(s.expected)}</strong></li>
            <li><span>Collected</span><strong className="green">{fmt(s.collected)}</strong></li>
            <li><span>Due</span><strong className="red">{fmt(s.pending)}</strong></li>
            <li><span>Best month</span><strong>{best ? `${best.month} — ${fmt(best.collected)}` : '—'}</strong></li>
          </ul>
        </div>
        <div className="card chart-card">
          <div className="card-head"><h2>Monthly Collection — {year}</h2></div>
          <TrendChart data={trend} />
        </div>
      </div>
    </>
  );
}