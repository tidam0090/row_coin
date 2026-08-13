import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import RequestStatus from './pages/RequestStatus';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/request/:id"
          element={
            <ProtectedRoute>
              <RequestStatus />
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </AuthProvider>
  );
}
