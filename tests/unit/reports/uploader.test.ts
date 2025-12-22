/**
 * Unit tests for ReportUploader
 * Per Sync-Mechanism-Requirements.md: sync must succeed before file upload
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ReportUploader } from '../../../src/reports/uploader';
import { ReportUploadError } from '../../../src/types';

// Mock fetch globally to simulate successful sync
const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ code: 2000, msg: 'success', data: null }),
  } as Response)
);

vi.stubGlobal('fetch', mockFetch);

describe('ReportUploader', () => {
  const testReportsDir = path.join(__dirname, '../../fixtures/test-reports');
  let uploader: ReportUploader;

  beforeEach(async () => {
    // Reset mock before each test
    mockFetch.mockClear();

    // Clean and recreate test directory to ensure clean state
    try {
      await fs.rm(testReportsDir, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    await fs.mkdir(testReportsDir, { recursive: true });

    // Create uploader with mock server domain and owner for sync to work
    uploader = new ReportUploader(
      testReportsDir,
      {
        enableUpload: true,
        maxSizeMB: 1,
        autoVersioning: true,
        filePermissions: '644',
        linkBaseUrl: 'https://test.example.com/reports/',
      },
      'https://mock-server.test' // Mock server domain for sync
    );
  });

  afterEach(async () => {
    // Clean up test directory with retry logic for race conditions
    try {
      await fs.rm(testReportsDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors (race condition in parallel tests)
      console.warn('Cleanup warning:', (error as Error).message);
    }
  });

  describe('Input Validation', () => {
    it('should reject invalid command name with special characters', async () => {
      await expect(
        uploader.upload({
          command_name: 'invalid/../command',
          report_content: 'test content',
          owner: 'test@example.com',
        })
      ).rejects.toThrow(ReportUploadError);
    });

    it('should reject empty report content', async () => {
      await expect(
        uploader.upload({
          command_name: 'test_command',
          report_content: '   ',
          owner: 'test@example.com',
        })
      ).rejects.toThrow(ReportUploadError);
    });

    it('should reject oversized report', async () => {
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
      await expect(
        uploader.upload({
          command_name: 'test_command',
          report_content: largeContent,
          owner: 'test@example.com',
        })
      ).rejects.toThrow(ReportUploadError);
    });

    it.skip('should accept valid command name', async () => {
      const result = await uploader.upload({
        command_name: 'valid_command-123',
        report_content: '# Test Report',
        owner: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject report name with invalid characters', async () => {
      await expect(
        uploader.upload({
          command_name: 'test_command',
          report_content: 'test',
          report_name: 'invalid/report',
          owner: 'test@example.com',
        })
      ).rejects.toThrow(ReportUploadError);
    });

    it('should accept report name with Chinese characters', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        report_name: '测试报告_2024',
        owner: 'test@example.com',
      });
      expect(result.success).toBe(true);
      expect(result.report_name).toContain('测试报告');
    });
  });

  describe('Directory Management', () => {
    it('should create command directory if not exists', async () => {
      const result = await uploader.upload({
        command_name: 'new_command',
        report_content: '# New Command Report',
        owner: 'test@example.com',
      });

      const dirPath = path.join(testReportsDir, 'new_command');
      const dirExists = await fs
        .access(dirPath)
        .then(() => true)
        .catch(() => false);

      expect(dirExists).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should use existing command directory', async () => {
      const cmdDir = path.join(testReportsDir, 'existing_command');
      await fs.mkdir(cmdDir, { recursive: true });

      const result = await uploader.upload({
        command_name: 'existing_command',
        report_content: '# Existing Command Report',
        owner: 'test@example.com',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Filename Generation', () => {
    it('should generate default filename with timestamp', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        owner: 'test@example.com',
      });

      // No conflict = no version suffix, format: test_command_报告_YYYYMMDD_HHMMSS.md
      expect(result.report_name).toMatch(/test_command_报告_\d{8}_\d{6}\.md/);
    });

    it('should use custom report name', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        report_name: 'Custom Analysis Report',
        owner: 'test@example.com',
      });

      expect(result.report_name).toContain('Custom_Analysis_Report');
    });

    it('should sanitize custom report name', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        report_name: 'Report   with    spaces',
        owner: 'test@example.com',
      });

      expect(result.report_name).toContain('Report_with_spaces');
    });
  });

  describe('Version Conflict Resolution', () => {
    it('should create file without version suffix for first upload (no conflict)', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        owner: 'test@example.com',
      });

      // No conflict = version 0, no _v1 suffix
      expect(result.version).toBe(0);
      expect(result.report_name).toMatch(/\.md$/);
      expect(result.report_name).not.toContain('_v1.md');
    });

    it('should auto-increment version on conflict', async () => {
      // First upload with custom name
      const result1 = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test 1',
        report_name: 'conflict_test',
        owner: 'test@example.com',
      });

      expect(result1.success).toBe(true);
      // First upload has no conflict, version = 0
      expect(result1.version).toBe(0);
      expect(result1.report_name).toBe('conflict_test.md');

      // Second upload with SAME name should conflict and get _v1
      const result2 = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test 2 - should be v1',
        report_name: 'conflict_test',
        owner: 'test@example.com',
      });

      expect(result2.success).toBe(true);
      expect(result2.version).toBe(1);
      expect(result2.report_name).toBe('conflict_test_v1.md');

      // Third upload should get _v2
      const result3 = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test 3 - should be v2',
        report_name: 'conflict_test',
        owner: 'test@example.com',
      });

      expect(result3.success).toBe(true);
      expect(result3.version).toBe(2);
      expect(result3.report_name).toBe('conflict_test_v2.md');
    });
  });

  describe('File Operations', () => {
    it('should write file with correct content', async () => {
      const content = '# Test Report\n\nThis is test content.';
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: content,
        owner: 'test@example.com',
      });

      const fileContent = await fs.readFile(result.report_path, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should write file with UTF-8 encoding', async () => {
      const content = '# 测试报告\n\n这是中文内容。';
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: content,
        owner: 'test@example.com',
      });

      const fileContent = await fs.readFile(result.report_path, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should return correct file path', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        owner: 'test@example.com',
      });

      expect(result.report_path).toContain('test_command');
      expect(result.report_path).toContain('.md');

      // Verify file exists
      const fileExists = await fs
        .access(result.report_path)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  describe('Link Generation', () => {
    it('should generate link when base URL configured', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        owner: 'test@example.com',
      });

      expect(result.report_link).toBeDefined();
      expect(result.report_link).toContain('https://test.example.com/reports/');
      expect(result.report_link).toContain('test_command');
    });

    it('should not generate link when base URL not configured', async () => {
      const uploaderNoLink = new ReportUploader(
        testReportsDir,
        {
          enableUpload: true,
          maxSizeMB: 1,
          autoVersioning: true,
          filePermissions: '644',
        },
        'https://mock-server.test'
      );

      const result = await uploaderNoLink.upload({
        command_name: 'test_command',
        report_content: '# Test',
        owner: 'test@example.com',
      });

      expect(result.report_link).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw ReportUploadError with code', async () => {
      try {
        await uploader.upload({
          command_name: 'invalid@name',
          report_content: 'test',
          owner: 'test@example.com',
        });
        expect.fail('Should have thrown ReportUploadError');
      } catch (error) {
        expect(error).toBeInstanceOf(ReportUploadError);
        expect((error as ReportUploadError).code).toBe('INVALID_COMMAND_NAME');
      }
    });

    it('should handle size limit error', async () => {
      const largeContent = 'x'.repeat(2 * 1024 * 1024);
      try {
        await uploader.upload({
          command_name: 'test_command',
          report_content: largeContent,
          owner: 'test@example.com',
        });
        expect.fail('Should have thrown ReportUploadError');
      } catch (error) {
        expect(error).toBeInstanceOf(ReportUploadError);
        expect((error as ReportUploadError).code).toBe('SIZE_LIMIT_EXCEEDED');
      }
    });

    it('should handle empty content error', async () => {
      try {
        await uploader.upload({
          command_name: 'test_command',
          report_content: '',
          owner: 'test@example.com',
        });
        expect.fail('Should have thrown ReportUploadError');
      } catch (error) {
        expect(error).toBeInstanceOf(ReportUploadError);
        expect((error as ReportUploadError).code).toBe('EMPTY_CONTENT');
      }
    });
  });

  describe('Sync Mechanism', () => {
    it('should fail upload when sync fails (no domain configured)', async () => {
      const uploaderNoDomain = new ReportUploader(testReportsDir, {
        enableUpload: true,
        maxSizeMB: 1,
        autoVersioning: true,
        filePermissions: '644',
      });
      // No domain configured = precondition failure

      const result = await uploaderNoDomain.upload({
        command_name: 'test_command',
        report_content: '# Test',
        owner: 'test@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.sync_status).toBe('failed');
      expect(result.message).toContain('未配置 mcp_server_domain');
    });

    it('should fail upload when sync fails (no owner)', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        // No owner provided
      });

      expect(result.success).toBe(false);
      expect(result.sync_status).toBe('failed');
      expect(result.message).toContain('未提供 owner');
    });

    it('should fail upload when sync fails (invalid owner format)', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        owner: 'invalid-owner', // Invalid email format
      });

      expect(result.success).toBe(false);
      expect(result.sync_status).toBe('failed');
      expect(result.message).toContain('owner 格式错误');
    });

    it('should succeed when sync passes', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        owner: 'test@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.sync_status).toBe('success');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should retry sync on failure and eventually succeed', async () => {
      // First 2 calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ code: 2000, msg: 'success', data: null }),
        } as Response);

      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        owner: 'test@example.com',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exhausted', async () => {
      // All calls fail
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        owner: 'test@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.sync_status).toBe('failed');
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });
});
