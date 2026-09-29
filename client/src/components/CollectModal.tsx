import { useState } from 'react';
import { apiPost } from '../api';
import type { SeatRow } from '../types';
import { fmt, MONTH_NAMES } from '../utils';

const METHODS = ['Cash', 'bKash', 'Nagad', 'Bank Transfer', 'Cheque'];

interface Props {
  seat: SeatRow;
  year: number;
  month: number;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function CollectModal({ seat, year, month, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState<number>(seat.monthlyRent);
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await apiPost('/payments', { seatId: seat.seatId, month, year, amount, method, paymentDate: date });
      onSuccess(`✔ Payment collected — ${seat.memberName} · ${fmt(amount)} (${MONTH_NAMES[month - 1]} ${year})`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Collect Payment</h3>

        <div className="modal-info">
          <div><span>Seat</span><strong>{seat.seatNo}</strong></div>
          <div><span>Member</span><strong>{seat.memberName}</strong></div>
          <div><span>Room</span><strong>{seat.roomNo}</strong></div>
          <div><span>Period</span><strong>{MONTH_NAMES[month - 1]} {year}</strong></div>
        </div>

        <label>Amount (₹)
          <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
        </label>
        <label>Method
          <select value={method} onChange={e => setMethod(e.target.value)}>
            {METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label>Date
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || amount <= 0}>
            {saving ? 'Saving…' : `Collect ${fmt(amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}