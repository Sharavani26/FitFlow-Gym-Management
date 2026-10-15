import { useState } from 'react';
import toast from 'react-hot-toast';
import { LogIn, LogOut } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { getErrorMessage } from '../services/api';
import { checkInMyself, checkOutMyself, listMyAttendance } from '../services/attendanceService';
import { getMyProgress } from '../services/statsService';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';

const date = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const time = (value) => new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function MyAttendance() {
  const { user } = useAuth();
  const {
    data: progress,
    loading: loadingProgress,
    error: progressError,
    reload: reloadProgress,
  } = useFetch(getMyProgress, []);
  const { data, loading, error, reload } = useFetch(listMyAttendance, []);
  const [busy, setBusy] = useState(false);
  const checkedIn = Boolean(progress?.openAttendance);
  const canCheckIn = progress?.membershipStatus === 'active';

  const toggleAttendance = async () => {
    setBusy(true);
    try {
      if (checkedIn) {
        await checkOutMyself();
        toast.success('You are checked out');
      } else {
        await checkInMyself();
        toast.success('You are checked in');
      }
      reload();
      reloadProgress();
    } catch (err) {
      toast.error(err.response?.data?.details?.[0]?.message || getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'checkInAt', header: 'Date', render: (record) => date(record.checkInAt) },
    { key: 'checkInTime', header: 'Check-in', render: (record) => time(record.checkInAt) },
    { key: 'checkOutAt', header: 'Check-out', render: (record) => record.checkOutAt ? time(record.checkOutAt) : '-' },
    {
      key: 'status',
      header: 'Status',
      render: (record) => (
        <Badge tone={record.checkOutAt ? 'gray' : 'green'}>
          {record.checkOutAt ? 'Complete' : 'Checked in'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My attendance</h1>
        <p className="text-sm text-slate-500">Mark your own gym visits and review your check-in history.</p>
      </div>

      {progressError && <p role="alert" className="text-sm text-red-600">{progressError}</p>}
      <Card title="Today's visit">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-900">{user?.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {checkedIn
                ? `Checked in at ${time(progress.openAttendance.checkInAt)}`
                : canCheckIn
                  ? 'Your active membership lets you check in.'
                  : 'You need an active membership to check in.'}
            </p>
          </div>
          <Button
            onClick={toggleAttendance}
            loading={busy}
            disabled={loadingProgress || (!checkedIn && !canCheckIn)}
          >
            {checkedIn ? <LogOut size={16} /> : <LogIn size={16} />}
            {checkedIn ? 'Check out' : 'Check in'}
          </Button>
        </div>
      </Card>

      <Card title={`Visit history${data ? ` (${data.total} total)` : ''}`}>
        <Table
          columns={columns}
          rows={data?.records || []}
          loading={loading}
          error={error}
          emptyTitle="No visits recorded"
          emptyMessage="Your gym check-ins will appear here."
        />
        {data?.total > data.records.length && (
          <p className="mt-3 text-xs text-slate-500">Showing the latest {data.records.length} visits.</p>
        )}
      </Card>
    </div>
  );
}
