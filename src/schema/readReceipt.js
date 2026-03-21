import mongoose from 'mongoose';

const readReceiptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    },
    lastRead: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Ensure a user has only one receipt per channel
readReceiptSchema.index({ userId: 1, channelId: 1 }, { unique: true });

const ReadReceipt = mongoose.model('ReadReceipt', readReceiptSchema);

export default ReadReceipt;
