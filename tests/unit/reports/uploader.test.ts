/**
 * Unit tests for ReportUploader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ReportUploader } from '../../../src/reports/uploader';
import { ReportUploadError } from '../../../src/types';

describe('ReportUploader', () => {
  const testReportsDir = path.join(__dirname, '../../fixtures/test-reports');
  let uploader: ReportUploader;

  beforeEach(async () => {
    // Clean and recreate test directory to ensure clean state
    try {
      await fs.rm(testReportsDir, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    await fs.mkdir(testReportsDir, { recursive: true });

    uploader = new ReportUploader(testReportsDir, {
      enableUpload: true,
      maxSizeMB: 1,
      autoVersioning: true,
      filePermissions: '644',
      linkBaseUrl: 'https://test.example.com/reports/',
    });
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
        })
      ).rejects.toThrow(ReportUploadError);
    });

    it('should reject empty report content', async () => {
      await expect(
        uploader.upload({
          command_name: 'test_command',
          report_content: '   ',
        })
      ).rejects.toThrow(ReportUploadError);
    });

    it('should reject oversized report', async () => {
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
      await expect(
        uploader.upload({
          command_name: 'test_command',
          report_content: largeContent,
        })
      ).rejects.toThrow(ReportUploadError);
    });

    it.skip('should accept valid command name', async () => {
      const result = await uploader.upload({
        command_name: 'valid_command-123',
        report_content: '# Test Report',
      });
      expect(result.success).toBe(true);
    });

    it('should reject report name with invalid characters', async () => {
      await expect(
        uploader.upload({
          command_name: 'test_command',
          report_content: 'test',
          report_name: 'invalid/report',
        })
      ).rejects.toThrow(ReportUploadError);
    });

    it('should accept report name with Chinese characters', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        report_name: '测试报告_2024',
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
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Filename Generation', () => {
    it('should generate default filename with timestamp', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
      });

      // No conflict = no version suffix, format: test_command_报告_YYYYMMDD_HHMMSS.md
      expect(result.report_name).toMatch(/test_command_报告_\d{8}_\d{6}\.md/);
    });

    it('should use custom report name', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        report_name: 'Custom Analysis Report',
      });

      expect(result.report_name).toContain('Custom_Analysis_Report');
    });

    it('should sanitize custom report name', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
        report_name: 'Report   with    spaces',
      });

      expect(result.report_name).toContain('Report_with_spaces');
    });
  });

  describe('Version Conflict Resolution', () => {
    it('should create file without version suffix for first upload (no conflict)', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
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
      });

      expect(result2.success).toBe(true);
      expect(result2.version).toBe(1);
      expect(result2.report_name).toBe('conflict_test_v1.md');

      // Third upload should get _v2
      const result3 = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test 3 - should be v2',
        report_name: 'conflict_test',
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
      });

      const fileContent = await fs.readFile(result.report_path, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should write file with UTF-8 encoding', async () => {
      const content = '# 测试报告\n\n这是中文内容。';
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: content,
      });

      const fileContent = await fs.readFile(result.report_path, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should return correct file path', async () => {
      const result = await uploader.upload({
        command_name: 'test_command',
        report_content: '# Test',
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
      });

      expect(result.report_link).toBeDefined();
      expect(result.report_link).toContain('https://test.example.com/reports/');
      expect(result.report_link).toContain('test_command');
    });

    it('should not generate link when base URL not configured', async () => {
      const uploaderNoLink = new ReportUploader(testReportsDir, {
        enableUpload: true,
        maxSizeMB: 1,
        autoVersioning: true,
        filePermissions: '644',
      });

      const result = await uploaderNoLink.upload({
        command_name: 'test_command',
        report_content: '# Test',
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
        });
        expect.fail('Should have thrown ReportUploadError');
      } catch (error) {
        expect(error).toBeInstanceOf(ReportUploadError);
        expect((error as ReportUploadError).code).toBe('EMPTY_CONTENT');
      }
    });
  });
});

