import Spinner from './Spinner';

const variants = {
  primary: 'bg-lime-400 text-charcoal-900 hover:bg-lime-300 focus:ring-lime-400',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
  ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
};

export default function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}