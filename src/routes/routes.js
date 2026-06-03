import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as syncController from '../controllers/syncController.js';
import * as userController from '../controllers/userController.js';
import * as projectController from '../controllers/projectController.js';
import * as issueController from '../controllers/issueController.js';
import * as commentController from '../controllers/commentController.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

// --- Authentication & Token Flow ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/public/token', authController.login); // Proxy alias for login
router.get('/auth/me', verifyToken, authController.getMe);

// --- Dataset Synchronization ---
router.post('/sync', syncController.syncDataset);

// --- User Routes ---
router.get('/users', verifyToken, userController.getAllUsers);
router.get('/users/:id', verifyToken, userController.getUserById);

// --- Project Routes ---
router.post('/projects', verifyToken, requireRole(['admin', 'manager']), projectController.createProject);
router.get('/projects', verifyToken, projectController.getAllProjects);
router.get('/projects/:id', verifyToken, projectController.getProjectById);
router.patch('/projects/:id', verifyToken, requireRole(['admin', 'manager']), projectController.updateProject);
router.delete('/projects/:id', verifyToken, requireRole(['admin', 'manager']), projectController.deleteProject);

// --- Issue Routes ---
router.post('/issues', verifyToken, issueController.createIssue);
router.get('/issues', verifyToken, issueController.getAllIssues);
router.get('/issues/:id', verifyToken, issueController.getIssueById);
router.patch('/issues/:id', verifyToken, issueController.updateIssue);
router.delete('/issues/:id', verifyToken, requireRole(['admin', 'manager']), issueController.deleteIssue);

// --- Issue Workflow ---
router.patch('/issues/:id/assign', verifyToken, requireRole(['admin', 'manager']), issueController.assignIssue);
router.patch('/issues/:id/status', verifyToken, issueController.updateIssueStatus);

// --- Comment Routes ---
router.post('/comments', verifyToken, commentController.createComment);
router.get('/comments', verifyToken, commentController.getAllComments);
router.get('/comments/:id', verifyToken, commentController.getCommentById);
router.delete('/comments/:id', verifyToken, commentController.deleteComment);

// --- Analytics & Aggregations ---
router.get('/analytics/issues', verifyToken, requireRole(['admin', 'manager']), analyticsController.getIssueAnalytics);
router.get('/analytics/projects', verifyToken, requireRole(['admin', 'manager']), analyticsController.getProjectAnalytics);
router.get('/analytics/developers', verifyToken, requireRole(['admin', 'manager']), analyticsController.getDeveloperAnalytics);

export default router;
