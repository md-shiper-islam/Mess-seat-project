export interface SeatRow {
  seatId: number;
  seatNo: string;
  roomNo: string;
  memberName: string | null;
  monthlyRent: number;
  paidMonths: boolean[];
}

export interface MonthlyStats {
  totalSeats: number;
  occupied: number;
  vacant: number;
  expected: number;
  collected: number;
  pending: number;
  paidCount: number;
  pendingCount: number;
  collectionRate: number;
}

export interface MonthlyResponse {
  year: number;
  month: number;
  monthName: string;
  stats: MonthlyStats;
  seats: SeatRow[];
}

export interface YearlySeat extends SeatRow {
  totalPaid: number;
  totalDue: number;
  status: 'paid' | 'due' | 'vacant';
}

export interface YearlyStats {
  totalSeats: number;
  occupied: number;
  vacant: number;
  expected: number;
  collected: number;
  pending: number;
  collectionRate: number;
}

export interface YearlyResponse {
  year: number;
  stats: YearlyStats;
  seats: YearlySeat[];
}

export interface TrendPoint {
  month: string;
  monthNum: number;
  expected: number;
  collected: number;
}