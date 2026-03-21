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
    }
  },

  { timestamps: true }
);

channelSchema.index({ name: 'text' });

const Channel = mongoose.model('Channel', channelSchema);

export default Channel;