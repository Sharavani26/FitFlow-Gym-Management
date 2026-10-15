import { useState } from 'react';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { getErrorMessage } from '../services/api';
import { checkIn, checkOut, listAttendance } from '../services/attendanceService';
import { listMembers } from '../services/memberService';
import MyAttendance from './MyAttendance';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';

const todayLocal = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

function AdminAttendance() {
  const [date, setDate] = useState(todayLocal());
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: records, loading, error, reload } = useFetch(() => listAttendance(date), [date]);
  const { data: members } = useFetch(() => listMembers({ limit: 50 }).then((d) => d.members), []);
  const options = (members || []).map((m) => ({ value: m._id, label: `${m.name} (${m.email})` }));

  const onCheckIn = async () => {
    if (!userId) {
      toast.error('Choose a member first');
      return;
    }
    setBusy(true);
    try {
      await checkIn(userId);
      toast.success('Checked in');
      setUserId('');
      setDate(todayLocal());
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onCheckOut = async (id) => {
    try {
      await checkOut(id);
      toast.success('Checked out');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    {
      key: 'user',
      header: 'Member',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.user?.name || 'Unknown'}</p>
          <p className="text-xs text-slate-500">{r.user?.email}</p>
        </div>
      ),
    },
    { key: 'in', header: 'Check-in', render: (r) => time(r.checkInAt) },
    { key: 'out', header: 'Check-out', render: (r) => (r.checkOutAt ? time(r.checkOutAt) : '-') },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={r.checkOutAt ? 'gray' : 'green'}>{r.checkOutAt ? 'Left' : 'In gym'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) =>
        r.checkOutAt ? null : (
          <Button variant="secondary" onClick={() => onCheckOut(r._id)}>
            Check out
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500">Check members in and out. Only members with an active plan can check in.</p>
      </div>

      <Card title="Check in a member">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select
            className="flex-1"
            name="member"
            placeholder="Choose a member"
            options={options}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <Button onClick={onCheckIn} loading={busy}>
            <LogIn size={16} /> Check in
          </Button>
        </div>
      </Card>

      <Card
        title="Visits"
        action={<Input name="date" type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} />}
      >
        <Table
          columns={columns}
          rows={records || []}
          loading={loading}
          error={error}
          emptyTitle="No visits on this day"
          emptyMessage="Check-ins will appear here."
        />
      </Card>
    </div>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  return user?.role === 'member' ? <MyAttendance /> : <AdminAttendance />;
}