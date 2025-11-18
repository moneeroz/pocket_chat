export interface IConversation {
  id: string;
  participants: string[]; // Array of user IDs
  created: string;
  updated: string;
  expand?: {
    participants?: {
      id: string;
      username: string;
      email: string;
      avatar?: string;
    }[];
  };
}
