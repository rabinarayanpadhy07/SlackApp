import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Channel name is required']
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required']
    },
    type: {
      type: String,
      enum: ['public', 'private'],
      default: 'public'
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isArchived: {
      type: Boolean,
      default: false
    }
  },

  { timestamps: true }
);

channelSchema.index({ name: 'text' });

const Channel = mongoose.model('Channel', channelSchema);

export default Channel;