import Issue from '../models/Issue.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';

// Q15 -- Issue Analytics (GET /analytics/issues)
export const getIssueAnalytics = async (req, res, next) => {
  try {
    const total = await Issue.countDocuments();
    const open = await Issue.countDocuments({ status: 'open' });
    const inProgress = await Issue.countDocuments({ status: 'in-progress' });
    const testing = await Issue.countDocuments({ status: 'testing' });
    const resolved = await Issue.countDocuments({ status: 'resolved' });
    const closed = await Issue.countDocuments({ status: 'closed' });

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: {
        total,
        open,
        inProgress,
        testing,
        resolved,
        closed
      }
    });
  } catch (error) {
    next(error);
  }
};

// Q16 -- Project Analytics (GET /analytics/projects)
export const getProjectAnalytics = async (req, res, next) => {
  try {
    const activeCount = await Project.countDocuments({ status: 'active' });
    const completedCount = await Project.countDocuments({ status: 'completed' });
    const archivedCount = await Project.countDocuments({ status: 'archived' });

    // Project-wise issue count aggregation
    const projectIssues = await Issue.aggregate([
      {
        $group: {
          _id: '$projectId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Fetch projects to map projectIds to titles
    const projects = await Project.find();
    const projectMap = {};
    projects.forEach(p => {
      projectMap[p.projectId] = p.title;
    });

    const projectWiseCount = projectIssues.map(pi => ({
      projectId: pi._id,
      title: projectMap[pi._id] || pi._id,
      count: pi.count
    }));

    // Ensure projects with 0 issues are included
    projects.forEach(p => {
      const exists = projectWiseCount.some(pi => pi.projectId === p.projectId);
      if (!exists) {
        projectWiseCount.push({
          projectId: p.projectId,
          title: p.title,
          count: 0
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: {
        activeCount,
        completedCount,
        archivedCount,
        closedCount: completedCount + archivedCount,
        projectWiseCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Q17 -- Developer Analytics (GET /analytics/developers)
export const getDeveloperAnalytics = async (req, res, next) => {
  try {
    // 1. Group resolved issues by assigned developer
    const developerGroups = await Issue.aggregate([
      {
        $match: { status: 'resolved', assignedTo: { $ne: null } }
      },
      {
        $group: {
          _id: '$assignedTo',
          resolvedCount: { $sum: 1 }
        }
      }
    ]);

    // 2. Fetch developer names from database
    const users = await User.find({ role: 'developer' });
    const userMap = {};
    users.forEach(u => {
      userMap[u.userId] = u.name;
    });

    // 3. Compute resolution time for resolved issues
    // We will look for status transition log entries from ActivityLog to 'resolved' and compare with 'created'
    const resolvedIssues = await Issue.find({ status: 'resolved', assignedTo: { $ne: null } });
    
    // We group resolved issue resolution times by developer
    const devTimes = {};
    for (const issue of resolvedIssues) {
      const logs = await ActivityLog.find({ issueId: issue.issueId }).sort({ timestamp: 1 });
      const createdLog = logs.find(l => l.action === 'created');
      const resolvedLog = logs.find(l => l.newStatus === 'resolved');

      let durationHours = 24; // Default fallback to 24 hours if timestamps are not complete
      if (createdLog && resolvedLog) {
        const timeDiff = new Date(resolvedLog.timestamp) - new Date(createdLog.timestamp);
        if (timeDiff > 0) {
          durationHours = timeDiff / (1000 * 60 * 60); // duration in hours
        }
      } else {
        // Alternative calculation: resolvedLog timestamp - issue.createdAt
        const issueCreatedAt = new Date(issue.createdAt);
        if (resolvedLog) {
          const timeDiff = new Date(resolvedLog.timestamp) - issueCreatedAt;
          if (timeDiff > 0) {
            durationHours = timeDiff / (1000 * 60 * 60);
          }
        }
      }

      if (!devTimes[issue.assignedTo]) {
        devTimes[issue.assignedTo] = [];
      }
      devTimes[issue.assignedTo].push(durationHours);
    }

    let highestResolvedCount = 0;

    const developerWiseData = users.map(dev => {
      const group = developerGroups.find(g => g._id === dev.userId);
      const resolvedCount = group ? group.resolvedCount : 0;
      
      if (resolvedCount > highestResolvedCount) {
        highestResolvedCount = resolvedCount;
      }

      const times = devTimes[dev.userId] || [];
      const avgResolutionTime = times.length > 0 
        ? parseFloat((times.reduce((sum, t) => sum + t, 0) / times.length).toFixed(2)) 
        : 0;

      return {
        developerId: dev.userId,
        name: dev.name,
        email: dev.email,
        department: dev.department,
        resolvedCount,
        avgResolutionTimeHours: avgResolutionTime
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: {
        highestResolvedCount,
        developers: developerWiseData
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getIssueAnalytics,
  getProjectAnalytics,
  getDeveloperAnalytics
};
