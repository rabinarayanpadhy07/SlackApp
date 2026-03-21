import { addReactionService,createMessageService } from '../services/messageService.js';
import {
  NEW_MESSAGE_EVENT,
  NEW_MESSAGE_RECEIVED_EVENT,
  NEW_MENTION_RECEIVED_EVENT
} from '../utils/common/eventConstants.js';

export default function messageHandlers(io, socket) {
  socket.on(NEW_MESSAGE_EVENT, async function createMessageHandler(data, cb) {
    console.log(data, typeof data);
    const { channelId } = data;
    const messageResponse = await createMessageService(data);
    console.log('Channel', channelId);
    io.to(channelId).emit(NEW_MESSAGE_RECEIVED_EVENT, messageResponse); 
    
    // Emit mention notification to mentioned users
    if (messageResponse.mentions && messageResponse.mentions.length > 0) {
      messageResponse.mentions.forEach(mention => {
        // Depending on if the mention is populated, get the ID
        const mentionId = mention._id ? mention._id.toString() : mention.toString();
        io.to(mentionId).emit(NEW_MENTION_RECEIVED_EVENT, {
          message: messageResponse,
          channelId
        });
      });
    }

    cb({
      success: true,
      message: 'Successfully created the message',
      data: messageResponse
    });
  });

  socket.on('ADD_REACTION', async function addReactionHandler(data, cb) {
    try {
      const { messageId, emoji, memberId, channelId } = data;
      const updatedMessage = await addReactionService(messageId, emoji, memberId);
      
      // Broadcast the updated message to the channel
      io.to(channelId).emit('REACTION_ADDED', updatedMessage);
      
      cb({
        success: true,
        message: 'Successfully added reaction',
        data: updatedMessage
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      cb({
        success: false,
        message: 'Failed to add reaction',
        error: error.message
      });
    }
  });

  socket.on('typing_start', (data) => {
    const { channelId, username } = data;
    socket.to(channelId).emit('user_typing_start', { username });
  });

  socket.on('typing_stop', (data) => {
    const { channelId, username } = data;
    socket.to(channelId).emit('user_typing_stop', { username });
  });

}