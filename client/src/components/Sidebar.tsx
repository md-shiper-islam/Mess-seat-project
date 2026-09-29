interface Props {
  page: string;
  onNavigate: (id: string) => void;
}

const ITEMS: { id: string; label: string; icon: string; children?: { id: string; label: string }[] }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'members', label: 'Members', icon: '👥' },
  { id: 'rooms', label: 'Rooms & Seats', icon: '🛏️' },
  {
    id: 'billing', label: 'Billing & Payments', icon: '💰',
    children: [
      { id: 'monthly', label: 'Monthly Collection' },
      { id: 'yearly', label: 'Yearly Rent Sheet' },
      { id: 'history', label: 'Payment History' },
    ],
  },
  { id: 'meals', label: 'Meals', icon: '🍽️' },
  { id: 'attendance', label: 'Attendance', icon: '🗓️' },
  { id: 'reports', label: 'Reports', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ page, onNavigate }: Props) {
  const billingActive = ['monthly', 'yearly', 'history'].includes(page);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-badge">SM</div>
        <div>
          <h1>Smart Mess</h1>
          <p>Rent Management</p>
        </div>
      </div>

      <nav>
        {ITEMS.map(item => (
          <div key={item.id}>
            <button
              className={`nav-item ${billingActive && item.id === 'billing' ? 'group-active' : ''}`}
              onClick={() => onNavigate(item.children ? item.children[0].id : item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.children && <span className="chev">›</span>}
            </button>
            {item.children && (
              <div className={`nav-children ${billingActive ? 'open' : ''}`}>
                {item.children.map(c => (
                  <button
                    key={c.id}
                    className={`nav-child ${page === c.id ? 'active' : ''}`}
                    onClick={() => onNavigate(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">AD</div>
        <div>
          <strong>Admin</strong>
          <p>Smart Mess</p>
        </div>
      </div>
    </aside>
  );
}