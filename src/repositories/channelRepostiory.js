import Channel from '../schema/channel.js';
import crudRepository from './crudRepository.js';

const channelRepository = {
  ...crudRepository(Channel),
  getChannelWithWorkspaceDetails: async function (channelId) {
    const channel = await Channel.findById(channelId).populate('workspaceId');
    return channel;
  },
  getByWorkspaceAndName: async function (workspaceId, name, excludeChannelId) {
    const query = {
      workspaceId,
      name: new RegExp(`^${name}$`, 'i')
    };

    if (excludeChannelId) {
      query._id = { $ne: excludeChannelId };
    }

    return Channel.findOne(query);
  },
  updateLatestHuddleSummary: async function (channelId, summary) {
    return Channel.findByIdAndUpdate(
      channelId,
      {
        latestHuddleSummary: summary
      },
      {
        new: true
      }
    );
  }
};

export default channelRepository;
