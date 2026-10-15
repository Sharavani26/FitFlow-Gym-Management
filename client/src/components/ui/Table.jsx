import Spinner from './Spinner';
import EmptyState from './EmptyState';

// columns: [{ key, header, render?: (row) => node, className? }]
export default function Table({ columns, rows = [], loading, error, emptyTitle, emptyMessage, rowKey = '_id' }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12 text-slate-400">
        <Spinner size={28} />
      </div>
    );
  }
  if (error) return <p className="py-8 text-center text-sm text-red-600">{error}</p>;
  if (!rows.length) return <EmptyState title={emptyTitle} message={emptyMessage} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 font-semibold ${c.className || ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row[rowKey]} className="hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-3 ${c.className || ''}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}