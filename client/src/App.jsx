import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import DistributorDashboard from './pages/distributor/Dashboard';
import DealerDashboard from './pages/dealer/Dashboard';
import { Toaster } from 'react-hot-toast';

// Loading Component
const LoadingSpinner = () => (
    <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto mb-4"></div>
            <p className="text-gray-500 font-bold animate-pulse">Loading Z-ON DOOR...</p>
        </div>
    </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    // Here we DO wait for loading, because we must know if user is logged in
    if (loading) return <LoadingSpinner />;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect based on role if they try to access wrong area
        if (user.role === 'MANUFACTURER') return <Navigate to="/admin" replace />;
        if (user.role === 'DISTRIBUTOR') return <Navigate to="/distributor" replace />;
        if (user.role === 'DEALER') return <Navigate to="/dealer" replace />;
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Home Redirect - Logic to send user to right place
const HomeRedirect = () => {
    const { user, loading } = useAuth();

    if (loading) return <LoadingSpinner />;

    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'DEALER') return <Navigate to="/dealer" replace />;
    if (user.role === 'DISTRIBUTOR') return <Navigate to="/distributor" replace />;
    return <Navigate to="/admin" replace />;
}

function App() {
    return (
        <>
            <Toaster position="top-right" />
            <Routes>
                {/* Public Route - Login - Renders Immediately */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route
                    path="/admin/*"
                    element={
                        <ProtectedRoute allowedRoles={['MANUFACTURER']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/distributor/*"
                    element={
                        <ProtectedRoute allowedRoles={['DISTRIBUTOR']}>
                            <DistributorDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/dealer/*"
                    element={
                        <ProtectedRoute allowedRoles={['DEALER']}>
                            <DealerDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Smart Redirect for Root */}
                <Route
                    path="/dashboard"
                    element={<HomeRedirect />}
                />
                <Route path="/" element={<HomeRedirect />} />

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </>
    )
}

export default App;
