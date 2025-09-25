import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/csv/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'), false);
    }
  }
});

// Upload CSV
router.post('/', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), upload.single('csv'), async (req, res) => {
  try {
    const { type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate upload type
    const validTypes = ['items', 'categories', 'recipes', 'students', 'dishes', 'vendors', 'units', 'storage_types', 'mealplans', 'subscriptions'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid upload type' });
    }

    // Create upload record
    const uploadRecord = await req.prisma.csvUpload.create({
      data: {
        uploadType: type,
        filename: file.originalname,
        uploadedBy: req.user.id,
        status: 'PROCESSING'
      }
    });

    // Process CSV file asynchronously
    processCSVFile(file.path, type, uploadRecord.id, req.prisma).catch(error => {
      console.error('CSV processing error:', error);
    });

    res.json({ 
      message: 'CSV upload started successfully',
      uploadId: uploadRecord.id 
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upload history
router.get('/', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  try {
    const uploads = await req.prisma.csvUpload.findMany({
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(uploads);
  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific upload details
router.get('/:id', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  try {
    const upload = await req.prisma.csvUpload.findUnique({
      where: { id: req.params.id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json(upload);
  } catch (error) {
    console.error('Get upload details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process CSV file asynchronously
async function processCSVFile(filePath, type, uploadId, prisma) {
  const results = [];
  const errors = [];
  let totalRows = 0;
  let successfulRows = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        totalRows++;
        results.push(data);
      })
      .on('end', async () => {
        try {
          // Process based on type
          switch (type) {
            case 'items':
              await processItemsCSV(results, errors, prisma);
              break;
            case 'categories':
              await processCategoriesCSV(results, errors, prisma);
              break;
            case 'recipes':
              await processRecipesCSV(results, errors, prisma);
              break;
            case 'students':
              await processStudentsCSV(results, errors, prisma);
              break;
            case 'dishes':
              await processDishesCSV(results, errors, prisma);
              break;
            case 'vendors':
              await processVendorsCSV(results, errors, prisma);
              break;
            case 'units':
              await processUnitsCSV(results, errors, prisma);
              break;
            case 'storage_types':
              await processStorageTypesCSV(results, errors, prisma);
              break;
            case 'mealplans':
              await processMealPlansCSV(results, errors, prisma);
              break;
            case 'subscriptions':
              await processSubscriptionsCSV(results, errors, prisma);
              break;
            default:
              throw new Error('Invalid upload type');
          }

          successfulRows = totalRows - errors.length;

          // Update upload record
          await prisma.csvUpload.update({
            where: { id: uploadId },
            data: {
              totalRows,
              successfulRows,
              failedRows: errors.length,
              errorLog: errors.length > 0 ? errors : null,
              status: 'COMPLETED'
            }
          });

          // Clean up file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          
          resolve({ totalRows, successfulRows, errors });
        } catch (error) {
          console.error('CSV processing error:', error);
          await prisma.csvUpload.update({
            where: { id: uploadId },
            data: {
              status: 'FAILED',
              errorLog: [{ error: error.message }]
            }
          });
          
          // Clean up file on error
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          
          reject(error);
        }
      })
      .on('error', async (error) => {
        console.error('CSV parsing error:', error);
        await prisma.csvUpload.update({
          where: { id: uploadId },
          data: {
            status: 'FAILED',
            errorLog: [{ error: error.message }]
          }
        });
        
        // Clean up file on error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        reject(error);
      });
  });
}

// Process items CSV
async function processItemsCSV(data, errors, prisma) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // Skip empty rows
      if (!row.name || !row.sku) {
        continue;
      }

      // Find or create category
      let category = await prisma.category.findUnique({
        where: { name: row.category_name }
      });

      if (!category) {
        category = await prisma.category.create({
          data: { name: row.category_name }
        });
      }

      // Find or create unit
      let unit = await prisma.unit.findUnique({
        where: { name: row.unit_name }
      });

      if (!unit) {
        unit = await prisma.unit.create({
          data: { 
            name: row.unit_name,
            symbol: row.unit_symbol || row.unit_name
          }
        });
      }

      // Find vendor if specified
      let vendorId = null;
      if (row.vendor_name) {
        const vendor = await prisma.vendor.findFirst({
          where: { name: row.vendor_name }
        });
        vendorId = vendor?.id;
      }

      // Find storage type if specified
      let storageTypeId = null;
      if (row.storage_type_name) {
        let storageType = await prisma.storageType.findUnique({
          where: { name: row.storage_type_name }
        });

        if (!storageType) {
          storageType = await prisma.storageType.create({
            data: { 
              name: row.storage_type_name,
              description: row.storage_type_description || null
            }
          });
        }
        storageTypeId = storageType.id;
      }

      // Create/update item
      await prisma.item.upsert({
        where: { sku: row.sku },
        update: {
          name: row.name,
          categoryId: category.id,
          unitId: unit.id,
          imageUrl: row.image_url || null,
          barcode: row.barcode || null,
          moq: parseInt(row.moq) || 0,
          reorderPoint: parseInt(row.reorder_point) || 0,
          vendorId: vendorId,
          storageTypeId: storageTypeId,
          perishable: row.perishable === 'true' || row.perishable === '1',
          costPerUnit: parseFloat(row.cost_per_unit) || 0,
          pointsValue: parseInt(row.points_value) || 0
        },
        create: {
          name: row.name,
          sku: row.sku,
          categoryId: category.id,
          unitId: unit.id,
          imageUrl: row.image_url || null,
          barcode: row.barcode || null,
          moq: parseInt(row.moq) || 0,
          reorderPoint: parseInt(row.reorder_point) || 0,
          vendorId: vendorId,
          storageTypeId: storageTypeId,
          perishable: row.perishable === 'true' || row.perishable === '1',
          costPerUnit: parseFloat(row.cost_per_unit) || 0,
          pointsValue: parseInt(row.points_value) || 0
        }
      });

    } catch (error) {
      console.error('Item processing error:', error);
      errors.push({ row: i + 1, error: error.message, data: row });
    }
  }
}

// Process categories CSV
async function processCategoriesCSV(data, errors, prisma) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (!row.name) continue;

      await prisma.category.upsert({
        where: { name: row.name },
        update: {},
        create: { name: row.name }
      });
    } catch (error) {
      errors.push({ row: i + 1, error: error.message, data: row });
    }
  }
}

// Process dishes CSV
async function processDishesCSV(data, errors, prisma) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (!row.name) continue;

      await prisma.dish.upsert({
        where: { name: row.name },
        update: {
          imageUrl: row.image_url || null,
          category: row.category || null,
          costPer5Students: row.cost_per_5_students || "0"
        },
        create: {
          name: row.name,
          imageUrl: row.image_url || null,
          category: row.category || null,
          costPer5Students: row.cost_per_5_students || "0"
        }
      });
    } catch (error) {
      errors.push({ row: i + 1, error: error.message, data: row });
    }
  }
}

// Process recipes CSV
async function processRecipesCSV(data, errors, prisma) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (!row.dish_name || !row.item_name || !row.qty_per_5_students) {
        continue;
      }

      // Find or create dish
      let dish = await prisma.dish.findFirst({
        where: { name: row.dish_name }
      });

      if (!dish) {
        dish = await prisma.dish.create({
          data: { name: row.dish_name }
        });
      }

      // Find item
      const item = await prisma.item.findFirst({
        where: { name: row.item_name }
      });

      if (!item) {
        throw new Error(`Item '${row.item_name}' not found`);
      }

      // Create recipe
      await prisma.recipe.upsert({
        where: {
          dishId_itemId: {
            dishId: dish.id,
            itemId: item.id
          }
        },
        update: {
          qtyPer5Students: row.qty_per_5_students.toString()
        },
        create: {
          dishId: dish.id,
          itemId: item.id,
          qtyPer5Students: row.qty_per_5_students.toString()
        }
      });
    } catch (error) {
      errors.push({ row: i + 1, error: error.message, data: row });
    }
  }
}

// Process students CSV
async function processStudentsCSV(data, errors, prisma) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (!row.register_number || !row.name) {
        continue;
      }

      // Find hostel if specified
      let hostelId = null;
      if (row.hostel_name) {
        const hostel = await prisma.hostel.findFirst({
          where: { name: row.hostel_name }
        });
        hostelId = hostel?.id;
      }

      const qrCode = `QR_${row.register_number}_${Math.random().toString(36).substr(2, 8)}`;
      
      await prisma.student.upsert({
        where: { registerNumber: row.register_number },
        update: {
          name: row.name,
          mobileNumber: row.mobile_number || null,
          email: row.email || null,
          roomNumber: row.room_number || null,
          userType: (row.user_type && ['STUDENT', 'EMPLOYEE'].includes(row.user_type)) ? row.user_type : 'STUDENT',
          employeeId: row.employee_id || null,
          department: row.department || null,
          photoUrl: row.photo_url || null,
          isHosteler: row.is_hosteler === 'true' || row.is_hosteler === '1',
          hostelId: hostelId,
          messName: row.mess_name || null,
          mobileLoginEnabled: row.mobile_login_enabled !== 'false'
        },
        create: {
          registerNumber: row.register_number,
          name: row.name,
          mobileNumber: row.mobile_number || null,
          email: row.email || null,
          roomNumber: row.room_number || null,
          qrCode,
          userType: (row.user_type && ['STUDENT', 'EMPLOYEE'].includes(row.user_type)) ? row.user_type : 'STUDENT',
          employeeId: row.employee_id || null,
          department: row.department || null,
          photoUrl: row.photo_url || null,
          isHosteler: row.is_hosteler === 'true' || row.is_hosteler === '1',
          hostelId: hostelId,
          messName: row.mess_name || null,
          mobileLoginEnabled: row.mobile_login_enabled !== 'false'
        }
      });
    } catch (error) {
      errors.push({ row: i + 1, error: error.message, data: row });
    }
  }
}

// Process vendors CSV
async function processVendorsCSV(data, errors, prisma) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (!row.name || !row.category_name || !row.gst_no || !row.phone || !row.email || !row.address) {
        continue;
      }

      // Find or create vendor category
      let vendorCategory = await prisma.vendorCategory.findUnique({
        where: { name: row.category_name }
      });

      if (!vendorCategory) {
        vendorCategory = await prisma.vendorCategory.create({
          data: { name: row.category_name }
        });
      }

      await prisma.vendor.create({
        data: {
          name: row.name,
          categoryId: vendorCategory.id,
          gstNo: row.gst_no,
          phone: row.phone,
          email: row.email,
          address: row.address
        }
      });

    } catch (error) {
      errors.push({ row: i + 1, error: error.message, data: row });
    }
  }
}

// Process units CSV
async function processUnitsCSV(data, errors, prisma) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (!row.name || !row.symbol) continue;

      await prisma.unit.upsert({
        where: { name: row.name },
        update: {
          symbol: row.symbol,
          active: row.active !== 'false'
        },
        create: {
          name: row.name,
          symbol: row.symbol,
          active: row.active !== 'false'
        }
      });
    } catch (error) {
      errors.push({ row: i + 1, error: error.message, data: row });
    }
  }
}

// Process storage types CSV
async function processStorageTypesCSV(data, errors, prisma) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (!row.name) continue;

      await prisma.storageType.upsert({
        where: { name: row.name },
        update: {
          description: row.description || null,
          active: row.active !== 'false'
        },
        create: {
          name: row.name,
          description: row.description || null,
          active: row.active !== 'false'
        }
      });
    } catch (error) {
      errors.push({ row: i + 1, error: error.message, data: row });
    }
  }
}

// Process meal plans CSV
async function processMealPlansCSV(data, errors, prisma) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // Required fields validation
      if (!row.mess_facility_name || row.day === undefined || !row.meal || !row.planned_students) {
        continue;
      }

      // Validate day (0-6 for Monday-Sunday)
      const day = parseInt(row.day);
      if (day < 0 || day > 6) {
        throw new Error(`Invalid day: ${row.day}. Must be 0-6 (0=Monday, 6=Sunday)`);
      }

      // Validate meal type
      const validMealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
      const mealType = row.meal.toUpperCase();
      if (!validMealTypes.includes(mealType)) {
        throw new Error(`Invalid meal type: ${row.meal}. Must be one of: ${validMealTypes.join(', ')}`);
      }

      // Find or create mess facility
      let messFacility = await prisma.messFacility.findFirst({
        where: { name: row.mess_facility_name }
      });

      if (!messFacility) {
        messFacility = await prisma.messFacility.create({
          data: { name: row.mess_facility_name }
        });
      }

      // Create or update meal plan
      const mealPlan = await prisma.mealPlan.upsert({
        where: {
          messFacilityId_day_meal: {
            messFacilityId: messFacility.id,
            day: day,
            meal: mealType
          }
        },
        update: {
          plannedStudents: parseInt(row.planned_students)
        },
        create: {
          messFacilityId: messFacility.id,
          day: day,
          meal: mealType,
          plannedStudents: parseInt(row.planned_students)
        }
      });

      // Process dishes if provided (comma-separated dish names)
      if (row.dishes) {
        const dishNames = row.dishes.split(',').map(name => name.trim()).filter(name => name);
        
        // Clear existing meal plan dishes
        await prisma.mealPlanDish.deleteMany({
          where: { mealPlanId: mealPlan.id }
        });

        // Add new dishes
        for (let j = 0; j < dishNames.length; j++) {
          const dishName = dishNames[j];
          
          // Find or create dish
          let dish = await prisma.dish.findFirst({
            where: { name: dishName }
          });

          if (!dish) {
            dish = await prisma.dish.create({
              data: { name: dishName }
            });
          }

          // Create meal plan dish
          await prisma.mealPlanDish.create({
            data: {
              mealPlanId: mealPlan.id,
              dishId: dish.id,
              sequenceOrder: j + 1,
              isMainDish: j === 0 // First dish is main dish
            }
          });
        }
      }

    } catch (error) {
      console.error('Meal plan processing error:', error);
      errors.push({ row: i + 1, error: error.message, data: row });
    }
  }
}

// Process subscriptions CSV
async function processSubscriptionsCSV(data, errors, prisma) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // Required fields validation
      if (!row.student_register_number || !row.package_name || !row.mess_facility_name || !row.start_date || !row.end_date || !row.amount_paid) {
        continue;
      }

      // Find student
      const student = await prisma.student.findUnique({
        where: { registerNumber: row.student_register_number }
      });

      if (!student) {
        throw new Error(`Student with register number '${row.student_register_number}' not found`);
      }

      // Find or create mess facility
      let messFacility = await prisma.messFacility.findFirst({
        where: { name: row.mess_facility_name }
      });

      if (!messFacility) {
        messFacility = await prisma.messFacility.create({
          data: { 
            name: row.mess_facility_name,
            location: row.mess_facility_location || null,
            capacity: parseInt(row.mess_facility_capacity) || 100
          }
        });
      }

      // Find or create package
      let package = await prisma.package.findFirst({
        where: { 
          name: row.package_name,
          messFacilityId: messFacility.id
        }
      });


      
      if (!package) {
        // Parse meals included
        let mealsIncluded = ['BREAKFAST', 'LUNCH', 'DINNER']; // Default
        if (row.meals_included) {
          const mealsList = row.meals_included.split(',').map(meal => meal.trim().toUpperCase());
          const validMeals = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
          mealsIncluded = mealsList.filter(meal => validMeals.includes(meal));
        }

        package = await prisma.package.create({
          data: {
            name: row.package_name,
            description: row.package_description || null,
            messFacilityId: messFacility.id,
            durationDays: parseInt(row.duration_days) || 30,
            price: parseFloat(row.package_price) || parseFloat(row.amount_paid),
            mealsIncluded: mealsIncluded
          }
        });
      }

      // Parse dates
      const startDate = new Date(row.start_date);
      const endDate = new Date(row.end_date);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(`Invalid date format. Use YYYY-MM-DD format`);
      }

      // Validate subscription status
      const validStatuses = ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'];
      const status = (row.status && validStatuses.includes(row.status.toUpperCase())) ? row.status.toUpperCase() : 'ACTIVE';

      // Create subscription
      await prisma.subscription.create({
        data: {
          studentId: student.id,
          packageId: package.id,
          messFacilityId: messFacility.id,
          startDate: startDate,
          endDate: endDate,
          status: status,
          amountPaid: parseFloat(row.amount_paid),
          razorpayOrderId: row.razorpay_order_id || null,
          razorpayPaymentId: row.razorpay_payment_id || null
        }
      });

    } catch (error) {
      console.error('Subscription processing error:', error);
      errors.push({ row: i + 1, error: error.message, data: row });
    }
  }
}

export default router;
