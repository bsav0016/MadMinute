import { FactStats, parseFacts } from "./factStats";
import { MadMinuteSettings } from "./MadMinuteSettings";
import { parseSettings } from "./settingsStorage";
import { parseHistory, RoundRecord } from "./roundRecord";
import { AvatarId, parseRegistry, profileLabel, Title } from "@/storage/profiles";

// A backup of one player's progress as a block of text, to be sent through the share sheet (to Notes, Mail, Messages,
// a file app) and pasted back in later. Text needs no native module, so an over-the-air update can carry it. It holds
// the player's id, animal and word, their settings, round history and record of each problem, and nothing else.
//
// The data comes after a short note a person can read, as PREFIX.checksum.length.base64. The length says where the data
// ends, so a greeting or signature after it is ignored (and a copy that stops early is noticed), and the checksum
// catches a copy that was changed on the way. Line breaks inside the data are ignored.

export const BACKUP_PREFIX = "MADMINUTE1";
export const BACKUP_VERSION = 1;
// A full history and fact record is about 100 KB. Anything far past that is not one of ours.
export const MAX_BACKUP_CHARS = 2_000_000;

export interface BackupProfile {
    id: string;
    avatar: AvatarId;
    title: Title;
}

export interface Backup {
    exportedAt: number;
    profile: BackupProfile;
    settings: MadMinuteSettings | null;
    history: RoundRecord[];
    facts: FactStats;
}

export type BackupResult = { ok: true; backup: Backup } | { ok: false; reason: string };

// FNV-1a over the characters, as 8 hex digits. It is a check against damage, not a security feature.
export function checksum(text: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
}

// The text to share for one player.
export function buildBackupText(backup: Backup): string {
    const settings = backup.settings && {
        minValue: backup.settings.minValue,
        maxValue: backup.settings.maxValue,
        availableOperators: backup.settings.availableOperators,
        durationSeconds: backup.settings.durationSeconds,
        focusOnWeakSpots: backup.settings.focusOnWeakSpots,
    };
    const json = JSON.stringify({
        v: BACKUP_VERSION,
        exportedAt: backup.exportedAt,
        profile: backup.profile,
        settings,
        history: backup.history,
        facts: backup.facts,
    });
    const encoded = btoa(json);
    const rounds = backup.history.length;
    return [
        `Mad Minute progress for ${profileLabel(backup.profile)} (${rounds} ${rounds === 1 ? "round" : "rounds"}).`,
        `To restore it, open Mad Minute, tap Restore progress, and paste this whole message.`,
        ``,
        `${BACKUP_PREFIX}.${checksum(json)}.${encoded.length}.${encoded}`,
    ].join("\n");
}

const NOT_A_BACKUP = "That doesn't look like a Mad Minute backup. Copy the whole message and try again.";
const DAMAGED = "This backup is damaged or was cut off. Copy the whole message and try again.";

// Reads backup text back into progress, checking every part. Anything that is wrong gives a reason to show the player.
export function readBackup(text: string): BackupResult {
    if (text.length > MAX_BACKUP_CHARS) return { ok: false, reason: NOT_A_BACKUP };
    const header = new RegExp(`${BACKUP_PREFIX}\\.([0-9a-f]{8})\\.(\\d{1,7})\\.`).exec(text);
    if (!header) return { ok: false, reason: NOT_A_BACKUP };

    // Take exactly the stated number of characters after the header, skipping line breaks and spaces.
    const length = Number(header[2]);
    let encoded = "";
    for (let i = header.index + header[0].length; i < text.length && encoded.length < length; i++) {
        if (!/\s/.test(text[i])) encoded += text[i];
    }
    if (!/^[A-Za-z0-9+/=]*$/.test(encoded)) return { ok: false, reason: DAMAGED };

    let json: string;
    try {
        json = atob(encoded);
    } catch {
        return { ok: false, reason: DAMAGED };
    }
    if (checksum(json) !== header[1]) return { ok: false, reason: DAMAGED };

    let data: Record<string, unknown>;
    try {
        const parsed = JSON.parse(json);
        if (parsed === null || typeof parsed !== "object") return { ok: false, reason: NOT_A_BACKUP };
        data = parsed;
    } catch {
        return { ok: false, reason: DAMAGED };
    }

    if (typeof data.v !== "number" || data.v > BACKUP_VERSION) {
        return { ok: false, reason: "This backup is from a newer version of Mad Minute. Update the app and try again." };
    }
    if (typeof data.exportedAt !== "number" || !Number.isFinite(data.exportedAt)) return { ok: false, reason: NOT_A_BACKUP };

    // The profile is checked the same way a saved list of players is.
    const p = data.profile as Record<string, unknown> | null;
    if (p === null || typeof p !== "object") return { ok: false, reason: NOT_A_BACKUP };
    const registry = parseRegistry({ active: p.id, profiles: [{ id: p.id, avatar: p.avatar, title: p.title, createdAt: 0 }] });
    if (registry === null) return { ok: false, reason: NOT_A_BACKUP };
    const { id, avatar, title } = registry.profiles[0];

    const history = parseHistory(data.history);
    const facts = parseFacts(data.facts);
    if (history === null || facts === null) return { ok: false, reason: NOT_A_BACKUP };
    const settings = data.settings === null || data.settings === undefined ? null : parseSettings(data.settings);

    return { ok: true, backup: { exportedAt: data.exportedAt, profile: { id, avatar, title }, settings, history, facts } };
}
