/**
 * Basic sanity tests
 */

import { describe, it, expect } from 'vitest';

describe('Basic Tests', () => {
  it('should pass basic sanity check', () => {
    expect(true).toBe(true);
  });

  it('should verify environment', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('should verify Node version', () => {
    const nodeVersion = process.version;
    expect(nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
  });
});

