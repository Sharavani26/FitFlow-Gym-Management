import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { register } from '../services/authService';
import { getErrorMessage } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const fieldClass =
  'w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400';

function PasswordField({ label, name, value, onChange, error, show, onToggle, autoComplete }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`${fieldClass} ${error ? 'border-red-400' : 'border-slate-300'}`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function Signup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your full name (at least 2 characters)';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.password.length < 8) e.password = 'Use at least 8 characters';
    else if (form.password.length > 72) e.password = 'Use 72 characters or fewer';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      e.password = 'Include at least one letter and one number';
    if (!form.confirm) e.confirm = 'Please confirm your password';
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Success is only assumed after the backend answers 201.
      await register(form.name.trim(), form.email.trim(), form.password);
      toast.success('Account created! Please log in.');
      navigate('/login', { replace: true, state: { email: form.email.trim().toLowerCase() } });
    } catch (err) {
      const message = err.response?.data?.details?.[0]?.message || getErrorMessage(err);
      if (err.response?.status === 409) setErrors({ email: message });
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 rounded-xl bg-lime-400 p-3 text-charcoal-900">
            <Dumbbell size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500">Join FitFlow</p>
        </div>

        {formError && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input label="Full name" name="name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <PasswordField label="Password" name="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          <p className="text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>
          <Button type="submit" loading={submitting} className="w-full">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-lime-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}