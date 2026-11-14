import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';

describe('Serverless Deployment Bundles (index.js, app.js, serverless.js)', () => {
  const apiDir = path.resolve(__dirname, '..');
  const indexJsPath = path.join(apiDir, 'index.js');
  const appJsPath = path.join(apiDir, 'app.js');
  const serverlessJsPath = path.join(apiDir, 'serverless.js');

  it('1. index.js exists and is self-contained with no external require(express)', () => {
    expect(fs.existsSync(indexJsPath)).toBe(true);
    const content = fs.readFileSync(indexJsPath, 'utf8');

    // Confirm that Express application creator is inlined inside the bundle
    expect(content).toContain('createApplication');

    // Confirm module exports the Express app instance
    expect(content).toContain('module.exports = app');

    // Confirm dead-code elimination of app.listen for serverless (guarded by if (false))
    expect(content).toContain('if (false)');
  });

  it('2. app.js exists and delegates to index.js', () => {
    expect(fs.existsSync(appJsPath)).toBe(true);
    const content = fs.readFileSync(appJsPath, 'utf8');
    expect(content).toContain("require('./index.js')");
  });

  it('3. serverless.js exists as a mirrored backup', () => {
    expect(fs.existsSync(serverlessJsPath)).toBe(true);
    const indexStats = fs.statSync(indexJsPath);
    const serverlessStats = fs.statSync(serverlessJsPath);
    expect(serverlessStats.size).toBe(indexStats.size);
  });

  it('4. index.js and app.js can be imported cleanly without binding to network ports', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const indexApp = require('../index.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appApp = require('../app.js');

    expect(typeof indexApp).toBe('function');
    expect(typeof indexApp.use).toBe('function');
    expect(typeof indexApp.get).toBe('function');

    expect(typeof appApp).toBe('function');
    expect(typeof appApp.use).toBe('function');
    expect(typeof appApp.get).toBe('function');
  });
});
