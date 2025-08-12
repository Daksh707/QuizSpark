# QuizMaster - Dynamic Quiz & Exam Platform

A comprehensive real-time quiz platform built with Node.js, Express.js, EJS, PostgreSQL, and Socket.IO. Features role-based access for teachers and students, live leaderboards, and AWS deployment ready.

## 🚀 Features

### For Teachers
- **Quiz Creation**: Create interactive quizzes with multiple question types (Multiple Choice, True/False, Short Answer)
- **Real-time Management**: Monitor student progress and quiz attempts in real-time
- **Live Leaderboards**: View live leaderboard updates as students complete quizzes
- **Analytics Dashboard**: Track quiz performance and student engagement
- **Quiz Controls**: Activate/deactivate quizzes and manage duration settings

### For Students  
- **Interactive Quiz Taking**: Responsive quiz interface with timer functionality
- **Real-time Updates**: Live leaderboard updates and instant result notifications
- **Progress Tracking**: View quiz history and performance analytics
- **Auto-save**: Automatic answer saving with recovery capabilities
- **Mobile Responsive**: Optimized for all device sizes

### Platform Features
- **Real-time Communication**: WebSocket-powered live updates and notifications
- **Secure Authentication**: Session-based authentication with PostgreSQL storage
- **Role-based Access**: Separate dashboards and permissions for teachers and students
- **Scalable Architecture**: Docker containerization and AWS deployment ready
- **Modern UI**: Bootstrap-based responsive design with custom styling

## 🛠 Technology Stack

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **EJS** - Embedded JavaScript templating engine
- **Socket.IO** - Real-time bidirectional communication
- **PostgreSQL** - Primary database for data persistence
- **Redis** - Caching and session storage (optional)

### Frontend
- **Bootstrap 5** - UI framework and responsive design
- **Font Awesome** - Icon library
- **Socket.IO Client** - Real-time client-side communication
- **Vanilla JavaScript** - Client-side interactivity

### Infrastructure
- **Docker** - Containerization platform
- **AWS EC2** - Compute instances
- **AWS RDS** - Managed PostgreSQL database
- **AWS S3** - File storage and static assets
- **Nginx** - Reverse proxy and load balancing
- **SSL/TLS** - Secure HTTPS communication

## 🏗 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- Redis (optional, for enhanced caching)
- Docker & Docker Compose (for containerized deployment)
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/quizmaster.git
   cd quizmaster
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database and configuration settings
   ```

4. **Setup PostgreSQL database**
   ```bash
   # Create database
   createdb quizmaster
   
   # Run schema (automatically done on first startup)
   psql quizmaster < server/database/schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # Or directly: node app.js
   ```

6. **Access the application**
   - Open http://localhost:5000
   - Default teacher account: teacher@example.com / password123
   - Default student account: student@example.com / password123

### Docker Deployment

1. **Using Docker Compose (Recommended)**
   ```bash
   # Start all services (app, postgres, redis, nginx)
   docker-compose up -d
   
   # View logs
   docker-compose logs -f app
   
   # Stop services
   docker-compose down
   ```

2. **Build Docker image manually**
   ```bash
   docker build -t quizmaster .
   docker run -p 5000:5000 --env-file .env quizmaster
   ```

## ☁️ AWS Deployment

### Automated Deployment Script

1. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS Access Key, Secret Key, and preferred region
   ```

2. **Run deployment script**
   ```bash
   chmod +x deploy/aws-deploy.sh
   ./deploy/aws-deploy.sh
   ```

   This script will:
   - Create RDS PostgreSQL instance
   - Launch EC2 instance with auto-configuration
   - Set up S3 bucket for file storage
   - Configure Nginx reverse proxy
   - Install SSL certificates
   - Set up monitoring and logging

### Manual AWS Setup

1. **EC2 Instance Setup**
   - Launch Amazon Linux 2023 instance (t3.small or larger)
   - Configure security groups (HTTP/HTTPS/SSH)
   - Use the provided user-data.sh script

2. **RDS Database Setup**  
   - Create PostgreSQL 15 RDS instance
   - Configure security groups and VPC
   - Update connection string in environment

3. **S3 Bucket Setup**
   - Create S3 bucket for file uploads
   - Configure IAM roles and policies
   - Update bucket name in environment

## 📁 Project Structure

```
quizmaster/
├── server/                 # Backend application code
│   ├── app.js             # Express app configuration
│   ├── routes/            # Route handlers
│   │   ├── auth.js        # Authentication routes
│   │   ├── teacher.js     # Teacher dashboard routes
│   │   └── student.js     # Student dashboard routes
│   └── database/          # Database schema and migrations
│       └── schema.sql     # PostgreSQL schema
├── views/                 # EJS templates
│   ├── layout.ejs         # Base layout template
│   ├── index.ejs          # Landing page
│   ├── auth/              # Authentication pages
│   ├── teacher/           # Teacher dashboard pages
│   └── student/           # Student dashboard pages
├── public/                # Static assets
│   ├── css/               # Custom stylesheets
│   ├── js/                # Client-side JavaScript
│   └── uploads/           # File upload directory
├── deploy/                # Deployment scripts and configs
│   ├── aws-deploy.sh      # AWS deployment automation
│   ├── user-data.sh       # EC2 initialization script
│   └── nginx.conf         # Nginx configuration
├── docker-compose.yml     # Multi-container Docker setup
├── Dockerfile             # Container image definition
├── app.js                 # Main application entry point
└── README.md             # Project documentation
```

## 🔐 Security Features

- **Input Validation**: Comprehensive input sanitization and validation
- **SQL Injection Protection**: Parameterized queries and ORM protection
- **XSS Prevention**: Content Security Policy and input escaping
- **CSRF Protection**: Cross-site request forgery tokens
- **Session Security**: Secure HTTP-only cookies with expiration
- **Password Hashing**: bcrypt encryption with salt rounds
- **HTTPS/SSL**: End-to-end encryption for production

## 📊 API Endpoints

### Authentication
- `POST /login` - User authentication
- `POST /register` - User registration  
- `POST /logout` - User logout

### Teacher Routes (Protected)
- `GET /teacher/dashboard` - Teacher dashboard
- `GET /teacher/create-quiz` - Quiz creation form
- `POST /teacher/create-quiz` - Create new quiz
- `GET /teacher/quiz/:id` - Quiz management
- `POST /teacher/quiz/:id/toggle` - Toggle quiz status
- `GET /teacher/quiz/:id/leaderboard` - Live leaderboard

### Student Routes (Protected)
- `GET /student/dashboard` - Student dashboard
- `GET /student/quiz/:id/start` - Start quiz attempt
- `GET /student/quiz/:id/take` - Take quiz
- `POST /student/quiz/:id/submit` - Submit quiz answers
- `GET /student/quiz/:id/results` - View results
- `GET /student/history` - Quiz attempt history

### Real-time Events (Socket.IO)
- `join-quiz` - Join quiz room for live updates
- `submit-answer` - Submit answer with real-time scoring
- `leaderboard-update` - Live leaderboard updates
- `quiz-completed` - Quiz completion notifications

## 🔧 Configuration

### Environment Variables

```bash
# Application
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=quizmaster

# Security
SESSION_SECRET=your-super-secret-key

# AWS (Optional)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-s3-bucket
```

## 🚀 Performance Optimization

- **Clustering**: PM2 cluster mode for multi-core utilization
- **Caching**: Redis integration for session and data caching
- **CDN**: Static asset delivery via CloudFront
- **Database**: Optimized queries with proper indexing
- **Compression**: Gzip compression for reduced payload
- **Monitoring**: CloudWatch integration for metrics and logs

## 🧪 Testing

```bash
# Run application tests
npm test

# Test specific components
npm run test:auth
npm run test:api
npm run test:realtime

# Load testing
npm run test:load
```

## 📈 Monitoring & Logging

### Application Monitoring
- PM2 process monitoring
- Health check endpoints
- Error tracking and alerting
- Performance metrics collection

### AWS CloudWatch Integration
- Application logs aggregation
- Custom metrics and dashboards  
- Automated alerting and notifications
- Log retention and analysis

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@quizmaster.com
- Documentation: [Wiki](https://github.com/yourusername/quizmaster/wiki)

## 🎯 Roadmap

### Upcoming Features
- [ ] Quiz templates and question banks
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Advanced question types (drag-drop, matching)
- [ ] Automated grading for essay questions
- [ ] Integration with LMS platforms
- [ ] Video/audio question support

---

**Built with ❤️ using Node.js, Express.js, EJS, PostgreSQL, Socket.IO, and AWS**