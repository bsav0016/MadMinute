import { Backup, BACKUP_PREFIX, BACKUP_VERSION, buildBackupText, checksum, MAX_BACKUP_CHARS, readBackup } from '../backup';
import { MadMinuteSettings } from '../MadMinuteSettings';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { RoundRecord } from '../roundRecord';
import { FactStats } from '../factStats';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const round = (id: string): RoundRecord => ({
    id, playedAt: 1000, operators: [MadMinuteOperator.Addition], minValue: 0, maxValue: 12, durationSeconds: 60,
    correct: 20, incorrect: 2, skipped: 1, byOperator: { [MadMinuteOperator.Addition]: { correct: 20, incorrect: 2, skipped: 1 } },
});
const FACTS: FactStats = { 'x:7:8': { attempts: 4, correct: 3, timedCorrect: 3, correctMs: 6000, lastSeen: 100 } };

const sample = (): Backup => ({
    exportedAt: 5000,
    profile: { id: 'pabc', avatar: 'owl', title: 'Brave' },
    settings: new MadMinuteSettings(2, 12, [MadMinuteOperator.Multiplication], 120, true),
    history: [round('r2'), round('r1')],
    facts: FACTS,
    practice: null,
});

// Re-encodes edited data with a matching checksum, to test what is inside rather than the wrapper.
function wrap(data: unknown): string {
    const json = JSON.stringify(data);
    const encoded = btoa(json);
    return `${BACKUP_PREFIX}.${checksum(json)}.${encoded.length}.${encoded}`;
}
const inner = (over: Record<string, unknown> = {}) => ({
    v: BACKUP_VERSION, exportedAt: 5000, profile: { id: 'pabc', avatar: 'owl', title: 'Brave' },
    settings: null, history: [], facts: {}, ...over,
});
const reasonOf = (text: string) => {
    const result = readBackup(text);
    if (result.ok) throw new Error('expected a failure');
    return result.reason;
};

describe('backup text', () => {
    it('round-trips a player\'s progress', () => {
        const result = readBackup(buildBackupText(sample()));
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.backup.profile).toEqual({ id: 'pabc', avatar: 'owl', title: 'Brave' });
        expect(result.backup.history).toEqual(sample().history);
        expect(result.backup.facts).toEqual(FACTS);
        expect(result.backup.settings).toEqual(sample().settings);
        expect(result.backup.exportedAt).toBe(5000);
    });

    it('says whose progress it is and how many rounds, in words a person can read', () => {
        const text = buildBackupText(sample());
        expect(text).toContain('Mad Minute progress for Brave Owl (2 rounds)');
        expect(text).toContain('Restore progress');
        expect(buildBackupText({ ...sample(), history: [round('a')] })).toContain('(1 round)');
    });

    it('holds nothing but the progress: no device, account or contact details', () => {
        const json = atob(buildBackupText(sample()).split('.').pop()!);
        expect(Object.keys(JSON.parse(json)).sort()).toEqual(['exportedAt', 'facts', 'history', 'practice', 'profile', 'settings', 'v']);
    });

    it('round-trips a player with no saved settings', () => {
        const result = readBackup(buildBackupText({ ...sample(), settings: null }));
        expect(result.ok && result.backup.settings).toBeNull();
    });

    it('survives being pasted with other text around it, and with the code split across lines', () => {
        const text = buildBackupText(sample());
        const code = text.split('\n').pop()!;
        const wrapped = code.replace(/(.{60})/g, '$1\n  ');
        const result = readBackup(`Hi Mum,\n\n${text.replace(code, wrapped)}\n\nSent from my phone`);
        expect(result.ok).toBe(true);
    });

    it('survives a large record', () => {
        const history = Array.from({ length: 200 }, (_, i) => round(`r${i}`));
        const facts: FactStats = {};
        for (let a = 0; a < 13; a++) for (let b = a; b < 13; b++) facts[`x:${a}:${b}`] = FACTS['x:7:8'];
        const text = buildBackupText({ ...sample(), history, facts });
        expect(text.length).toBeLessThan(MAX_BACKUP_CHARS);
        const result = readBackup(text);
        expect(result.ok && result.backup.history).toHaveLength(200);
        expect(result.ok && Object.keys(result.backup.facts)).toHaveLength(91);
    });
});

describe('reading a backup that is wrong', () => {
    it('refuses text that is not a backup', () => {
        expect(reasonOf('hello')).toMatch(/doesn't look like a Mad Minute backup/);
        expect(reasonOf('')).toMatch(/doesn't look like a Mad Minute backup/);
        expect(reasonOf(`${BACKUP_PREFIX}.zzzz.abc`)).toMatch(/doesn't look like/);
        expect(reasonOf(`${BACKUP_PREFIX}.00000000.abc`)).toMatch(/doesn't look like/); // no length
    });

    it('notices a copy that was cut off', () => {
        const text = buildBackupText(sample());
        expect(reasonOf(text.slice(0, text.length - 40))).toMatch(/damaged or was cut off/);
    });

    it('notices when something other than the code is mixed into it', () => {
        const text = buildBackupText(sample());
        const i = text.length - 30;
        expect(reasonOf(text.slice(0, i) + '!' + text.slice(i + 1))).toMatch(/damaged or was cut off/);
    });

    it('notices a change that leaves the data readable, which only the checksum can see', () => {
        const text = buildBackupText(sample());
        const [, sum, , encoded] = text.split('\n').pop()!.split('.');
        const changed = atob(encoded).replace('"correct":20', '"correct":21'); // same length, still valid JSON
        expect(changed).not.toBe(atob(encoded));
        const forged = `${BACKUP_PREFIX}.${sum}.${btoa(changed).length}.${btoa(changed)}`;
        expect(reasonOf(forged)).toMatch(/damaged or was cut off/);
    });

    it('notices a changed character', () => {
        const text = buildBackupText(sample());
        const i = text.length - 30;
        const flipped = text.slice(0, i) + (text[i] === 'A' ? 'B' : 'A') + text.slice(i + 1);
        expect(reasonOf(flipped)).toMatch(/damaged or was cut off/);
    });

    it('refuses a backup from a newer version of the app', () => {
        expect(reasonOf(wrap(inner({ v: BACKUP_VERSION + 1 })))).toMatch(/newer version/);
    });

    it('refuses something huge', () => {
        expect(reasonOf('x'.repeat(MAX_BACKUP_CHARS + 1))).toMatch(/doesn't look like/);
    });

    it('refuses data that is not an object, or has no timestamp', () => {
        expect(reasonOf(wrap(5))).toMatch(/doesn't look like/);
        expect(reasonOf(wrap(null))).toMatch(/doesn't look like/);
        expect(reasonOf(wrap(inner({ exportedAt: 'later' })))).toMatch(/doesn't look like/);
        expect(reasonOf(wrap(inner({ v: undefined })))).toMatch(/newer version|doesn't look like/);
    });

    it.each([
        ['an id that would clash with storage keys', { id: 'a.b', avatar: 'owl', title: 'Brave' }],
        ['an unknown animal', { id: 'p1', avatar: 'dragon', title: 'Brave' }],
        ['no profile', null],
        ['a profile that is not an object', 'owl'],
    ])('refuses %s', (_name, profile) => {
        expect(reasonOf(wrap(inner({ profile })))).toMatch(/doesn't look like/);
    });

    it('swaps in a word for one that is not on the list instead of refusing', () => {
        const result = readBackup(wrap(inner({ profile: { id: 'p1', avatar: 'owl', title: 'Grumpy' } })));
        expect(result.ok).toBe(true);
        expect(result.ok && result.backup.profile.title).not.toBe('Grumpy');
    });

    it('refuses history or facts that are the wrong shape', () => {
        expect(reasonOf(wrap(inner({ history: 'lots' })))).toMatch(/doesn't look like/);
        expect(reasonOf(wrap(inner({ facts: [] })))).toMatch(/doesn't look like/);
    });

    it('drops bad rounds and bad facts but keeps the good ones', () => {
        const data = inner({
            history: [round('ok'), { id: 'bad' }, round('ok'), 7],
            facts: { 'x:7:8': FACTS['x:7:8'], 'x:1:1': { attempts: 1, correct: 5, timedCorrect: 0, correctMs: 0, lastSeen: 1 }, nonsense: 1 },
        });
        const result = readBackup(wrap(data));
        expect(result.ok && result.backup.history.map(r => r.id)).toEqual(['ok']);
        expect(result.ok && Object.keys(result.backup.facts)).toEqual(['x:7:8']);
    });

    it('treats settings it cannot read as none, rather than refusing the backup', () => {
        const result = readBackup(wrap(inner({ settings: { minValue: 9, maxValue: 3 } })));
        expect(result.ok && result.backup.settings).toBeNull();
    });
});

describe('checksum', () => {
    it('is 8 hex digits and changes with any change', () => {
        expect(checksum('abc')).toMatch(/^[0-9a-f]{8}$/);
        expect(checksum('abc')).not.toBe(checksum('abd'));
        expect(checksum('')).toBe('811c9dc5');
    });
});
