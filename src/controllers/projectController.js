import Project from '../models/Project.js';
import User from '../models/User.js';

// Q7 -- Project APIs: POST /projects
// Authorization check (admin/manager only) will be enforced by middleware in route configuration
export const createProject = async (req, res, next) => {
  try {
    const { projectId, title, description, owner, members, status, startDate } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({
        success: false,
        message: 'projectId and title are required fields.'
      });
    }

    const existingProject = await Project.findOne({ projectId });
    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: 'Project ID already exists.'
      });
    }

    // Verify owner if provided
    if (owner) {
      const ownerExists = await User.findOne({ userId: owner });
      if (!ownerExists) {
        return res.status(400).json({
          success: false,
          message: 'Project owner user does not exist.'
        });
      }
    }

    const newProject = await Project.create({
      projectId,
      title,
      description,
      owner,
      members: members || [],
      status: status || 'active',
      startDate: startDate ? new Date(startDate) : null
    });

    return res.status(201).json({
      success: true,
      message: 'Operation successful',
      data: newProject
    });
  } catch (error) {
    next(error);
  }
};

// Q7 & Q13 -- Project APIs: GET /projects with Filtering (status, owner)
export const getAllProjects = async (req, res, next) => {
  try {
    const { status, owner } = req.query;
    const filter = {};

    if (status) {
      filter.status = status.toString().trim().toLowerCase();
    }

    if (owner) {
      // The query filter might pass an owner userId (e.g. USR1004) or a user's name (e.g. Rahul)
      // Let's check if we can resolve the name to userIds first
      const matchedUsers = await User.find({
        $or: [
          { userId: owner },
          { name: { $regex: owner, $options: 'i' } }
        ]
      }).select('userId');
      
      const userIds = matchedUsers.map(u => u.userId);
      filter.owner = { $in: userIds };
    }

    const projects = await Project.find(filter);
    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: projects
    });
  } catch (error) {
    next(error);
  }
};

// Q7 -- Project APIs: GET /projects/:id
export const getProjectById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const project = await Project.findOne({
      $or: [
        { projectId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// Q7 -- Project APIs: PATCH /projects/:id
export const updateProject = async (req, res, next) => {
  try {
    const id = req.params.id;
    const project = await Project.findOne({
      $or: [
        { projectId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const updates = req.body;
    
    // Verify owner if updated
    if (updates.owner) {
      const ownerExists = await User.findOne({ userId: updates.owner });
      if (!ownerExists) {
        return res.status(400).json({
          success: false,
          message: 'Project owner user does not exist.'
        });
      }
    }

    // Apply fields
    const fields = ['title', 'description', 'owner', 'members', 'status', 'startDate'];
    fields.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'startDate') {
          project[field] = updates[field] ? new Date(updates[field]) : null;
        } else {
          project[field] = updates[field];
        }
      }
    });

    await project.save();

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// Q7 -- Project APIs: DELETE /projects/:id
export const deleteProject = async (req, res, next) => {
  try {
    const id = req.params.id;
    const project = await Project.findOneAndDelete({
      $or: [
        { projectId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
      ].filter(cond => cond._id !== null)
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject
};
