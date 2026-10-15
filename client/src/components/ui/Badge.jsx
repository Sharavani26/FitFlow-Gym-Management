const tones = {
  green: 'bg-lime-100 text-lime-800',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-sky-100 text-sky-700',
  gray: 'bg-slate-100 text-slate-600',
};

export default function Badge({ tone = 'gray', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}