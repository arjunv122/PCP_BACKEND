import axios from 'axios';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Issue from '../models/Issue.js';
import Comment from '../models/Comment.js';
import ActivityLog from '../models/ActivityLog.js';
import {
  validateAndSanitizeUser,
  validateAndSanitizeProject,
  validateAndSanitizeIssue,
  validateAndSanitizeComment,
  validateAndSanitizeActivityLog
} from '../utils/sanitizer.js';

export const syncDataFromAPI = async (credentials) => {
  const stats = {
    success: true,
    totalFetched: 0,
    inserted: 0,
    duplicates: 0,
    rejected: 0
  };

  const studentId = credentials?.studentId || process.env.STUDENT_ID || 'E0223017';
  const password = credentials?.password || process.env.STUDENT_PASSWORD || '351727';
  const setVal = credentials?.set || process.env.STUDENT_SET || 'setB';
  const apiBaseUrl = process.env.EXTERNAL_API_URL || 'https://t4e-testserver.onrender.com/api';

  try {
    // 1. Authenticate with external API
    const tokenRes = await axios.post(`${apiBaseUrl}/public/token`, {
      studentId,
      password,
      set: setVal
    });

    const { token, dataUrl } = tokenRes.data;
    if (!token || !dataUrl) {
      throw new Error('Authentication with external API failed');
    }

    // 2. Fetch dataset from private API URL
    const datasetRes = await axios.get(`${apiBaseUrl}${dataUrl}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = datasetRes.data.data;
    if (!data) {
      throw new Error('Dataset fetching failed or returned empty data');
    }

    const { users = [], projects = [], issues = [], comments = [], activities_log = [] } = data;
    stats.totalFetched = users.length + projects.length + issues.length + comments.length + activities_log.length;

    // Default password hash for synced users
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    // Keep track of valid entities
    const validUserIds = new Set();
    const validProjectIds = new Set();
    const validIssueIds = new Set();

    // 3. Sync Users
    for (const rawUser of users) {
      const sanitized = validateAndSanitizeUser(rawUser);
      if (!sanitized) {
        stats.rejected++;
        continue;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ userId: sanitized.userId });
      if (existingUser) {
        stats.duplicates++;
        validUserIds.add(sanitized.userId);
      } else {
        // Insert new user with default password
        sanitized.password = defaultPasswordHash;
        await User.create(sanitized);
        stats.inserted++;
        validUserIds.add(sanitized.userId);
      }
    }

    // 4. Sync Projects
    for (const rawProj of projects) {
      const sanitized = validateAndSanitizeProject(rawProj, validUserIds);
      if (!sanitized) {
        stats.rejected++;
        continue;
      }

      const existingProj = await Project.findOne({ projectId: sanitized.projectId });
      if (existingProj) {
        stats.duplicates++;
        validProjectIds.add(sanitized.projectId);
      } else {
        await Project.create(sanitized);
        stats.inserted++;
        validProjectIds.add(sanitized.projectId);
      }
    }

    // 5. Sync Issues
    const processedIssueIds = new Set();
    for (const rawIssue of issues) {
      const sanitized = validateAndSanitizeIssue(rawIssue, validProjectIds, validUserIds);
      if (!sanitized) {
        stats.rejected++;
        continue;
      }

      // Check for duplicate issueId within dataset itself
      if (processedIssueIds.has(sanitized.issueId)) {
        stats.rejected++; // Rejected as duplicate ID in dataset
        continue;
      }
      processedIssueIds.add(sanitized.issueId);

      const existingIssue = await Issue.findOne({ issueId: sanitized.issueId });
      if (existingIssue) {
        stats.duplicates++;
        validIssueIds.add(sanitized.issueId);
      } else {
        await Issue.create(sanitized);
        stats.inserted++;
        validIssueIds.add(sanitized.issueId);
      }
    }

    // 6. Sync Comments
    for (const rawComment of comments) {
      const sanitized = validateAndSanitizeComment(rawComment, validIssueIds, validUserIds);
      if (!sanitized) {
        stats.rejected++;
        continue;
      }

      const existingComment = await Comment.findOne({ commentId: sanitized.commentId });
      if (existingComment) {
        stats.duplicates++;
      } else {
        await Comment.create(sanitized);
        stats.inserted++;
      }
    }

    // 7. Sync Activity Logs (activities_log)
    for (const rawLog of activities_log) {
      const sanitized = validateAndSanitizeActivityLog(rawLog, validIssueIds, validUserIds);
      if (!sanitized) {
        stats.rejected++;
        continue;
      }

      const existingLog = await ActivityLog.findOne({ logId: sanitized.logId });
      if (existingLog) {
        stats.duplicates++;
      } else {
        await ActivityLog.create(sanitized);
        stats.inserted++;
      }
    }

    return stats;
  } catch (error) {
    console.error('Error during data synchronization:', error);
    throw new Error(`Sync failed: ${error.message}`);
  }
};

export default {
  syncDataFromAPI
};
