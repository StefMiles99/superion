export type Role = 'technician' | 'supervisor' | 'rag_admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  plantId: string;
}
