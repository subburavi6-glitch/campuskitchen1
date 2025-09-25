import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { authenticateToken1 } from '../middleware/auth.js';
import { sendPushNotification } from '../services/notificationService.js';

const router = express.Router();

// Get active payment gateway
const getActivePaymentGateway = async (prisma) => {
  const gateway = await prisma.paymentGateway.findFirst({
    where: { 
      active: true,
      type: 'RAZORPAY'
    }
  });
  
  if (!gateway) {
    throw new Error('No active payment gateway configured');
  }
  
  return new Razorpay({
    key_id: gateway.keyId,
    key_secret: gateway.keySecret,
  });
};

// Create Razorpay order for subscription
router.post('/create-order', authenticateToken1, async (req, res) => {
  try {
    const { packageId, messFacilityId } = req.body;

    // Check if student is hosteler
    const student = await req.prisma.student.findUnique({
      where: { id: req.user.studentId },
      include: { hostel: true }
    });

    if (!student || !student.isHosteler) {
      return res.status(403).json({ 
        error: 'Package subscriptions are only available for hostel residents' 
      });
    }

    // Fetch package
    const pkg = await req.prisma.package.findUnique({
      where: { id: packageId },
      include: {
        messFacility: { select: { name: true } },
        hostels: {
          include: {
            hostel: { select: { name: true } }
          }
        }
      },
    });

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Check if package is available for student's hostel
    const isPackageAvailable = pkg.hostels.some(ph => ph.hostelId === student.hostelId);
    if (!isPackageAvailable) {
      return res.status(403).json({ 
        error: 'This package is not available for your hostel' 
      });
    }

    // Get active payment gateway
    const razorpay = await getActivePaymentGateway(req.prisma);

    const receipt = `R_${Math.random().toString(36).substring(2, 15)}`;

    // Create subscription (pending payment)
    const subscription = await req.prisma.subscription.create({
      data: {
        studentId: req.user.studentId,
        packageId,
        messFacilityId,
        startDate: new Date(),
        endDate: new Date(Date.now() + pkg.durationDays * 24 * 60 * 60 * 1000),
        status: 'SUSPENDED',
        amountPaid: pkg.price,
      },
    });

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(Number(pkg.price) * 100), // INR to paise
      currency: 'INR',
      receipt: receipt,
      notes: {
        packageName: pkg.name,
        messFacility: pkg.messFacility.name,
        studentId: req.user.studentId,
      },
    });

    // Save orderId in subscription
    await req.prisma.subscription.update({
      where: { id: subscription.id },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      subscriptionId: subscription.id,
      packageName: pkg.name,
      messFacilityName: pkg.messFacility.name,
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create Razorpay order for individual food order
router.post('/create-food-order', authenticateToken1, async (req, res) => {
  try {
    const { orderId } = req.body;

    // Get active payment gateway
    const razorpay = await getActivePaymentGateway(req.prisma);

    // Get order details
    const order = await req.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        student: true,
        messFacility: true,
        orderItems: true,
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const receipt = `ORDER_${order.orderNumber}`;

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(Number(order.totalAmount) * 100), // INR to paise
      currency: 'INR',
      receipt: receipt,
      notes: {
        orderNumber: order.orderNumber,
        messFacility: order.messFacility.name,
        studentId: order.studentId,
      },
    });
console.log(razorpayOrder,order);
    // Update order with Razorpay order ID
    await req.prisma.order.update({
      where: { id: orderId },
      data: { razorpayOrderId: razorpayOrder.id }
    });

    res.json({
      payorderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderNumber: order.orderNumber,
      messFacilityName: order.messFacility.name,
    });
  } catch (error) {
    console.error('Create food order error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Verify payment for subscription
router.post('/verify-payment', authenticateToken1, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, subscriptionId } = req.body;

    // Get active payment gateway for signature verification
    const gateway = await req.prisma.paymentGateway.findFirst({
      where: { active: true, type: 'RAZORPAY' }
    });

    if (!gateway) {
      return res.status(500).json({ error: 'Payment gateway not configured' });
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;

    // Generate signature with Razorpay secret
    const expectedSignature = crypto
      .createHmac('sha256', gateway.keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update subscription
    const subscription = await req.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        razorpayPaymentId,
        status: 'ACTIVE',
      },
      include: {
        package: { select: { name: true } },
        messFacility: { select: { name: true } },
      },
    });

    // Record transaction
    await req.prisma.subscriptionTransaction.create({
      data: {
        subscriptionId,
        razorpayOrderId,
        razorpayPaymentId,
        amount: subscription.amountPaid,
        status: 'SUCCESS',
      },
    });

    // Send notification
    await req.prisma.notification.create({
      data: {
        studentId: subscription.studentId,
        title: 'Subscription Activated',
        message: `Your ${subscription.package.name} subscription for ${subscription.messFacility.name} is now active!`,
        type: 'subscription',
      },
    });

     await sendPushNotification(
      subscription.studentId,
      'Subscription Activated',
      `Your ${subscription.package.name} subscription for ${subscription.messFacility.name} is now active!`
     );

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Verify payment for food order
router.post('/verify-food-payment', authenticateToken1, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    // Get active payment gateway for signature verification
    const gateway = await req.prisma.paymentGateway.findFirst({
      where: { active: true, type: 'RAZORPAY' }
    });

    if (!gateway) {
      return res.status(500).json({ error: 'Payment gateway not configured' });
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;

    // Generate signature with Razorpay secret
    const expectedSignature = crypto
      .createHmac('sha256', gateway.keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }
console.log('Payment verified for orderId:', orderId);
    // Update order
    const order = await req.prisma.order.update({
      where: { id: orderId },
      data: {
        razorpayPaymentId,
        paymentStatus: 'PAID',
        status: 'CONFIRMED'
      },
      include: {
         orderItems: true,
      }
    });

    // Generate QR code for order collection
    const qrCode = `ORDER_${order.id}_${Date.now()}`;
    await req.prisma.OrderQRCode.create({
      data: {
        orderId: order.id,
        qrCodeData: qrCode,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Send notification
    await req.prisma.notification.create({
      data: {
        studentId: order.studentId,
        title: 'Order Confirmed',
        message: `Your order #${order.orderNumber} has been confirmed and is being prepared.`,
        type: 'order',
      },
    });

      await sendPushNotification(
        order.studentId,
        'Order Confirmed',
        `Your order #${order.orderNumber} has been confirmed and is being prepared.`
      );
    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        qrCode: qrCode
      },
    });
  } catch (error) {
    console.error('Verify food payment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}); 

// Razorpay webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    // Get active payment gateway for webhook verification
    const gateway = await req.prisma.paymentGateway.findFirst({
      where: { active: true, type: 'RAZORPAY' }
    });

    if (!gateway || !gateway.webhookSecret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', gateway.webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(body.toString());

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity, req.prisma);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity, req.prisma);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper functions
async function handlePaymentCaptured(payment, prisma) {
  try {
    // Check if it's a subscription payment
    const subscription = await prisma.subscription.findFirst({
      where: { razorpayOrderId: payment.order_id }
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE', razorpayPaymentId: payment.id }
      });

      await prisma.subscriptionTransaction.updateMany({
        where: { razorpayOrderId: payment.order_id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId: payment.id,
          webhookData: payment
        }
      });

      console.log('Subscription payment captured:', subscription.id);
      return;
    }

    // Check if it's an order payment
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: payment.order_id }
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          razorpayPaymentId: payment.id 
        }
      });

      console.log('Order payment captured:', order.id);
    }
  } catch (error) {
    console.error('Handle payment captured error:', error);
  }
}

async function handlePaymentFailed(payment, prisma) {
  try {
    // Update subscription transaction status
    await prisma.subscriptionTransaction.updateMany({
      where: { razorpayOrderId: payment.order_id },
      data: {
        status: 'FAILED',
        webhookData: payment
      }
    });

    // Update order payment status
    await prisma.order.updateMany({
      where: { razorpayOrderId: payment.order_id },
      data: { paymentStatus: 'FAILED' }
    });

    console.log('Payment failed:', payment.order_id);
  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
}

export default router;