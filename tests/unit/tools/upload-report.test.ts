/**
 * Unit tests for upload_report tool handler
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { handleUploadReport } from '../../../src/tools/upload-report';
import { ReportUploader } from '../../../src/reports/uploader';
import { UploadReportOutput } from '../../../src/types';

describe('handleUploadReport', () => {
  const testReportsDir = path.join(__dirname, '../../fixtures/test-upload-handler');
  let uploader: ReportUploader;

  beforeEach(async () => {
    await fs.mkdir(testReportsDir, { recursive: true });

    uploader = new ReportUploader(testReportsDir, {
      enableUpload: true,
      maxSizeMB: 1,
      autoVersioning: true,
      filePermissions: '644',
      linkBaseUrl: 'https://test.example.com/',
    });
  });

  afterEach(async () => {
    await fs.rm(testReportsDir, { recursive: true, force: true });
  });

  it('should handle valid upload request', async () => {
    const input = {
      command_name: 'test_command',
      report_content: '# Test Report\n\nContent here.',
    };

    const result = await handleUploadReport(input, uploader);

    expect(result).toHaveProperty('success', true);
    expect((result as UploadReportOutput).report_name).toBeDefined();
    expect((result as UploadReportOutput).report_path).toBeDefined();
  });

  it('should handle upload with custom report name', async () => {
    const input = {
      command_name: 'test_command',
      report_content: '# Custom Report',
      report_name: 'My_Custom_Report',
    };

    const result = await handleUploadReport(input, uploader);

    expect(result).toHaveProperty('success', true);
    expect((result as UploadReportOutput).report_name).toContain('My_Custom_Report');
  });

  it('should return error for invalid command name', async () => {
    const input = {
      command_name: 'invalid/command',
      report_content: 'test',
    };

    const result = await handleUploadReport(input, uploader);

    expect(result).toHaveProperty('error');
    const errorResult = result as { error: { code: string; message: string } };
    expect(errorResult.error.code).toBe('INVALID_COMMAND_NAME');
  });

  it('should return error for empty content', async () => {
    const input = {
      command_name: 'test_command',
      report_content: '',
    };

    const result = await handleUploadReport(input, uploader);

    expect(result).toHaveProperty('error');
    const errorResult = result as { error: { code: string; message: string } };
    expect(errorResult.error.code).toBe('EMPTY_CONTENT');
  });

  it('should return error for oversized content', async () => {
    const input = {
      command_name: 'test_command',
      report_content: 'x'.repeat(2 * 1024 * 1024), // 2MB
    };

    const result = await handleUploadReport(input, uploader);

    expect(result).toHaveProperty('error');
    const errorResult = result as { error: { code: string; message: string } };
    expect(errorResult.error.code).toBe('SIZE_LIMIT_EXCEEDED');
  });

  it('should include version number in success response', async () => {
    const input = {
      command_name: 'test_command',
      report_content: '# Test',
    };

    const result = await handleUploadReport(input, uploader);

    expect(result).toHaveProperty('success', true);
    expect((result as UploadReportOutput).version).toBe(1);
  });

  it('should include link in success response when configured', async () => {
    const input = {
      command_name: 'test_command',
      report_content: '# Test',
    };

    const result = await handleUploadReport(input, uploader);

    expect(result).toHaveProperty('success', true);
    expect((result as UploadReportOutput).report_link).toBeDefined();
    expect((result as UploadReportOutput).report_link).toContain('https://test.example.com/');
  });

  it('should handle Chinese content correctly', async () => {
    const input = {
      command_name: 'test_command',
      report_content: '# 测试报告\n\n这是中文内容。',
      report_name: '中文报告名称',
    };

    const result = await handleUploadReport(input, uploader);

    expect(result).toHaveProperty('success', true);
    expect((result as UploadReportOutput).report_name).toContain('中文报告名称');
  });
});

