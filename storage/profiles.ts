import { loadStored, removeStored, saveStored, STORAGE_KEYS } from "./storage";

// A profile is only an avatar. There is no typed name, so the app never stores anything a child could type about
// themselves, and the avatar's own name is what is shown and spoken.
export const AVATARS = [
    { id: "fox", label: "Fox", emoji: "🦊" },
    { id: "owl", label: "Owl", emoji: "🦉" },
    { id: "frog", label: "Frog", emoji: "🐸" },
    { id: "panda", label: "Panda", emoji: "🐼" },
    { id: "lion", label: "Lion", emoji: "🦁" },
    { id: "octopus", label: "Octopus", emoji: "🐙" },
    { id: "penguin", label: "Penguin", emoji: "🐧" },
    { id: "unicorn", label: "Unicorn", emoji: "🦄" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

// Every profile has a different avatar, so the avatars are also the limit on how many profiles there can be.
export const MAX_PROFILES = AVATARS.length;

// The profile every install starts with. Its data stays under the keys the app used before profiles existed, so
// nobody's saved progress has to be moved or copied.
export const DEFAULT_PROFILE_ID = "default";

export interface Profile {
    id: string;
    avatar: AvatarId;
    createdAt: number;
}

export interface ProfileRegistry {
    active: string;
    profiles: Profile[];
}

export function avatarInfo(avatar: AvatarId) {
    return AVATARS.find(a => a.id === avatar) ?? AVATARS[0];
}

export function profileLabel(profile: Profile): string {
    return avatarInfo(profile.avatar).label;
}

export function defaultRegistry(now: number = Date.now()): ProfileRegistry {
    return {
        active: DEFAULT_PROFILE_ID,
        profiles: [{ id: DEFAULT_PROFILE_ID, avatar: AVATARS[0].id, createdAt: now }],
    };
}

const isAvatar = (value: unknown): value is AvatarId => AVATARS.some(a => a.id === value);
const ID_PATTERN = /^[a-z0-9-]{1,24}$/;

// Turns saved data back into a registry, or null if any part of it is wrong.
export function parseRegistry(data: unknown): ProfileRegistry | null {
    if (data === null || typeof data !== "object") return null;
    const { active, profiles } = data as Record<string, unknown>;
    if (typeof active !== "string" || !Array.isArray(profiles)) return null;
    if (profiles.length < 1 || profiles.length > MAX_PROFILES) return null;

    const ids = new Set<string>();
    const avatars = new Set<string>();
    const parsed: Profile[] = [];
    for (const item of profiles) {
        if (item === null || typeof item !== "object") return null;
        const { id, avatar, createdAt } = item as Record<string, unknown>;
        if (typeof id !== "string" || !ID_PATTERN.test(id) || ids.has(id)) return null;
        if (!isAvatar(avatar) || avatars.has(avatar)) return null;
        if (typeof createdAt !== "number" || !Number.isFinite(createdAt)) return null;
        ids.add(id);
        avatars.add(avatar);
        parsed.push({ id, avatar, createdAt });
    }
    if (!ids.has(active)) return null;
    return { active, profiles: parsed };
}

export function newProfileId(): string {
    return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function freeAvatars(registry: ProfileRegistry): AvatarId[] {
    const used = new Set(registry.profiles.map(p => p.avatar));
    return AVATARS.map(a => a.id).filter(id => !used.has(id));
}

// Adds a profile and makes it the active one. Returns the registry unchanged if the avatar is taken or the limit is hit.
export function addProfile(
    registry: ProfileRegistry, avatar: AvatarId, now: number = Date.now(), id: string = newProfileId()
): ProfileRegistry {
    if (registry.profiles.length >= MAX_PROFILES) return registry;
    if (!freeAvatars(registry).includes(avatar)) return registry;
    if (registry.profiles.some(p => p.id === id) || !ID_PATTERN.test(id)) return registry;
    return { active: id, profiles: [...registry.profiles, { id, avatar, createdAt: now }] };
}

export function switchProfile(registry: ProfileRegistry, id: string): ProfileRegistry {
    if (!registry.profiles.some(p => p.id === id) || registry.active === id) return registry;
    return { ...registry, active: id };
}

// Changes a profile's avatar to one nobody else is using.
export function changeAvatar(registry: ProfileRegistry, id: string, avatar: AvatarId): ProfileRegistry {
    const target = registry.profiles.find(p => p.id === id);
    if (!target || target.avatar === avatar || !freeAvatars(registry).includes(avatar)) return registry;
    return { ...registry, profiles: registry.profiles.map(p => (p.id === id ? { ...p, avatar } : p)) };
}

// Removes a profile. The last one cannot be removed. If the active profile goes, the one before it (or the first) takes over.
export function removeProfile(registry: ProfileRegistry, id: string): ProfileRegistry {
    const index = registry.profiles.findIndex(p => p.id === id);
    if (index === -1 || registry.profiles.length <= 1) return registry;
    const remaining = registry.profiles.filter(p => p.id !== id);
    const active = registry.active === id ? remaining[Math.max(0, index - 1)].id : registry.active;
    return { active, profiles: remaining };
}

export interface ProfileKeys {
    settings: string;
    history: string;
    facts: string;
}

// Where a profile's data lives. The default profile keeps the original keys.
export function profileKeys(profileId: string): ProfileKeys {
    if (profileId === DEFAULT_PROFILE_ID) {
        return { settings: STORAGE_KEYS.settings, history: STORAGE_KEYS.history, facts: STORAGE_KEYS.facts };
    }
    const prefix = `madminute.p.${profileId}`;
    return { settings: `${prefix}.settings`, history: `${prefix}.history`, facts: `${prefix}.facts` };
}

export function loadRegistry(): Promise<ProfileRegistry | null> {
    return loadStored(STORAGE_KEYS.profiles, parseRegistry);
}

export function saveRegistry(registry: ProfileRegistry): Promise<boolean> {
    return saveStored(STORAGE_KEYS.profiles, registry);
}

// Deletes everything saved for one profile.
export async function removeProfileData(profileId: string): Promise<void> {
    const keys = profileKeys(profileId);
    await Promise.all([removeStored(keys.settings), removeStored(keys.history), removeStored(keys.facts)]);
}
