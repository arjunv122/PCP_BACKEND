import Comment from '../models/Comment.js';
import Issue from '../models/Issue.js';

// POST /comments
export const createComment = async (req, res, next) => {
  try {
    const { issueId, message } = req.body;
    const userId = req.user.userId;

    if (!issueId || !message) {
      return res.status(400).json({
        success: false,
        message: 'issueId and message are required fields.'
      });
    }

    const issueExists = await Issue.findOne({ issueId });
    if (!issueExists) {
      return res.status(400).json({
        success: false,
        message: `Issue with ID '${issueId}' does not exist.`
      });
    }

    const commentId = 'COM' + Date.now() + Math.floor(Math.random() * 1000);

    const newComment = await Comment.create({
      commentId,
      issueId,
      userId,
      message,
      createdAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: newComment
    });
  } catch (error) {
    next(error);
  }
};

// GET /comments
export const getAllComments = async (req, res, next) => {
  try {
    const { issueId } = req.query;
    const filter = {};

    if (issueId) {
      filter.issueId = issueId.toString().trim();
    }

    const comments = await Comment.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Comments fetched successfully',
      data: comments
    });
  } catch (error) {
    next(error);
  }
};

// GET /comments/:id
export const getCommentById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const comment = await Comment.findOne({
      $or: [
        { commentId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Comment fetched successfully',
      data: comment
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /comments/:id
export const deleteComment = async (req, res, next) => {
  try {
    const id = req.params.id;
    const userRole = req.user.role;
    const userId = req.user.userId;

    const comment = await Comment.findOne({
      $or: [
        { commentId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (userRole !== 'admin' && userRole !== 'manager' && comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to delete this comment.'
      });
    }

    await Comment.findByIdAndDelete(comment._id);

    // No data block in expected response of DELETE comment
    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createComment,
  getAllComments,
  getCommentById,
  deleteComment
};
