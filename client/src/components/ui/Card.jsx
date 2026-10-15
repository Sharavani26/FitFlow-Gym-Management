export default function Card({ title, action, className = '', children }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}