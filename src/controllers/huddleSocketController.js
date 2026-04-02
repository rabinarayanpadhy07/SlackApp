import channelRepository from '../repositories/channelRepostiory.js';
import { summarizeTranscript, trimTranscriptSegments } from '../services/aiAssistantService.js';
import { assertPaidPlanAccess, getSocketUserFromToken } from '../services/socketFeatureAccessService.js';

const huddleSessions = new Map();

const getSession = (channelId) => {
  if (!huddleSessions.has(channelId)) {
    huddleSessions.set(channelId, {
      channelId,
      startedAt: new Date().toISOString(),
      transcriptSegments: [],
      latestSummary: null
    });
  }

  return huddleSessions.get(channelId);
};

export default function huddleSocketHandlers(io, socket) {
  // Join an active Huddle room securely
  socket.on('join-huddle', (data, cb) => {
    try {
      const { channelId, user } = data; 
      const huddleRoom = `huddle_${channelId}`;
      socket.join(huddleRoom);
      
      const numClients = io.sockets.adapter.rooms.get(huddleRoom)?.size || 1;
      const session = getSession(channelId);

      if (numClients === 1) {
          session.startedAt = new Date().toISOString();
          session.transcriptSegments = [];
          session.latestSummary = null;
          io.to(channelId).emit('HUDDLE_STARTED', { user, channelId });
      }

      socket.emit('HUDDLE_SESSION_SYNC', {
        channelId,
        transcriptSegments: session.transcriptSegments,
        latestSummary: session.latestSummary
      });

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
  socket.on('leave-huddle', async (data, cb) => {
    try {
      const { channelId } = data;
      const huddleRoom = `huddle_${channelId}`;
      const session = getSession(channelId);

      socket.leave(huddleRoom);

      const numClients = io.sockets.adapter.rooms.get(huddleRoom)?.size || 0;
      if (numClients === 0 && session.transcriptSegments.length > 0) {
          const summary = await summarizeTranscript({
            channelName: channelId,
            segments: session.transcriptSegments,
            startedAt: session.startedAt,
            endedAt: new Date().toISOString()
          });

          session.latestSummary = {
            ...summary,
            generatedAt: new Date().toISOString()
          };
          await channelRepository.updateLatestHuddleSummary(
            channelId,
            session.latestSummary
          );
          io.to(channelId).emit('HUDDLE_SUMMARY_READY', {
            channelId,
            summary: session.latestSummary
          });
      }

      if (numClients === 0) {
          io.to(channelId).emit('HUDDLE_ENDED', { channelId });
      }

      socket.to(huddleRoom).emit('user-left-huddle', { socketId: socket.id });
      cb?.({ success: true, message: 'Left huddle' });
    } catch (e) {
      cb?.({ success: false, message: e.message });
    }
  });

  socket.on('HUDDLE_TRANSCRIPT_SEGMENT', async (data, cb) => {
    try {
      const user = await getSocketUserFromToken(data?.token);
      assertPaidPlanAccess(user);
      const { channelId, segment } = data;
      const session = getSession(channelId);
      const huddleRoom = `huddle_${channelId}`;

      const transcriptSegment = {
        speakerId: segment?.speakerId || socket.id,
        speakerName: segment?.speakerName || 'Someone',
        text: segment?.text || '',
        createdAt: segment?.createdAt || new Date().toISOString()
      };

      session.transcriptSegments = trimTranscriptSegments([
        ...session.transcriptSegments,
        transcriptSegment
      ]);
      session.latestSummary = null;

      io.to(huddleRoom).emit('HUDDLE_TRANSCRIPT_UPDATED', {
        channelId,
        transcriptSegments: session.transcriptSegments
      });

      cb?.({ success: true });
    } catch (error) {
      cb?.({ success: false, message: error.message });
    }
  });

  socket.on('GENERATE_HUDDLE_SUMMARY', async (data, cb) => {
    try {
      const user = await getSocketUserFromToken(data?.token);
      assertPaidPlanAccess(user);
      const { channelId } = data;
      const session = getSession(channelId);

      if (session.transcriptSegments.length === 0) {
        cb?.({
          success: false,
          message: 'No transcript available to summarize yet'
        });
        return;
      }

      const summary = await summarizeTranscript({
        channelName: channelId,
        segments: session.transcriptSegments,
        startedAt: session.startedAt,
        endedAt: new Date().toISOString()
      });

      session.latestSummary = {
        ...summary,
        generatedAt: new Date().toISOString()
      };
      await channelRepository.updateLatestHuddleSummary(
        channelId,
        session.latestSummary
      );

      io.to(`huddle_${channelId}`).emit('HUDDLE_SUMMARY_READY', {
        channelId,
        summary: session.latestSummary
      });

      io.to(channelId).emit('HUDDLE_SUMMARY_READY', {
        channelId,
        summary: session.latestSummary
      });

      cb?.({
        success: true,
        message: 'Summary generated',
        data: session.latestSummary
      });
    } catch (error) {
      cb?.({
        success: false,
        message: error.message || 'Failed to generate huddle summary'
      });
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
