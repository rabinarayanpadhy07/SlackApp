import AuditLog from '../schema/auditLog.js';
import crudRepository from './crudRepository.js';

const auditLogRepository = {
  ...crudRepository(AuditLog),
  countDocuments: async (filter = {}) => AuditLog.countDocuments(filter),
  getRecentLogs: async (limit = 50, skip = 0) =>
    AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actorId', 'username email avatar isSuperAdmin')
};

export default auditLogRepository;
