import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Building,
  Utensils,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface MealData {
  mealPlan: {
    id: string;
    meal: string;
    dishes: Array<{
      dish: { name: string };
    }>;
  };
  totalMarked: number;
  willAttend: number;
  attended: number;
  attendancePercentage: string;
  dishes: string;
}

interface FacilityReport {
  messFacility: {
    id: string;
    name: string;
    location: string;
    capacity: number;
  };
  meals: {
    BREAKFAST?: MealData;
    LUNCH?: MealData;
    SNACKS?: MealData;
    DINNER?: MealData;
  };
}

interface AttendanceReport {
  date: string;
  dayOfWeek: string;
  facilities: FacilityReport[];
}

const mealColors = {
  BREAKFAST: 'bg-orange-100 text-orange-800 border-orange-200',
  LUNCH: 'bg-green-100 text-green-800 border-green-200',
  SNACKS: 'bg-purple-100 text-purple-800 border-purple-200',
  DINNER: 'bg-blue-100 text-blue-800 border-blue-200',
};

const MealAttendanceReport: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAttendanceReport();
  }, [selectedDate]);

  const fetchAttendanceReport = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fnb-manager/meal-attendance-report', {
        params: { date: selectedDate }
      });
      setReport(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance report:', error);
      toast.error('Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      // Create CSV data from report
      const csvData = [];
      
      if (report) {
        report.facilities.forEach(facility => {
          Object.entries(facility.meals).forEach(([mealType, mealData]) => {
            if (mealData) {
              csvData.push({
                date: report.date,
                messFacility: facility.messFacility.name,
                mealType,
                dishes: mealData.dishes,
                totalMarked: mealData.totalMarked,
                willAttend: mealData.willAttend,
                attended: mealData.attended,
                attendancePercentage: mealData.attendancePercentage
              });
            }
          });
        });
      }

      const csvContent = convertToCSV(csvData);
      downloadCSV(csvContent, `meal-attendance-report-${selectedDate}.csv`);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(','));
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

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'BREAKFAST': return '🌅';
      case 'LUNCH': return '🌞';
      case 'SNACKS': return '☕';
      case 'DINNER': return '🌙';
      default: return '🍽️';
    }
  };

  const canView = ['FNB_MANAGER', 'CHEF', 'ADMIN', 'SUPERADMIN'].includes(user?.role || '');

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view meal attendance reports.</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Meal Attendance Report</h1>
          <p className="text-gray-600">Track student meal attendance preferences and actual attendance</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchAttendanceReport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportReport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <label className="block text-sm font-medium text-gray-700">Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {report && (
            <div className="text-sm text-gray-600">
              {report.dayOfWeek} - {new Date(report.date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      {report && (
        <div className="space-y-6">
          {report.facilities.map((facility, index) => (
            <motion.div
              key={facility.messFacility.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <div className="bg-gray-50 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building size={24} className="text-blue-600" />
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{facility.messFacility.name}</h3>
                      <p className="text-gray-600 text-sm">{facility.messFacility.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Capacity</div>
                    <div className="text-lg font-semibold text-blue-600">{facility.messFacility.capacity}</div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(facility.meals).map(([mealType, mealData]) => (
                    <div key={mealType} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{getMealIcon(mealType)}</span>
                          <div>
                            <h4 className={`font-semibold px-2 py-1 rounded-full text-sm ${mealColors[mealType as keyof typeof mealColors]}`}>
                              {mealType}
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          <strong>Dishes:</strong> {mealData.dishes}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-white p-2 rounded border">
                            <div className="text-gray-500 text-xs">Marked</div>
                            <div className="font-semibold text-blue-600">
                              {mealData.totalMarked}
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <div className="text-gray-500 text-xs">Will Attend</div>
                            <div className="font-semibold text-green-600">
                              {mealData.willAttend}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded border">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Attended</span>
                            <span className="font-semibold text-purple-600">
                              {mealData.attended}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm mt-1">
                            <span className="text-gray-500">Attendance %</span>
                            <span className="font-semibold text-gray-900">
                              {mealData.attendancePercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(parseFloat(mealData.attendancePercentage), 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Facility Summary */}
                <div className="mt-6 pt-4 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {Object.values(facility.meals).reduce((sum, meal) => sum + (meal?.totalMarked || 0), 0)}
                      </div>
                      <div className="text-sm text-gray-500">Total Marked</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {Object.values(facility.meals).reduce((sum, meal) => sum + (meal?.willAttend || 0), 0)}
                      </div>
                      <div className="text-sm text-gray-500">Will Attend</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {Object.values(facility.meals).reduce((sum, meal) => sum + (meal?.attended || 0), 0)}
                      </div>
                      <div className="text-sm text-gray-500">Actually Attended</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {Object.values(facility.meals).length > 0 ? (
                          Object.values(facility.meals).reduce((sum, meal) => sum + parseFloat(meal?.attendancePercentage || '0'), 0) / Object.values(facility.meals).length
                        ).toFixed(1) : 0}%
                      </div>
                      <div className="text-sm text-gray-500">Avg Attendance</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {report.facilities.length === 0 && (
            <div className="text-center py-12">
              <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
              <p className="text-gray-500">No meal plans found for the selected date.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MealAttendanceReport;