import Channel from '../schema/channel.js';
import Message from '../schema/message.js';
import User from '../schema/user.js';

export const globalSearchService = async (workspaceId, query) => {

    const messages = await Message.find({
        workspaceId,
        $text: { $search: query }
    }).populate('senderId', 'username avatar email').limit(20);

    const channels = await Channel.find({
        workspaceId,
        $text: { $search: query }
    }).limit(10);

    // Users are global, but standard UX makes us search all users matching query
    const users = await User.find({
        $text: { $search: query }
    }).select('username avatar email').limit(10);

    return {
        messages,
        channels,
        users
    };
};
