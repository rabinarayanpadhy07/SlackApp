import Channel from '../schema/channel.js';
import Message from '../schema/message.js';
import ReadReceipt from '../schema/readReceipt.js';

export const markChannelAsReadService = async (userId, channelId, workspaceId) => {
    return ReadReceipt.findOneAndUpdate(
        { userId, channelId },
        { workspaceId, lastRead: new Date() },
        { upsert: true, new: true }
    );
};

export const getUnreadChannelsForWorkspaceService = async (userId, workspaceId) => {
    const receipts = await ReadReceipt.find({ userId, workspaceId });
    const receiptMap = new Map(receipts.map(r => [r.channelId.toString(), r.lastRead]));
    
    const channels = await Channel.find({ workspaceId });
    
    const unreadMap = {};
    await Promise.all(channels.map(async (channel) => {
        const lastRead = receiptMap.get(channel._id.toString()) || new Date(0);
        const count = await Message.countDocuments({
            channelId: channel._id,
            createdAt: { $gt: lastRead }
        });
        unreadMap[channel._id.toString()] = count;
    }));
    
    return unreadMap;
};
