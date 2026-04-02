import { z } from 'zod';

export const updateChannelSchema = z.object({
  channelName: z.string().min(3).max(50)
});
