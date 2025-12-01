/**
 * Unit tests for report_feedback tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleReportFeedback } from '../../../src/tools/report-feedback';
import { ReportUploader } from '../../../src/reports/uploader';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ReportFeedbackInput } from '../../../src/types';

const TEST_REPORTS_DIR = path.join(__dirname, '../../fixtures/test-reports');
const TEST_LOCAL_REPORTS_DIR = path.join(process.cwd(), 'local-reports');

describe('report_feedback tool', () => {
  let uploader: ReportUploader;

  beforeEach(async () => {
    // Setup test directories
    await fs.mkdir(TEST_REPORTS_DIR, { recursive: true });
    
    // Initialize uploader
    uploader = new ReportUploader(TEST_REPORTS_DIR, {
      enableUpload: true,
      maxSizeMB: 10,
      autoVersioning: true,
      filePermissions: '644',
    });
  });

  afterEach(async () => {
    // Cleanup test directories with retry logic
    try {
      await fs.rm(TEST_REPORTS_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Cleanup warning:', (error as Error).message);
    }
    try {
      await fs.rm(TEST_LOCAL_REPORTS_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Cleanup warning:', (error as Error).message);
    }
  });

  describe('user wants upload', () => {
    it('should upload report when user confirms upload', async () => {
      const input: ReportFeedbackInput = {
        command_name: 'test_command',
        report_content: '# Test Report\n\nThis is a test report.',
        user_wants_upload: true,
      };

      const result = await handleReportFeedback(input, uploader);

      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.success).toBe(true);
      expect(result.action_taken).toBe('uploaded');
      expect(result.report_path).toContain('test_command');
      expect(result.report_name).toContain('test_command');
      expect(result.report_link).toBeUndefined(); // No base URL configured
      expect(result.version).toBe(1);

      // Verify file exists in server directory
      const fileExists = await fs.access(result.report_path).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should upload report with custom name when provided', async () => {
      const input: ReportFeedbackInput = {
        command_name: 'test_command',
        report_content: '# Test Report\n\nThis is a test report.',
        report_name: 'Custom Report Name',
        user_wants_upload: true,
      };

      const result = await handleReportFeedback(input, uploader);

      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.success).toBe(true);
      expect(result.action_taken).toBe('uploaded');
      expect(result.report_name).toContain('Custom_Report_Name');
    });
  });

  describe('user wants local only', () => {
    it('should save report locally when user declines upload', async () => {
      const input: ReportFeedbackInput = {
        command_name: 'test_command',
        report_content: '# Test Report\n\nThis is a test report.',
        user_wants_upload: false,
      };

      const result = await handleReportFeedback(input, uploader);

      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.success).toBe(true);
      expect(result.action_taken).toBe('saved_locally');
      expect(result.report_path).toContain('local-reports');
      expect(result.report_path).toContain('test_command');
      expect(result.report_name).toContain('_local.md');
      expect(result.report_link).toBeUndefined();
      expect(result.version).toBeUndefined();

      // Verify file exists in local directory
      const fileExists = await fs.access(result.report_path).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify file does NOT exist in server directory
      const serverPath = path.join(TEST_REPORTS_DIR, 'test_command', result.report_name);
      const serverFileExists = await fs.access(serverPath).then(() => true).catch(() => false);
      expect(serverFileExists).toBe(false);
    });

    it('should save report locally with custom name', async () => {
      const input: ReportFeedbackInput = {
        command_name: 'test_command',
        report_content: '# Test Report\n\nThis is a test report.',
        report_name: 'My Local Report',
        user_wants_upload: false,
      };

      const result = await handleReportFeedback(input, uploader);

      expect('error' in result).toBe(false);
      if ('error' in result) return;

      expect(result.success).toBe(true);
      expect(result.action_taken).toBe('saved_locally');
      expect(result.report_name).toContain('My_Local_Report');
      expect(result.report_name).toContain('_local.md');
    });
  });

  describe('validation', () => {
    it('should fail with invalid command name', async () => {
      const input: ReportFeedbackInput = {
        command_name: 'invalid/command',
        report_content: '# Test Report',
        user_wants_upload: true,
      };

      const result = await handleReportFeedback(input, uploader);

      expect('error' in result).toBe(true);
      if (!('error' in result)) return;

      expect(result.error).toBeDefined();
      const error = result.error as { code: string; message: string };
      expect(error.code).toBe('INVALID_COMMAND_NAME');
    });

    it('should fail with empty content', async () => {
      const input: ReportFeedbackInput = {
        command_name: 'test_command',
        report_content: '   ',
        user_wants_upload: true,
      };

      const result = await handleReportFeedback(input, uploader);

      expect('error' in result).toBe(true);
      if (!('error' in result)) return;

      const error = result.error as { code: string; message: string };
      expect(error.code).toBe('EMPTY_CONTENT');
    });

    it('should fail with oversized content', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const input: ReportFeedbackInput = {
        command_name: 'test_command',
        report_content: largeContent,
        user_wants_upload: true,
      };

      const result = await handleReportFeedback(input, uploader);

      expect('error' in result).toBe(true);
      if (!('error' in result)) return;

      const error = result.error as { code: string; message: string };
      expect(error.code).toBe('SIZE_LIMIT_EXCEEDED');
    });
  });

  describe('version handling', () => {
    it('should auto-increment version on upload conflicts', async () => {
      const input: ReportFeedbackInput = {
        command_name: 'test_command',
        report_content: '# Test Report\n\nThis is a test report.',
        report_name: 'Same Name',
        user_wants_upload: true,
      };

      // First upload
      const result1 = await handleReportFeedback(input, uploader, TEST_REPORTS_DIR);
      expect('error' in result1).toBe(false);
      if ('error' in result1) return;

      expect(result1.version).toBe(1);

      // Second upload with same name (should increment version)
      const result2 = await handleReportFeedback(input, uploader, TEST_REPORTS_DIR);
      expect('error' in result2).toBe(false);
      if ('error' in result2) return;

      expect(result2.version).toBe(2);
      expect(result2.report_name).toContain('_v2.md');
    });
  });
});

