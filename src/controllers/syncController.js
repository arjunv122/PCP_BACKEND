import { syncDataFromAPI } from '../services/syncService.js';

// POST /sync
export const syncDataset = async (req, res, next) => {
  try {
    const stats = await syncDataFromAPI(req.body);
    
    return res.status(200).json({
      success: true,
      message: 'Dataset synchronized successfully',
      data: {
        totalFetched: stats.totalFetched,
        inserted: stats.inserted,
        duplicates: stats.duplicates,
        rejected: stats.rejected
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Sync operation failed'
    });
  }
};

export default {
  syncDataset
};
