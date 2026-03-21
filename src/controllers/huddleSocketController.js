export default function huddleSocketHandlers(io, socket) {
  // Join an active Huddle room securely
  socket.on('join-huddle', (data, cb) => {
    try {
      const { channelId, user } = data; 
      const huddleRoom = `huddle_${channelId}`;
      socket.join(huddleRoom);
      
      const numClients = io.sockets.adapter.rooms.get(huddleRoom)?.size || 1;
      if (numClients === 1) {
          socket.to(channelId).emit('HUDDLE_STARTED', { user, channelId });
      }

      // Alert active P2P peers to generate an Offer for this new socket
      socket.to(huddleRoom).emit('user-joined-huddle', { 
        socketId: socket.id, 
        user 
      });
      cb?.({ success: true, message: 'Joined huddle' });
    } catch (e) {
      cb?.({ success: false, message: e.message });
    }
  });

  // Relay a WebRTC Offer strictly to the generated target peer
  socket.on('huddle-offer', (data) => {
    const { targetSocketId, offer, user } = data;
    socket.to(targetSocketId).emit('huddle-offer', {
      fromSocketId: socket.id,
      user,
      offer
    });
  });

  // Relay a WebRTC Answer strictly back to the offerer
  socket.on('huddle-answer', (data) => {
    const { targetSocketId, answer } = data;
    socket.to(targetSocketId).emit('huddle-answer', {
      fromSocketId: socket.id,
      answer
    });
  });

  // Relay ICE Traversal Candidates securely
  socket.on('huddle-ice-candidate', (data) => {
    const { targetSocketId, candidate } = data;
    socket.to(targetSocketId).emit('huddle-ice-candidate', {
      fromSocketId: socket.id,
      candidate
    });
  });

  // Terminate connections securely leaving rooms safely
  socket.on('leave-huddle', (data, cb) => {
    try {
      const { channelId } = data;
      const huddleRoom = `huddle_${channelId}`;
      socket.leave(huddleRoom);

      const numClients = io.sockets.adapter.rooms.get(huddleRoom)?.size || 0;
      if (numClients === 0) {
          socket.to(channelId).emit('HUDDLE_ENDED', { channelId });
      }

      socket.to(huddleRoom).emit('user-left-huddle', { socketId: socket.id });
      cb?.({ success: true, message: 'Left huddle' });
    } catch (e) {
      cb?.({ success: false, message: e.message });
    }
  });

  // Automatic connection death detector tearing down P2P tracks
  socket.on('disconnecting', () => {
    socket.rooms.forEach(room => {
      if (room.startsWith('huddle_')) {
        socket.to(room).emit('user-left-huddle', { socketId: socket.id });
      }
    });
  });
}
