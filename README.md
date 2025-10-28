# Major — Personal Wellness Dashboard

A full-stack wellness tracking application with AI-powered insights, built with React + Express + MySQL.

## Features

- **Goal Management**: Create, track, and complete personal goals with priority levels
- **Mood Tracking**: Daily mood logging with visual trends and analytics
- **Meditation Sessions**: Track mindfulness practice with session durations
- **Journal Entries**: Personal journaling with AI-powered summaries and sentiment analysis
- **AI Insights**: DeepSeek integration for personalized wellness analysis and suggestions
- **Dashboard Overview**: Comprehensive wellness metrics and progress visualization

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (dev server & build)
- Tailwind CSS
- React Router v6
- Context API for state management

**Backend:**
- Node.js + Express
- MySQL database
- JWT authentication
- bcrypt for password hashing
- Hugging Face + DeepSeek AI integration

## Project Structure

```
d:\major\
├── frontend/          # React frontend
│   ├── src/
│   │   ├── auth/      # Authentication context
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/     # Route components
│   │   └── ...
├── backend/           # Express backend
│   ├── controllers/   # Route handlers
│   ├── services/      # Business logic
│   ├── middleware/    # Auth & validation
│   ├── routes/        # API routes
│   └── config/        # Database & app config
└── README.md
```

## Prerequisites

- Node.js 16+ and npm/pnpm
- MySQL 8.0+ (or compatible database)
- Optional: Hugging Face API token for AI features

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Backend
cd d:\major\backend
npm install

# Frontend  
cd d:\major\frontend
npm install
```

### 2. Environment Configuration

Create `.env` files:

**Backend** (`backend/.env`):
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=major

# Authentication
JWT_SECRET=your_very_strong_jwt_secret_here
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_ORIGIN=http://localhost:5173

# AI Integration (Optional)
HF_TOKEN=your_huggingface_token
DEEPSEEK_MOCK=true  # Use mock responses for testing
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
```

### 3. Database Setup

1. Create MySQL database named `major`
2. Run the SQL schema (create tables for users, goals, mood_entries, meditation_runs, journal_entries)
3. Ensure database connection works

### 4. Run Development Servers

**Backend:**
```bash
cd d:\major\backend
npm run dev
# or: node index.js
```

**Frontend:**
```bash
cd d:\major\frontend  
npm run dev
```

Visit `http://localhost:5173` for the frontend application.

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `GET /api/auth/me` - Get current user

### Goals
- `GET /api/goals` - Get user goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Mood Tracking
- `GET /api/moods` - Get mood entries
- `POST /api/moods` - Create mood entry

### Meditation
- `GET /api/meditation/runs` - Get meditation sessions
- `POST /api/meditation/runs` - Log meditation session

### Journal
- `GET /api/journal` - Get journal entries
- `POST /api/journal` - Create journal entry

### Dashboard & Analytics
- `GET /api/dashboard/overview` - Complete dashboard data
- `POST /api/dashboard/ai/analyze` - Generate AI insights

## Testing

### Test AI Integration
```bash
cd d:\major\backend
node test-dashboard-deepseek.js
```

### Manual API Testing
```bash
# Login example
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Dashboard example (replace TOKEN)
curl -X GET http://localhost:3000/api/dashboard/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Features in Detail

### AI-Powered Insights
- Analyzes user's wellness patterns across goals, mood, and meditation
- Provides personalized suggestions and trend analysis
- Uses DeepSeek via Hugging Face for natural language processing
- Fallback logic when AI services are unavailable

### Authentication
- JWT-based auth with HTTP-only cookies
- Password hashing with bcrypt
- Protected routes and middleware
- Auto-logout on token expiration

### Data Visualization
- Goal completion rates and priority breakdown
- Mood trends and distribution charts  
- Meditation session tracking and minutes logged
- Cross-feature analytics and correlations

## Troubleshooting

### Common Issues

**401 Unauthorized on API calls:**
- Verify `VITE_API_URL` points to backend (`http://localhost:3000`)
- Check that login sets JWT token in localStorage or cookies
- Ensure backend CORS allows your frontend origin with credentials

**Database connection errors:**
- Verify MySQL is running and credentials in `.env` are correct
- Check database `major` exists and is accessible

**AI features not working:**
- Set `DEEPSEEK_MOCK=true` in backend `.env` for testing
- For real AI: obtain Hugging Face token and set `HF_TOKEN`

### Debug Mode
Add debug logs to backend services:
```bash
# In backend
DEBUG=* npm run dev
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is private/personal use. Add appropriate license as needed.

## Contact

For questions or support, please create an issue in the repository.
```// filepath: d:\major\README.md
# Major — Personal Wellness Dashboard

A full-stack wellness tracking application with AI-powered insights, built with React + Express + MySQL.

## Features

- **Goal Management**: Create, track, and complete personal goals with priority levels
- **Mood Tracking**: Daily mood logging with visual trends and analytics
- **Meditation Sessions**: Track mindfulness practice with session durations
- **Journal Entries**: Personal journaling with AI-powered summaries and sentiment analysis
- **AI Insights**: DeepSeek integration for personalized wellness analysis and suggestions
- **Dashboard Overview**: Comprehensive wellness metrics and progress visualization

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (dev server & build)
- Tailwind CSS
- React Router v6
- Context API for state management

**Backend:**
- Node.js + Express
- MySQL database
- JWT authentication
- bcrypt for password hashing
- Hugging Face + DeepSeek AI integration

## Project Structure

```
d:\major\
├── frontend/          # React frontend
│   ├── src/
│   │   ├── auth/      # Authentication context
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/     # Route components
│   │   └── ...
├── backend/           # Express backend
│   ├── controllers/   # Route handlers
│   ├── services/      # Business logic
│   ├── middleware/    # Auth & validation
│   ├── routes/        # API routes
│   └── config/        # Database & app config
└── README.md
```

## Prerequisites

- Node.js 16+ and npm/pnpm
- MySQL 8.0+ (or compatible database)
- Optional: Hugging Face API token for AI features

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Backend
cd d:\major\backend
npm install

# Frontend  
cd d:\major\frontend
npm install
```

### 2. Environment Configuration

Create `.env` files:

**Backend** (`backend/.env`):
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=major

# Authentication
JWT_SECRET=your_very_strong_jwt_secret_here
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_ORIGIN=http://localhost:5173

# AI Integration (Optional)
HF_TOKEN=your_huggingface_token
DEEPSEEK_MOCK=true  # Use mock responses for testing
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
```

### 3. Database Setup

1. Create MySQL database named `major`
2. Run the SQL schema (create tables for users, goals, mood_entries, meditation_runs, journal_entries)
3. Ensure database connection works

### 4. Run Development Servers

**Backend:**
```bash
cd d:\major\backend
npm run dev
# or: node index.js
```

**Frontend:**
```bash
cd d:\major\frontend  
npm run dev
```

Visit `http://localhost:5173` for the frontend application.

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `GET /api/auth/me` - Get current user

### Goals
- `GET /api/goals` - Get user goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Mood Tracking
- `GET /api/moods` - Get mood entries
- `POST /api/moods` - Create mood entry

### Meditation
- `GET /api/meditation/runs` - Get meditation sessions
- `POST /api/meditation/runs` - Log meditation session

### Journal
- `GET /api/journal` - Get journal entries
- `POST /api/journal` - Create journal entry

### Dashboard & Analytics
- `GET /api/dashboard/overview` - Complete dashboard data
- `POST /api/dashboard/ai/analyze` - Generate AI insights

## Testing

### Test AI Integration
```bash
cd d:\major\backend
node test-dashboard-deepseek.js
```

### Manual API Testing
```bash
# Login example
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Dashboard example (replace TOKEN)
curl -X GET http://localhost:3000/api/dashboard/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Features in Detail

### AI-Powered Insights
- Analyzes user's wellness patterns across goals, mood, and meditation
- Provides personalized suggestions and trend analysis
- Uses DeepSeek via Hugging Face for natural language processing
- Fallback logic when AI services are unavailable

### Authentication
- JWT-based auth with HTTP-only cookies
- Password hashing with bcrypt
- Protected routes and middleware
- Auto-logout on token expiration

### Data Visualization
- Goal completion rates and priority breakdown
- Mood trends and distribution charts  
- Meditation session tracking and minutes logged
- Cross-feature analytics and correlations

## Troubleshooting

### Common Issues

**401 Unauthorized on API calls:**
- Verify `VITE_API_URL` points to backend (`http://localhost:3000`)
- Check that login sets JWT token in localStorage or cookies
- Ensure backend CORS allows your frontend origin with credentials

**Database connection errors:**
- Verify MySQL is running and credentials in `.env` are correct
- Check database `major` exists and is accessible

**AI features not working:**
- Set `DEEPSEEK_MOCK=true` in backend `.env` for testing
- For real AI: obtain Hugging Face token and set `HF_TOKEN`

### Debug Mode
Add debug logs to backend services:
```bash
# In backend
DEBUG=* npm run dev
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is private/personal use. Add appropriate license as needed.

## Contact

For questions or support, please create an issue in the repository.
