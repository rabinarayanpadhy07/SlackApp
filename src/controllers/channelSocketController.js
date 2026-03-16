import {
  JOIN_CHANNEL,
  LEAVE_CHANNEL,
  NEW_DIRECT_MESSAGE_EVENT
} from '../utils/common/eventConstants.js';

export default function messageHandlers(io, socket) {
  socket.on(JOIN_CHANNEL, async function joinChannelHandler(data, cb) {
    const roomId = data.channelId;
    socket.join(roomId);
    console.log(`User ${socket.id} joined the channel: ${roomId}`);
    cb?.({
      success: true,
      message: 'Successfully joined the channel',
      data: roomId
    });
  });

  socket.on(
    NEW_DIRECT_MESSAGE_EVENT,
    async function joinDirectMessageRoomHandler(data, cb) {
      const { workspaceId, memberId, currentUserId } = data;
      const roomId = `${workspaceId}:${currentUserId}:${memberId}`;
      socket.join(roomId);
      console.log(`User ${socket.id} joined the DM room: ${roomId}`);
      cb?.({
        success: true,
        message: 'Successfully joined the direct message room',
        data: roomId
      });
    }
  );

  socket.on(LEAVE_CHANNEL, async function leaveChannelHandler(data, cb) {
    const roomId = data.channelId;
    socket.leave(roomId);
    console.log(`User ${socket.id} left the channel: ${roomId}`);
    cb?.({
      success: true,
      message: 'Successfully left the channel',
      data: roomId
    });
  });
}