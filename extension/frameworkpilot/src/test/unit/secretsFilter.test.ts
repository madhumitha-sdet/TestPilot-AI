import * as assert from 'assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isExcludedFilename, readIfSafe } from '../../secretsFilter';

describe('secretsFilter', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-secrets-filter-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('excludes .env files by name', () => {
        assert.equal(isExcludedFilename('.env'), true);
        assert.equal(isExcludedFilename('.env.local'), true);

        const filePath = path.join(tmpDir, '.env');
        fs.writeFileSync(filePath, 'BASE_URL=https://example.com\n');
        assert.equal(readIfSafe(filePath, '.env'), undefined);
    });

    it('excludes .pem and .key files by extension', () => {
        assert.equal(isExcludedFilename('server.pem'), true);
        assert.equal(isExcludedFilename('private.key'), true);
    });

    it('excludes filenames containing "secret" or "credential"', () => {
        assert.equal(isExcludedFilename('my_secret_config.json'), true);
        assert.equal(isExcludedFilename('credentials.json'), true);
    });

    it('allows .env.example and .env.sample as documented exceptions', () => {
        assert.equal(isExcludedFilename('.env.example'), false);
        assert.equal(isExcludedFilename('.env.sample'), false);
    });

    it('withholds content that looks like an inline secret even for an otherwise-safe filename', () => {
        const filePath = path.join(tmpDir, 'config.py');
        fs.writeFileSync(filePath, 'api_key = "sk_live_abcdef123456"\n');
        assert.equal(readIfSafe(filePath, 'config.py'), undefined);
    });

    it('reads content through for a genuinely safe file', () => {
        const filePath = path.join(tmpDir, 'base_page.py');
        const content = 'class BasePage:\n    def __init__(self, page):\n        self.page = page\n';
        fs.writeFileSync(filePath, content);
        assert.equal(readIfSafe(filePath, 'base_page.py'), content);
    });
});
