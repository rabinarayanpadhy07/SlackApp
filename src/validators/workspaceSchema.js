import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(3).max(50),
  description: z.string().trim().max(200).optional()
});

export const addMemberToWorkspaceSchema = z.object({
  memberId: z.string()
});
export const addChannelToWorkspaceSchema = z.object({
  channelName: z.string().trim().min(2).max(80)
});
