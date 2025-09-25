import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  CreditCard, 
  AlertTriangle, 
  DollarSign,
  TrendingUp,
  Calendar,
  Package,
  Upload,
  Download,
  Building
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

interface FNBStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  monthlyRevenue: number;
}

const FNBDashboard: React.FC = () => {
  const [stats, setStats] = useState<FNBStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    expiringSubscriptions: 0,
    monthlyRevenue: 0
  });
  const [userTypeStats, setUserTypeStats] = useState([]);
  const [packageStats, setPackageStats] = useState([]);
  const [messwiseActiveCounts, setMesswiseActiveCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'students' | 'subscriptions'>('students');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/fnb-manager/dashboard');
      const { stats, userTypeStats, packageStats, messwiseActiveCounts } = response.data;
      setStats(stats);
      setUserTypeStats(userTypeStats);
      setPackageStats(packageStats);
      setMesswiseActiveCounts(messwiseActiveCounts || []);
    } catch (error) {
      console.error('Failed to fetch FNB dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'students' | 'subscriptions') => {
    const formData = new FormData();
    formData.append('csv', file);

    try {
      const endpoint = type === 'students' ? '/fnb-manager/upload-students' : '/fnb-manager/upload-subscriptions';
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message);
      setShowUploadModal(false);
      fetchDashboardData();
    } catch (error) {
      console.error(`Upload ${type} error:`, error);
    }
  };

  const handleExportSubscriptions = async () => {
    try {
      const response = await api.get('/fnb-manager/export-subscriptions');
      const csvContent = convertToCSV(response.data);
      downloadCSV(csvContent, 'subscriptions.csv');
      toast.success('Subscriptions exported successfully');
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      title: 'Total Subscriptions',
      value: stats.totalSubscriptions,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions,
      icon: CreditCard,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Expiring Soon',
      value: stats.expiringSubscriptions,
      icon: AlertTriangle,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const COLORS = ['#1c3c80', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
    
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} rounded-lg p-6 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

  {/* Messwise Active Subscriptions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Messwise Active Subscriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {messwiseActiveCounts.map((mess: any) => (
            <div key={mess.id} className="border rounded-lg p-4 flex flex-col items-start hover:shadow">
              <span className="text-blue-700 font-bold text-xl">{mess.activeCount}</span>
              <span className="text-gray-700 font-medium">{mess.name}</span>
              <span className="text-xs text-gray-400">Active Subscriptions</span>
            </div>
          ))}
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">User Distribution</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userTypeStats.map((stat: any, index) => ({
                    name: stat.userType,
                    value: stat._count,
                    fill: COLORS[index % COLORS.length]
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Package Popularity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center mb-4">
            <Package className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Package Popularity</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={packageStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="subscriptions" fill="#1c3c80" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/mess-facilities'}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Building className="h-8 w-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Manage Mess Facilities</h4>
            <p className="text-sm text-gray-500">Add and configure mess locations</p>
          </button>
          
          <button
            onClick={() => window.location.href = '/packages'}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Package className="h-8 w-8 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Manage Packages</h4>
            <p className="text-sm text-gray-500">Create and edit subscription packages</p>
          </button>
          
          <button
            onClick={() => window.location.href = '/subscriptions'}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <CreditCard className="h-8 w-8 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">View Subscriptions</h4>
            <p className="text-sm text-gray-500">Monitor all active subscriptions</p>
          </button>
          <button
            onClick={() => { setUploadType('students'); setShowUploadModal(true); }}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Upload className="h-8 w-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Upload Students</h4>
            <p className="text-sm text-gray-500">Bulk upload student data via CSV</p>
          </button>
          <button
            onClick={() => { setUploadType('subscriptions'); setShowUploadModal(true); }}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Upload className="h-8 w-8 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Upload Subscriptions</h4>
            <p className="text-sm text-gray-500">Bulk upload subscription data via CSV</p>
          </button>
        </div>
      </motion.div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={`Upload ${uploadType === 'students' ? 'Students' : 'Subscriptions'} CSV`}
        size="md"
      >
        <CSVUploadForm
          type={uploadType}
          onUpload={handleFileUpload}
          onCancel={() => setShowUploadModal(false)}
        />
      </Modal>
    </div>
  );
};

// CSV Upload Form Component
const CSVUploadForm: React.FC<{
  type: 'students' | 'subscriptions';
  onUpload: (file: File, type: 'students' | 'subscriptions') => void;
  onCancel: () => void;
}> = ({ type, onUpload, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (file) {
      onUpload(file, type);
    }
  };

  const sampleData = {
    students: [
      'register_number,name,mobile_number,email,room_number,user_type,employee_id,department',
      'CS2021001,John Doe,9876543210,john@college.edu,A-101,STUDENT,,Computer Science',
      'EMP001,Dr. Smith,9876543211,smith@college.edu,,EMPLOYEE,EMP001,Mathematics'
    ],
    subscriptions: [
      'register_number,package_id,mess_facility_id,start_date,end_date,status,amount_paid,razorpay_payment_id',
      'CS2021001,package-id-here,facility-id-here,2024-01-01,2024-01-31,ACTIVE,3500,pay_123456789'
    ]
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">CSV Format for {type}</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {sampleData[type].map((line, index) => (
            <div key={index} className={`font-mono text-xs ${index === 0 ? 'font-bold' : ''}`}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="space-y-2">
            <Upload className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-lg font-medium text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
            <button
              onClick={() => setFile(null)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-800 font-medium">
                  Choose a CSV file
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <span className="text-gray-500"> or drag and drop</span>
            </div>
            <p className="text-sm text-gray-500">CSV files only</p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!file}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Upload {type}
        </button>
      </div>
    </div>
  );
};

export default FNBDashboard;