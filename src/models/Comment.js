import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    commentId: {
      type: String,
      required: [true, 'Comment ID is required'],
      unique: true,
      trim: true
    },
    issueId: {
      type: String, // References Issue.issueId
      required: [true, 'Issue ID is required'],
      trim: true
    },
    userId: {
      type: String, // References User.userId
      required: [true, 'User ID is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
