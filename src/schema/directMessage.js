import mongoose from 'mongoose';

const directMessageSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: [true, 'Message body is required']
    },
    image: {
      type: String
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required']
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required']
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required']
    }
  },
  {
    timestamps: true
  }
);

directMessageSchema.index(
  { workspaceId: 1, senderId: 1, recipientId: 1, createdAt: -1 },
  { name: 'dm_conversation_index' }
);

const DirectMessage = mongoose.model('DirectMessage', directMessageSchema);

export default DirectMessage;

