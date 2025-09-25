import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChefHat as Chef, Eye, EyeOff, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError, showLoading, closeLoading } from '../utils/sweetAlert';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempCredentials, setTempCredentials] = useState<{email: string, password: string} | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    showLoading('Sending OTP...');

    try {
      // Simulate OTP sending (in production, integrate with SMS service)
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('OTP for admin login:', otpCode); // In production, send via SMS
      
      setTempCredentials({ email, password });
      setShowOTP(true);
      closeLoading();
      showSuccess('OTP Sent', 'Please check your registered mobile number for OTP');
    } catch (error) {
      closeLoading();
      showError('Login Failed', 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempCredentials) return;
    
    setLoading(true);
    showLoading('Verifying OTP...');

    try {
      // In production, verify OTP with backend
      if (otp.length === 6) {
        await login(tempCredentials.email, tempCredentials.password);
        closeLoading();
        showSuccess('Login Successful', 'Welcome to the system');
        navigate('/');
      } else {
        throw new Error('Invalid OTP');
      }
    } catch (error) {
      closeLoading();
      showError('Invalid OTP', 'Please enter the correct 6-digit OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Resent OTP for admin login:', otpCode);
    showSuccess('OTP Resent', 'New OTP sent to your mobile number');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4"
            >
              {showOTP ? <Send size={32} className="text-white" /> : <Chef size={32} className="text-white" />}
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900">ORFUS</h1>
            <p className="text-gray-600 mt-2">
              {showOTP ? 'Enter OTP to Continue' : 'Campus Kitchen Management System'}
            </p>
          </div>

          {!showOTP ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleOTPSubmit} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-Digit OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  OTP sent to your registered mobile number
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOTP(false);
                    setOtp('');
                    setTempCredentials(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
                <motion.button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </motion.button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/scanner-login')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Scanner Login →
            </button>
          </div>

          {/* <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <p className="mb-2 font-medium">Demo Accounts:</p>
              <div className="space-y-1 text-xs">
                <p><strong>Admin:</strong> admin@foodservice.com / admin123</p>
                <p><strong>Chef:</strong> chef@foodservice.com / chef123</p>
                <p><strong>Store:</strong> store@foodservice.com / store123</p>
                <p><strong>Cook:</strong> cook@foodservice.com / cook123</p>
              </div>
            </div>
          </div> */}
        </div>
      </motion.div>
    </div>
  );
};

export default Login;