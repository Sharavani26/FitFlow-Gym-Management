
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Dumbbell } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: location.state?.email || '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const validate = () => {
    const e = {};

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address';
    }

    if (!form.password) {
      e.password = 'Password is required';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      await login(form.email.trim(), form.password);

      toast.success('Welcome back!');

      navigate(location.state?.from?.pathname || '/', {
        replace: true,
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key) => (e) => {
    setForm((previous) => ({
      ...previous,
      [key]: e.target.value,
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: '',
    }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 rounded-xl bg-lime-400 p-3 text-charcoal-900">
            <Dumbbell size={28} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            FitFlow
          </h1>

          <p className="text-sm text-slate-500">
            Gym Management System
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
          />

          <Button
            type="submit"
            loading={submitting}
            className="w-full"
          >
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-lime-700 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
