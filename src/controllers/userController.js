import User from '../models/User.js';

// GET /users (Supports Pagination)
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await User.countDocuments();
    const users = await User.find()
      .select('-password')
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// GET /users/:id
export const getUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
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
      message: 'User fetched successfully',
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
