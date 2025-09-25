import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Items from './pages/Items';
import Vendors from './pages/Vendors';
import PurchaseOrders from './pages/PurchaseOrders';
import GRN from './pages/GRN';
import Indents from './pages/Indents';
import Issues from './pages/Issues';
import Dishes from './pages/Dishes';
import MealPlans from './pages/MealPlans';
import Users from './pages/Users';
import Settings from './pages/Settings';
import FNBDashboard from './pages/FNBDashboard';
import MessFacilities from './pages/MessFacilities';
import Packages from './pages/Packages';
import Subscriptions from './pages/Subscriptions';
import TransactionReports from './pages/TransactionReports';
import MessFacilityDetail from './pages/MessFacilityDetail';
import StudentOrders from './pages/StudentOrders';
import LoadingSpinner from './components/LoadingSpinner';
import QRScannerModule from './pages/QRScannerModule';
import StudentPhotoManagement from './pages/StudentPhotoManagement';
import CSVUploadManager from './pages/CSVUploadManager';
import Reports from './pages/Reports';
import ScannerPage from './pages/ScannerPage';
import MessReport from './pages/MessReport';
import AdminConfig from './pages/AdminConfig';
import SystemConfig from './pages/SystemConfig';
import ScannerLogin from './pages/ScannerLogin';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/items" element={
              <ProtectedRoute>
                <Layout>
                  <Items />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/vendors" element={
              <ProtectedRoute>
                <Layout>
                  <Vendors />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/purchase-orders" element={
              <ProtectedRoute>
                <Layout>
                  <PurchaseOrders />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/grn" element={
              <ProtectedRoute>
                <Layout>
                  <GRN />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/indents" element={
              <ProtectedRoute>
                <Layout>
                  <Indents />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/issues" element={
              <ProtectedRoute>
                <Layout>
                  <Issues />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/dishes" element={
              <ProtectedRoute>
                <Layout>
                  <Dishes />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/meal-plans" element={
              <ProtectedRoute>
                <Layout>
                  <MealPlans />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/fnb-dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <FNBDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/mess-facilities" element={
              <ProtectedRoute>
                <Layout>
                  <MessFacilities />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/packages" element={
              <ProtectedRoute>
                <Layout>
                  <Packages />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/subscriptions" element={
              <ProtectedRoute>
                <Layout>
                  <Subscriptions />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/transaction-reports" element={
              <ProtectedRoute>
                <Layout>
                  <TransactionReports />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/mess-facilities/:id" element={
              <ProtectedRoute>
                <Layout>
                  <MessFacilityDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/student-orders" element={
              <ProtectedRoute>
                <Layout>
                  <StudentOrders />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/qr-scanner" element={
              <ProtectedRoute>
                <Layout>
                  <ScannerPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/student-photos" element={
              <ProtectedRoute>
                <Layout>
                  <StudentPhotoManagement />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/csv-uploads" element={
              <ProtectedRoute>
                <Layout>
                  <CSVUploadManager />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports/mess/:messId" element={
              <ProtectedRoute>
                <Layout>
                  <MessReport />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin-config" element={
              <ProtectedRoute>
                <Layout>
                  <AdminConfig />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/system-config" element={
              <ProtectedRoute>
                <Layout>
                  <SystemConfig />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/scanner-login" element={<ScannerLogin />} />
            <Route path="/scanner-dashboard" element={
              <ProtectedRoute>
                <ScannerPage />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;