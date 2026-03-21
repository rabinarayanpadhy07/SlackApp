import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: [true, 'Message body is required']
    },
    image: {
      type: String
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: [true, 'Channel ID is required']
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required']
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required']
    },
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    reactions: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        body: {
          type: String, // The emoji (e.g., '👍')
          required: true
        }
      }
    ],
    isEdited: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    stars: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  { timestamps: true }
);

messageSchema.index({ body: 'text' });

const Message = mongoose.model('Message', messageSchema);

export default Message;