import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Earnings from './pages/Earnings';
import FraudDefense from './pages/FraudDefense';
import Sensors from './pages/Sensors';
import Subscription from './pages/Subscription';
import AdminDashboard from './pages/admin/AdminDashboard';
import Layout from './components/Layout';

function PrivateRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="earnings" element={<Earnings />} />
              <Route path="fraud-defense" element={<FraudDefense />} />
              <Route path="sensors" element={<Sensors />} />
              <Route path="subscription" element={<Subscription />} />
              <Route path="admin" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
