export type Tool =
  | 'select'
  | 'pen'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'text'
  | 'eraser'
  | 'image';

export interface UserCursor {
  x: number;
  y: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor: UserCursor;
}

export interface BoardObject {
  id: string;
  type: string;
  data: Record<string, unknown>;
}
