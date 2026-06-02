# MERN Full Stack Task Management Application

## Backend Setup

### Prerequisites
- Node.js v14+
- MongoDB Atlas Account
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables
Create a `.env` file based on `.env.example`:

```
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
PRIVATE_API_URL=https://api.example.com/private
PUBLIC_API_URL=https://api.example.com/public
```

### Project Structure

```
src/
├── controllers/      # Request handlers
├── middleware/       # Custom middleware (auth, etc.)
├── models/          # Mongoose models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions & validators
├── app.js           # Express app configuration
└── server.js        # Entry point
```

### Running the Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

### API Endpoints

#### Authentication
- `POST /public/token` - Get JWT token

#### Tasks (CRUD)
- `GET /tasks` - Get all tasks
- `GET /tasks/:id` - Get task by ID
- `POST /tasks` - Create new task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task

#### Sync & Stats
- `POST /sync` - Sync data from private API
- `GET /stats` - Get task statistics
- `GET /health` - Health check

#### Search & Filter
- `GET /tasks?status=pending` - Filter by status
- `GET /tasks?priority=high` - Filter by priority
- `GET /tasks/search?q=keyword` - Search tasks

### Required Dependencies
- express
- mongoose
- dotenv
- axios
- nodemon (dev)

## Deployment

Deploy to **Render**:
1. Connect GitHub repository
2. Set environment variables
3. Configure start command: `npm start`

## Notes
- All APIs follow standard response structure
- Data validation and sanitization is mandatory
- MongoDB persistence required (no caching)
- Duplicate prevention implemented
