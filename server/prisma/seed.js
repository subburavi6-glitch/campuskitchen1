import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting enhanced database seed...');

  // Create system configuration
  console.log('Creating system configuration...');
  await Promise.all([
    // Existing configs
    prisma.systemConfig.upsert({
      where: { key: 'auto_po_enabled' },
      update: {},
      create: { key: 'auto_po_enabled', value: 'false', category: 'purchase' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'default_tax_rate' },
      update: {},
      create: { key: 'default_tax_rate', value: '18', category: 'finance' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'notification_type' },
      update: {},
      create: { key: 'notification_type', value: 'sweetalert', category: 'ui' }
    }),
    
    // NEW: Meal timing configurations
    prisma.systemConfig.upsert({
      where: { key: 'breakfast_start' },
      update: {},
      create: { key: 'breakfast_start', value: '07:30', category: 'meal_times' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'breakfast_end' },
      update: {},
      create: { key: 'breakfast_end', value: '09:30', category: 'meal_times' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'lunch_start' },
      update: {},
      create: { key: 'lunch_start', value: '12:00', category: 'meal_times' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'lunch_end' },
      update: {},
      create: { key: 'lunch_end', value: '14:00', category: 'meal_times' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'snacks_start' },
      update: {},
      create: { key: 'snacks_start', value: '16:00', category: 'meal_times' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'snacks_end' },
      update: {},
      create: { key: 'snacks_end', value: '17:30', category: 'meal_times' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'dinner_start' },
      update: {},
      create: { key: 'dinner_start', value: '19:00', category: 'meal_times' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'dinner_end' },
      update: {},
      create: { key: 'dinner_end', value: '21:00', category: 'meal_times' }
    }),

    // NEW: Order management configurations
    prisma.systemConfig.upsert({
      where: { key: 'default_order_status' },
      update: {},
      create: { key: 'default_order_status', value: 'PREPARED', category: 'orders' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'auto_mark_attendance' },
      update: {},
      create: { key: 'auto_mark_attendance', value: 'true', category: 'meals' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'order_expiry_hours' },
      update: {},
      create: { key: 'order_expiry_hours', value: '24', category: 'orders' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'rating_notification_delay' },
      update: {},
      create: { key: 'rating_notification_delay', value: '30', category: 'notifications' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'qr_code_expiry_hours' },
      update: {},
      create: { key: 'qr_code_expiry_hours', value: '24', category: 'orders' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'max_order_items' },
      update: {},
      create: { key: 'max_order_items', value: '10', category: 'orders' }
    }),
  ]);
  // Create units
  console.log('Creating units...');
  const units = await Promise.all([
    prisma.unit.upsert({
      where: { name: 'Kilogram' },
      update: {},
      create: { name: 'Kilogram', symbol: 'kg' }
    }),
    prisma.unit.upsert({
      where: { name: 'Gram' },
      update: {},
      create: { name: 'Gram', symbol: 'g' }
    }),
    prisma.unit.upsert({
      where: { name: 'Liter' },
      update: {},
      create: { name: 'Liter', symbol: 'l' }
    }),
    prisma.unit.upsert({
      where: { name: 'Milliliter' },
      update: {},
      create: { name: 'Milliliter', symbol: 'ml' }
    }),
    prisma.unit.upsert({
      where: { name: 'Pieces' },
      update: {},
      create: { name: 'Pieces', symbol: 'pcs' }
    }),
    prisma.unit.upsert({
      where: { name: 'Box' },
      update: {},
      create: { name: 'Box', symbol: 'box' }
    }),
    prisma.unit.upsert({
      where: { name: 'Packet' },
      update: {},
      create: { name: 'Packet', symbol: 'packet' }
    }),
  ]);

  // Create storage types
  console.log('Creating storage types...');
  const storageTypes = await Promise.all([
    prisma.storageType.upsert({
      where: { name: 'Dry Storage' },
      update: {},
      create: { name: 'Dry Storage', description: 'Room temperature, dry environment' }
    }),
    prisma.storageType.upsert({
      where: { name: 'Cool Storage' },
      update: {},
      create: { name: 'Cool Storage', description: 'Cool temperature, controlled humidity' }
    }),
    prisma.storageType.upsert({
      where: { name: 'Refrigerated' },
      update: {},
      create: { name: 'Refrigerated', description: '2-8°C temperature range' }
    }),
    prisma.storageType.upsert({
      where: { name: 'Frozen' },
      update: {},
      create: { name: 'Frozen', description: 'Below -18°C temperature' }
    }),
    prisma.storageType.upsert({
      where: { name: 'Cool & Dry' },
      update: {},
      create: { name: 'Cool & Dry', description: 'Cool temperature with low humidity' }
    }),
  ]);

  // Create vendor categories
  console.log('Creating vendor categories...');
  const vendorCategories = await Promise.all([
    prisma.vendorCategory.upsert({
      where: { name: 'Fresh Produce' },
      update: {},
      create: { name: 'Fresh Produce' }
    }),
    prisma.vendorCategory.upsert({
      where: { name: 'Grains & Pulses' },
      update: {},
      create: { name: 'Grains & Pulses' }
    }),
    prisma.vendorCategory.upsert({
      where: { name: 'Dairy Products' },
      update: {},
      create: { name: 'Dairy Products' }
    }),
    prisma.vendorCategory.upsert({
      where: { name: 'Spices & Condiments' },
      update: {},
      create: { name: 'Spices & Condiments' }
    }),
    prisma.vendorCategory.upsert({
      where: { name: 'Packaged Foods' },
      update: {},
      create: { name: 'Packaged Foods' }
    }),
  ]);

  // Create categories
  console.log('Creating categories...');
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Vegetables' },
      update: {},
      create: { name: 'Vegetables' }
    }),
    prisma.category.upsert({
      where: { name: 'Grains & Pulses' },
      update: {},
      create: { name: 'Grains & Pulses' }
    }),
    prisma.category.upsert({
      where: { name: 'Dairy' },
      update: {},
      create: { name: 'Dairy' }
    }),
    prisma.category.upsert({
      where: { name: 'Spices' },
      update: {},
      create: { name: 'Spices' }
    }),
    prisma.category.upsert({
      where: { name: 'Oil & Condiments' },
      update: {},
      create: { name: 'Oil & Condiments' }
    }),
  ]);

  // Create vendors with mandatory fields
  console.log('Creating vendors...');
  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655441001' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655441001',
        name: 'Fresh Produce Co.',
        categoryId: vendorCategories[0].id,
        phone: '9876543210',
        email: 'sales@freshproduce.com',
        address: 'Market Road, City Center',
        gstNo: 'GST001234567'
      }
    }),
    prisma.vendor.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655441002' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655441002',
        name: 'Grain Traders Ltd.',
        categoryId: vendorCategories[1].id,
        phone: '9876543211',
        email: 'orders@graintraders.com',
        address: 'Industrial Area, Sector 5',
        gstNo: 'GST001234568'
      }
    }),
    prisma.vendor.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655441003' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655441003',
        name: 'Dairy Fresh Suppliers',
        categoryId: vendorCategories[2].id,
        phone: '9876543212',
        email: 'orders@dairyfresh.com',
        address: 'Dairy Complex, Ring Road',
        gstNo: 'GST001234569'
      }
    }),
  ]);

  // Create users with enhanced roles
  console.log('Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const chefPassword = await bcrypt.hash('chef123', 10);
  const storePassword = await bcrypt.hash('store123', 10);
  const cookPassword = await bcrypt.hash('cook123', 10);
  const fnbPassword = await bcrypt.hash('fnb123', 10);
  const scannerPassword = await bcrypt.hash('scanner123', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@foodservice.com' },
      update: {},
      create: {
        name: 'System Administrator',
        email: 'admin@foodservice.com',
        phone: '9999999999',
        passwordHash: adminPassword,
        role: 'ADMIN'
      }
    }),
    prisma.user.upsert({
      where: { email: 'chef@foodservice.com' },
      update: {},
      create: {
        name: 'Head Chef',
        email: 'chef@foodservice.com',
        phone: '9999999998',
        passwordHash: chefPassword,
        role: 'CHEF'
      }
    }),
    prisma.user.upsert({
      where: { email: 'store@foodservice.com' },
      update: {},
      create: {
        name: 'Store Manager',
        email: 'store@foodservice.com',
        phone: '9999999997',
        passwordHash: storePassword,
        role: 'STORE'
      }
    }),
    prisma.user.upsert({
      where: { email: 'cook@foodservice.com' },
      update: {},
      create: {
        name: 'Kitchen Cook',
        email: 'cook@foodservice.com',
        phone: '9999999996',
        passwordHash: cookPassword,
        role: 'COOK'
      }
    }),
    prisma.user.upsert({
      where: { email: 'fnb@foodservice.com' },
      update: {},
      create: {
        name: 'FNB Manager',
        email: 'fnb@foodservice.com',
        phone: '9999999995',
        passwordHash: fnbPassword,
        role: 'FNB_MANAGER'
      }
    }),
  ]);

  // Create mess facilities
  console.log('Creating mess facilities...');
  const messFacilities = await Promise.all([
    prisma.messFacility.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440001' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Girls Hostel - Nursing',
        location: 'Campus Center, Ground Floor',
        capacity: 500,
        active: true
      }
    }),
    prisma.messFacility.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440002' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Boys Hostel - Nursing',
        location: 'Boys Hostel for nursing, First Floor',
        capacity: 200,
        active: true
      }
    }),
    prisma.messFacility.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440003' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Gowthami Hostel Mess',
        location: 'Gowthami Hostel Mess, First Floor',
        capacity: 200,
        active: true
      }
    }),
  ]);

  // Create scanner user for first mess facility
  const scannerUser = await prisma.user.upsert({
    where: { email: 'scanner@foodservice.com' },
    update: {},
    create: {
      name: 'QR Scanner Device',
      email: 'scanner@foodservice.com',
      phone: '9999999994',
      passwordHash: scannerPassword,
      role: 'SCANNER',
      messFacilityId: messFacilities[0].id
    }
  });

  // Create packages
  console.log('Creating packages...');
  const packages = await Promise.all([
    prisma.package.upsert({
      where: { id: '660e8400-e29b-41d4-a716-446655440001' },
      update: {},
      create: {
        id: '660e8400-e29b-41d4-a716-446655440001',
        name: 'Basic Monthly Plan',
        description: 'Lunch and Dinner for 30 days',
        messFacilityId: '550e8400-e29b-41d4-a716-446655440001',
        durationDays: 30,
        price: 2500.00,
        mealsIncluded: ['LUNCH', 'DINNER'],
        active: true
      }
    }),
    prisma.package.upsert({
      where: { id: '660e8400-e29b-41d4-a716-446655440002' },
      update: {},
      create: {
        id: '660e8400-e29b-41d4-a716-446655440002',
        name: 'Full Monthly Plan',
        description: 'All meals for 30 days',
        messFacilityId: '550e8400-e29b-41d4-a716-446655440001',
        durationDays: 30,
        price: 3500.00,
        mealsIncluded: ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'],
        active: true
      }
    }),
  ]);

  // Create items with enhanced structure
  console.log('Creating items...');
  const items = await Promise.all([
    prisma.item.upsert({
      where: { sku: 'VEG001' },
      update: {},
      create: {
        name: 'Onion',
        sku: 'VEG001',
        unitId: units[0].id, // kg
        categoryId: categories[0].id,
        vendorId: vendors[0].id,
        storageTypeId: storageTypes[4].id, // Cool & Dry
        moq: 50,
        reorderPoint: 50, // Same as MOQ
        perishable: true,
        costPerUnit: 25.00,
        pointsValue: 25
      }
    }),
    prisma.item.upsert({
      where: { sku: 'GRN001' },
      update: {},
      create: {
        name: 'Rice (Basmati)',
        sku: 'GRN001',
        unitId: units[0].id, // kg
        categoryId: categories[1].id,
        vendorId: vendors[1].id,
        storageTypeId: storageTypes[0].id, // Dry
        moq: 100,
        reorderPoint: 100, // Same as MOQ
        perishable: false,
        costPerUnit: 80.00,
        pointsValue: 80
      }
    }),
    prisma.item.upsert({
      where: { sku: 'VEG002' },
      update: {},
      create: {
        name: 'Tomato',
        sku: 'VEG002',
        unitId: units[0].id, // kg
        categoryId: categories[0].id,
        vendorId: vendors[0].id,
        storageTypeId: storageTypes[1].id, // Cool
        moq: 25,
        reorderPoint: 25, // Same as MOQ
        perishable: true,
        costPerUnit: 30.00,
        pointsValue: 30
      }
    }),
    prisma.item.upsert({
      where: { sku: 'SPC001' },
      update: {},
      create: {
        name: 'Turmeric Powder',
        sku: 'SPC001',
        unitId: units[0].id, // kg
        categoryId: categories[3].id,
        vendorId: vendors[0].id,
        storageTypeId: storageTypes[0].id, // Dry
        moq: 10,
        reorderPoint: 10, // Same as MOQ
        perishable: false,
        costPerUnit: 150.00,
        pointsValue: 150
      }
    }),
    prisma.item.upsert({
      where: { sku: 'DAI001' },
      update: {},
      create: {
        name: 'Milk (Full Cream)',
        sku: 'DAI001',
        unitId: units[2].id, // liter
        categoryId: categories[2].id,
        vendorId: vendors[2].id,
        storageTypeId: storageTypes[2].id, // Refrigerated
        moq: 50,
        reorderPoint: 50, // Same as MOQ
        perishable: true,
        costPerUnit: 55.00,
        pointsValue: 55
      }
    }),
  ]);

  // Create sample batches
  console.log('Creating item batches...');
  const batches = await Promise.all([
    prisma.itemBatch.upsert({
      where: {
        itemId_batchNo: {
          itemId: items[0].id,
          batchNo: 'ON001'
        }
      },
      update: {},
      create: {
        itemId: items[0].id,
        batchNo: 'ON001',
        qtyOnHand: 75,
        unitCost: 25,
        mfgDate: new Date('2024-01-10'),
        expDate: new Date('2024-01-25'),
        location: 'A1-01'
      }
    }),
    prisma.itemBatch.upsert({
      where: {
        itemId_batchNo: {
          itemId: items[1].id,
          batchNo: 'RC001'
        }
      },
      update: {},
      create: {
        itemId: items[1].id,
        batchNo: 'RC001',
        qtyOnHand: 200,
        unitCost: 80,
        mfgDate: new Date('2023-12-15'),
        expDate: new Date('2025-12-15'),
        location: 'B1-01'
      }
    }),
  ]);

  // Create dishes with 5-student base calculation
  console.log('Creating dishes...');
  const dishes = await Promise.all([
    prisma.dish.upsert({
      where: { id: 'dish001' },
      update: {},
      create: {
        id: 'dish001',
        name: 'Vegetable Curry',
        category: 'Main Course',
        costPer5Students: '45.50'
      }
    }),
    prisma.dish.upsert({
      where: { id: 'dish002' },
      update: {},
      create: {
        id: 'dish002',
        name: 'Rice',
        category: 'Staple',
        costPer5Students: '25.00'
      }
    }),
    prisma.dish.upsert({
      where: { id: 'dish003' },
      update: {},
      create: {
        id: 'dish003',
        name: 'Dal Tadka',
        category: 'Main Course',
        costPer5Students: '35.75'
      }
    }),
  ]);

  // Create recipes with 5-student base
  console.log('Creating recipes...');
  await Promise.all([
    prisma.recipe.upsert({
      where: {
        dishId_itemId: {
          dishId: dishes[0].id,
          itemId: items[0].id
        }
      },
      update: {},
      create: {
        dishId: dishes[0].id,
        itemId: items[0].id, // Onion
        qtyPer5Students: '0.25' // 250g for 5 students
      }
    }),
    prisma.recipe.upsert({
      where: {
        dishId_itemId: {
          dishId: dishes[0].id,
          itemId: items[2].id
        }
      },
      update: {},
      create: {
        dishId: dishes[0].id,
        itemId: items[2].id, // Tomato
        qtyPer5Students: '0.40' // 400g for 5 students
      }
    }),
    prisma.recipe.upsert({
      where: {
        dishId_itemId: {
          dishId: dishes[1].id,
          itemId: items[1].id
        }
      },
      update: {},
      create: {
        dishId: dishes[1].id,
        itemId: items[1].id, // Rice
        qtyPer5Students: '0.75' // 750g for 5 students
      }
    }),
  ]);

  // Create sample students
  console.log('Creating students...');
  const students = await Promise.all([
    prisma.student.upsert({
      where: { registerNumber: 'CS2021001' },
      update: {},
      create: {
        registerNumber: 'CS2021001',
        name: 'Rahul Kumar',
        mobileNumber: '9876543210',
        email: 'rahul.kumar@college.edu',
        roomNumber: 'A-101',
        userType: 'STUDENT',
        department: 'Computer Science',
        qrCode: `QR_CS2021001_${crypto.randomBytes(8).toString('hex')}`
      }
    }),
    prisma.student.upsert({
      where: { registerNumber: 'EMP001' },
      update: {},
      create: {
        registerNumber: 'EMP001',
        name: 'Dr. Rajesh Gupta',
        mobileNumber: '9876543213',
        email: 'rajesh.gupta@college.edu',
        userType: 'EMPLOYEE',
        employeeId: 'EMP001',
        department: 'Computer Science',
        qrCode: `QR_EMP001_${crypto.randomBytes(8).toString('hex')}`
      }
    }),
    prisma.student.upsert({
      where: { registerNumber: 'NS2021001' },
      update: {},
      create: {
        registerNumber: 'NS2021001',
        name: 'Priya Sharma',
        mobileNumber: '9876543214',
        email: 'priya.sharma@college.edu',
        roomNumber: 'B-205',
        userType: 'STUDENT',
        department: 'Nursing',
        qrCode: `QR_NS2021001_${crypto.randomBytes(8).toString('hex')}`
      }
    }),
  ]);

  // Create sample subscriptions
  console.log('Creating subscriptions...');
  const subscriptions = await Promise.all([
    prisma.subscription.upsert({
      where: { id: '880e8400-e29b-41d4-a716-446655440001' },
      update: {},
      create: {
        id: '880e8400-e29b-41d4-a716-446655440001',
        studentId: students[0].id,
        packageId: packages[1].id,
        messFacilityId: messFacilities[0].id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        amountPaid: 3500.00,
        razorpayPaymentId: 'pay_test123456789'
      }
    }),
    prisma.subscription.upsert({
      where: { id: '880e8400-e29b-41d4-a716-446655440002' },
      update: {},
      create: {
        id: '880e8400-e29b-41d4-a716-446655440002',
        studentId: students[1].id,
        packageId: packages[1].id,
        messFacilityId: messFacilities[0].id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        amountPaid: 3500.00,
        razorpayPaymentId: 'pay_test123456790'
      }
    }),
  ]);

  // Create sample menu items
  console.log('Creating menu items...');
  await Promise.all([
    // Breakfast items
    prisma.menuItem.upsert({
      where: { id: 'menu001' },
      update: {},
      create: {
        id: 'menu001',
        messFacilityId: messFacilities[0].id,
        name: 'Mysore Bajji with Chutney',
        description: 'Traditional South Indian breakfast with coconut chutney',
        mealType: 'BREAKFAST',
        price: 40.00,
        available: true,
        preparationTime: 15
      }
    }),
    prisma.menuItem.upsert({
      where: { id: 'menu002' },
      update: {},
      create: {
        id: 'menu002',
        messFacilityId: messFacilities[0].id,
        name: 'Idly with Sambar',
        description: 'Steamed rice cakes with lentil curry',
        mealType: 'BREAKFAST',
        price: 40.00,
        available: true,
        preparationTime: 10
      }
    }),
    // Lunch items
    prisma.menuItem.upsert({
      where: { id: 'menu003' },
      update: {},
      create: {
        id: 'menu003',
        messFacilityId: messFacilities[0].id,
        name: 'Rice with Sambar & Curry',
        description: 'Complete lunch with rice, sambar, vegetable curry, and yogurt',
        mealType: 'LUNCH',
        price: 90.00,
        available: true,
        preparationTime: 20
      }
    }),
  ]);

  // Create sample meal plans with mess facility
  console.log('Creating meal plans...');
  await Promise.all([
    prisma.mealPlan.upsert({
      where: {
        messFacilityId_day_meal: {
          messFacilityId: messFacilities[0].id,
          day: 0,
          meal: 'BREAKFAST'
        }
      },
      update: {},
      create: {
        day: 0,
        meal: 'BREAKFAST',
        dishId: dishes[0].id,
        plannedStudents: 150,
        messFacilityId: messFacilities[0].id
      }
    }),
    prisma.mealPlan.upsert({
      where: {
        messFacilityId_day_meal: {
          messFacilityId: messFacilities[0].id,
          day: 0,
          meal: 'LUNCH'
        }
      },
      update: {},
      create: {
        day: 0,
        meal: 'LUNCH',
        dishId: dishes[1].id,
        plannedStudents: 200,
        messFacilityId: messFacilities[0].id
      }
    }),
  ]);

  // Create sample purchase orders with text fields
  console.log('Creating purchase orders...');
  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      vendorId: vendors[0].id,
      poNo: 'PO000001',
      subtotal: '2500.00',
      tax: '450.00',
      total: '2950.00',
      notes: 'Sample purchase order for vegetables',
      createdBy: users[2].id, // Store manager
      items: {
        create: [
          {
            itemId: items[0].id,
            orderedQty: '50',
            unitCost: '25.00',
            taxRate: '18',
            pointsUsed: 1250
          },
          {
            itemId: items[2].id,
            orderedQty: '25',
            unitCost: '30.00',
            taxRate: '18',
            pointsUsed: 750
          }
        ]
      }
    }
  });

  // Create sample indents
  console.log('Creating indents...');
  const indent = await prisma.indent.create({
    data: {
      requestedBy: users[3].id, // Cook
      requestedForDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      meal: 'LUNCH',
      notes: 'Ingredients needed for tomorrow lunch',
      totalCost: '125.50',
      items: {
        create: [
          {
            itemId: items[0].id,
            requestedQty: '5',
            estimatedCost: '125.00'
          },
          {
            itemId: items[2].id,
            requestedQty: '3',
            estimatedCost: '90.00'
          }
        ]
      }
    }
  });

  console.log('✅ Enhanced database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });