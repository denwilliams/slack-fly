import { ChannelDigest, SlackMessage } from "@/types";

export interface ICacheService {
  //   isConnected: boolean;

  //   connect(): Promise<void>;
  disconnect(): Promise<void>;

  //   set(key: string, value: any, expiration?: number | null): Promise<boolean>;
  //   get<T = any>(key: string): Promise<T | null>;
  //   del(key: string): Promise<boolean>;
  //   exists(key: string): Promise<boolean>;

  // Convenience methods
  storeChannelMessages(
    channelId: string,
    messages: SlackMessage[],
    date: string,
    expiration?: number
  ): Promise<boolean>;

  getChannelMessages(
    channelId: string,
    date: string
  ): Promise<SlackMessage[] | null>;

  storeDigest(
    channelId: string,
    date: string,
    digest: ChannelDigest
  ): Promise<boolean>;

  getDigest(channelId: string, date: string): Promise<ChannelDigest | null>;
}
