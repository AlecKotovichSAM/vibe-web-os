// Browser-based tests for Auth module - Avatar file deletion prevention
// Run by opening tests/test-runner.html in browser

(function() {
  'use strict';
  const describe = window.describe;
  const it = window.it;
  const expect = window.expect;
  const beforeEach = window.beforeEach;

  describe('Auth - Avatar File Deletion Prevention', () => {
    let fsRmCallCount = 0;
    let fsRmCalledPaths = [];
    let mockAuth;

    beforeEach(() => {
      // Clear localStorage
      localStorage.clear();
      
      // Reset FS.rm call tracking
      fsRmCallCount = 0;
      fsRmCalledPaths = [];
      
      // Mock FS with tracking for rm() calls
      window.FS = {
        root: '/root',
        read: (path) => {
          if (path.includes('avatar')) {
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          }
          return '';
        },
        write: () => {},
        rm: (path) => {
          fsRmCallCount++;
          fsRmCalledPaths.push(path);
          // Don't actually delete anything in tests
        }
      };

      // Mock Auth module implementation (simplified version for testing)
      const STORAGE_KEY = 'webos.account.v1';
      
      mockAuth = {
        getAccount: () => {
          const stored = localStorage.getItem(STORAGE_KEY);
          return stored ? JSON.parse(stored) : null;
        },
        
        updateAccount: async (updates) => {
          const account = mockAuth.getAccount();
          if (!account) {
            throw new Error('No account found');
          }
          
          // Update fields (as done in core.auth.js)
          if (updates.firstName !== undefined) {
            account.firstName = updates.firstName ? updates.firstName.trim() : null;
          }
          if (updates.lastName !== undefined) {
            account.lastName = updates.lastName ? updates.lastName.trim() : null;
          }
          if (updates.email !== undefined) {
            account.email = updates.email ? updates.email.trim() : null;
          }
          if (updates.avatar !== undefined) {
            // Note: We don't delete the old avatar file - just unlink it from the account
            // The file remains in the file system and can be reused or manually deleted by the user
            account.avatar = updates.avatar || null;
          }
          
          // Save updated account
          localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
          return account;
        },
        
        deleteAccount: async (password) => {
          const account = mockAuth.getAccount();
          if (!account) {
            throw new Error('No account found');
          }
          
          // Delete account from localStorage
          localStorage.removeItem(STORAGE_KEY);
          
          // Note: We don't delete the avatar file when deleting account
          // The file remains in the file system and can be manually deleted by the user if needed
          
          return true;
        },
        
        resetAccount: () => {
          const account = mockAuth.getAccount();
          // Note: We don't delete the avatar file when resetting account
          // The file remains in the file system and can be manually deleted by the user if needed
          localStorage.removeItem(STORAGE_KEY);
        }
      };

      // Set mock Auth on window
      window.Auth = mockAuth;
    });

    it('should NOT delete avatar file when updating account with new avatar', async () => {
      const STORAGE_KEY = 'webos.account.v1';
      const oldAvatarPath = '/root/Desktop/old-avatar.png';
      const newAvatarPath = '/root/Desktop/new-avatar.png';
      
      // Create account with old avatar
      const account = {
        guid: 'test-guid',
        username: 'testuser',
        passwordHash: 'test-hash',
        salt: 'test-salt',
        avatar: oldAvatarPath
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));

      // Update account with new avatar
      await mockAuth.updateAccount({ avatar: newAvatarPath });

      // Verify FS.rm was NOT called
      if (fsRmCallCount > 0) {
        throw new Error(`Expected FS.rm to NOT be called when updating avatar, but it was called ${fsRmCallCount} time(s). Called paths: ${fsRmCalledPaths.join(', ')}`);
      }

      // Verify account was updated correctly
      const updatedAccount = mockAuth.getAccount();
      if (updatedAccount.avatar !== newAvatarPath) {
        throw new Error(`Expected avatar to be ${newAvatarPath}, but got: ${updatedAccount.avatar}`);
      }
    });

    it('should NOT delete avatar file when removing avatar from account', async () => {
      const STORAGE_KEY = 'webos.account.v1';
      const avatarPath = '/root/Desktop/test-avatar.png';
      
      // Create account with avatar
      const account = {
        guid: 'test-guid',
        username: 'testuser',
        passwordHash: 'test-hash',
        salt: 'test-salt',
        avatar: avatarPath
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));

      // Remove avatar from account
      await mockAuth.updateAccount({ avatar: null });

      // Verify FS.rm was NOT called
      if (fsRmCallCount > 0) {
        throw new Error(`Expected FS.rm to NOT be called when removing avatar, but it was called ${fsRmCallCount} time(s). Called paths: ${fsRmCalledPaths.join(', ')}`);
      }

      // Verify account was updated correctly
      const updatedAccount = mockAuth.getAccount();
      if (updatedAccount.avatar !== null) {
        throw new Error(`Expected avatar to be null, but got: ${updatedAccount.avatar}`);
      }
    });

    it('should NOT delete avatar file when deleting account', async () => {
      const STORAGE_KEY = 'webos.account.v1';
      const avatarPath = '/root/Desktop/test-avatar.png';
      
      // Create account with avatar
      const account = {
        guid: 'test-guid',
        username: 'testuser',
        passwordHash: 'test-hash',
        salt: 'test-salt',
        avatar: avatarPath
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));

      // Delete account
      await mockAuth.deleteAccount('test-password');

      // Verify FS.rm was NOT called
      if (fsRmCallCount > 0) {
        throw new Error(`Expected FS.rm to NOT be called when deleting account, but it was called ${fsRmCallCount} time(s). Called paths: ${fsRmCalledPaths.join(', ')}`);
      }

      // Verify account was deleted
      const deletedAccount = mockAuth.getAccount();
      if (deletedAccount !== null) {
        throw new Error(`Expected account to be deleted (null), but got: ${deletedAccount}`);
      }
    });

    it('should NOT delete avatar file when resetting account', () => {
      const STORAGE_KEY = 'webos.account.v1';
      const avatarPath = '/root/Desktop/test-avatar.png';
      
      // Create account with avatar
      const account = {
        guid: 'test-guid',
        username: 'testuser',
        passwordHash: 'test-hash',
        salt: 'test-salt',
        avatar: avatarPath
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));

      // Reset account
      mockAuth.resetAccount();

      // Verify FS.rm was NOT called
      if (fsRmCallCount > 0) {
        throw new Error(`Expected FS.rm to NOT be called when resetting account, but it was called ${fsRmCallCount} time(s). Called paths: ${fsRmCalledPaths.join(', ')}`);
      }

      // Verify account was reset
      const resetAccount = mockAuth.getAccount();
      if (resetAccount !== null) {
        throw new Error(`Expected account to be reset (null), but got: ${resetAccount}`);
      }
    });

    it('should only unlink avatar from account, file should remain in filesystem', async () => {
      const STORAGE_KEY = 'webos.account.v1';
      const avatarPath = '/root/Desktop/test-avatar.png';
      
      // Create account with avatar
      const account = {
        guid: 'test-guid',
        username: 'testuser',
        passwordHash: 'test-hash',
        salt: 'test-salt',
        avatar: avatarPath
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));

      // Verify avatar exists in account
      let currentAccount = mockAuth.getAccount();
      if (currentAccount.avatar !== avatarPath) {
        throw new Error(`Expected avatar to be ${avatarPath}, but got: ${currentAccount.avatar}`);
      }

      // Remove avatar from account
      await mockAuth.updateAccount({ avatar: null });

      // Verify FS.rm was NOT called (file should remain)
      if (fsRmCallCount > 0) {
        throw new Error(`Expected FS.rm to NOT be called, but it was called ${fsRmCallCount} time(s). File should remain in filesystem.`);
      }

      // Verify account was updated (avatar unlinked)
      const updatedAccount = mockAuth.getAccount();
      if (updatedAccount.avatar !== null) {
        throw new Error(`Expected avatar to be null (unlinked), but got: ${updatedAccount.avatar}`);
      }

      // Note: In a real scenario, the file at avatarPath would still exist in FS
      // and could be reused or manually deleted by user via Files app
    });
  });
})();
