import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all system configuration
router.get('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const config = await req.prisma.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });
    res.json(config);
  } catch (error) {
    console.error('Get system config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get config by key
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const config = await req.prisma.systemConfig.findUnique({
      where: { key: req.params.key }
    });
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Get config by key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update single config
router.put('/:key', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { value, category } = req.body;
    
    const config = await req.prisma.systemConfig.upsert({
      where: { key: req.params.key },
      update: { value, category },
      create: { 
        key: req.params.key, 
        value, 
        category: category || 'general' 
      }
    });
    
    res.json(config);
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update settings
router.post('/bulk-update', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { settings } = req.body;
    
    const updatePromises = settings.map((setting) => 
      req.prisma.systemConfig.upsert({
        where: { key: setting.key },
        update: { 
          value: setting.value, 
          category: setting.category 
        },
        create: { 
          key: setting.key, 
          value: setting.value, 
          category: setting.category 
        }
      })
    );
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Bulk update config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete config
router.delete('/:key', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    await req.prisma.systemConfig.delete({
      where: { key: req.params.key }
    });
    res.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Delete config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meal times configuration
router.get('/meal-times', async (req, res) => {
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

// Update meal times
router.post('/meal-times', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const mealTimes = req.body;
    
    const updatePromises = Object.entries(mealTimes).map(([key, value]) =>
      req.prisma.systemConfig.upsert({
        where: { key },
        update: { value: value  },
        create: { key, value: value , category: 'meal_times' }
      })
    );
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Meal times updated successfully' });
  } catch (error) {
    console.error('Update meal times error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meal attendance settings
router.get('/meal-attendance-settings', authenticateToken, async (req, res) => {
  try {
    const settings = await req.prisma.mealAttendanceSettings.findFirst();
    
    if (!settings) {
      // Return default settings
      return res.json({
        isMandatory: false,
        reminderStartTime: '15:00',
        reminderEndTime: '22:00',
        cutoffTime: '23:00'
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Get meal attendance settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update meal attendance settings
router.post('/meal-attendance-settings', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req, res) => {
  try {
    const { isMandatory, reminderStartTime, reminderEndTime, cutoffTime } = req.body;
    
    const settings = await req.prisma.mealAttendanceSettings.upsert({
      where: { id: 'default-settings' },
      update: {
        isMandatory,
        reminderStartTime,
        reminderEndTime,
        cutoffTime
      },
      create: {
        id: 'default-settings',
        isMandatory,
        reminderStartTime,
        reminderEndTime,
        cutoffTime
      }
    });
    
    res.json({ message: 'Meal attendance settings updated successfully', settings });
  } catch (error) {
    console.error('Update meal attendance settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment gateways
router.get('/payment-gateways', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req, res) => {
  try {
    const gateways = await req.prisma.paymentGateway.findMany({
      orderBy: { name: 'asc' }
    });

    res.json(gateways);
  } catch (error) {
    console.error('Get payment gateways error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/Update payment gateway
router.post('/payment-gateways', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req, res) => {
  try {
    const { id, ...gatewayData } = req.body;
    
    let gateway;
    if (id) {
      gateway = await req.prisma.paymentGateway.update({
        where: { id },
        data: gatewayData
      });
    } else {
      gateway = await req.prisma.paymentGateway.create({
        data: gatewayData
      });
    }

    res.json(gateway);
  } catch (error) {
    console.error('Save payment gateway error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete payment gateway
router.delete('/payment-gateways/:id', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req, res) => {
  try {
    await req.prisma.paymentGateway.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Payment gateway deleted successfully' });
  } catch (error) {
    console.error('Delete payment gateway error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;