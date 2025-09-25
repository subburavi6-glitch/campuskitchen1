import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = file.fieldname === 'photo' ? 'uploads/photos/' : 'uploads/csv/';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Get single mess facility by ID
router.get('/mess-facilities/:id', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const facility = await req.prisma.messFacility.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            packages: true,
            subscriptions: true
          }
        }
      }
    });
    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    res.json(facility);
  } catch (error) {
    console.error('Get mess facility by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Dashboard statistics
router.get('/dashboard', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const totalSubscriptions = await req.prisma.subscription.count();
    const activeSubscriptions = await req.prisma.subscription.count({
      where: { status: 'ACTIVE' }
    });
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const expiringSubscriptions = await req.prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        endDate: { lte: threeDaysFromNow }
      }
    });

    const currentMonth = new Date();
    currentMonth.setDate(1);
    
    const monthlyRevenue = await req.prisma.subscription.aggregate({
      where: {
        createdAt: { gte: currentMonth },
        status: { in: ['ACTIVE', 'EXPIRED'] }
      },
      _sum: { amountPaid: true }
    });

    // User type statistics
    const userTypeStats = await req.prisma.student.groupBy({
      by: ['userType'],
      _count: true
    });

    // Package statistics
    const packageStats = await req.prisma.package.findMany({
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    // Messwise active subscription counts
    const messwiseActiveCounts = await req.prisma.messFacility.findMany({
      select: {
        id: true,
        name: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    });
console.log(messwiseActiveCounts);
    res.json({
      stats: {
        totalSubscriptions,
        activeSubscriptions,
        expiringSubscriptions,
        monthlyRevenue: monthlyRevenue._sum.amountPaid || 0
      },
      userTypeStats,
      packageStats: packageStats.map(pkg => ({
        name: pkg.name,
        subscriptions: pkg._count.subscriptions
      })),
      messwiseActiveCounts: messwiseActiveCounts.map(mess => ({
        id: mess.id,
        name: mess.name,
        activeCount: mess.subscriptions.length
      }))
    });
  } catch (error) {
    console.error('FNB dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mess facilities
router.get('/mess-facilities', authenticateToken, requireRole(['FNB_MANAGER','ADMIN','CHEF']), async (req, res) => {
  try {
    const facilities = await req.prisma.messFacility.findMany({
      include: {
        _count: {
          select: {
            packages: true,
            subscriptions: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(facilities);
  } catch (error) {
    console.error('Get mess facilities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create mess facility
router.post('/mess-facilities', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const facility = await req.prisma.messFacility.create({
      data: req.body
    });

    res.status(201).json(facility);
  } catch (error) {
    console.error('Create mess facility error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update mess facility
router.put('/mess-facilities/:id', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const { imageFile, ...facilityData } = req.body;
    
    let updateData = facilityData;
    
    // Handle image upload if provided
    if (req.file) {
      updateData.imageUrl = `/uploads/facilities/${req.file.filename}`;
    }

    const facility = await req.prisma.messFacility.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(facility);
  } catch (error) {
    console.error('Update mess facility error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get packages
router.get('/packages', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const { messFacilityId } = req.query;
    
    const where = {};
    if (messFacilityId) where.messFacilityId = messFacilityId;

    const packages = await req.prisma.package.findMany({
      where,
      include: {
        messFacility: {
          select: { name: true, location: true }
        },
        _count: {
          select: { subscriptions: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(packages);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create package
router.post('/packages', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const pkg = await req.prisma.package.create({
      data: req.body,
      include: {
        messFacility: {
          select: { name: true }
        }
      }
    });

    res.status(201).json(pkg);
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get subscriptions
router.get('/subscriptions', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const { status, userType, messFacilityId } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (messFacilityId) where.messFacilityId = messFacilityId;

    const subscriptions = await req.prisma.subscription.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            registerNumber: true,
            userType: true,
            employeeId: true,
            department: true
          }
        },
        package: {
          select: { name: true, mealsIncluded: true }
        },
        messFacility: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter by user type if specified
    const filteredSubscriptions = userType 
      ? subscriptions.filter(sub => sub.student.userType === userType)
      : subscriptions;

    res.json(filteredSubscriptions);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Update subscription status
router.put('/subscriptions/:id', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const { status } = req.body;

    const subscription = await req.prisma.subscription.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        student: {
          select: { name: true, registerNumber: true }
        },
        package: {
          select: { name: true }
        }
      }
    });

    // Create notification for status change
    if (status === 'SUSPENDED' || status === 'CANCELLED') {
      await req.prisma.notification.create({
        data: {
          studentId: subscription.studentId,
          title: `Subscription ${status.toLowerCase()}`,
          message: `Your ${subscription.package.name} subscription has been ${status.toLowerCase()}.`,
          type: 'subscription'
        }
      });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Update subscription status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Get students for photo management
router.get('/students', authenticateToken, requireRole(['FNB_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const students = await req.prisma.student.findMany({
      select: {
        id: true,
        name: true,
        registerNumber: true,
        mobileNumber: true,
        email: true,
        roomNumber: true,
        photoUrl: true,
        userType: true,
        department: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload student photo
router.post('/upload-student-photo', authenticateToken, requireRole(['FNB_MANAGER', 'ADMIN']), upload.single('photo'), async (req, res) => {
  try {
    const { studentId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const photoUrl = `/uploads/photos/${file.filename}`;

    // Update student photo
    await req.prisma.student.update({
      where: { id: studentId },
      data: { photoUrl }
    });

    // Create photo record
    await req.prisma.studentPhoto.create({
      data: {
        studentId,
        photoUrl,
        uploadedBy: req.user.id,
        isPrimary: true
      }
    });

    res.json({ message: 'Photo uploaded successfully', photoUrl });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student photo
router.delete('/students/:id/photo', authenticateToken, requireRole(['FNB_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    await req.prisma.student.update({
      where: { id: req.params.id },
      data: { photoUrl: null }
    });

    await req.prisma.studentPhoto.deleteMany({
      where: { studentId: req.params.id }
    });

    res.json({ message: 'Photo removed successfully' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get menu items
router.get('/menu-items', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const { messFacilityId, mealType } = req.query;
    
    const where = {};
    if (messFacilityId) where.messFacilityId = messFacilityId;
    if (mealType) where.mealType = mealType;

    const menuItems = await req.prisma.menuItem.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json(menuItems);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create menu item
router.post('/menu-items', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const menuItem = await req.prisma.menuItem.create({
      data: req.body
    });

    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get orders
router.get('/orders', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const { status, mealType } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (mealType) where.mealType = mealType;
    where.paymentStatus = 'PAID'; // Only paid orders

    const orders = await req.prisma.order.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            registerNumber: true,
            userType: true,
            createdAt: true
          }
        },
        messFacility: {
          select: { name: true }
        },
         orderItems: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
router.put('/orders/:id', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const { status } = req.body;

    // For orders, set default status to PREPARED for pre-cooked food
    const updateData = { 
      status: status === 'CONFIRMED' ? 'PREPARED' : status,
      servedAt: status === 'SERVED' ? new Date() : undefined
    };

    const order = await req.prisma.order.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(order);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload students CSV
router.post('/upload-students', authenticateToken, requireRole(['FNB_MANAGER']), upload.single('csv'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let totalRows = 0;
    let successfulRows = 0;
    const errors = [];

    const results = [];
    
    fs.createReadStream(file.path)
      .pipe(csv())
      .on('data', (data) => {
        totalRows++;
        results.push(data);
      })
      .on('end', async () => {
        try {
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            try {
              const qrCode = `QR_${row.register_number}_${Math.random().toString(36).substr(2, 8)}`;
              
              await req.prisma.student.upsert({
                where: { registerNumber: row.register_number },
                update: {
                  name: row.name,
                  mobileNumber: row.mobile_number,
                  email: row.email,
                  roomNumber: row.room_number,
                  userType: row.user_type || 'STUDENT',
                  employeeId: row.employee_id,
                  department: row.department
                },
                create: {
                  registerNumber: row.register_number,
                  name: row.name,
                  mobileNumber: row.mobile_number,
                  email: row.email,
                  roomNumber: row.room_number,
                  qrCode,
                  userType: row.user_type || 'STUDENT',
                  employeeId: row.employee_id,
                  department: row.department
                }
              });
              successfulRows++;
            } catch (error) {
              errors.push({ row: i + 1, error: error.message });
            }
          }

          // Clean up file
          fs.unlinkSync(file.path);

          res.json({
            message: `Successfully uploaded ${successfulRows} of ${totalRows} students`,
            totalRows,
            successfulRows,
            errors
          });
        } catch (error) {
          res.status(500).json({ error: 'Processing failed' });
        }
      });
  } catch (error) {
    console.error('Upload students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload subscriptions CSV
router.post('/upload-subscriptions', authenticateToken, requireRole(['FNB_MANAGER']), upload.single('csv'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let totalRows = 0;
    let successfulRows = 0;
    const errors = [];

    const results = [];
    
    fs.createReadStream(file.path)
      .pipe(csv())
      .on('data', (data) => {
        totalRows++;
        results.push(data);
      })
      .on('end', async () => {
        try {
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            try {
              const student = await req.prisma.student.findUnique({
                where: { registerNumber: row.register_number }
              });

              if (!student) {
                throw new Error(`Student ${row.register_number} not found`);
              }

              await req.prisma.subscription.create({
                data: {
                  studentId: student.id,
                  packageId: row.package_id,
                  messFacilityId: row.mess_facility_id,
                  startDate: new Date(row.start_date),
                  endDate: new Date(row.end_date),
                  status: row.status || 'ACTIVE',
                  amountPaid: parseFloat(row.amount_paid),
                  razorpayPaymentId: row.razorpay_payment_id
                }
              });
              successfulRows++;
            } catch (error) {
              errors.push({ row: i + 1, error: error.message });
            }
          }

          // Clean up file
          fs.unlinkSync(file.path);

          res.json({
            message: `Successfully uploaded ${successfulRows} of ${totalRows} subscriptions`,
            totalRows,
            successfulRows,
            errors
          });
        } catch (error) {
          res.status(500).json({ error: 'Processing failed' });
        }
      });
  } catch (error) {
    console.error('Upload subscriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export subscriptions
router.get('/export-subscriptions', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const subscriptions = await req.prisma.subscription.findMany({
      include: {
        student: {
          select: {
            registerNumber: true,
            name: true,
            userType: true,
            department: true
          }
        },
        package: {
          select: { name: true }
        },
        messFacility: {
          select: { name: true }
        }
      }
    });

    const csvData = subscriptions.map(sub => ({
      register_number: sub.student.registerNumber,
      student_name: sub.student.name,
      user_type: sub.student.userType,
      department: sub.student.department,
      package_name: sub.package.name,
      mess_facility: sub.messFacility.name,
      start_date: sub.startDate,
      end_date: sub.endDate,
      status: sub.status,
      amount_paid: sub.amountPaid,
      created_at: sub.createdAt
    }));

    res.json(csvData);
  } catch (error) {
    console.error('Export subscriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// routes/fnb-manager.js - Update the transaction-reports endpoint

// Transaction reports - Include both subscriptions and orders
router.get('/transaction-reports', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Get subscription transactions
    const subscriptionTransactions = await req.prisma.subscriptionTransaction.findMany({
      where,
      include: {
        subscription: {
          include: {
            student: {
              select: { name: true, registerNumber: true, userType: true }
            },
            package: {
              select: { name: true }
            },
            messFacility: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get order transactions (paid orders)
    const orderTransactions = await req.prisma.order.findMany({
      where: {
        ...where,
        paymentStatus: 'PAID',
        razorpayPaymentId: { not: null }
      },
      include: {
        student: {
          select: { name: true, registerNumber: true, userType: true }
        },
        messFacility: {
          select: { name: true }
        },
        orderItems: {
          include: {
            menuItem: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Combine and format all transactions
    const allTransactions = [
      ...subscriptionTransactions.map(t => ({
        id: t.id,
        type: 'SUBSCRIPTION',
        student: t.subscription.student,
        amount: parseFloat(t.amount),
        status: t.status,
        razorpayOrderId: t.razorpayOrderId,
        razorpayPaymentId: t.razorpayPaymentId,
        createdAt: t.createdAt,
        description: t.subscription.package.name,
        messFacility: t.subscription.messFacility,
        mealType: null,
        orderItems: []
      })),
      ...orderTransactions.map(o => ({
        id: o.id,
        type: 'ORDER',
        student: o.student,
        amount: parseFloat(o.totalAmount),
        status: o.status === 'SERVED' ? 'SUCCESS' : (o.status === 'CANCELLED' ? 'FAILED' : 'PENDING'),
        razorpayOrderId: o.razorpayOrderId,
        razorpayPaymentId: o.razorpayPaymentId,
        createdAt: o.createdAt,
        description: `${o.mealType} Order`,
        messFacility: o.messFacility,
        mealType: o.mealType,
        orderItems: o.orderItems.map(item => item.menuItem.name).join(', ')
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100);

    // Calculate statistics
    const successfulTransactions = allTransactions.filter(t => t.status === 'SUCCESS');
    const failedTransactions = allTransactions.filter(t => t.status === 'FAILED');
    const pendingTransactions = allTransactions.filter(t => t.status === 'PENDING');

    const totalRevenue = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalTransactions = allTransactions.length;
    const averageTransactionValue = successfulTransactions.length > 0 ? totalRevenue / successfulTransactions.length : 0;

    // Revenue by type
    const subscriptionRevenue = successfulTransactions
      .filter(t => t.type === 'SUBSCRIPTION')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const orderRevenue = successfulTransactions
      .filter(t => t.type === 'ORDER')
      .reduce((sum, t) => sum + t.amount, 0);

    // Monthly data for charts
    const monthlyData = [];
    const months = {};
    
    successfulTransactions.forEach(t => {
      const monthKey = new Date(t.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, subscriptionRevenue: 0, orderRevenue: 0, totalRevenue: 0 };
      }
      
      if (t.type === 'SUBSCRIPTION') {
        months[monthKey].subscriptionRevenue += t.amount;
      } else {
        months[monthKey].orderRevenue += t.amount;
      }
      months[monthKey].totalRevenue += t.amount;
    });

    Object.keys(months).sort().forEach(key => {
      monthlyData.push(months[key]);
    });

    // Status data
    const statusData = [
      { status: 'SUCCESS', count: successfulTransactions.length },
      { status: 'FAILED', count: failedTransactions.length },
      { status: 'PENDING', count: pendingTransactions.length }
    ];

    // Transaction type distribution
    const typeData = [
      { type: 'Subscription', count: allTransactions.filter(t => t.type === 'SUBSCRIPTION').length, revenue: subscriptionRevenue },
      { type: 'Order', count: allTransactions.filter(t => t.type === 'ORDER').length, revenue: orderRevenue }
    ];

    // Package/Item revenue data
    const packageRevenue = {};
    const mealTypeRevenue = {};

    successfulTransactions.forEach(t => {
      if (t.type === 'SUBSCRIPTION') {
        packageRevenue[t.description] = (packageRevenue[t.description] || 0) + t.amount;
      } else {
        const mealType = t.mealType || 'Other';
        mealTypeRevenue[mealType] = (mealTypeRevenue[mealType] || 0) + t.amount;
      }
    });

    const packageData = Object.entries(packageRevenue).map(([name, revenue]) => ({
      name, revenue
    }));

    const mealTypeData = Object.entries(mealTypeRevenue).map(([name, revenue]) => ({
      name, revenue
    }));

    // Daily revenue trend
    const dailyRevenue = {};
    successfulTransactions.forEach(t => {
      const dateKey = new Date(t.createdAt).toISOString().split('T')[0];
      if (!dailyRevenue[dateKey]) {
        dailyRevenue[dateKey] = { date: dateKey, subscriptionRevenue: 0, orderRevenue: 0, totalRevenue: 0 };
      }
      
      if (t.type === 'SUBSCRIPTION') {
        dailyRevenue[dateKey].subscriptionRevenue += t.amount;
      } else {
        dailyRevenue[dateKey].orderRevenue += t.amount;
      }
      dailyRevenue[dateKey].totalRevenue += t.amount;
    });

    const dailyData = Object.values(dailyRevenue).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      stats: {
        totalRevenue,
        totalTransactions,
        successfulTransactions: successfulTransactions.length,
        failedTransactions: failedTransactions.length,
        averageTransactionValue,
        subscriptionRevenue,
        orderRevenue,
        subscriptionCount: allTransactions.filter(t => t.type === 'SUBSCRIPTION').length,
        orderCount: allTransactions.filter(t => t.type === 'ORDER').length
      },
      transactions: allTransactions,
      monthlyData,
      dailyData,
      statusData,
      typeData,
      packageData,
      mealTypeData
    });
  } catch (error) {
    console.error('Transaction reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export transactions - Include both types
router.get('/export-transactions', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Get subscription transactions
    const subscriptionTransactions = await req.prisma.subscriptionTransaction.findMany({
      where,
      include: {
        subscription: {
          include: {
            student: { select: { name: true, registerNumber: true, userType: true, department: true } },
            package: { select: { name: true } },
            messFacility: { select: { name: true } }
          }
        }
      }
    });

    // Get order transactions
    const orderTransactions = await req.prisma.order.findMany({
      where: {
        ...where,
        paymentStatus: 'PAID'
      },
      include: {
        student: { select: { name: true, registerNumber: true, userType: true, department: true } },
        messFacility: { select: { name: true } },
        orderItems: { include: { menuItem: { select: { name: true } } } }
      }
    });

    const csvData = [
      ...subscriptionTransactions.map(t => ({
        type: 'Subscription',
        date: t.createdAt.toISOString().split('T')[0],
        student_name: t.subscription.student.name,
        register_number: t.subscription.student.registerNumber,
        user_type: t.subscription.student.userType,
        department: t.subscription.student.department,
        mess_facility: t.subscription.messFacility.name,
        description: t.subscription.package.name,
        meal_type: '',
        items: '',
        amount: parseFloat(t.amount),
        status: t.status,
        razorpay_order_id: t.razorpayOrderId,
        razorpay_payment_id: t.razorpayPaymentId || '',
        created_at: t.createdAt
      })),
      ...orderTransactions.map(o => ({
        type: 'Order',
        date: o.createdAt.toISOString().split('T')[0],
        student_name: o.student.name,
        register_number: o.student.registerNumber,
        user_type: o.student.userType,
        department: o.student.department,
        mess_facility: o.messFacility.name,
        description: `${o.mealType} Order`,
        meal_type: o.mealType,
        items: o.orderItems.map(item => item.menuItem.name).join('; '),
        amount: parseFloat(o.totalAmount),
        status: o.status === 'SERVED' ? 'SUCCESS' : (o.status === 'CANCELLED' ? 'FAILED' : 'PENDING'),
        razorpay_order_id: o.razorpayOrderId || '',
        razorpay_payment_id: o.razorpayPaymentId || '',
        created_at: o.createdAt
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(csvData);
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update menu item
router.put('/menu-items/:id', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    let updateData = req.body;
    
    // Handle image upload if provided
    if (req.file) {
      updateData.imageUrl = `/uploads/menu-items/${req.file.filename}`;
    }

    const menuItem = await req.prisma.menuItem.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.status(200).json(menuItem);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update package
router.put('/packages/:id', authenticateToken, requireRole(['FNB_MANAGER']), async (req, res) => {
  try {
    const pkg = await req.prisma.package.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        messFacility: {
          select: { name: true }
        }
      }
    });

    res.json(pkg);
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student details
router.put('/students/:id', authenticateToken, requireRole(['FNB_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const student = await req.prisma.student.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(student);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;