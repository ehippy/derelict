import { Entity } from 'electrodb';
import { client, getTableName } from '../client';

export const GuildMembershipEntity = new Entity(
  {
    model: {
      entity: 'GuildMembership',
      version: '1',
      service: 'derelict',
    },
    attributes: {
      id: {
        type: 'string',
        required: true,
      },
      guildId: {
        type: 'string',
        required: true,
      },
      playerId: {
        type: 'string',
        required: true,
      },
      playerUsername: {
        type: 'string',
        required: true,
      },
      playerAvatar: {
        type: 'string',
        required: false,
      },
      optedIn: {
        type: 'boolean',
        required: true,
        default: false,
      },
      lastActiveAt: {
        type: 'string',
        required: true,
        default: () => new Date().toISOString(),
        set: () => new Date().toISOString(),
      },
      createdAt: {
        type: 'string',
        required: true,
        default: () => new Date().toISOString(),
        readOnly: true,
      },
      updatedAt: {
        type: 'string',
        required: true,
        default: () => new Date().toISOString(),
        set: () => new Date().toISOString(),
        watch: '*',
      },
    },
    indexes: {
      primary: {
        pk: {
          field: 'pk',
          composite: ['playerId'],
        },
        sk: {
          field: 'sk',
          composite: ['guildId'],
        },
      },
      byGuild: {
        index: 'gsi1',
        pk: {
          field: 'gsi1pk',
          composite: ['guildId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['optedIn', 'playerUsername'],
        },
      },
    },
  },
  {
    table: getTableName(),
    client,
  }
);

export type GuildMembershipEntityType = typeof GuildMembershipEntity;
