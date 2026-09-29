import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { TrendPoint } from '../types';

const fmtINR = (v: number) => '₹' + v.toLocaleString('en-IN');

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => fmtINR(v)} tick={{ fontSize: 11 }} width={85} />
        <Tooltip formatter={(value) => fmtINR(Number(value))} />
        <Legend />
        <Bar dataKey="expected" name="Expected" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}