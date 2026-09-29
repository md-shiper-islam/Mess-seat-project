import { useState } from 'react';
import Sidebar from './components/Sidebar';
import MonthlyCollection from './pages/MonthlyCollection';
import YearlyRentSheet from './pages/YearlyRentSheet';

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard', members: 'Members', rooms: 'Rooms & Seats',
  history: 'Payment History', meals: 'Meals', attendance: 'Attendance',
  reports: 'Reports', settings: 'Settings',
};

export default function App() {
  const [page, setPage] = useState('monthly');

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="content">
        {page === 'monthly' && <MonthlyCollection onOpenYearly={() => setPage('yearly')} />}
        {page === 'yearly' && <YearlyRentSheet onOpenMonthly={() => setPage('monthly')} />}
        {page !== 'monthly' && page !== 'yearly' && (
          <div className="card placeholder">
            <h2>{TITLES[page] ?? 'Module'}</h2>
            <p>This module is out of current scope — Monthly Collection & Yearly Rent Sheet are fully working.</p>
          </div>
        )}
      </main>
    </div>
  );
}