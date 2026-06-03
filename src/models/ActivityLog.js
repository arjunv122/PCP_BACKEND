import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: [true, 'Log ID is required'],
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
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true
    },
    previousStatus: {
      type: String,
      default: null,
      trim: true
    },
    newStatus: {
      type: String,
      required: [true, 'New status is required'],
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
