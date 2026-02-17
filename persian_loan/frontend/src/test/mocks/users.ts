/**
 * Mock User Data for Testing
 */

export interface MockUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

export const mockUser: MockUser = {
  id: 'user-test-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
};

export const mockAdminUser: MockUser = {
  id: 'admin-test-1',
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin',
};

export const mockUsers: MockUser[] = [
  mockUser,
  mockAdminUser,
];

export const createMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  ...mockUser,
  ...overrides,
});
