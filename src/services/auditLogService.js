import auditLogRepository from '../repositories/auditLogRepository.js';

export const recordAuditLog = async ({
  actorId,
  action,
  targetType,
  targetId,
  metadata = {}
}) =>
  auditLogRepository.create({
    actorId,
    action,
    targetType,
    targetId,
    metadata
  });
