import DirectMessage from '../schema/directMessage.js';
import crudRepository from './crudRepository.js';

const directMessageRepository = {
  ...crudRepository(DirectMessage),
  getPaginatedMessages: async (filter, page, limit) => {
    const messages = await DirectMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('senderId', 'username email avatar')
      .populate('recipientId', 'username email avatar');

    return messages;
  },
  getMessageDetails: async (messageId) => {
    const message = await DirectMessage.findById(messageId)
      .populate('senderId', 'username email avatar')
      .populate('recipientId', 'username email avatar');

    return message;
  }
};

export default directMessageRepository;

