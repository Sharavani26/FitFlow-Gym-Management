import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-slate-500">That page doesn't exist.</p>
      <Link to="/" className="mt-4 font-semibold text-lime-700 hover:underline">
        Back to home
      </Link>
    </div>
  );
}