import AuditLog from '../schema/auditLog.js';
import crudRepository from './crudRepository.js';

const auditLogRepository = {
  ...crudRepository(AuditLog),
  getRecentLogs: async (limit = 50) =>
    AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actorId', 'username email avatar isSuperAdmin')
};

export default auditLogRepository;
