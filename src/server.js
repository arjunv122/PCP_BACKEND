import app from './app.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from './models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pcpfa:pcpfa@cluster0.bd2ku64.mongodb.net/bugtracker';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    // Seed default admin if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        userId: 'E0223017',
        name: 'Arjun V',
        email: 'arjun@bugtracker.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
      console.log('Default admin seeded: E0223017 / password123');
    }
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
