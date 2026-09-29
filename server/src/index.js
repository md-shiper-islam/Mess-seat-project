require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query } = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const toNum = (v) => Number(v ?? 0);

async function getSeats() {
  const res = await query(
    `SELECT s.id, s.seat_no, s.monthly_rent, s.member_id, r.room_no, m.name AS member_name
       FROM seats s
       JOIN rooms r ON r.id = s.room_id
       LEFT JOIN members m ON m.id = s.member_id
      ORDER BY s.seat_no`
  );
  return res.rows;
}

async function getPaidMonths(year) {
  const res = await query(
    `SELECT seat_id, month, amount FROM payments WHERE year = $1 AND status = 'PAID'`,
    [year]
  );
  return res.rows;
}

/* ---------------- Health ---------------- */
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'smart-mess-api' }));

/* ---------------- Monthly Collection ---------------- */
app.get('/api/monthly-collection/:year/:month', async (req, res) => {
  try {
    const y = Number(req.params.year);
    const m = Number(req.params.month);

    const [seats, payments, collectedRes] = await Promise.all([
      getSeats(),
      getPaidMonths(y),
      query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
          WHERE year = $1 AND month = $2 AND status = 'PAID'`,
        [y, m]
      ),
    ]);

    const paidSet = new Set(payments.map((p) => `${p.seat_id}-${p.month}`));

    const rows = seats.map((s) => ({
      seatId: s.id,
      seatNo: s.seat_no,
      roomNo: s.room_no,
      memberName: s.member_name,
      monthlyRent: toNum(s.monthly_rent),
      paidMonths: Array.from({ length: 12 }, (_, i) => paidSet.has(`${s.id}-${i + 1}`)),
    }));

    const occupied = rows.filter((r) => r.memberName);
    const expected = occupied.reduce((a, r) => a + r.monthlyRent, 0);
    const collected = toNum(collectedRes.rows[0] && collectedRes.rows[0].total);
    const paidCount = occupied.filter((r) => r.paidMonths[m - 1]).length;

    res.json({
      year: y,
      month: m,
      monthName: MONTHS[m - 1],
      stats: {
        totalSeats: rows.length,
        occupied: occupied.length,
        vacant: rows.length - occupied.length,
        expected,
        collected,
        pending: expected - collected,
        paidCount,
        pendingCount: occupied.length - paidCount,
        collectionRate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
      },
      seats: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Yearly Rent Sheet ---------------- */
app.get('/api/yearly-sheet/:year', async (req, res) => {
  try {
    const y = Number(req.params.year);
    const [seats, payments] = await Promise.all([getSeats(), getPaidMonths(y)]);

    const paidMap = new Map();
    const paidAmount = new Map();
    for (const p of payments) {
      if (!paidMap.has(p.seat_id)) paidMap.set(p.seat_id, new Set());
      paidMap.get(p.seat_id).add(p.month);
      paidAmount.set(p.seat_id, (paidAmount.get(p.seat_id) || 0) + toNum(p.amount));
    }

    const rows = seats.map((s) => {
      const months = paidMap.get(s.id) || new Set();
      const rent = toNum(s.monthly_rent);
      const isVacant = !s.member_name;
      const totalPaid = paidAmount.get(s.id) || 0;
      const totalDue = isVacant ? 0 : rent * 12 - totalPaid;
      return {
        seatId: s.id,
        seatNo: s.seat_no,
        roomNo: s.room_no,
        memberName: s.member_name,
        monthlyRent: rent,
        paidMonths: Array.from({ length: 12 }, (_, i) => months.has(i + 1)),
        totalPaid,
        totalDue,
        status: isVacant ? 'vacant' : totalDue <= 0 ? 'paid' : 'due',
      };
    });

    const occupied = rows.filter((r) => r.memberName);
    const expected = occupied.reduce((a, r) => a + r.monthlyRent * 12, 0);
    const collected = rows.reduce((a, r) => a + r.totalPaid, 0);

    res.json({
      year: y,
      stats: {
        totalSeats: rows.length,
        occupied: occupied.length,
        vacant: rows.length - occupied.length,
        expected,
        collected,
        pending: expected - collected,
        collectionRate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
      },
      seats: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Monthly Trend (chart) ---------------- */
app.get('/api/trends/:year', async (req, res) => {
  try {
    const y = Number(req.params.year);
    const [occRes, payRes] = await Promise.all([
      query(`SELECT COALESCE(SUM(monthly_rent), 0) AS total FROM seats WHERE member_id IS NOT NULL`),
      query(
        `SELECT month, COALESCE(SUM(amount), 0) AS total FROM payments
          WHERE year = $1 AND status = 'PAID' GROUP BY month`,
        [y]
      ),
    ]);
    const expected = toNum(occRes.rows[0].total);
    const byMonth = new Map(payRes.rows.map((r) => [Number(r.month), toNum(r.total)]));

    res.json(
      MONTHS.map((name, i) => ({
        month: name,
        monthNum: i + 1,
        expected,
        collected: byMonth.get(i + 1) || 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Collect Payment ---------------- */
app.post('/api/payments', async (req, res) => {
  try {
    const { seatId, month, year, amount, method, paymentDate } = req.body;
    if (!seatId || !month || !year) {
      return res.status(400).json({ error: 'seatId, month and year are required' });
    }

    const seatRes = await query(
      `SELECT s.id, s.monthly_rent, s.member_id, m.name
         FROM seats s LEFT JOIN members m ON m.id = s.member_id
        WHERE s.id = $1`,
      [seatId]
    );
    const seat = seatRes.rows[0];
    if (!seat) return res.status(404).json({ error: 'Seat not found' });
    if (!seat.member_id) return res.status(400).json({ error: 'Seat is vacant — no member to collect from' });

    const dup = await query(
      `SELECT 1 FROM payments WHERE seat_id = $1 AND month = $2 AND year = $3`,
      [seatId, month, year]
    );
    if (dup.rowCount) return res.status(409).json({ error: 'This seat/month is already paid' });

    const finalAmount = amount ?? seat.monthly_rent;
    const ins = await query(
      `INSERT INTO payments (seat_id, member_id, amount, month, year, payment_date, method, status)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, 'PAID')
       RETURNING *`,
      [seatId, seat.member_id, finalAmount, month, year, paymentDate ?? null, method ?? 'Cash']
    );
    res.status(201).json(ins.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Undo Payment ---------------- */
app.delete('/api/payments/:seatId/:month/:year', async (req, res) => {
  try {
    const { seatId, month, year } = req.params;
    const del = await query(
      `DELETE FROM payments WHERE seat_id = $1 AND month = $2 AND year = $3`,
      [seatId, month, year]
    );
    if (!del.rowCount) return res.status(404).json({ error: 'Payment not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Smart Mess API → http://localhost:${PORT}`));