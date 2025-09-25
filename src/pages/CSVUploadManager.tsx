import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

interface CSVUpload {
  id: string;
  uploadType: string;
  filename: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorLog?: any;
  createdAt: string;
  uploadedBy: { name: string };
}

const CSVUploadManager: React.FC = () => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<CSVUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<string>('');

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const response = await api.get('/csv-uploads');
      setUploads(response.data);
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: string) => {
    const formData = new FormData();
    formData.append('csv', file);
    formData.append('type', type);

    try {
      const response = await api.post('/csv-uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message);
      setShowUploadModal(false);
      fetchUploads();
    } catch (error) {
      console.error(`Upload ${type} error:`, error);
      toast.error(`Failed to upload ${type} CSV`);
    }
  };

  const downloadTemplate = (type: string) => {
    const templates = {
      items: [
        'name,sku,category_name,unit_name,unit_symbol,vendor_name,storage_type_name,storage_type_description,moq,reorder_point,perishable,cost_per_unit,points_value,barcode,image_url',
        'Rice Basmati,RICE001,Grains & Pulses,Kilogram,kg,Grain Traders Ltd.,Dry Storage,Storage for dry items,20,10,false,45.50,10,1234567890,',
        'Onion,VEG001,Vegetables,Kilogram,kg,Fresh Produce Ltd.,Cool Storage,Cool and dry storage,25,15,true,35.00,5,9876543210,'
      ],
      recipes: [
        'dish_name,item_name,qty_per_5_students',
        'IDLY(MEDIUM SIZE),URAD DAL,0.1562',
        'IDLY(MEDIUM SIZE),IDLY RAVVA,0.5625',
        'IDLY(MEDIUM SIZE),SALT,0.0187',
        'CHUTNEY,PEANUTS,0.02',
        'CHUTNEY,ROASTED CHANA DAL,0.2',
        'SAMBAR,TOOR DAL,0.0714',
        'SAMBAR,MASOOR DAL,0.0714'
      ],
      students: [
        'register_number,name,mobile_number,email,room_number,user_type,employee_id,department,photo_url',
        'CS2021001,John Doe,9876543210,john@college.edu,A-101,STUDENT,,Computer Science,',
        'EMP001,Dr. Smith,9876543211,smith@college.edu,,EMPLOYEE,EMP001,Mathematics,'
      ],
      dishes: [
        'name,image_url,category,cost_per_5_students',
        'IDLY(MEDIUM SIZE),,Breakfast,25.50',
        'CHUTNEY,,Breakfast,15.30',
        'SAMBAR,,Breakfast,35.75',
        'VEG BIRYANI,,Lunch,85.00'
      ],
      vendors: [
        'name,category_name,gst_no,phone,email,address',
        'ABC Traders,Food Suppliers,29ABCDE1234F1Z5,9876543210,abc@traders.com,123 Market Street',
        'Fresh Produce Ltd,Vegetable Suppliers,29XYZAB5678C2D1,9876543211,contact@freshproduce.com,456 Wholesale Market'
      ],
      units: [
        'name,symbol,active',
        'Kilogram,kg,true',
        'Liter,ltr,true',
        'Numbers,nos,true',
        'Pieces,pcs,true'
      ],
      storage_types: [
        'name,description,active',
        'Dry Storage,Storage for dry items,true',
        'Cool Storage,Cool and dry storage,true',
        'Frozen Storage,Frozen storage for perishables,true',
        'Room Temperature,Normal room temperature storage,true'
      ],
      mealplans: [
        'mess_facility_name,day,meal,planned_students,dishes',
        'Main Mess,1,BREAKFAST,50,"IDLY(MEDIUM SIZE),CHUTNEY,SAMBAR,TEA"',
        'Main Mess,1,LUNCH,45,"RICE,TOMATO PAPPU,ALOO THALIMPU,RASAM"',
        'Main Mess,1,DINNER,40,"RICE,MIX VEG CURRY,SAMBAR,CABBAGE 65"',
        'Main Mess,2,BREAKFAST,48,"WADA,CHUTNEY,SAMBAR,TEA"',
        'Main Mess,2,LUNCH,42,"RICE,CHICKEN CURRY,RASAM"',
        'Main Mess,2,DINNER,38,"RICE,VEG BIRYANI,RAITA"'
      ]
    };

    const csvContent = templates[type as keyof typeof templates]?.join('\n') || '';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uploadTypes = [
    { 
      key: 'items', 
      label: 'Items', 
      description: 'Upload inventory items with categories, units, and vendors',
      icon: '📦'
    },
    { 
      key: 'recipes', 
      label: 'Recipes', 
      description: 'Upload dish recipes with ingredients and quantities',
      icon: '🍳'
    },
    { 
      key: 'students', 
      label: 'Students', 
      description: 'Upload student and employee data with QR codes',
      icon: '👥'
    },
    { 
      key: 'dishes', 
      label: 'Dishes', 
      description: 'Upload menu dishes with categories and costs',
      icon: '🍛'
    },
    { 
      key: 'vendors', 
      label: 'Vendors', 
      description: 'Upload supplier and vendor information',
      icon: '🏪'
    },
    { 
      key: 'units', 
      label: 'Units', 
      description: 'Upload measurement units and symbols',
      icon: '⚖️'
    },
    { 
      key: 'storage_types', 
      label: 'Storage Types', 
      description: 'Upload storage type configurations',
      icon: '📋'
    },
    { 
      key: 'mealplans', 
      label: 'Meal Plans', 
      description: 'Upload weekly meal plans with dishes and student counts',
      icon: '📅'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'FAILED':
        return <XCircle size={20} className="text-red-600" />;
      case 'PROCESSING':
        return <Clock size={20} className="text-yellow-600" />;
      default:
        return <FileText size={20} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUploadTypeLabel = (type: string) => {
    const uploadType = uploadTypes.find(t => t.key === type);
    return uploadType ? uploadType.label : type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CSV Upload Manager</h1>
          <p className="text-gray-600">Bulk upload data using CSV files</p>
        </div>
      </div>

      {/* Upload Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {uploadTypes.map((type) => (
          <motion.div 
            key={type.key} 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-center">
              <div className="text-3xl mb-3">{type.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{type.label}</h3>
              <p className="text-sm text-gray-600 mb-4 h-12">{type.description}</p>
              
              <div className="space-y-2">
                <button
                  onClick={() => downloadTemplate(type.key)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-2 transition-colors"
                >
                  <Download size={16} />
                  <span>Download Template</span>
                </button>
                
                <button
                  onClick={() => {
                    setUploadType(type.key);
                    setShowUploadModal(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-2 transition-colors"
                >
                  <Upload size={16} />
                  <span>Upload CSV</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Upload History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Upload History</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filename
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Results
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {uploads.map((upload) => (
                <motion.tr 
                  key={upload.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(upload.status)}
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {getUploadTypeLabel(upload.uploadType)}
                        </span>
                        <div className="text-xs text-gray-500 capitalize">
                          {upload.uploadType}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{upload.filename}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(upload.status)}`}>
                      {upload.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-green-600 font-medium">
                          ✓ {upload.successfulRows}
                        </span>
                        {upload.failedRows > 0 && (
                          <span className="text-red-600 font-medium">
                            ✗ {upload.failedRows}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Total: {upload.totalRows} rows
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {upload.uploadedBy.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{new Date(upload.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs">
                      {new Date(upload.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {uploads.length === 0 && (
          <div className="text-center py-12">
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No uploads yet</h3>
            <p className="text-gray-500">Start by downloading a template and uploading your first CSV file</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={`Upload ${getUploadTypeLabel(uploadType)} CSV`}
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
  type: string;
  onUpload: (file: File, type: string) => void;
  onCancel: () => void;
}> = ({ type, onUpload, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const getTypeInstructions = (type: string) => {
    const instructions = {
      items: "Upload inventory items with categories, units, vendors, and storage information. Categories and units will be created automatically if they don't exist.",
      recipes: "Upload dish recipes with ingredients and quantities per 5 students. Dishes will be created automatically if they don't exist.",
      students: "Upload student and employee data. QR codes will be generated automatically for each student.",
      dishes: "Upload menu dishes with categories and cost information for meal planning.",
      vendors: "Upload supplier information with categories. Vendor categories will be created automatically if they don't exist.",
      units: "Upload measurement units with symbols for inventory management.",
      storage_types: "Upload storage type configurations for inventory organization.",
      mealplans: "Upload weekly meal plans with dishes and student counts. Mess facilities must exist, dishes will be created automatically if they don't exist."
    };
    return instructions[type as keyof typeof instructions] || "Upload your CSV data.";
  };

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
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        toast.error('Please upload a CSV file only');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast.error('Please select a CSV file only');
      }
    }
  };

  const handleSubmit = () => {
    if (file) {
      onUpload(file, type);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="text-blue-500 mt-1">ℹ️</div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Upload {type} CSV</h4>
            <p className="text-sm text-blue-800">{getTypeInstructions(type)}</p>
          </div>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          dragActive 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : file 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {file ? (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Remove file
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <Upload className={`h-12 w-12 mx-auto ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            <div>
              <label className="cursor-pointer group">
                <span className="text-blue-600 hover:text-blue-700 font-medium text-lg group-hover:underline">
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
            <p className="text-sm text-gray-500">CSV files only, max 10MB</p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!file}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Upload {type}
        </button>
      </div>
    </div>
  );
};

export default CSVUploadManager;
