import Project from '../models/Project.js';
import User from '../models/User.js';

// POST /projects
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
      message: 'Project created successfully',
      data: newProject
    });
  } catch (error) {
    next(error);
  }
};

// GET /projects with Filtering
export const getAllProjects = async (req, res, next) => {
  try {
    const { status, owner } = req.query;
    const filter = {};

    if (status) {
      filter.status = status.toString().trim().toLowerCase();
    }

    if (owner) {
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
    
    const isFiltered = (status !== undefined || owner !== undefined);
    
    return res.status(200).json({
      success: true,
      message: isFiltered ? 'Projects filtered successfully' : 'Projects fetched successfully',
      data: projects
    });
  } catch (error) {
    next(error);
  }
};

// GET /projects/:id
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
      message: 'Project fetched successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /projects/:id
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
    
    if (updates.owner) {
      const ownerExists = await User.findOne({ userId: updates.owner });
      if (!ownerExists) {
        return res.status(400).json({
          success: false,
          message: 'Project owner user does not exist.'
        });
      }
    }

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
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /projects/:id
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

    // No data block in expected response of DELETE project
    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
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
