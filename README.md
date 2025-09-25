# Complete Food Service Management System

A comprehensive food service management system with subscription-based mess management, mobile app, and admin dashboard.

## 🌟 Features

### Web Dashboard
- **Multi-role Authentication**: Admin, Chef, Store Manager, Cook, Viewer, FNB Manager
- **Inventory Management**: Items, categories, vendors, stock tracking
- **Purchase Management**: Purchase orders, GRN, automated PO generation
- **Meal Planning**: Weekly meal plans, dish management, recipes
- **Subscription Management**: Packages, mess facilities, subscription tracking
- **Analytics & Reporting**: Revenue analytics, subscription insights
- **CSV Import/Export**: Bulk upload students and subscriptions

### Mobile App (React Native)
- **OTP Authentication**: Secure login with register number
- **QR Code Integration**: Personal QR codes and scanning
- **Meal Management**: View meals, rate food, set attendance
- **Subscription Management**: View active subscriptions, purchase packages
- **Push Notifications**: Rating requests, attendance confirmations
- **Offline Support**: Works without internet for basic features

### Payment Integration
- **Razorpay Gateway**: Secure payment processing
- **Webhook Support**: Automatic payment verification
- **Transaction Tracking**: Complete payment history

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Expo CLI (for mobile app)

### Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Configure your database and Razorpay credentials in .env
npm run migrate
npm run seed
npm run dev
```

### Web Dashboard Setup
```bash
npm install
npm run dev
```

### Mobile App Setup
```bash
cd mobileapp
npm install
npm start
```

## 🎨 Design System

### Colors
- **Primary**: #1c3c80 (Asram Blue)
- **Secondary**: #f2f2f2 (Light Gray)
- **Success**: #10b981 (Green)
- **Warning**: #f59e0b (Orange)
- **Error**: #ef4444 (Red)

### Logo
- **Source**: https://www.asram.in/asramlogo.png
- **Usage**: Consistent branding across web and mobile

## 📱 Mobile App Features

### Authentication
- Register number-based login
- OTP verification (SMS integration ready)
- JWT token management

### Dashboard
- Personal QR code for mess entry
- Today's meal status and ratings
- Tomorrow's meal planning
- Subscription status overview

### Subscription Management
- View current subscription details
- Browse available packages
- Secure payment with Razorpay
- Subscription history

### Notifications
- Push notifications for rating requests
- Attendance confirmation reminders
- Subscription expiry alerts
- In-app notification center

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - Web dashboard login
- `POST /api/mobile/send-otp` - Send OTP for mobile
- `POST /api/mobile/verify-otp` - Verify OTP and login

### FNB Manager
- `GET /api/fnb-manager/dashboard` - Dashboard statistics
- `GET /api/fnb-manager/mess-facilities` - Mess facilities
- `GET /api/fnb-manager/packages` - Subscription packages
- `GET /api/fnb-manager/subscriptions` - All subscriptions
- `POST /api/fnb-manager/upload-students` - CSV upload
- `POST /api/fnb-manager/upload-subscriptions` - CSV upload

### Mobile App
- `GET /api/mobile/packages` - Available packages
- `GET /api/mobile/subscription` - Current subscription
- `POST /api/mobile/register-push-token` - Register for notifications

### Payments
- `POST /api/razorpay/create-order` - Create payment order
- `POST /api/razorpay/verify-payment` - Verify payment
- `POST /api/razorpay/webhook` - Payment webhooks

## 📊 Database Schema

### Core Tables
- `users` - System users (admin, chef, store, etc.)
- `students` - Students and employees
- `mess_facilities` - Mess locations
- `packages` - Subscription packages
- `subscriptions` - Active/expired subscriptions
- `meal_plans` - Weekly meal planning
- `meal_attendances` - Attendance tracking
- `meal_ratings` - Food ratings and feedback

### Inventory Tables
- `items` - Inventory items
- `categories` - Item categories
- `vendors` - Supplier information
- `purchase_orders` - Purchase orders
- `grns` - Goods receipt notes
- `stock_ledger` - Stock movement tracking

## 🔐 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **JWT Authentication**: Secure token-based auth
- **Role-based Permissions**: Granular access control
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries

## 📈 Analytics & Insights

### FNB Manager Dashboard
- Subscription statistics and trends
- Revenue analytics by package
- User type distribution
- Package popularity metrics
- Expiring subscription alerts

### Operational Insights
- Meal attendance patterns
- Food rating analytics
- Inventory turnover rates
- Vendor performance metrics

## 🔔 Notification System

### Automated Notifications
- **Rating Requests**: 30 minutes after meal attendance
- **Attendance Confirmation**: Daily at 2 PM for next day
- **Subscription Expiry**: 3 days before expiration
- **Low Stock Alerts**: When inventory below reorder point

### Push Notification Integration
- Expo Push Notifications ready
- Device token management
- Platform-specific handling (iOS/Android)
- Notification history tracking

## 📋 CSV Upload Formats

### Students CSV
```csv
register_number,name,mobile_number,email,room_number,user_type,employee_id,department
CS2021001,John Doe,9876543210,john@college.edu,A-101,STUDENT,,Computer Science
EMP001,Dr. Smith,9876543211,smith@college.edu,,EMPLOYEE,EMP001,Mathematics
```

### Subscriptions CSV
```csv
register_number,package_id,mess_facility_id,start_date,end_date,status,amount_paid,razorpay_payment_id
CS2021001,package-id,facility-id,2024-01-01,2024-01-31,ACTIVE,3500,pay_123456789
```

## 🚀 Deployment

### Production Setup
1. Configure environment variables
2. Set up PostgreSQL database
3. Configure Razorpay credentials
4. Set up push notification certificates
5. Deploy backend and frontend
6. Configure mobile app for production

### Environment Variables
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=webhook-secret
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Built with ❤️ for efficient mess management**