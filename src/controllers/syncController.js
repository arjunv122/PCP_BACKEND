import { syncDataFromAPI } from '../services/syncService.js';

// Q4 - Sync API (POST /sync)
export const syncDataset = async (req, res, next) => {
  try {
    const stats = await syncDataFromAPI(req.body);
    
    return res.status(200).json({
      success: true,
      message: 'Operation successful',
      totalFetched: stats.totalFetched,
      inserted: stats.inserted,
      duplicates: stats.duplicates,
      rejected: stats.rejected,
      data: stats
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
