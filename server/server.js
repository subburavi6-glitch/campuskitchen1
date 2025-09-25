import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import itemRoutes from './routes/items.js';
import vendorRoutes from './routes/vendors.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import grnRoutes from './routes/grn.js';
import indentRoutes from './routes/indents.js';
import issueRoutes from './routes/issues.js';
import dishRoutes from './routes/dishes.js';
import mealPlanRoutes from './routes/mealPlans.js';
import alertRoutes from './routes/alerts.js';
import dashboardRoutes from './routes/dashboard.js';
import mobileRoutes from './routes/mobile.js';
import fnbManagerRoutes from './routes/fnbManager.js';
import razorpayRoutes from './routes/razorpay.js';
import notificationRoutes from './routes/notifications.js';
import scannerRoutes from './routes/scanner.js';
import csvUploadRoutes from './routes/csvUploads.js';
import reportsRoutes from './routes/reports.js';
import adminConfigRoutes from './routes/adminConfig.js';
import systemConfigRoutes from './routes/systemConfig.js';
import './services/notificationService.js'; // Start cron jobs

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// Make prisma available to all routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/indents', indentRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/fnb-manager', fnbManagerRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/csv-uploads', csvUploadRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin-config', adminConfigRoutes);
app.use('/api/system-config', systemConfigRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Food Service API is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});