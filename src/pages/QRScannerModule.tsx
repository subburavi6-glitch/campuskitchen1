import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  User, 
  Check, 
  X, 
  Clock, 
  AlertTriangle,
  Wifi,
  WifiOff,
  Settings,
  Upload,
  Download,
  Scan,
  UserCheck
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

interface ScanResult {
  success: boolean;
  access_granted: boolean;
  student?: {
    name: string;
    registerNumber: string;
    photoUrl?: string;
    userType: string;
    department?: string;
  };
  meal_type?: string;
  error?: string;
  duplicate_scan?: boolean;
  requires_approval?: boolean;
  message?: string;
}

interface ScanLog {
  id: string;
  studentName: string;
  scanResult: string;
  mealType: string;
  accessGranted: boolean;
  scannedAt: string;
  errorMessage?: string;
}

const QRScannerModule: React.FC = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [deviceId] = useState(`SCANNER_${Math.random().toString(36).substr(2, 9)}`);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<ScanResult | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Simulate USB scanner connection
    const connectScanner = () => {
      setIsConnected(true);
      toast.success('QR Scanner connected');
    };

    const disconnectScanner = () => {
      setIsConnected(false);
      toast.error('QR Scanner disconnected');
    };

    // Simulate connection after 2 seconds
    const timer = setTimeout(connectScanner, 2000);

    // Focus input for external scanner
    if (inputRef.current) {
      inputRef.current.focus();
    }

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    fetchScanLogs();
  }, []);

  useEffect(() => {
    // Handle keyboard input for external scanner
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && manualInput.trim()) {
        handleQRScan(manualInput.trim());
        setManualInput('');
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [manualInput]);

  const fetchScanLogs = async () => {
    try {
      const response = await api.get('/scanner/logs', {
        params: { deviceId, limit: 50 }
      });
      setScanLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch scan logs:', error);
    }
  };

  const handleQRScan = async (qrData: string) => {
    if (!isConnected) {
      toast.error('Scanner not connected');
      return;
    }

    try {
      const response = await api.post('/scanner/scan', {
        qrCode: qrData,
        deviceId
      });

      const result: ScanResult = response.data;
      setCurrentScan(result);

      if (result.requires_approval) {
        setPendingApproval(result);
        setShowApprovalModal(true);
      } else if (result.access_granted) {
        toast.success(`Access granted for ${result.student?.name}`);
        setTimeout(() => setCurrentScan(null), 5000);
      } else if (result.duplicate_scan) {
        toast.warning('Student already scanned for this meal');
        setTimeout(() => setCurrentScan(null), 5000);
      } else {
        toast.error(result.error || 'Access denied');
        setTimeout(() => setCurrentScan(null), 5000);
      }

      fetchScanLogs();
    } catch (error) {
      console.error('QR scan error:', error);
      toast.error('Failed to process QR scan');
    }
  };

  const handleManualApproval = async (approved: boolean) => {
    if (!pendingApproval) return;

    try {
      await api.post('/scanner/manual-approval', {
        studentId: pendingApproval.student?.registerNumber,
        approved,
        deviceId,
        mealType: pendingApproval.meal_type
      });

      if (approved) {
        toast.success(`Manual access granted for ${pendingApproval.student?.name}`);
      } else {
        toast.error(`Access denied for ${pendingApproval.student?.name}`);
      }

      setShowApprovalModal(false);
      setPendingApproval(null);
      setCurrentScan(null);
      fetchScanLogs();
    } catch (error) {
      console.error('Manual approval error:', error);
    }
  };

  // Simulate QR scan for demo
  const simulateQRScan = () => {
    const sampleQRCodes = [
      'QR_CS2021001_abc123',
      'QR_EMP001_def456',
      'QR_CS2021002_ghi789',
      'INVALID_QR_CODE'
    ];
    const randomQR = sampleQRCodes[Math.floor(Math.random() * sampleQRCodes.length)];
    handleQRScan(randomQR);
  };

  const getCurrentMealTime = () => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 10) return 'BREAKFAST';
    if (hour >= 12 && hour < 15) return 'LUNCH';
    if (hour >= 16 && hour < 18) return 'SNACKS';
    if (hour >= 19 && hour < 22) return 'DINNER';
    return 'CLOSED';
  };

  const currentMeal = getCurrentMealTime();

  if (user?.role !== 'FNB_MANAGER' && user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Camera size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to access the QR scanner module.</p>
        </div>
      </div>
    );
  }

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Full Screen Scanner Interface */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">QR Scanner Module</h1>
            <div className="flex items-center justify-center space-x-4 text-white">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi size={24} className="text-green-400" />
                ) : (
                  <WifiOff size={24} className="text-red-400" />
                )}
                <span>{isConnected ? 'Scanner Connected' : 'Scanner Disconnected'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock size={24} className={currentMeal === 'CLOSED' ? 'text-red-400' : 'text-green-400'} />
                <span>{currentMeal === 'CLOSED' ? 'Mess Closed' : currentMeal}</span>
              </div>
            </div>
          </div>

          {/* Scanner Area */}
          <div className="w-96 h-96 border-4 border-dashed border-white rounded-2xl flex items-center justify-center mb-8">
            {isConnected ? (
              <div className="text-center">
                <Camera size={96} className="text-white mx-auto mb-4" />
                <p className="text-white text-xl">Ready to Scan</p>
                <p className="text-gray-300">Position QR code in scanner area</p>
              </div>
            ) : (
              <div className="text-center">
                <WifiOff size={96} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-xl">Scanner Disconnected</p>
              </div>
            )}
          </div>

          {/* Manual Input for External Scanner */}
          <div className="w-full max-w-md mb-8">
            <input
              ref={inputRef}
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && manualInput.trim()) {
                  handleQRScan(manualInput.trim());
                  setManualInput('');
                }
              }}
              placeholder="External scanner input (auto-focus)"
              className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
              autoFocus
            />
            <p className="text-gray-400 text-sm text-center mt-2">
              External scanner will auto-fill this field
            </p>
          </div>

          {/* Demo Button */}
          <button
            onClick={simulateQRScan}
            disabled={!isConnected}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold text-lg mb-8"
          >
            Simulate QR Scan (Demo)
          </button>

          {/* Exit Full Screen */}
          <button
            onClick={() => setIsFullScreen(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            Exit Full Screen
          </button>
        </div>

        {/* Current Scan Result Overlay */}
        {currentScan && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-8 left-8 right-8 bg-white rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-start space-x-6">
              {currentScan.student?.photoUrl ? (
                <img
                  src={currentScan.student.photoUrl}
                  alt={currentScan.student.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <User size={40} className="text-gray-500" />
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-3">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {currentScan.student?.name || 'Unknown Student'}
                  </h3>
                  {currentScan.access_granted ? (
                    <Check size={32} className="text-green-600" />
                  ) : (
                    <X size={32} className="text-red-600" />
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-lg">
                  <div>
                    <span className="text-gray-600">Register:</span>
                    <span className="font-semibold ml-2">{currentScan.student?.registerNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="font-semibold ml-2">{currentScan.student?.userType}</span>
                  </div>
                  {currentScan.student?.department && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-semibold ml-2">{currentScan.student.department}</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-gray-600">Meal:</span>
                    <span className="font-semibold ml-2">{currentScan.meal_type}</span>
                  </div>
                </div>

                <div className={`mt-4 px-4 py-3 rounded-lg text-lg font-bold text-center ${
                  currentScan.access_granted 
                    ? 'bg-green-100 text-green-800'
                    : currentScan.duplicate_scan
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {currentScan.access_granted && '✅ ACCESS GRANTED - Welcome!'}
                  {currentScan.duplicate_scan && '⚠️ ALREADY SCANNED - Duplicate entry'}
                  {!currentScan.access_granted && !currentScan.duplicate_scan && (
                    `❌ ${currentScan.error || 'ACCESS DENIED'}`
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Scanner Module</h1>
          <p className="text-gray-600">USB QR Scanner for mess entry verification</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsFullScreen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Scan size={16} />
            <span>Full Screen Scanner</span>
          </button>
          <button
            onClick={() => setShowLogsModal(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Download size={16} />
            <span>View Logs</span>
          </button>
        </div>
      </div>

      {/* Scanner Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scanner Status</h3>
              <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            {isConnected ? (
              <Wifi size={24} className="text-green-600" />
            ) : (
              <WifiOff size={24} className="text-red-600" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Meal</h3>
              <p className={`text-sm ${currentMeal === 'CLOSED' ? 'text-red-600' : 'text-green-600'}`}>
                {currentMeal === 'CLOSED' ? 'Mess Closed' : currentMeal}
              </p>
            </div>
            <Clock size={24} className={currentMeal === 'CLOSED' ? 'text-red-600' : 'text-green-600'} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Device ID</h3>
              <p className="text-sm text-gray-600 font-mono">{deviceId}</p>
            </div>
            <Camera size={24} className="text-blue-600" />
          </div>
        </div>
      </div>

      {/* Scanner Interface */}
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-6 border-4 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            {isConnected ? (
              <Camera size={48} className="text-blue-600" />
            ) : (
              <WifiOff size={48} className="text-gray-400" />
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isConnected ? 'Ready to Scan' : 'Scanner Disconnected'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {isConnected 
              ? 'Position QR code in front of the scanner or use external scanner' 
              : 'Please check scanner connection'
            }
          </p>

          {/* Manual Input for External Scanner */}
          <div className="max-w-md mx-auto mb-6">
            <input
              ref={inputRef}
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="External scanner input (auto-focus)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
              disabled={!isConnected}
            />
            <p className="text-gray-500 text-sm mt-2">
              External USB scanner will auto-fill this field
            </p>
          </div>

          {/* Demo Scan Button */}
          <button
            onClick={simulateQRScan}
            disabled={!isConnected}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold mr-4"
          >
            Simulate QR Scan (Demo)
          </button>

          <button
            onClick={() => setIsFullScreen(true)}
            disabled={!isConnected}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Full Screen Mode
          </button>
        </div>
      </div>

      {/* Current Scan Result */}
      {currentScan && !isFullScreen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-start space-x-4">
            {currentScan.student?.photoUrl ? (
              <img
                src={currentScan.student.photoUrl}
                alt={currentScan.student.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={32} className="text-gray-500" />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentScan.student?.name || 'Unknown Student'}
                </h3>
                {currentScan.access_granted ? (
                  <Check size={24} className="text-green-600" />
                ) : (
                  <X size={24} className="text-red-600" />
                )}
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <p>Register: {currentScan.student?.registerNumber}</p>
                <p>Type: {currentScan.student?.userType}</p>
                {currentScan.student?.department && (
                  <p>Department: {currentScan.student.department}</p>
                )}
                <p>Meal: {currentScan.meal_type}</p>
              </div>

              <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
                currentScan.access_granted 
                  ? 'bg-green-100 text-green-800'
                  : currentScan.duplicate_scan
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {currentScan.access_granted && 'ACCESS GRANTED - Welcome!'}
                {currentScan.duplicate_scan && 'ALREADY SCANNED - Duplicate entry'}
                {!currentScan.access_granted && !currentScan.duplicate_scan && (
                  currentScan.error || 'ACCESS DENIED'
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Scans */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Scans</h3>
          <button
            onClick={fetchScanLogs}
            className="text-blue-600 hover:text-blue-800 p-1 rounded"
          >
            <Download size={16} />
          </button>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {scanLogs.slice(0, 10).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{log.studentName}</p>
                <p className="text-sm text-gray-600">{log.mealType}</p>
                <p className="text-xs text-gray-500">
                  {new Date(log.scannedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  log.scanResult === 'SUCCESS' 
                    ? 'bg-green-100 text-green-800'
                    : log.scanResult === 'DUPLICATE'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {log.scanResult}
                </span>
                {log.accessGranted ? (
                  <Check size={16} className="text-green-600" />
                ) : (
                  <X size={16} className="text-red-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="Manual Approval Required"
        size="md"
      >
        {pendingApproval && (
          <div className="space-y-6">
            <div className="text-center">
              {pendingApproval.student?.photoUrl ? (
                <img
                  src={pendingApproval.student.photoUrl}
                  alt={pendingApproval.student.name}
                  className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto">
                  <User size={32} className="text-gray-500" />
                </div>
              )}
              
              <h3 className="text-xl font-semibold text-gray-900 mt-4">
                {pendingApproval.student?.name}
              </h3>
              <p className="text-gray-600">{pendingApproval.student?.registerNumber}</p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={20} className="text-yellow-600" />
                <p className="text-yellow-800 font-medium">Outside Meal Time</p>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                {pendingApproval.message}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleManualApproval(false)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold"
              >
                Deny Access
              </button>
              <button
                onClick={() => handleManualApproval(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
              >
                Grant Access
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Scan Logs Modal */}
      <Modal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        title="Scanner Logs"
        size="xl"
      >
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scanLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.studentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.mealType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        log.scanResult === 'SUCCESS' 
                          ? 'bg-green-100 text-green-800'
                          : log.scanResult === 'DUPLICATE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.scanResult}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.scannedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.accessGranted ? (
                        <Check size={16} className="text-green-600" />
                      ) : (
                        <X size={16} className="text-red-600" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QRScannerModule;