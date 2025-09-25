import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticateToken1 } from '../middleware/auth.js';
import axios from 'axios';
   
    import fs from 'fs';
    import path from 'path';

const router = express.Router();
const SMS_CONFIG = {
  apiUrl: 'http://www.bulksmsapps.com/api/apismsv2.aspx',
  apiKey: '12cb909c-761f-4c2b-90df-702879c19472',
  sender: 'INTEMT'
};

// Function to send SMS
async function sendSMS(phoneNumber, message) {
  try {
    const params = new URLSearchParams({
      apikey: SMS_CONFIG.apiKey,
      sender: SMS_CONFIG.sender,
      number: phoneNumber,
      message: message
    });

    const response = await axios.get(`${SMS_CONFIG.apiUrl}?${params}`);
    
    // Log the response for debugging
    //console.log('SMS API Response:', response.data);
    
    return {
      success: true,
      response: response.data
    };
  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to format SMS message using your template
function formatOTPMessage(studentName, otp) {
  // Using your template: "Dear Customer, welcome to resorts {#var#}. your otp is{#var#} INTEMT"
  return `Dear Customer, welcome to resorts ${studentName}. your otp is ${otp} INTEMT`;
}
// Temporary OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP
// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { identifier } = req.body; // Can be register number or mobile number

    if (!identifier) {
      return res.status(400).json({ error: 'Register number or mobile number is required' });
    }

    // Check if student exists by register number or mobile number
    const student = await req.prisma.student.findUnique({
      where: {
        OR: [
          { registerNumber: identifier },
          { mobileNumber: identifier }
        ],
        mobileLoginEnabled: true
      }
    });

    // Only send OTP if student exists
    if (!student) {
      return res.status(404).json({ error: 'Student not found or mobile login disabled. Please contact administration.' });
    }

    // Check if student has a phone number
    if (!student.mobileNumber) {
      return res.status(400).json({ error: 'Phone number not found for student. Please contact administration.' });
    }

    const otp = generateOTP();
    
    // Store OTP with expiration (5 minutes)
    otpStore.set(student.registerNumber, {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
      attempts: 0
    });
console.log(student);
    // Send SMS with OTP
    const message = formatOTPMessage(student.name || 'Student', otp);
    const smsResult = await sendSMS(student.mobileNumber, message);
console.log(smsResult);
    if (!smsResult.success) {
      // If SMS fails, still log the OTP for development/fallback
      console.log(`SMS failed for ${registerNumber}. OTP: ${otp}`);
      return res.status(500).json({ 
        error: 'Failed to send OTP. Please try again or contact support.',
        debug: smsResult.error // Remove this in production
      });
    }

    console.log(`OTP sent via SMS to ${student.registerNumber}: ${otp}`);
    
    res.json({ 
      message: 'OTP sent successfully to your registered mobile number',
      // Don't send the actual OTP in response for security
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { registerNumber, otp } = req.body;

    if (!registerNumber || !otp) {
      return res.status(400).json({ error: 'Register number and OTP are required' });
    }

    const storedOtpData = otpStore.get(registerNumber);

    if (!storedOtpData) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (Date.now() > storedOtpData.expires) {
      otpStore.delete(registerNumber);
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (storedOtpData.attempts >= 3) {
      otpStore.delete(registerNumber);
      return res.status(400).json({ error: 'Too many attempts' });
    }

    if (storedOtpData.otp !== otp) {
      storedOtpData.attempts++;
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP verified, remove from store
    otpStore.delete(registerNumber);

    // Get student data
    const student = await req.prisma.student.findUnique({
      where: { registerNumber }
    });

    // Generate JWT token with longer expiration
    const token = jwt.sign(
      { studentId: student.id, registerNumber: student.registerNumber },
      process.env.JWT_SECRET,
      { expiresIn: '90d' } // 90 days for long-lasting token
    );

    res.json({
      token,
      user: {
        id: student.id,
        name: student.name,
        registerNumber: student.registerNumber,
        mobileNumber: student.mobileNumber
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Register push notification token
router.post('/register-push-token', authenticateToken1, async (req, res) => {
  try {
    const { token, platform } = req.body;

    await req.prisma.pushToken.upsert({
      where: {
        studentId_token: {
          studentId: req.user.studentId,
          token
        }
      },
      update: {
        platform,
        active: true
      },
      create: {
        studentId: req.user.studentId,
        token,
        platform: platform || 'expo',
        active: true
      }
    });

    res.json({ message: 'Push token registered successfully' });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student profile
router.get('/profile', authenticateToken1, async (req, res) => {
  try {
    const student = await req.prisma.student.findUnique({
      where: { id: req.user.studentId },
      include: {
        _count: {
          select: {
            attendances: true,
            ratings: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get weekly meal plan by student's active subscription
router.get('/meals/weekly/by-user', authenticateToken1, async (req, res) => {
  try {
  // Load meal times configuration
  const mealTimesConfig = await fetchMealTimes(req.prisma);
    // Get student's active subscription
    const subscription = await req.prisma.subscription.findFirst({
      where: {
        studentId: req.user.studentId,
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        messFacility: true,
        package: true
      }
    });

    if (!subscription) {
      return res.json([]);
    }

    // Get meal plans for the mess facility
    const mealPlans = await req.prisma.mealPlan.findMany({
      where: {
        messFacilityId: subscription.messFacilityId
      },
      include: {
        dishes: {
          include: {
            dish: true
          }
        }
      },
      orderBy: [
        { day: 'asc' },
        { meal: 'asc' }
      ]
    });

    // Get student's attendance records
    const attendances = await req.prisma.mealAttendance.findMany({
      where: {
        studentId: req.user.studentId,
        mealPlanId: {
          in: mealPlans.map(p => p.id)
        }
      }
    });

    // Get student's meal preferences (willAttend)
    const mealPreferences = await req.prisma.mealAttendance.findMany({
      where: {
        studentId: req.user.studentId,
        mealPlanId: {
          in: mealPlans.map(p => p.id)
        }
      }
    });

    const weeklyPlan = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let day = 0; day < 7; day++) {
      const dayPlans = mealPlans.filter(p => p.day === day);
      const date = new Date();
      date.setDate(date.getDate() - date.getDay() + 1 + day); // Monday = 0

      weeklyPlan.push({
        dayName: dayNames[day],
        date: date.toLocaleDateString(),
        meals: dayPlans
          .filter(plan => subscription.package.mealsIncluded.includes(plan.meal))
          .map(plan => {
            const attendance = attendances.find(a => a.mealPlanId === plan.id);
            const preference = mealPreferences.find(p => p.mealPlanId === plan.id);
            const dishNames = plan.dishes.map(d => d.dish.name).join(', ');
            return {
              id: plan.id,
              mealType: plan.meal,
              dishName: dishNames,
              time: getMealTime(plan.meal, mealTimesConfig),
              attended: attendance?.attended || false,
              willAttend: preference?.willAttend !== null ? preference?.willAttend : true
            };
          })
      });
    }

    res.json(weeklyPlan);
  } catch (error) {
    console.error('Get weekly meal plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set meal attendance preference
router.post('/meals/attendance', authenticateToken1, async (req, res) => {
  try {
    const { mealId, willAttend } = req.body;

    await req.prisma.mealAttendance.upsert({
      where: {
        studentId_mealPlanId: {
          studentId: req.user.studentId,
          mealPlanId: mealId
        }
      },
      update: {
        willAttend
      },
      create: {
        studentId: req.user.studentId,
        mealPlanId: mealId,
        willAttend: willAttend !== undefined ? willAttend : true, // Default to true
        attended: false
      }
    });

    res.json({ message: 'Attendance preference updated successfully' });
  } catch (error) {
    console.error('Set meal attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's meals
router.get('/meals/today', authenticateToken1, async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert to Monday = 0

    // Get student's active subscription
    const subscription = await req.prisma.subscription.findFirst({
      where: {
        studentId: req.user.studentId,
        status: 'ACTIVE',
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        package: true
      }
    });

    if (!subscription) {
      return res.json([]);
    }

    const mealPlans = await req.prisma.mealPlan.findMany({
      where: {
        messFacilityId: subscription.messFacilityId,
        day: dayOfWeek
      },
      include: {
        dishes: {
          include: {
            dish: true
          }
        }
      }
    });

    // Get attendance for this student today
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const attendances = await req.prisma.mealAttendance.findMany({
      where: {
        studentId: req.user.studentId,
        attendedAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    // Get ratings for this student today
    const ratings = await req.prisma.mealRating.findMany({
      where: {
        studentId: req.user.studentId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

  // Load meal times configuration
  const mealTimesConfig = await fetchMealTimes(req.prisma);

  const meals = mealPlans
      .filter(plan => subscription.package.mealsIncluded.includes(plan.meal))
      .map(plan => ({
        id: plan.id,
        mealType: plan.meal,
        dishName: plan.dishes.map(d => d.dish.name).join(', '),
    time: getMealTime(plan.meal, mealTimesConfig),
        attended: attendances.some(a => a.mealPlanId === plan.id),
        rated: ratings.some(r => r.mealPlanId === plan.id),
        rating: ratings.find(r => r.mealPlanId === plan.id)?.rating
      }));

    res.json(meals);
  } catch (error) {
    console.error('Get today meals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate meal
router.post('/meals/rate', authenticateToken1, async (req, res) => {
  try {
    const { mealId, rating, comment } = req.body;

    await req.prisma.mealRating.create({
      data: {
        studentId: req.user.studentId,
        mealPlanId: mealId,
        rating,
        comment
      }
    });

    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('Rate meal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student profile with photo
router.put('/profile', authenticateToken1, async (req, res) => {
  try {
    const { name, mobileNumber, email, roomNumber, photoUrl } = req.body;

    const updatedStudent = await req.prisma.student.update({
      where: { id: req.user.studentId },
      data: {
        name,
        mobileNumber,
        email,
        roomNumber,
        photoUrl
      }
    });

    res.json(updatedStudent);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile photo
router.post('/upload-photo', authenticateToken1, async (req, res) => {
  try {
    const { photoData } = req.body;
    
    // Save image to server
 
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'student-photos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filename = `student-${req.user.studentId}-${Date.now()}.jpg`;
    const filepath = path.join(uploadsDir, filename);
    
    // Convert base64 to buffer and save
    const buffer = Buffer.from(photoData, 'base64');
    fs.writeFileSync(filepath, buffer);
    
    const photoUrl = `/uploads/student-photos/${filename}`;
    
    await req.prisma.student.update({
      where: { id: req.user.studentId },
      data: { photoUrl }
    });

    res.json({ photoUrl, message: 'Photo uploaded successfully' });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mess facilities for ordering
router.get('/mess-facilities', authenticateToken1, async (req, res) => {
  try {
    const facilities = await req.prisma.messFacility.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        location: true,
        capacity: true,
        imageUrl: true
      }
    });

    res.json(facilities);
  } catch (error) {
    console.error('Get mess facilities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get menu items for ordering
router.get('/menu-items', authenticateToken1, async (req, res) => {
  try {
    const { facilityId, mealType } = req.query;

    const menuItems = await req.prisma.menuItem.findMany({
      where: {
        messFacilityId: facilityId,
        mealType: mealType,
        available: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(menuItems);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order
router.post('/orders', authenticateToken1, async (req, res) => {
  try {
    const { messFacilityId, mealType, items, totalAmount, specialInstructions } = req.body;

    // Generate order number
    const orderNumber = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const order = await req.prisma.order.create({
      data: {
        studentId: req.user.studentId,
        messFacilityId,
        orderNumber,
        mealType,
        totalAmount,
        specialInstructions,
        orderItems: {
          create: items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            specialInstructions: item.specialInstructions
          }))
        }
      },
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: { name: true, price: true }
            }
          }
        }
      }
    });
console.log(order);
    // Generate QR code for order
    const qrCode = `ORDER_${order.id}_${Date.now()}`;
    await req.prisma.OrderQRCode.create({
      data: {
        orderId: order.id,
        qrCodeData: qrCode,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    res.json({
      order,
      qrCode
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order history
router.get('/orders', authenticateToken1, async (req, res) => {
  try {
    const orders = await req.prisma.order.findMany({
      where: { studentId: req.user.studentId },
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: { name: true, price: true }
            }
          }
        },
        messFacility: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order details
router.get('/orders/:id', authenticateToken1, async (req, res) => {
  try {
    const order = await req.prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
       orderItems: true,
        messFacility: {
          select: { name: true }
        }
      }
    });

    if (!order || order.studentId !== req.user.studentId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate QR code with subscription check
router.get('/qr-code', authenticateToken1, async (req, res) => {
  try {
    const student = await req.prisma.student.findUnique({
      where: { id: req.user.studentId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check for active subscription
    const subscription = await req.prisma.subscription.findFirst({
      where: {
        studentId: student.id,
        status: 'ACTIVE'
      },
      include: {
        package: {
          select: { name: true, mealsIncluded: true, durationDays: true }
        },
        messFacility: {
          select: { name: true, location: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      return res.json({  qrCode: student.qrCode,status:'inactive',error: 'No active subscription found' });
    }else{
    

    res.json({
      qrCode: student.qrCode,
      status:'active',
      subscription: {
        id: subscription.id,
        package: subscription.package,
        messFacility: subscription.messFacility,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status
      }
    });
  }
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available packages for subscription
router.get('/packages', authenticateToken1, async (req, res) => {
  try {
    // Get student details to check hostel
    const student = await req.prisma.student.findUnique({
      where: { id: req.user.studentId },
      include: { hostel: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Only hostelers can access packages
    if (!student.isHosteler) {
      return res.json({
        packages: [],
        message: 'Package subscriptions are only available for hostel residents'
      });
    }

    // Get packages available for student's hostel
    const packages = await req.prisma.package.findMany({
      where: { active: true },
        active: true,
        hostels: {
          some: {
            hostelId: student.hostelId
          }
        }
        messFacility: {
          select: { name: true, location: true }
        },
        hostels: {
          include: {
            hostel: {
              select: { name: true, type: true }
            }
          }
        },
        _count: {
          select: { subscriptions: true }
        }
      },
      orderBy: { price: 'asc' }
    });

    res.json(packages);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student's current subscription
router.get('/subscription', authenticateToken1, async (req, res) => {
  try {
    const subscription = await req.prisma.subscription.findFirst({
      where: {
        studentId: req.user.studentId,
        status: 'ACTIVE'
      },
      include: {
        package: {
          select: { name: true, mealsIncluded: true, durationDays: true }
        },
        messFacility: {
          select: { name: true, location: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(subscription);
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get subscription history
router.get('/subscription-history', authenticateToken1, async (req, res) => {
  try {
    const subscriptions = await req.prisma.subscription.findMany({
      where: { studentId: req.user.studentId },
      include: {
        package: {
          select: { name: true, mealsIncluded: true }
        },
        messFacility: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(subscriptions);
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notifications with enhanced data
router.get('/notifications', authenticateToken1, async (req, res) => {
  try {
    const notifications = await req.prisma.notification.findMany({
      where: {
        OR: [
          { studentId: req.user.studentId },
          { studentId: null } // Global notifications
        ]
      },
      include: {
        // Include meal plan data for rating notifications
        mealPlan: {
          include: {
            dishes: {
              include: {
                dish: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread notification count
router.get('/notifications/unread-count', authenticateToken1, async (req, res) => {
  try {
    const count = await req.prisma.notification.count({
      where: {
        OR: [
          { studentId: req.user.studentId },
          { studentId: null }
        ],
        read: false
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken1, async (req, res) => {
  try {
    await req.prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meal times configuration
router.get('/meal-times', authenticateToken1, async (req, res) => {
  try {
    const mealTimes = await req.prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['breakfast_start', 'breakfast_end', 'lunch_start', 'lunch_end', 'snacks_start', 'snacks_end', 'dinner_start', 'dinner_end']
        }
      }
    });

    const defaultTimes = {
      breakfast_start: '07:30',
      breakfast_end: '09:30',
      lunch_start: '12:00',
      lunch_end: '14:00',
      snacks_start: '16:00',
      snacks_end: '17:30',
      dinner_start: '19:00',
      dinner_end: '21:00'
    };

    const result = {};
    Object.keys(defaultTimes).forEach(key => {
      const config = mealTimes.find(mt => mt.key === key);
      result[key] = config ? config.value : defaultTimes[key];
    });

    res.json(result);
  } catch (error) {
    console.error('Get meal times error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper to fetch meal times from DB with defaults
async function fetchMealTimes(prisma) {
  const keys = ['breakfast_start', 'breakfast_end', 'lunch_start', 'lunch_end', 'snacks_start', 'snacks_end', 'dinner_start', 'dinner_end'];
  const rows = await prisma.systemConfig.findMany({ where: { key: { in: keys } } });

  const defaults = {
    breakfast_start: '07:30',
    breakfast_end: '09:30',
    lunch_start: '12:00',
    lunch_end: '14:00',
    snacks_start: '16:00',
    snacks_end: '17:30',
    dinner_start: '19:00',
    dinner_end: '21:00'
  };

  const result = {};
  keys.forEach(k => {
    const found = rows.find(r => r.key === k);
    result[k] = found ? found.value : defaults[k];
  });

  return result;
}

// Helper function to get meal times string for a meal using config
function getMealTime(mealType, config) {
  // config expected to have HH:MM values (24h) for start/end keys
  if (!config) {
    // fallback to previous hard-coded strings
    switch (mealType) {
      case 'BREAKFAST':
        return '7:30 AM - 9:30 AM';
      case 'LUNCH':
        return '12:00 PM - 2:00 PM';
      case 'SNACKS':
        return '4:00 PM - 5:30 PM';
      case 'DINNER':
        return '7:00 PM - 9:00 PM';
      default:
        return '';
    }
  }

  const map = {
    BREAKFAST: ['breakfast_start', 'breakfast_end'],
    LUNCH: ['lunch_start', 'lunch_end'],
    SNACKS: ['snacks_start', 'snacks_end'],
    DINNER: ['dinner_start', 'dinner_end']
  };

  const keys = map[mealType];
  if (!keys) return '';

  const start = formatTo12Hour(config[keys[0]]);
  const end = formatTo12Hour(config[keys[1]]);
  return `${start} - ${end}`;
}

function formatTo12Hour(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return '';
  const [hh, mm] = hhmm.split(':').map(s => parseInt(s, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return hhmm;
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = ((hh + 11) % 12) + 1; // convert 0->12, 13->1
  return `${hour12}:${mm.toString().padStart(2, '0')} ${period}`;
}

// Set meal attendance preference with mandatory check
router.post('/meals/set-attendance', authenticateToken1, async (req, res) => {
  try {
    const { attendanceData } = req.body; // Array of { mealPlanId, willAttend }
    
    // Get attendance settings
    const settings = await req.prisma.mealAttendanceSettings.findFirst();
    const isMandatory = settings?.isMandatory || false;
    
    // Check if within allowed time window
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const cutoffTime = settings?.cutoffTime || '23:00';
    
    if (currentTime > cutoffTime) {
      return res.status(400).json({ 
        error: 'Meal attendance marking is closed for today. Please try again tomorrow.' 
      });
    }

    // Update attendance preferences
    for (const attendance of attendanceData) {
      await req.prisma.mealAttendance.upsert({
        where: {
          studentId_mealPlanId: {
            studentId: req.user.studentId,
            mealPlanId: attendance.mealPlanId
          }
        },
        update: {
          willAttend: attendance.willAttend,
          markedAt: new Date(),
          isMandatoryMarked: isMandatory
        },
        create: {
          studentId: req.user.studentId,
          mealPlanId: attendance.mealPlanId,
          willAttend: attendance.willAttend,
          markedAt: new Date(),
          isMandatoryMarked: isMandatory,
          attended: false
        }
      });
    }

    // Mark reminder as completed
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await req.prisma.mealAttendanceReminder.updateMany({
      where: {
        studentId: req.user.studentId,
        reminderDate: tomorrow.toISOString().split('T')[0]
      },
      data: { completed: true }
    });

    res.json({ message: 'Meal attendance preferences updated successfully' });
  } catch (error) {
    console.error('Set meal attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meal attendance settings
router.get('/attendance-settings', authenticateToken1, async (req, res) => {
  try {
    const settings = await req.prisma.mealAttendanceSettings.findFirst();
    
    if (!settings) {
      return res.json({
        isMandatory: false,
        reminderStartTime: '15:00',
        reminderEndTime: '22:00',
        cutoffTime: '23:00'
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Get attendance settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;