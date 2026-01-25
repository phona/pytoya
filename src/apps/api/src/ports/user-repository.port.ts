export type UserRecord = {
  id: number;
  role: string;
};

export interface UserRepositoryPort {
  findById(userId: number): Promise<UserRecord | null>;
}
