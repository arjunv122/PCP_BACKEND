import express from 'express';
import * as taskController from '../controllers/taskController.js';

const router = express.Router();

// CRUD Routes
router.get('/tasks', taskController.getAllTasks);
router.get('/tasks/:id', taskController.getTaskById);
router.post('/tasks', taskController.createTask);
router.put('/tasks/:id', taskController.updateTask);
router.delete('/tasks/:id', taskController.deleteTask);

// Filter/Search routes (TODO: Implement during assessment)
router.get('/tasks/filter/status', (req, res) => {
  // TODO: Implement filtering by status
});

router.get('/tasks/search', (req, res) => {
  // TODO: Implement search functionality
});

// Stats route (TODO: Implement during assessment)
router.get('/stats', (req, res) => {
  // TODO: Implement stats endpoint
});

export default router;
