import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

import useFetch from '../hooks/useFetch';
import { getErrorMessage } from '../services/api';
import { createTrainer, listTrainers, updateTrainer } from '../services/trainerService';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';

const EMPTY = { name: '', email: '', phone: '', specialization: '' };

export default function Trainers() {
  const { data: trainers, loading, error, reload } = useFetch(listTrainers, []);

  const [editing, setEditing] = useState(null); // null = closed, 'new' = create, object = edit
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDeactivate, setToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const openNew = () => {
    setForm(EMPTY);
    setErrors({});
    setEditing('new');
  };

  const openEdit = (t) => {
    setForm({ name: t.name, email: t.email, phone: t.phone || '', specialization: t.specialization });
    setErrors({});
    setEditing(t);
  };

  const close = () => setEditing(null);

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter a name (at least 2 characters)';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    if (form.specialization.trim().length < 2) e.specialization = 'Enter a specialization';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      specialization: form.specialization.trim(),
    };

    setSaving(true);
    try {
      if (editing === 'new') {
        await createTrainer(payload);
        toast.success('Trainer added');
      } else {
        await updateTrainer(editing._id, payload);
        toast.success('Trainer updated');
      }
      close();
      reload();
    } catch (err) {
      const message = err.response?.data?.details?.[0]?.message || getErrorMessage(err);
      if (err.response?.status === 409) setErrors({ email: 'A trainer with this email already exists' });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (trainer, isActive) => {
    try {
      await updateTrainer(trainer._id, { isActive });
      toast.success(isActive ? 'Trainer reactivated' : 'Trainer deactivated');
      reload();
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    }
  };

  const confirmDeactivate = async () => {
    setDeactivating(true);
    const ok = await setActive(toDeactivate, false);
    setDeactivating(false);
    if (ok) setToDeactivate(null);
  };

  const columns = [
    {
      key: 'name',
      header: 'Trainer',
      render: (t) => (
        <div>
          <p className="font-medium text-slate-900">{t.name}</p>
          <p className="text-xs text-slate-500">{t.email}</p>
        </div>
      ),
    },
    { key: 'specialization', header: 'Specialization' },
    { key: 'phone', header: 'Phone', render: (t) => t.phone || '-' },
    {
      key: 'isActive',
      header: 'Status',
      render: (t) => <Badge tone={t.isActive ? 'green' : 'gray'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (t) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => openEdit(t)}>Edit</Button>
          {t.isActive ? (
            <Button variant="ghost" onClick={() => setToDeactivate(t)}>Deactivate</Button>
          ) : (
            <Button variant="ghost" onClick={() => setActive(t, true)}>Reactivate</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trainers</h1>
          <p className="text-sm text-slate-500">Manage the trainers at your gym.</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> Add trainer
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          rows={trainers || []}
          loading={loading}
          error={error}
          emptyTitle="No trainers yet"
          emptyMessage='Click "Add trainer" to add the first one.'
        />
      </Card>

      <Modal open={Boolean(editing)} title={editing === 'new' ? 'Add trainer' : 'Edit trainer'} onClose={close}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input label="Full name" name="name" value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone (optional)" name="phone" value={form.phone} onChange={set('phone')} error={errors.phone} />
            <Input label="Specialization" name="specialization" placeholder="e.g. Strength, Yoga" value={form.specialization} onChange={set('specialization')} error={errors.specialization} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDeactivate)}
        title="Deactivate trainer?"
        message={`${toDeactivate?.name} will be marked inactive. You can reactivate them later.`}
        confirmLabel="Deactivate"
        loading={deactivating}
        onConfirm={confirmDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  );
}