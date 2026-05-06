import Message from '../schema/message.js';
import crudRepository from './crudRepository.js';

const messageRepository = {
  ...crudRepository(Message),
  getPaginatedMessaged: async (messageParams, page, limit) => {
    const messages = await Message.find({ ...messageParams, parentMessage: { $exists: false } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('senderId', 'username email profilePicture')
      .populate('mentions', 'username email profilePicture');

    return messages;
  },
  getThreadMessages: async (messageId) => {
    const messages = await Message.find({ parentMessage: messageId })
      .sort({ createdAt: 1 }) // Chronological order for replies
      .populate('senderId', 'username email profilePicture')
      .populate('mentions', 'username email profilePicture');
      
    return messages;
  },
  getMessageDetails: async (messageId) => {
    const message = await Message.findById(messageId)
      .populate('senderId', 'username email profilePicture')
      .populate('mentions', 'username email profilePicture');
    return message;
  },
  deleteManyByChannelId: async (channelId) => {
    return Message.deleteMany({ channelId });
  },

  editMessage: async (messageId, body) => {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');
    message.body = body;
    message.isEdited = true;
    await message.save();
    return message.populate('senderId', 'username email profilePicture').then(m => m.populate('mentions', 'username email profilePicture'));
  },

  deleteMessage: async (messageId) => {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');
    message.deletedAt = new Date();
    await message.save();
    return message.populate('senderId', 'username email profilePicture').then(m => m.populate('mentions', 'username email profilePicture'));
  },

  togglePinMessage: async (messageId, memberId) => {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');
    message.isPinned = !message.isPinned;
    message.pinnedBy = message.isPinned ? memberId : null;
    await message.save();
    return message.populate('senderId', 'username email profilePicture').then(m => m.populate('mentions', 'username email profilePicture'));
  },

  toggleStarMessage: async (messageId, memberId) => {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');
    const index = message.stars.indexOf(memberId);
    if (index > -1) {
      message.stars.splice(index, 1);
    } else {
      message.stars.push(memberId);
    }
    await message.save();
    return message.populate('senderId', 'username email profilePicture').then(m => m.populate('mentions', 'username email profilePicture'));
  },

  addReaction: async (messageId, emoji, memberId) => {
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');

    // Check if the user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.body === emoji && r.memberId.toString() === memberId.toString()
    );

    if (existingReactionIndex > -1) {
      // If they already reacted, toggle it off (remove)
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add new reaction
      message.reactions.push({ body: emoji, memberId });
    }

    await message.save();
    return message.populate('senderId', 'username email profilePicture').then(m => m.populate('mentions', 'username email profilePicture'));
  }
};

export default messageRepository;
