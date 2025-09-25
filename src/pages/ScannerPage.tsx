import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import QrScanner from 'qr-scanner';
import api from '../utils/api';
import { showSuccess, showError } from '../utils/sweetAlert';

interface ScanResult {
  valid: boolean;
  type?: 'MESS_COUPON' | 'ORDER';
  message?: string;
  error?: string;
  student?: {
    name: string;
    registerNumber: string;
    photoUrl?: string;
  };
  order?: {
    orderNumber: string;
    studentName: string;
    registerNumber: string;
    totalAmount: number;
    mealType: string;
    items: { name: string; quantity: number }[];
  };
  mealType?: string;
}

const ScannerPage: React.FC = () => {
  const { user, logout } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanned, setScanned] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [stats, setStats] = useState<{ expectedToCome: number; served: number; mealType: string }>({
    expectedToCome: 0,
    served: 0,
    mealType: ''
  });
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState(0);

  useEffect(() => {
    let scanner: QrScanner | null = null;
    if (cameraActive && videoRef.current && !isProcessing) {
      scanner = new QrScanner(videoRef.current, async result => {
        const qrData = result.data || result;

        // Prevent duplicate scans
        if (isProcessing || scanCooldown > 0) return;
        if (lastScanned && lastScanned === qrData) return;

        setLastScanned(qrData);
        setScanned(qrData);
        await processScan(qrData);

        // Start cooldown (e.g., 10 sec)
        setScanCooldown(10);
      });
      scanner.start();
    }

    return () => {
      scanner?.stop();
    };
  }, [cameraActive, user, isProcessing]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isProcessing) {
        fetchScansAndStats();
      }
    }, 10000);
    fetchScansAndStats();

    return () => clearInterval(interval);
  }, [user]);

  // External scanner keyboard input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && scanned && !isProcessing) {
        processScan(scanned);
        setScanned('');
      } else if (e.key.length === 1 && !isProcessing) {
        setScanned(prev => prev + e.key);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [scanned, user, isProcessing]);

  async function processScan(qrCode: string) {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const response = await api.post(
        '/scanner/scan',
        { qrCode, deviceId: user?.id }
      );
      const data: ScanResult = response.data;
      setScanResult(data);
      
      if (data.valid) {
        showSuccess('Access Granted', data.message || 'Valid scan');
      } else {
        showError('Access Denied', data.error || 'Invalid QR code');
      }
      
      fetchScansAndStats();
    } catch (error) {
      setScanResult({ valid: false, error: 'Scan failed' });
      showError('Scan Error', 'Failed to process scan');
    } finally {
      setIsProcessing(false);
    }
  }

  async function fetchScansAndStats() {
    try {
      const response = await api.get('/scanner/recent-scans', { params: { limit: 25 } });
      setRecentScans(response.data.scans);
      setStats(response.data.stats);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (scanCooldown <= 0) return;

    const timer = setInterval(() => {
      setScanCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setLastScanned(null); // reset after cooldown
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [scanCooldown]);

  // Redirect non-scanner users
  if (user?.role !== 'SCANNER') {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Access Denied</h1>
          <p className="text-red-600 mb-4">This page is only accessible to scanner devices.</p>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Mess Scanner Dashboard</h1>
          <p className="text-gray-600">Device: {user?.name}</p>
        </div>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Left side: scanner and scan result */}
        <div className="flex flex-col lg:w-1/2 bg-white rounded-xl shadow-lg p-6">
          {/* Scanner Controls */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">QR Code Scanner</h2>
            <button
              onClick={() => setCameraActive(v => !v)}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                cameraActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {cameraActive ? '📹 Stop Camera' : '📷 Start Camera'}
            </button>
          </div>

          {/* Video Feed */}
          {cameraActive && (
            <div className="relative mb-4">
              <video 
                ref={videoRef} 
                className="w-full rounded-lg border-4 border-blue-200"
                style={{ maxHeight: '300px' }}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <div className="text-white text-lg font-semibold flex items-center">
                    <div className="animate-spin mr-3 h-6 w-6 border-4 border-white border-t-transparent rounded-full"></div>
                    Processing...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Manual/External Scanner Input
            </label>
            <input
              type="text"
              value={scanned}
              onChange={e => setScanned(e.target.value)}
              disabled={isProcessing}
              placeholder="Scan QR code with external scanner or type manually..."
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                isProcessing ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'
              }`}
            />
          </div>

          {/* Scan Result Display */}
          <div className="flex-1 p-6 border-2 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 min-h-[300px]">
            {isProcessing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin mx-auto mb-4 h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  <p className="text-gray-600 font-semibold">Processing scan...</p>
                </div>
              </div>
            ) : scanCooldown > 0 && !scanResult ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="bg-orange-200 rounded-full p-8 mx-auto mb-4 w-24 h-24 flex items-center justify-center">
                    <div className="text-3xl animate-pulse">⏱</div>
                  </div>
                  <p className="text-orange-700 font-semibold text-lg">Scanner Cooldown Active</p>
                  <p className="text-orange-600 text-sm mt-2">
                    Please wait {scanCooldown} seconds before next scan
                  </p>
                </div>
              </div>
            ) : scanResult ? (
              <div className="h-full">
                {scanResult.valid ? (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 h-full">
                    <div className="flex items-center mb-4">
                      <div className="bg-green-500 rounded-full p-2 mr-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-green-800 font-bold text-lg">
                        {scanResult.message || 'Valid QR Code Scanned'}
                      </h3>
                    </div>

                    {scanResult.type === 'MESS_COUPON' && scanResult.student && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-600 text-sm font-medium">Student Name</p>
                            <p className="text-gray-800 font-semibold text-lg">{scanResult.student.name}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-sm font-medium">Register Number</p>
                            <p className="text-gray-800 font-semibold">{scanResult.student.registerNumber}</p>
                          </div>
                        </div>
                        {scanResult.mealType && (
                          <div>
                            <p className="text-gray-600 text-sm font-medium">Meal Type</p>
                            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {scanResult.mealType}
                            </span>
                          </div>
                        )}
                        {scanResult.student.photoUrl && (
                          <div className="flex justify-center">
                            <img
                              src={scanResult.student.photoUrl}
                              alt={scanResult.student.name}
                              className="w-24 h-24 rounded-full border-4 border-green-200 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {scanResult.type === 'ORDER' && scanResult.order && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-600 text-sm font-medium">Order Number</p>
                            <p className="text-gray-800 font-mono text-sm">{scanResult.order.orderNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-sm font-medium">Total Amount</p>
                            <p className="text-green-700 font-bold text-xl">₹{scanResult.order.totalAmount}</p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-gray-600 text-sm font-medium">Student Details</p>
                          <p className="text-gray-800 font-semibold">{scanResult.order.studentName}</p>
                          <p className="text-gray-600 text-sm">({scanResult.order.registerNumber})</p>
                        </div>

                        <div>
                          <p className="text-gray-600 text-sm font-medium">Meal Type</p>
                          <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                            {scanResult.order.mealType}
                          </span>
                        </div>

                        <div>
                          <p className="text-gray-600 text-sm font-medium mb-2">Order Items</p>
                          <div className="bg-white rounded-lg p-3 space-y-2">
                            {scanResult.order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
                                <span className="text-gray-800">{item.name}</span>
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-semibold">
                                  x {item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 h-full">
                    <div className="flex items-center mb-4">
                      <div className="bg-red-500 rounded-full p-2 mr-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <h3 className="text-red-800 font-bold text-lg">
                        {scanResult.error || 'Invalid QR Code'}
                      </h3>
                    </div>
                    <p className="text-red-600">Please try scanning a valid QR code or contact administration.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="bg-gray-200 rounded-full p-8 mx-auto mb-4 w-24 h-24 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h4.01M12 12v4.01" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">Scan a QR code to see results here</p>
                  <p className="text-gray-400 text-sm mt-2">Use camera or external scanner</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: recent scans and stats */}
        <div className="flex flex-col lg:w-1/2 bg-white rounded-xl shadow-lg p-6">
          {/* Stats Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Today's Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-blue-600 text-sm font-medium">Meal Type</p>
                <p className="text-blue-800 font-bold text-lg">{stats?.mealType || 'N/A'}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <p className="text-orange-600 text-sm font-medium">Expected</p>
                <p className="text-orange-800 font-bold text-2xl">{stats?.expectedToCome}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-green-600 text-sm font-medium">Served</p>
                <p className="text-green-800 font-bold text-2xl">{stats?.served}</p>
              </div>
            </div>
          </div>

          {/* Recent Scans */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Scans</h3>
            <div className="space-y-3 overflow-auto max-h-96 pr-2">
              {recentScans?.map(scan => (
                <div
                  key={scan.id}
                  className={`p-4 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md ${
                    scan.accessGranted 
                      ? 'bg-green-50 border-l-green-500' 
                      : 'bg-red-50 border-l-red-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className={`font-semibold ${
                        scan.accessGranted ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {scan.studentName || 'Unknown'}
                      </p>
                      <p className={`text-sm ${
                        scan.accessGranted ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {scan.scanResult}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      scan.accessGranted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {scan.accessGranted ? '✓ Success' : '✗ Failed'}
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(scan.scannedAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {!recentScans?.length && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent scans available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;