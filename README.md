# Smart Home Control Platform - Backend Server

A comprehensive, production-ready Node.js + Express backend server for the Smart Home Control Platform. This server provides RESTful APIs, real-time communication, and advanced features for managing smart home devices, automation, and user accounts.

## 🚀 Features

### Core Functionality
- **Device Management**: Control and monitor smart home devices
- **User Authentication**: JWT + Google OAuth 2.0 integration
- **Real-time Communication**: Socket.IO for live updates
- **Automation Engine**: Rules, modes, and scheduling
- **Group Management**: Device grouping and scene control
- **Analytics & Insights**: Usage patterns and energy monitoring
- **Notifications**: Multi-channel notification system

### Technical Features
- **Security**: Helmet, CORS, rate limiting, input validation
- **Database**: MongoDB with Mongoose ODM
- **Logging**: Structured logging with Winston
- **Error Handling**: Comprehensive error management
- **API Documentation**: RESTful API with proper versioning
- **Health Monitoring**: Health checks and system metrics

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **MongoDB**: v5.0 or higher (local or cloud)
- **npm**: v8.0.0 or higher
- **Google OAuth 2.0**: Client credentials for authentication

## 🛠️ Installation

### 1. Clone and Setup

```bash
cd SmartHome_Server
npm install
```

### 2. Environment Configuration

Create environment files:

```bash
# Copy example files
cp .env.example .env
cp .env.example .env.development
cp .env.example .env.production
```

### 3. Configure Environment Variables

Edit `.env` file with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
APP_VERSION=1.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/smarthome_platform
DB_NAME=smarthome_platform

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback

# Client Configuration
CLIENT_URL=http://localhost:3000

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Smart Home Platform <noreply@smarthome.com>

# Push Notifications (Optional)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:your-email@gmail.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5
```

### 4. Google OAuth 2.0 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/v1/auth/google/callback` (development)
   - `https://yourdomain.com/api/v1/auth/google/callback` (production)
7. Copy Client ID and Client Secret to your `.env` file

### 5. MongoDB Setup

#### Local MongoDB
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install mongodb

# Start MongoDB service
sudo service mongodb start

# Create database and user (optional)
mongo
use smarthome_platform
db.createUser({
  user: "smarthome_user",
  pwd: "your_password",
  roles: ["readWrite"]
})
```

#### MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Add your IP address to whitelist
4. Create database user
5. Get connection string and update `MONGODB_URI` in `.env`

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Available Scripts
```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm test             # Run tests (when available)
```

## 📡 API Documentation

### Base URL
- Development: `http://localhost:5000/api/v1`
- Production: `https://yourdomain.com/api/v1`

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

#### Login User
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

#### Google OAuth Login
```http
GET /api/v1/auth/google
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Device Endpoints

#### Get User Devices
```http
GET /api/v1/devices
Authorization: Bearer your-jwt-token
```

#### Add Device
```http
POST /api/v1/devices
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "Living Room Light",
  "type": "light",
  "brand": "Philips",
  "model": "Hue Bulb",
  "connectionType": "wifi",
  "location": {
    "room": "Living Room",
    "zone": "Main Floor"
  }
}
```

#### Control Device
```http
POST /api/v1/devices/:deviceId/control
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "action": "toggle",
  "parameters": {
    "brightness": 80,
    "color": "#FF0000"
  }
}
```

### Group Endpoints

#### Create Group
```http
POST /api/v1/groups
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "Living Room Lights",
  "description": "All lights in the living room",
  "deviceIds": ["device1", "device2"],
  "type": "lighting"
}
```

#### Execute Scene
```http
POST /api/v1/groups/:groupId/scenes/:sceneId/execute
Authorization: Bearer your-jwt-token
```

### Mode Endpoints

#### Create Automation Mode
```http
POST /api/v1/modes
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "Movie Night",
  "description": "Dim lights and close curtains",
  "actions": [
    {
      "deviceId": "light1",
      "action": "setBrightness",
      "parameters": { "brightness": 20 }
    }
  ],
  "schedule": {
    "type": "time",
    "time": "20:00",
    "days": ["friday", "saturday"]
  }
}
```

### Rule Endpoints

#### Create Automation Rule
```http
POST /api/v1/rules
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "Motion Detected",
  "description": "Turn on lights when motion detected",
  "conditions": [
    {
      "deviceId": "motion_sensor_1",
      "property": "motion",
      "operator": "equals",
      "value": true
    }
  ],
  "actions": [
    {
      "deviceId": "light_1",
      "action": "turnOn",
      "parameters": { "brightness": 100 }
    }
  ]
}
```

## 🔌 Socket.IO Events

### Client Events (Emit to Server)

#### Device Control
```javascript
socket.emit('device_control', {
  deviceId: 'device123',
  action: 'toggle',
  parameters: { brightness: 80 }
});
```

#### Subscribe to Device Updates
```javascript
socket.emit('subscribe_device', { deviceId: 'device123' });
```

### Server Events (Listen from Server)

#### Device Status Update
```javascript
socket.on('device_status_update', (data) => {
  console.log('Device updated:', data);
  // { deviceId, status, state, timestamp }
});
```

#### Notification
```javascript
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});
```

#### Real-time Metrics
```javascript
socket.on('real_time_metrics', (metrics) => {
  console.log('Updated metrics:', metrics);
});
```

## 🏗️ Project Structure

```
SmartHome_Server/
├── app.js                 # Express app configuration
├── server.js             # Server entry point
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
├── README.md            # This file
├── docs/                # API documentation
├── uploads/             # File uploads directory
├── logs/                # Log files
└── src/
    ├── config/          # Configuration files
    │   ├── database.js  # Database connection
    │   └── googleOAuth.js # Google OAuth config
    ├── controllers/     # Route controllers
    │   ├── authController.js
    │   ├── deviceController.js
    │   ├── groupController.js
    │   ├── modeController.js
    │   ├── ruleController.js
    │   └── userController.js
    ├── middleware/      # Express middleware
    │   ├── auth.js      # Authentication middleware
    │   ├── errorHandler.js # Error handling
    │   ├── rateLimiter.js # Rate limiting
    │   └── validation.js # Request validation
    ├── models/          # Mongoose models
    │   ├── User.js
    │   ├── Device.js
    │   ├── Group.js
    │   ├── Mode.js
    │   ├── Rule.js
    │   ├── Notification.js
    │   └── Analytics.js
    ├── routes/          # API routes
    │   ├── index.js     # Main router
    │   ├── authRoutes.js
    │   ├── deviceRoutes.js
    │   ├── groupRoutes.js
    │   ├── modeRoutes.js
    │   ├── ruleRoutes.js
    │   └── userRoutes.js
    ├── services/        # Business logic
    │   ├── index.js
    │   ├── userService.js
    │   ├── deviceService.js
    │   ├── groupService.js
    │   ├── modeService.js
    │   ├── ruleService.js
    │   ├── automationService.js
    │   ├── notificationService.js
    │   └── analyticsService.js
    ├── socket/          # Socket.IO server
    │   └── socketServer.js
    ├── utils/           # Utility functions
    │   ├── constants.js
    │   ├── helpers.js
    │   └── logger.js
    └── validators/      # Input validation schemas
        ├── authValidator.js
        ├── deviceValidator.js
        ├── groupValidator.js
        ├── modeValidator.js
        ├── ruleValidator.js
        └── userValidator.js
```

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Express rate limiter with configurable windows
- **Input Validation**: Joi schema validation for all endpoints
- **Security Headers**: Helmet middleware for HTTP security
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Environment Variables**: Secure configuration management
- **Error Handling**: Comprehensive error handling without data leaks

## 📊 Monitoring & Logging

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system health

### Logging Levels
- **Error**: Application errors and exceptions
- **Warn**: Warning conditions and slow requests
- **Info**: General information and server events
- **Debug**: Detailed debugging information (development only)

### Metrics
- Memory usage monitoring
- Request timing and performance
- Socket.IO connection statistics
- Database connection health

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smarthome_platform
JWT_SECRET=your-super-secure-production-secret
CLIENT_URL=https://yourdomain.com
```

### PM2 Deployment
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name "smarthome-server"

# Monitor
pm2 monit

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 5000

CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature/new-feature`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review the health check endpoints for debugging

## 🔄 Version History

### v1.0.0
- Initial release
- Complete RESTful API
- Socket.IO real-time communication
- JWT + Google OAuth authentication
- Device management and automation
- Group and scene management
- Rule engine and automation modes
- Analytics and notifications
- Production-ready security and monitoring

---

**Smart Home Control Platform Backend** - Built with ❤️ using Node.js and Express