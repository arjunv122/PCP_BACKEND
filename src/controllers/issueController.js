import Issue from '../models/Issue.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';

const generateLogId = () => {
  return 'LOG' + Date.now() + Math.floor(Math.random() * 1000);
};

// POST /issues
export const createIssue = async (req, res, next) => {
  try {
    const { issueId, projectId, assignedTo, reportedBy, title, description, priority, severity, status, dueDate } = req.body;
    const userRole = req.user.role;

    if (userRole === 'developer') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Developers cannot report new issues directly.'
      });
    }

    if (!issueId || !projectId || !reportedBy || !title) {
      return res.status(400).json({
        success: false,
        message: 'issueId, projectId, reportedBy, and title are required fields.'
      });
    }

    const projectExists = await Project.findOne({ projectId });
    if (!projectExists) {
      return res.status(400).json({
        success: false,
        message: `Project with ID '${projectId}' does not exist.`
      });
    }

    const reporterExists = await User.findOne({ userId: reportedBy });
    if (!reporterExists) {
      return res.status(400).json({
        success: false,
        message: `Reporting user '${reportedBy}' does not exist.`
      });
    }

    if (assignedTo) {
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only managers and admins can assign issues.'
        });
      }
      const assigneeExists = await User.findOne({ userId: assignedTo });
      if (!assigneeExists) {
        return res.status(400).json({
          success: false,
          message: `Assigned user '${assignedTo}' does not exist.`
        });
      }
    }

    const existingIssueId = await Issue.findOne({ issueId });
    if (existingIssueId) {
      return res.status(400).json({
        success: false,
        message: 'Issue ID already exists.'
      });
    }

    const duplicateTitle = await Issue.findOne({
      projectId,
      title: { $regex: `^${title.trim()}$`, $options: 'i' }
    });
    if (duplicateTitle) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate issue titles within the same project not allowed.'
      });
    }

    const newIssue = await Issue.create({
      issueId,
      projectId,
      assignedTo: assignedTo || null,
      reportedBy,
      title: title.trim(),
      description: description || '',
      priority: priority ? priority.trim().toLowerCase() : 'medium',
      severity: severity ? severity.trim().toLowerCase() : 'major',
      status: status ? status.trim().toLowerCase() : 'open',
      dueDate: dueDate ? new Date(dueDate) : null
    });

    await ActivityLog.create({
      logId: generateLogId(),
      issueId: newIssue.issueId,
      userId: req.user.userId,
      action: 'created',
      previousStatus: null,
      newStatus: newIssue.status,
      timestamp: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      data: newIssue
    });
  } catch (error) {
    next(error);
  }
};

// GET /issues (Filtering, Search, Pagination)
export const getAllIssues = async (req, res, next) => {
  try {
    const { priority, status, severity, page = 1, limit = 10, search } = req.query;
    const filter = {};

    if (priority) {
      filter.priority = priority.toString().trim().toLowerCase();
    }
    if (status) {
      filter.status = status.toString().trim().toLowerCase();
    }
    if (severity) {
      filter.severity = severity.toString().trim().toLowerCase();
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { issueId: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Issue.countDocuments(filter);
    const issues = await Issue.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const isFiltered = (priority !== undefined || status !== undefined || severity !== undefined);

    return res.status(200).json({
      success: true,
      message: isFiltered ? 'Issues filtered successfully' : 'Issues fetched successfully',
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      data: issues
    });
  } catch (error) {
    next(error);
  }
};

// GET /issues/:id
export const getIssueById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const issue = await Issue.findOne({
      $or: [
        { issueId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Issue fetched successfully',
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /issues/:id (General Update)
export const updateIssue = async (req, res, next) => {
  try {
    const id = req.params.id;
    const userRole = req.user.role;
    const userId = req.user.userId;

    const issue = await Issue.findOne({
      $or: [
        { issueId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    if (issue.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Resolved issues cannot be edited directly.'
      });
    }

    const updates = req.body;

    if (updates.title && updates.title !== issue.title) {
      const projId = updates.projectId || issue.projectId;
      const duplicateTitle = await Issue.findOne({
        projectId: projId,
        title: { $regex: `^${updates.title.trim()}$`, $options: 'i' },
        issueId: { $ne: issue.issueId }
      });
      if (duplicateTitle) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate issue titles within the same project not allowed.'
        });
      }
    }

    if (userRole === 'developer' && issue.assignedTo !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Developers can only update issues assigned to them.'
      });
    }

    if (updates.priority && updates.priority !== issue.priority) {
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only managers and admins can change issue priority.'
        });
      }
    }

    if (issue.status === 'closed' && updates.assignedTo !== undefined && updates.assignedTo !== issue.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Closed issues cannot be reassigned.'
      });
    }

    if (updates.assignedTo !== undefined && updates.assignedTo !== issue.assignedTo) {
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only managers and admins can assign issues.'
        });
      }
      if (updates.assignedTo) {
        const assigneeExists = await User.findOne({ userId: updates.assignedTo });
        if (!assigneeExists) {
          return res.status(400).json({
            success: false,
            message: `Assigned user '${updates.assignedTo}' does not exist.`
          });
        }
      }
    }

    const oldStatus = issue.status;
    const oldAssignedTo = issue.assignedTo;

    const fields = ['title', 'description', 'priority', 'severity', 'dueDate', 'assignedTo', 'reportedBy', 'projectId'];
    fields.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'dueDate') {
          issue[field] = updates[field] ? new Date(updates[field]) : null;
        } else {
          issue[field] = updates[field];
        }
      }
    });

    await issue.save();

    if (oldStatus !== issue.status || oldAssignedTo !== issue.assignedTo) {
      const action = oldAssignedTo !== issue.assignedTo ? 'assigned' : 'updated';
      await ActivityLog.create({
        logId: generateLogId(),
        issueId: issue.issueId,
        userId: req.user.userId,
        action,
        previousStatus: oldStatus,
        newStatus: issue.status,
        timestamp: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Issue updated successfully',
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /issues/:id
export const deleteIssue = async (req, res, next) => {
  try {
    const id = req.params.id;
    const issue = await Issue.findOneAndDelete({
      $or: [
        { issueId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // No data block in expected response of DELETE issue
    return res.status(200).json({
      success: true,
      message: 'Issue deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /issues/:id/assign
export const assignIssue = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { assignedTo } = req.body;
    const userRole = req.user.role;

    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Only managers and admins can assign issues.'
      });
    }

    const issue = await Issue.findOne({
      $or: [
        { issueId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    if (issue.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Closed issues cannot be reassigned.'
      });
    }

    let assigneeUser = null;
    if (assignedTo) {
      assigneeUser = await User.findOne({ userId: assignedTo });
      if (!assigneeUser) {
        return res.status(400).json({
          success: false,
          message: `User '${assignedTo}' does not exist.`
        });
      }
    }

    const oldStatus = issue.status;
    issue.assignedTo = assignedTo || null;
    await issue.save();

    await ActivityLog.create({
      logId: generateLogId(),
      issueId: issue.issueId,
      userId: req.user.userId,
      action: 'assigned',
      previousStatus: oldStatus,
      newStatus: issue.status,
      timestamp: new Date()
    });

    // Format response exactly as contract expects
    return res.status(200).json({
      success: true,
      message: 'Issue assigned successfully',
      data: {
        issueId: issue.issueId,
        assignedTo: assigneeUser ? {
          _id: assigneeUser._id.toString(),
          name: assigneeUser.name
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /issues/:id/status
export const updateIssueStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const userRole = req.user.role;
    const userId = req.user.userId;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required.'
      });
    }

    const newStatus = status.trim().toLowerCase();
    if (!['open', 'in-progress', 'testing', 'resolved', 'closed'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. Must be open, in-progress, testing, resolved, or closed.'
      });
    }

    const issue = await Issue.findOne({
      $or: [
        { issueId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    const oldStatus = issue.status;

    if (oldStatus === 'closed') {
      if (newStatus !== 'open') {
        return res.status(400).json({
          success: false,
          message: 'Closed issues can only be transitioned to open (reopened).'
        });
      }
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only managers and admins can reopen closed issues.'
        });
      }
    }

    if (newStatus === 'closed' && userRole === 'tester') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Testers cannot close issues directly.'
      });
    }

    if (newStatus === 'testing') {
      if (userRole === 'developer' && issue.assignedTo !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only the assigned developer can transition the issue to testing.'
        });
      }
    }

    if (userRole === 'developer' && issue.assignedTo !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Developers can only update status of issues assigned to them.'
      });
    }

    issue.status = newStatus;
    await issue.save();

    await ActivityLog.create({
      logId: generateLogId(),
      issueId: issue.issueId,
      userId: userId,
      action: 'status_changed',
      previousStatus: oldStatus,
      newStatus: newStatus,
      timestamp: new Date()
    });

    // Format response exactly as contract expects
    return res.status(200).json({
      success: true,
      message: 'Issue status updated successfully',
      data: {
        issueId: issue.issueId,
        status: issue.status,
        updatedAt: issue.updatedAt.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  assignIssue,
  updateIssueStatus
};
