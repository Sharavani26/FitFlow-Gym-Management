import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CreditCard,
  LogIn,
  LogOut,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { getErrorMessage } from '../services/api';
import { checkInMyself, checkOutMyself } from '../services/attendanceService';
import { getMyProgress, getStats } from '../services/statsService';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const date = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const time = (value) => new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

function Stat({ label, value, hint }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

function MemberDashboard({ user }) {
  const { data: progress, loading, error, reload } = useFetch(getMyProgress, []);
  const [health, setHealth] = useState('checking');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = () =>
      fetch(`${API_ROOT}/health/ready`)
        .then((response) => alive && setHealth(response.ok ? 'up' : 'degraded'))
        .catch(() => alive && setHealth('down'));
    check();
    const id = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const markAttendance = async () => {
    setBusy(true);
    try {
      if (progress.openAttendance) {
        await checkOutMyself();
        toast.success('You are checked out');
      } else {
        await checkInMyself();
        toast.success('You are checked in');
      }
      reload();
    } catch (err) {
      toast.error(err.response?.data?.details?.[0]?.message || getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const statusTone = {
    active: 'green',
    upcoming: 'blue',
    expired: 'red',
    none: 'gray',
  }[progress?.membershipStatus || 'none'];
  const canCheckIn = progress?.membershipStatus === 'active';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your fitness progress</h1>
          <p className="text-sm text-slate-500">Welcome back, {user?.name}. Keep building your routine.</p>
        </div>
        <Button
          onClick={markAttendance}
          loading={busy}
          disabled={loading || (!progress?.openAttendance && !canCheckIn)}
        >
          {progress?.openAttendance ? <LogOut size={16} /> : <LogIn size={16} />}
          {progress?.openAttendance ? 'Check out' : 'Check in'}
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading your progress...</p>}

      {progress && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card title="Membership">
              {progress.membership ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{progress.membership.planName}</p>
                    <Badge tone={statusTone}>{progress.membershipStatus}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {progress.membershipStatus === 'upcoming' ? 'Starts' : 'Expires'} {date(
                      progress.membershipStatus === 'upcoming'
                        ? progress.membership.startDate
                        : progress.membership.endDate
                    )}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Choose a membership plan to get started.</p>
              )}
              <Link to="/plans" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-lime-700 hover:text-lime-800">
                {progress.membershipStatus === 'active' ? 'View plans' : 'Choose a plan'} <ArrowRight size={15} />
              </Link>
            </Card>
            <Stat label="Visits this month" value={progress.visitsThisMonth} hint="Your consistency this month" />
            <Stat label="Total visits" value={progress.totalVisits} hint="All recorded check-ins" />
            <Card title="Attendance">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-slate-400" />
                <span className="text-sm text-slate-700">API and database</span>
                <Badge tone={{ up: 'green', degraded: 'amber', down: 'red', checking: 'gray' }[health]}>
                  {health}
                </Badge>
              </div>
              {progress.openAttendance && (
                <p className="mt-2 text-xs text-slate-500">Checked in today at {time(progress.openAttendance.checkInAt)}</p>
              )}
              {!canCheckIn && !progress.openAttendance && (
                <p className="mt-2 text-xs text-slate-500">An active membership is required to check in.</p>
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Your visits this week">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progress.visitsByDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Visits" fill="#84cc16" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Recent check-ins"
              action={
                <Link to="/attendance" className="text-sm font-medium text-lime-700 hover:text-lime-800">
                  Attendance history
                </Link>
              }
            >
              {progress.recentAttendance.length ? (
                <ul className="divide-y divide-slate-100">
                  {progress.recentAttendance.map((record) => (
                    <li key={record._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-700">
                        <CalendarCheck size={16} className="text-slate-400" />
                        {date(record.checkInAt)}
                      </span>
                      <span className="text-slate-500">
                        {time(record.checkInAt)}{record.checkOutAt ? ` – ${time(record.checkOutAt)}` : ' – In gym'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">Your check-ins will appear here.</p>
              )}
            </Card>
          </div>

          <Card
            title="Plan and payment requests"
            action={
              <Link to="/plans" className="text-sm font-medium text-lime-700 hover:text-lime-800">
                Browse plans
              </Link>
            }
          >
            {progress.recentPayments.length ? (
              <ul className="divide-y divide-slate-100">
                {progress.recentPayments.map((payment) => (
                  <li key={payment._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{payment.planName || 'Membership payment'}</p>
                      <p className="text-xs text-slate-500">
                        {money(payment.amount)} · {payment.method.toUpperCase()} · {date(payment.createdAt)}
                      </p>
                    </div>
                    <Badge tone={payment.status === 'paid' ? 'green' : ['pending', 'processing'].includes(payment.status) ? 'amber' : 'red'}>
                      {payment.status === 'processing' ? 'under review' : payment.status || 'paid'}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm text-slate-500">You have no payment requests yet.</p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <CreditCard size={15} />
              Offline payment requests activate after staff verification.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function AdminDashboard({ user }) {
  const [health, setHealth] = useState('checking');
  const { data: stats, loading, error } = useFetch(getStats, []);

  useEffect(() => {
    let alive = true;
    const check = () =>
      fetch(`${API_ROOT}/health/ready`)
        .then((response) => alive && setHealth(response.ok ? 'up' : 'degraded'))
        .catch(() => alive && setHealth('down'));
    check();
    const id = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const tone = { up: 'green', degraded: 'amber', down: 'red', checking: 'gray' }[health];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h1>
        <p className="text-sm text-slate-500">Here's how your gym is doing.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading statistics...</p>}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total members" value={stats.totalMembers} hint={`${stats.noPlanMembers} without a plan`} />
            <Stat label="Active memberships" value={stats.activeMembers} hint={`${stats.expiringSoon} expiring within 7 days`} />
            <Stat label="Upcoming memberships" value={stats.upcomingMembers} />
            <Stat label="Expired" value={stats.expiredMembers} />
            <Stat label="Checked in today" value={stats.checkedInToday} />
            <Stat label="Revenue this month" value={money(stats.revenueThisMonth)} />
            <Stat label="Active trainers" value={stats.activeTrainers} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Revenue, last 6 months">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => money(value)} />
                    <Bar dataKey="total" name="Revenue" fill="#84cc16" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Check-ins, last 7 days">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.attendanceByDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Check-ins" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Signed in as">
          <p className="text-sm text-slate-700">{user?.email}</p>
          <div className="mt-2"><Badge tone="blue">{user?.role}</Badge></div>
        </Card>
        <Card title="System status">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-slate-400" />
            <span className="text-sm text-slate-700">API and database</span>
            <Badge tone={tone}>{health}</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}

function BasicDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h1>
        <p className="text-sm text-slate-500">Your account is ready.</p>
      </div>
      <Card title="Signed in as">
        <p className="text-sm text-slate-700">{user?.email}</p>
        <div className="mt-2"><Badge tone="blue">{user?.role}</Badge></div>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminDashboard user={user} />;
  if (user?.role === 'member') return <MemberDashboard user={user} />;
  return <BasicDashboard user={user} />;
}
