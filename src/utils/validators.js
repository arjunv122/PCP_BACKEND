// Data validation and sanitization utilities

export const validateTask = (data) => {
  const errors = [];
  
  // Title validation
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
    errors.push('Title is required and must be at least 3 characters');
  }

  // Status validation
  if (data.status && !['pending', 'in-progress', 'completed'].includes(data.status)) {
    errors.push('Invalid status value');
  }

  // Priority validation
  if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
    errors.push('Invalid priority value');
  }

  // Due date validation
  if (data.dueDate && isNaN(Date.parse(data.dueDate))) {
    errors.push('Invalid due date format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const sanitizeTask = (data) => {
  return {
    title: data.title?.toString().trim() || '',
    description: data.description?.toString().trim() || '',
    status: data.status?.toLowerCase() || 'pending',
    priority: data.priority?.toLowerCase() || 'medium',
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
  };
};

export default {
  validateTask,
  sanitizeTask,
};
