import User from '../models/User.js';

// Q6 -- User APIs: GET /users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// Q6 -- User APIs: GET /users/:id
export const getUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    // Query either by MongoDB _id or custom userId
    const user = await User.findOne({
      $or: [
        { userId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllUsers,
  getUserById
};
