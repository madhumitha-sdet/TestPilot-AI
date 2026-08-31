import * as assert from 'assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isProjectEmpty } from '../../projectInspector';

describe('projectInspector.isProjectEmpty', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-project-inspector-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('treats a non-existent path as empty', () => {
        assert.equal(isProjectEmpty(path.join(tmpDir, 'does-not-exist')), true);
    });

    it('treats a truly empty directory as empty', () => {
        assert.equal(isProjectEmpty(tmpDir), true);
    });

    it('treats a directory containing only OS noise files (.DS_Store) as empty', () => {
        fs.writeFileSync(path.join(tmpDir, '.DS_Store'), '');
        assert.equal(isProjectEmpty(tmpDir), true);
    });

    it('treats a directory containing only instructions.md/skill.md as empty (bootstrap-detection fix)', () => {
        fs.writeFileSync(path.join(tmpDir, 'instructions.md'), '# Instructions\n');
        fs.writeFileSync(path.join(tmpDir, 'skill.md'), '# Skill\n');
        assert.equal(isProjectEmpty(tmpDir), true);
    });

    it('treats a directory with a genuine project file as non-empty', () => {
        fs.writeFileSync(path.join(tmpDir, 'instructions.md'), '# Instructions\n');
        fs.writeFileSync(path.join(tmpDir, 'conftest.py'), '# real framework file\n');
        assert.equal(isProjectEmpty(tmpDir), false);
    });
});
