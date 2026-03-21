const onlineUsers = new Map(); // socket.id -> userId

export default function PresenceSocketHandlers(io, socket) {
  // When a client explicitly identifies themselves
  socket.on('register_user', ({ userId }) => {
    if (!userId) return;
    
    onlineUsers.set(socket.id, userId);
    socket.join(userId.toString());
    
    // Broadcast to everyone that this user is online
    io.emit('user_status_changed', { userId, isOnline: true });
    
    // Send the current roster of online users back to the newly registered socket
    const uniqueUsers = Array.from(new Set(onlineUsers.values()));
    socket.emit('active_users_list', uniqueUsers);
  });

  socket.on('disconnect', () => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      onlineUsers.delete(socket.id);
      
      // A single user might have multiple tabs (sockets) open. 
      // Only emit offline if they have no other active sockets.
      const hasOtherSockets = Array.from(onlineUsers.values()).includes(userId);
      if (!hasOtherSockets) {
        io.emit('user_status_changed', { userId, isOnline: false });
      }
    }
  });
}
