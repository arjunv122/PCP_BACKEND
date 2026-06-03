import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforbugtracker';

// POST /auth/register
export const register = async (req, res, next) => {
  try {
    const { userId, name, email, password, role, department } = req.body;

    if (!userId || !name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'userId, name, email, password, and role are required fields.'
      });
    }

    if (!['admin', 'manager', 'developer', 'tester'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Role must be admin, manager, developer, or tester.'
      });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists.'
      });
    }

    const existingUserId = await User.findOne({ userId });
    if (existingUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      userId,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      department,
      status: 'active'
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: userObj
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/login and POST /public/token
export const login = async (req, res, next) => {
  try {
    const { email, password, studentId } = req.body;
    const username = email || studentId;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email/StudentID and password are required fields.'
      });
    }

    const user = await User.findOne({
      $or: [
        { email: username.toString().toLowerCase() },
        { userId: username.toString() }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: userObj
    });
  } catch (error) {
    next(error);
  }
};

// GET /auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Authenticated user fetched successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};
