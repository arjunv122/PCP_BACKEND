import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema(
  {
    issueId: {
      type: String,
      required: [true, 'Issue ID is required'],
      unique: true,
      trim: true
    },
    projectId: {
      type: String, // References Project.projectId
      required: [true, 'Project reference is required'],
      trim: true
    },
    assignedTo: {
      type: String, // References User.userId (optional)
      trim: true,
      default: null
    },
    reportedBy: {
      type: String, // References User.userId
      required: [true, 'Reporter is required'],
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    severity: {
      type: String,
      enum: ['minor', 'major', 'critical'],
      default: 'major'
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'testing', 'resolved', 'closed'],
      default: 'open'
    },
    dueDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const Issue = mongoose.model('Issue', issueSchema);
export default Issue;
