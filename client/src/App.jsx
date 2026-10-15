import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Plans from './pages/Plans';
import Members from './pages/Members';
import Trainers from './pages/Trainers';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import NotFound from './pages/NotFound';

const adminOnly = (page) => <ProtectedRoute roles={['admin']}>{page}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="plans" element={<Plans />} />
        <Route path="members" element={adminOnly(<Members />)} />
        <Route path="trainers" element={adminOnly(<Trainers />)} />
        <Route
          path="attendance"
          element={
            <ProtectedRoute roles={['admin', 'member']}>
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route path="payments" element={adminOnly(<Payments />)} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}