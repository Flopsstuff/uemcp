import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { exportEnvironmentSnapshot, importEnvironmentSnapshot } from '../utils/environment-snapshot.js';

describe('environment snapshot filesystem safety', () => {
describe('Filesystem symlink safety', () => {
    it('should reject exporting through symlinked project path components', async () => {
      const previousCwd = process.cwd();
      const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-env-project-'));
      const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-env-outside-'));

      try {
        process.chdir(projectDir);
        await fs.symlink(outsideDir, path.join(projectDir, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');

        const result = await exportEnvironmentSnapshot({ path: 'escape/snapshot.json' });

        expect(result.success).toBe(false);
        expect(String(result.error)).toContain('SECURITY_VIOLATION');
        await expect(fs.access(path.join(outsideDir, 'snapshot.json'))).rejects.toThrow();
      } finally {
        process.chdir(previousCwd);
        await fs.rm(projectDir, { recursive: true, force: true });
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('should reject exporting through nested symlinked project path components even when they resolve inside the project', async () => {
      const previousCwd = process.cwd();
      const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-env-project-'));

      try {
        process.chdir(projectDir);
        await fs.mkdir(path.join(projectDir, 'real', 'sub'), { recursive: true });
        await fs.symlink(path.join(projectDir, 'real'), path.join(projectDir, 'link'), process.platform === 'win32' ? 'junction' : 'dir');

        const result = await exportEnvironmentSnapshot({ path: 'link/sub/snapshot.json' });

        expect(result.success).toBe(false);
        expect(String(result.error)).toContain('SECURITY_VIOLATION');
        await expect(fs.access(path.join(projectDir, 'real', 'sub', 'snapshot.json'))).rejects.toThrow();
      } finally {
        process.chdir(previousCwd);
        await fs.rm(projectDir, { recursive: true, force: true });
      }
    });

    it('should reject importing through symlinked project path components', async () => {
      const previousCwd = process.cwd();
      const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-env-project-'));
      const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-env-outside-'));

      try {
        process.chdir(projectDir);
        await fs.writeFile(path.join(outsideDir, 'secret.json'), '{"timeOfDay": 12}', 'utf8');
        await fs.symlink(outsideDir, path.join(projectDir, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');

        const result = await importEnvironmentSnapshot({ path: 'escape/secret.json' });

        expect(result.success).toBe(false);
        expect(String(result.error)).toContain('SECURITY_VIOLATION');
      } finally {
        process.chdir(previousCwd);
        await fs.rm(projectDir, { recursive: true, force: true });
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('should reject filename parameters containing drive or stream separators', async () => {
      for (const filename of ['foo:bar.json', 'C:foo.json']) {
        const result = await exportEnvironmentSnapshot({ path: 'tmp/unreal-mcp', filename });

        expect(result.success).toBe(false);
        expect(String(result.error)).toContain('SECURITY_VIOLATION');
      }
    });

    it('should reject filename parameters containing null bytes', async () => {
      const result = await exportEnvironmentSnapshot({ path: 'tmp/unreal-mcp', filename: 'env\0snapshot.json' });

      expect(result.success).toBe(false);
      expect(String(result.error)).toContain('SECURITY_VIOLATION');
      expect(String(result.error)).toContain('null bytes');
    });
  });

  describe('Snapshot import details', () => {
    it('should only expose parsed object snapshots as details', async () => {
      const previousCwd = process.cwd();
      const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-env-project-'));

      try {
        process.chdir(projectDir);
        await fs.mkdir(path.join(projectDir, 'tmp', 'unreal-mcp'), { recursive: true });
        await fs.writeFile(path.join(projectDir, 'tmp', 'unreal-mcp', 'array.json'), '[1,2,3]', 'utf8');

        const result = await importEnvironmentSnapshot({ path: 'tmp/unreal-mcp/array.json' });

        expect(result.success).toBe(true);
        expect(result.details).toBeUndefined();
      } finally {
        process.chdir(previousCwd);
        await fs.rm(projectDir, { recursive: true, force: true });
      }
    });
  });
});
