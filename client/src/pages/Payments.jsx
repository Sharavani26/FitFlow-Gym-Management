import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

import useFetch from '../hooks/useFetch';
import { getErrorMessage } from '../services/api';
import { createPayment, listPayments, rejectPayment, verifyPayment } from '../services/paymentService';
import { listMembers } from '../services/memberService';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';

const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];
const EMPTY = { userId: '', amount: '', method: 'cash', note: '' };

export default function Payments() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => listPayments({ page, limit: 10 }), [page]);
  const { data: members } = useFetch(() => listMembers({ limit: 50 }).then((d) => d.members), []);
  const memberOptions = (members || []).map((m) => ({ value: m._id, label: `${m.name} (${m.email})` }));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const openNew = () => {
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  };

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.userId) e.userId = 'Choose a member';
    const amount = Number(form.amount);
    if (form.amount === '' || Number.isNaN(amount) || amount <= 0) e.amount = 'Enter an amount greater than 0';
    if (form.note.length > 200) e.note = 'Note must be at most 200 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await createPayment({ userId: form.userId, amount: Number(form.amount), method: form.method, note: form.note.trim() });
      toast.success('Payment recorded');
      setOpen(false);
      setPage(1);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.details?.[0]?.message || getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onVerify = async (payment) => {
    setReviewingId(payment._id);
    try {
      await verifyPayment(payment._id);
      toast.success('Payment verified and membership activated');
      reload();
    } catch (err) {
      toast.error(err.response?.data?.details?.[0]?.message || getErrorMessage(err));
    } finally {
      setReviewingId(null);
    }
  };

  const onReject = async () => {
    setReviewingId(rejecting._id);
    try {
      await rejectPayment(rejecting._id);
      toast.success('Payment request rejected');
      setRejecting(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.details?.[0]?.message || getErrorMessage(err));
    } finally {
      setReviewingId(null);
    }
  };

  const columns = [
    { key: 'paidAt', header: 'Date', render: (p) => fmt(p.paidAt || p.createdAt) },
    {
      key: 'user',
      header: 'Member',
      render: (p) => (
        <div>
          <p className="font-medium text-slate-900">{p.user?.name || 'Unknown'}</p>
          <p className="text-xs text-slate-500">{p.user?.email}</p>
        </div>
      ),
    },
    { key: 'amount', header: 'Amount', render: (p) => <span className="font-medium">{money(p.amount)}</span> },
    { key: 'method', header: 'Method', render: (p) => <Badge tone="blue">{p.method.toUpperCase()}</Badge> },
    { key: 'note', header: 'Note', render: (p) => p.note || '-' },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge tone={p.status === 'paid' ? 'green' : ['pending', 'processing'].includes(p.status) ? 'amber' : 'red'}>
          {p.status || 'paid'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) =>
        ['pending', 'processing'].includes(p.status) && p.plan ? (
          <div className="flex justify-end gap-2">
            <Button loading={reviewingId === p._id} onClick={() => onVerify(p)}>
              Verify
            </Button>
            <Button
              variant="ghost"
              disabled={Boolean(reviewingId)}
              onClick={() => setRejecting(p)}
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">Record and review membership payments.</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> Record payment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card title="Collected this month">
          <p className="text-2xl font-bold text-slate-900">{money(data?.thisMonth.amount || 0)}</p>
        </Card>
        <Card title="Payments this month">
          <p className="text-2xl font-bold text-slate-900">{data?.thisMonth.count || 0}</p>
        </Card>
        <Card title="Requests awaiting review">
          <p className="text-2xl font-bold text-slate-900">{data?.paymentRequests?.length || 0}</p>
        </Card>
      </div>

      <Card title="Plan payment requests">
        <Table
          columns={columns}
          rows={data?.paymentRequests || []}
          loading={loading}
          error={error}
          emptyTitle="No requests to review"
          emptyMessage="Member plan payment requests will appear here."
        />
      </Card>

      <Card title="Payment history">
        <Table
          columns={columns}
          rows={data?.payments || []}
          loading={loading}
          error={error}
          emptyTitle="No payment history"
          emptyMessage="Recorded and reviewed payments will appear here."
        />
        {data && data.pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Page {data.page} of {data.pages} ({data.total} payments)
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

      <Modal open={open} title="Record payment" onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Select label="Member" name="userId" placeholder="Choose a member" options={memberOptions} value={form.userId} onChange={set('userId')} error={errors.userId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount (₹)" name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} error={errors.amount} />
            <Select label="Method" name="method" options={METHODS} value={form.method} onChange={set('method')} />
          </div>
          <Input label="Note (optional)" name="note" value={form.note} onChange={set('note')} error={errors.note} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(rejecting)}
        title="Reject payment request?"
        message={`Reject ${rejecting?.user?.name || 'this member'}'s ${rejecting?.planName || 'plan'} request? Their membership will not be activated.`}
        confirmLabel="Reject request"
        loading={Boolean(reviewingId)}
        onConfirm={onReject}
        onCancel={() => !reviewingId && setRejecting(null)}
      />
    </div>
  );
}