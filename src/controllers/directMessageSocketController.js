import { createDirectMessageService } from '../services/directMessageService.js';
import {
  NEW_DIRECT_MESSAGE_EVENT,
  NEW_DIRECT_MESSAGE_RECEIVED_EVENT
} from '../utils/common/eventConstants.js';

export default function directMessageHandlers(io, socket) {
  socket.on(
    NEW_DIRECT_MESSAGE_EVENT,
    async function createDirectMessageHandler(data, cb) {
      const { workspaceId, memberId } = data;

      const messageResponse = await createDirectMessageService({
        workspaceId,
        memberId,
        currentUserId: data.senderId,
        body: data.body,
        image: data.image
      });

      const roomKeyA = `${workspaceId}:${data.senderId}:${memberId}`;
      const roomKeyB = `${workspaceId}:${memberId}:${data.senderId}`;

      io.to(roomKeyA).to(roomKeyB).emit(
        NEW_DIRECT_MESSAGE_RECEIVED_EVENT,
        messageResponse
      );

      cb?.({
        success: true,
        message: 'Successfully created the direct message',
        data: messageResponse
      });
    }
  );
}

