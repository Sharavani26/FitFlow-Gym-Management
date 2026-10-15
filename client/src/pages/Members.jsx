import { useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

import useFetch from '../hooks/useFetch';
import { getErrorMessage } from '../services/api';
import { listMembers, assignPlan } from '../services/memberService';
import { listPlans } from '../services/planService';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const DAY_MS = 24 * 60 * 60 * 1000;

function StatusBadge({ member }) {
  if (member.membershipStatus === 'none') return <Badge tone="gray">No plan</Badge>;
  if (member.membershipStatus === 'expired') return <Badge tone="red">Expired</Badge>;
  if (member.membershipStatus === 'upcoming') return <Badge tone="blue">Upcoming</Badge>;
  const soon = new Date(member.membership.endDate) - Date.now() < 7 * DAY_MS;
  return <Badge tone={soon ? 'amber' : 'green'}>{soon ? 'Expiring soon' : 'Active'}</Badge>;
}

export default function Members() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => listMembers({ search, page, limit: 10 }), [search, page]);

  const [target, setTarget] = useState(null);
  const [planId, setPlanId] = useState('');
  const [planError, setPlanError] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: plans } = useFetch(listPlans, []);
  const planOptions = (plans || [])
    .filter((p) => p.isActive)
    .map((p) => ({ value: p._id, label: `${p.name} - ₹${p.price} / ${p.durationDays} days` }));

  const onSearch = (ev) => {
    ev.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openAssign = (member) => {
    setTarget(member);
    setPlanId('');
    setPlanError('');
  };

  const onAssign = async (ev) => {
    ev.preventDefault();
    if (!planId) {
      setPlanError('Choose a plan');
      return;
    }
    setSaving(true);
    try {
      await assignPlan(target._id, { planId });
      toast.success('Membership saved');
      setTarget(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.details?.[0]?.message || getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Member',
      render: (m) => (
        <div>
          <p className="font-medium text-slate-900">{m.name}</p>
          <p className="text-xs text-slate-500">{m.email}</p>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', render: (m) => m.membership?.planName || '-' },
    { key: 'expiry', header: 'Expires', render: (m) => (m.membership ? fmt(m.membership.endDate) : '-') },
    { key: 'status', header: 'Status', render: (m) => <StatusBadge member={m} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (m) => (
        <Button variant="secondary" onClick={() => openAssign(m)}>
          {m.membershipStatus === 'none' ? 'Assign plan' : 'Renew / change'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Members</h1>
        <p className="text-sm text-slate-500">Members appear here after they sign up. Assign or renew their plan.</p>
      </div>

      <Card>
        <form onSubmit={onSearch} className="mb-4 flex gap-2">
          <Input
            className="flex-1"
            name="search"
            placeholder="Search by name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            <Search size={16} /> Search
          </Button>
        </form>

        <Table
          columns={columns}
          rows={data?.members || []}
          loading={loading}
          error={error}
          emptyTitle="No members found"
          emptyMessage={search ? 'Try a different search.' : 'No one has signed up as a member yet.'}
        />

        {data && data.pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Page {data.page} of {data.pages} ({data.total} members)
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={Boolean(target)} title={`Plan for ${target?.name || ''}`} onClose={() => setTarget(null)}>
        <form onSubmit={onAssign} className="space-y-4" noValidate>
          <Select
            label="Membership plan"
            name="planId"
            placeholder="Choose a plan"
            options={planOptions}
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              setPlanError('');
            }}
            error={planError}
          />
          <p className="text-xs text-slate-500">
            If the member's plan is still active, the new plan starts when the current one ends.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}