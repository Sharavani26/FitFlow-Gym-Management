import { useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, Plus } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { getErrorMessage } from '../services/api';
import { createPlan, listPlans, updatePlan } from '../services/planService';
import { requestPlanPayment } from '../services/paymentService';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';

const EMPTY = { name: '', description: '', price: '', durationDays: '' };
const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash at the gym' },
  { value: 'upi', label: 'UPI (pay offline)' },
  { value: 'card', label: 'Card at the gym' },
  { value: 'other', label: 'Other' },
];

export default function Plans() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';
  const { data: plans, loading, error, reload } = useFetch(listPlans, []);

  const [editing, setEditing] = useState(null); // null = closed, 'new' = create, plan object = edit
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDeactivate, setToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [requesting, setRequesting] = useState(false);

  const openNew = () => {
    setForm(EMPTY);
    setErrors({});
    setEditing('new');
  };

  const openEdit = (plan) => {
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: String(plan.price),
      durationDays: String(plan.durationDays),
    });
    setErrors({});
    setEditing(plan);
  };

  const close = () => setEditing(null);

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    const name = form.name.trim();
    if (name.length < 2 || name.length > 60) e.name = 'Name must be 2 to 60 characters';
    if (form.description.length > 300) e.description = 'Description must be at most 300 characters';
    const price = Number(form.price);
    if (form.price === '' || Number.isNaN(price) || price < 0) e.price = 'Enter a price of 0 or more';
    const days = Number(form.durationDays);
    if (!Number.isInteger(days) || days < 1 || days > 3650) e.durationDays = 'Enter whole days from 1 to 3650';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      durationDays: Number(form.durationDays),
    };

    setSaving(true);
    try {
      if (editing === 'new') {
        await createPlan(payload);
        toast.success('Plan created');
      } else if (isMember) {
        await updatePlan(editing._id, payload);
        toast.success('Plan updated');
      }
      close();
      reload();
    } catch (err) {
      const message = err.response?.data?.details?.[0]?.message || getErrorMessage(err);
      if (err.response?.status === 409) setErrors({ name: 'A plan with this name already exists' });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    setDeactivating(true);
    try {
      await updatePlan(toDeactivate._id, { isActive: false });
      toast.success('Plan deactivated');
      setToDeactivate(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeactivating(false);
    }
  };

  const reactivate = async (plan) => {
    try {
      await updatePlan(plan._id, { isActive: true });
      toast.success('Plan reactivated');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submitPlanRequest = async (event) => {
    event.preventDefault();
    setRequesting(true);
    try {
      const result = await requestPlanPayment({ planId: selectedPlan._id, method: paymentMethod });
      toast.success(
        result.membership
          ? 'Free plan activated'
          : 'Payment request sent. Your plan activates after staff verifies payment.'
      );
      setSelectedPlan(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.details?.[0]?.message || getErrorMessage(err));
    } finally {
      setRequesting(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Plan', render: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
    { key: 'description', header: 'Description', render: (p) => p.description || '-' },
    { key: 'price', header: 'Price', render: (p) => money(p.price) },
    { key: 'durationDays', header: 'Duration', render: (p) => `${p.durationDays} days` },
    {
      key: 'isActive',
      header: 'Status',
      render: (p) => <Badge tone={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
  ];

  if (isAdmin) {
    columns.push({
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => openEdit(p)}>Edit</Button>
          {p.isActive ? (
            <Button variant="ghost" onClick={() => setToDeactivate(p)}>Deactivate</Button>
          ) : (
            <Button variant="ghost" onClick={() => reactivate(p)}>Reactivate</Button>
          )}
        </div>
      ),
    });
  } else {
    columns.push({
      key: 'choose',
      header: '',
      className: 'text-right',
      render: (plan) => (
        <Button onClick={() => setSelectedPlan(plan)}>
          {plan.price === 0 ? 'Choose free plan' : 'Choose plan'}
        </Button>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Membership plans</h1>
          <p className="text-sm text-slate-500">
            {isAdmin ? 'Create and manage the plans members can join.' : 'Available membership plans.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openNew}>
            <Plus size={16} /> Add plan
          </Button>
        )}
      </div>

      <Card>
        <Table
          columns={columns}
          rows={plans || []}
          loading={loading}
          error={error}
          emptyTitle="No plans yet"
          emptyMessage={isAdmin ? 'Click "Add plan" to create the first one.' : 'No plans are available right now.'}
        />
      </Card>

      <Modal open={Boolean(editing)} title={editing === 'new' ? 'Add plan' : 'Edit plan'} onClose={close}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input label="Name" name="name" value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Description (optional)" name="description" value={form.description} onChange={set('description')} error={errors.description} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Price (₹)" name="price" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} error={errors.price} />
            <Input label="Duration (days)" name="durationDays" type="number" min="1" step="1" value={form.durationDays} onChange={set('durationDays')} error={errors.durationDays} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDeactivate)}
        title="Deactivate plan?"
        message={`"${toDeactivate?.name}" will no longer be offered to new members. You can reactivate it later.`}
        confirmLabel="Deactivate"
        loading={deactivating}
        onConfirm={confirmDeactivate}
        onCancel={() => setToDeactivate(null)}
      />

      {isMember && (
        <Modal
          open={Boolean(selectedPlan)}
          title={`Choose ${selectedPlan?.name || 'plan'}`}
          onClose={() => !requesting && setSelectedPlan(null)}
        >
          {selectedPlan && (
            <form onSubmit={submitPlanRequest} className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-900">{selectedPlan.name}</p>
                <p className="mt-1 text-slate-600">
                  {money(selectedPlan.price)} for {selectedPlan.durationDays} days
                </p>
              </div>
              {selectedPlan.price > 0 ? (
                <>
                  <Select
                    label="How will you pay?"
                    name="paymentMethod"
                    options={PAYMENT_METHODS}
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  />
                  <p className="text-sm text-slate-500">
                    This sends a payment request; it does not charge you online. Pay using the selected method and staff will activate your membership after verifying the payment.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  This free plan will activate immediately. If you already have a membership, it will start after that membership ends.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={requesting}
                  onClick={() => setSelectedPlan(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={requesting}>
                  <CreditCard size={16} />
                  {selectedPlan.price === 0 ? 'Activate plan' : 'Request payment'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}