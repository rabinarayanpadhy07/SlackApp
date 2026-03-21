import Message from '../schema/message.js';
import crudRepository from './crudRepository.js';

const messageRepository = {
  ...crudRepository(Message),
  getPaginatedMessaged: async (messageParams, page, limit) => {
    const messages = await Message.find({ ...messageParams, parentMessage: { $exists: false } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('senderId', 'username email avatar')
      .populate('mentions', 'username email avatar');

    return messages;
  },
  getThreadMessages: async (messageId) => {
    const messages = await Message.find({ parentMessage: messageId })
      .sort({ createdAt: 1 }) // Chronological order for replies
      .populate('senderId', 'username email avatar')
      .populate('mentions', 'username email avatar');
      
    return messages;
  },
  getMessageDetails: async (messageId) => {
    const message = await Message.findById(messageId)
      .populate('senderId', 'username email avatar')
      .populate('mentions', 'username email avatar');
    return message;
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
    return message.populate('senderId', 'username email avatar').then(m => m.populate('mentions', 'username email avatar'));
  }
};

export default messageRepository;