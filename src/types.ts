export interface FileData {
  id: number;
  name: string;
  telegram_file_id: string;
  thumbnail_file_id?: string | null;
  size: number;
  mime_type: string;
  category: string;
  genre?: string;
  folder_id?: number | null;
  created_at: string;
}

export interface FolderData {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
}

export interface Settings {
  botToken?: string;
  chatId?: string;
}
