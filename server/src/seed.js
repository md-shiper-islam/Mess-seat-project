require('dotenv').config();
const { pool, query } = require('./db');

const YEAR = new Date().getFullYear();
const CUR_MONTH = new Date().getMonth() + 1;
const SEED_FUTURE_MONTHS = true; // false korle current month porjonto data hobe

const ROOMS = ['R-101', 'R-102', 'R-103', 'R-201', 'R-202', 'R-203'];

const SEATS = [
  { seatNo: 'S-01', roomNo: 'R-101', rent: 6500, member: { name: 'Rahul Sharma',  phone: '01711-223344' }, unpaid: [] },
  { seatNo: 'S-02', roomNo: 'R-101', rent: 4000, member: { name: 'Amit Kumar',    phone: '01712-556677' }, unpaid: [11] },
  { seatNo: 'S-03', roomNo: 'R-102', rent: 6500, member: { name: 'Sourav Das',    phone: '01713-889900' }, unpaid: [2] },
  { seatNo: 'S-04', roomNo: 'R-102', rent: 4000, member: { name: 'Priya Sen',     phone: '01714-112233' }, unpaid: [] },
  { seatNo: 'S-05', roomNo: 'R-103', rent: 4000, member: { name: 'Karim Uddin',   phone: '01715-334455' }, unpaid: [8] },
  { seatNo: 'S-06', roomNo: 'R-103', rent: 4000, member: { name: 'Tanvir Ahmed',  phone: '01716-667788' }, unpaid: [7] },
  { seatNo: 'S-07', roomNo: 'R-201', rent: 4000, member: { name: 'Neha Gupta',    phone: '01717-990011' }, unpaid: [6] },
  { seatNo: 'S-08', roomNo: 'R-201', rent: 4000, member: { name: 'Arif Hossain',  phone: '01718-223344' }, unpaid: [] },
  { seatNo: 'S-09', roomNo: 'R-202', rent: 4000, member: { name: 'Sumit Roy',     phone: '01719-556677' }, unpaid: [4] },
  { seatNo: 'S-10', roomNo: 'R-202', rent: 4000, member: { name: 'Ritu Mondal',   phone: '01720-889900' }, unpaid: [12] },
  { seatNo: 'S-11', roomNo: 'R-203', rent: 4500, unpaid: [] },
  { seatNo: 'S-12', roomNo: 'R-203', rent: 4500, unpaid: [] },
];

async function main() {
  console.log(`Seeding Smart Mess for ${YEAR}…`);

  await query(`
    DROP TABLE IF EXISTS payments, seats, members, rooms CASCADE;

    CREATE TABLE members (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      join_date DATE DEFAULT CURRENT_DATE
    );

    CREATE TABLE rooms (
      id SERIAL PRIMARY KEY,
      room_no VARCHAR(10) UNIQUE NOT NULL,
      capacity INT NOT NULL DEFAULT 2
    );

    CREATE TABLE seats (
      id SERIAL PRIMARY KEY,
      seat_no VARCHAR(10) UNIQUE NOT NULL,
      room_id INT NOT NULL REFERENCES rooms(id),
      member_id INT REFERENCES members(id),
      monthly_rent NUMERIC(10,2) NOT NULL CHECK (monthly_rent >= 0)
    );

    CREATE TABLE payments (
      id SERIAL PRIMARY KEY,
      seat_id INT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
      member_id INT REFERENCES members(id),
      amount NUMERIC(10,2) NOT NULL,
      month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
      year INT NOT NULL,
      payment_date DATE DEFAULT CURRENT_DATE,
      method VARCHAR(20) NOT NULL DEFAULT 'Cash',
      status VARCHAR(10) NOT NULL DEFAULT 'PAID',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (seat_id, month, year)
    );

    CREATE INDEX idx_payments_period ON payments (year, month);
  `);

  const roomId = new Map();
  for (const r of ROOMS) {
    const res = await query(`INSERT INTO rooms (room_no, capacity) VALUES ($1, 2) RETURNING id`, [r]);
    roomId.set(r, res.rows[0].id);
  }

  // S-01 = regular defaulter (odd months + Aug + always current month → demo-te always kichu pending thake)
  for (let m = 1; m <= 12; m += 2) SEATS[0].unpaid.push(m);
  SEATS[0].unpaid.push(8, CUR_MONTH);
  SEATS[0].unpaid = [...new Set(SEATS[0].unpaid)];

  const lastMonth = SEED_FUTURE_MONTHS ? 12 : CUR_MONTH;
  const methods = ['Cash', 'bKash', 'Nagad', 'Bank Transfer'];
  let paymentCount = 0;

  for (const s of SEATS) {
    let memberId = null;
    if (s.member) {
      const mRes = await query(
        `INSERT INTO members (name, phone, join_date) VALUES ($1, $2, $3) RETURNING id`,
        [s.member.name, s.member.phone, `${YEAR}-01-05`]
      );
      memberId = mRes.rows[0].id;
    }

    const seatRes = await query(
      `INSERT INTO seats (seat_no, room_id, member_id, monthly_rent) VALUES ($1, $2, $3, $4) RETURNING id`,
      [s.seatNo, roomId.get(s.roomNo), memberId, s.rent]
    );
    const seatId = seatRes.rows[0].id;
    if (!memberId) continue;

    for (let m = 1; m <= lastMonth; m++) {
      if (s.unpaid.includes(m)) continue;
      const payDate =
        m > CUR_MONTH ? new Date().toISOString().slice(0, 10)
                      : `${YEAR}-${String(m).padStart(2, '0')}-05`;
      await query(
        `INSERT INTO payments (seat_id, member_id, amount, month, year, payment_date, method)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [seatId, memberId, s.rent, m, YEAR, payDate, methods[m % methods.length]]
      );
      paymentCount++;
    }
  }

  console.log(`✔ Seeded ${ROOMS.length} rooms, ${SEATS.length} seats, ${SEATS.filter(s => s.member).length} members, ${paymentCount} payments.`);
  console.log(`  Current month → expected ₹45,000 | collected ₹38,500 (86%) | pending ₹6,500`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await pool.end();
  process.exit(1);
});