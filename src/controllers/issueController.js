import Issue from '../models/Issue.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';

// Helper to generate unique ID for activity log
const generateLogId = () => {
  return 'LOG' + Date.now() + Math.floor(Math.random() * 1000);
};

// Q8 -- Issue APIs: POST /issues
export const createIssue = async (req, res, next) => {
  try {
    const { issueId, projectId, assignedTo, reportedBy, title, description, priority, severity, status, dueDate } = req.body;
    const userRole = req.user.role;

    // Testers can report bugs. Admin/Manager can also do it. Developers can only update assigned issues.
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

    // Verify Project exists
    const projectExists = await Project.findOne({ projectId });
    if (!projectExists) {
      return res.status(400).json({
        success: false,
        message: `Project with ID '${projectId}' does not exist.`
      });
    }

    // Verify Reporter user exists
    const reporterExists = await User.findOne({ userId: reportedBy });
    if (!reporterExists) {
      return res.status(400).json({
        success: false,
        message: `Reporting user '${reportedBy}' does not exist.`
      });
    }

    // Verify Assignee if provided
    if (assignedTo) {
      // Only managers/admins can assign issues
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

    // Check duplicate issueId
    const existingIssueId = await Issue.findOne({ issueId });
    if (existingIssueId) {
      return res.status(400).json({
        success: false,
        message: 'Issue ID already exists.'
      });
    }

    // Check duplicate issue title in the same project (case-insensitive)
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

    // Create the issue
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

    // Create activity log
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
      message: 'Operation successful',
      data: newIssue
    });
  } catch (error) {
    next(error);
  }
};

// Q8, Q12, Q14 -- GET /issues (with filter, search, pagination)
export const getAllIssues = async (req, res, next) => {
  try {
    const { priority, status, severity, page = 1, limit = 10, search } = req.query;
    const filter = {};

    // 1. Apply filters
    if (priority) {
      filter.priority = priority.toString().trim().toLowerCase();
    }
    if (status) {
      filter.status = status.toString().trim().toLowerCase();
    }
    if (severity) {
      filter.severity = severity.toString().trim().toLowerCase();
    }

    // 2. Apply search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { issueId: { $regex: search, $options: 'i' } }
      ];
    }

    // Role-based restrictions: Developers can only view issues assigned to them, or developers can see all but edit only assigned?
    // Let's check Image 5: "Developer Module: view assigned issues, update status...".
    // To allow the developer to see all but focus, or if we filter by assignedTo for developers if a query param is passed.
    // The instructions say "Developers can update assigned issues...". Let's allow them to fetch all, but if we want to support developer view easily.

    // 3. Paginate
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Issue.countDocuments(filter);
    const issues = await Issue.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: issues,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Q8 -- Issue APIs: GET /issues/:id
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
      message: 'Operation successful',
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// Q8 -- Issue APIs: PATCH /issues/:id (General Update)
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

    // Workflow Rule: Resolved issues cannot be edited directly
    if (issue.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Resolved issues cannot be edited directly.'
      });
    }

    const updates = req.body;

    // Check duplicate issue title in the same project if title is updated
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

    // Role restrictions: Developers can only update assigned issues
    if (userRole === 'developer' && issue.assignedTo !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Developers can only update issues assigned to them.'
      });
    }

    // Only managers/admins can change priority
    if (updates.priority && updates.priority !== issue.priority) {
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only managers and admins can change issue priority.'
        });
      }
    }

    // Closed issues cannot be reassigned
    if (issue.status === 'closed' && updates.assignedTo !== undefined && updates.assignedTo !== issue.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Closed issues cannot be reassigned.'
      });
    }

    // Only managers/admins can assign issues
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

    // Apply updates
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

    // Create log if status or assignment changed
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
      message: 'Operation successful',
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// Q8 -- Issue APIs: DELETE /issues/:id
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

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// Q10 -- Assign Issue: PATCH /issues/:id/assign
export const assignIssue = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { assignedTo } = req.body;
    const userRole = req.user.role;

    // Only managers and admins can assign issues
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

    // Closed issues cannot be reassigned
    if (issue.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Closed issues cannot be reassigned.'
      });
    }

    // Verify user exists if assignedTo is not null/empty
    if (assignedTo) {
      const userExists = await User.findOne({ userId: assignedTo });
      if (!userExists) {
        return res.status(400).json({
          success: false,
          message: `User '${assignedTo}' does not exist.`
        });
      }
    }

    const oldStatus = issue.status;
    issue.assignedTo = assignedTo || null;
    await issue.save();

    // Create log
    await ActivityLog.create({
      logId: generateLogId(),
      issueId: issue.issueId,
      userId: req.user.userId,
      action: 'assigned',
      previousStatus: oldStatus,
      newStatus: issue.status,
      timestamp: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// Q11 -- Update Issue Status: PATCH /issues/:id/status
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
    if (oldStatus === newStatus) {
      return res.status(200).json({
        success: true,
        message: 'Operation successful',
        data: issue
      });
    }

    // Rule: Resolved issues cannot be edited directly (which includes changing status through here, unless reassigned or re-resolved, wait. Developers can change status of assigned issues. Let's make sure that if it is resolved, only managers/admins can move it to closed or open, or developers can move it to in-progress if testing failed. Let's block direct edits of resolved issues except for status changes through this specific status endpoint).
    
    // Rule: Closed issues cannot move back without reopen.
    // Reopen means changing status from 'closed' to 'open'. Only managers/admins can do this.
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

    // Rule: Testers cannot close issues directly
    if (newStatus === 'closed' && userRole === 'tester') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Testers cannot close issues directly.'
      });
    }

    // Rule: Only assigned developer can move issue to testing
    if (newStatus === 'testing') {
      if (userRole === 'developer' && issue.assignedTo !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only the assigned developer can transition the issue to testing.'
        });
      }
    }

    // Rule: Developers can update assigned issues. If a developer attempts to modify a non-assigned issue, return 403.
    if (userRole === 'developer' && issue.assignedTo !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Developers can only update status of issues assigned to them.'
      });
    }

    // Save status
    issue.status = newStatus;
    await issue.save();

    // Create log
    await ActivityLog.create({
      logId: generateLogId(),
      issueId: issue.issueId,
      userId: userId,
      action: 'status_changed',
      previousStatus: oldStatus,
      newStatus: newStatus,
      timestamp: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: issue
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
