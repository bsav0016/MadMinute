import { loadStored, removeStored, saveStored, STORAGE_KEYS } from "./storage";

// A profile is only an animal and a word chosen from a fixed list ("Swift Fox"). There is no typed name, so the app
// never stores anything a child could type about themselves, and nothing needs moderating if names ever leave the
// device. The name is for showing; a profile is identified by its id, which no one sees.
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

export const TITLES = [
    "Swift", "Brave", "Clever", "Happy", "Bold", "Calm", "Bright", "Quick", "Sunny", "Lucky",
    "Mighty", "Gentle", "Cheerful", "Daring", "Eager", "Fearless", "Jolly", "Keen", "Lively", "Merry",
    "Nimble", "Plucky", "Proud", "Speedy", "Steady", "Super", "Wise", "Zippy", "Cool", "Epic",
] as const;

export type Title = (typeof TITLES)[number];

// As many as the home screen can show comfortably. Two players can share an animal, but not a whole name.
export const MAX_PROFILES = 12;

// The profile every install starts with. Its data stays under the keys the app used before profiles existed, so
// nobody's saved progress has to be moved or copied.
export const DEFAULT_PROFILE_ID = "default";

export interface Profile {
    id: string;
    avatar: AvatarId;
    title: Title;
    createdAt: number;
}

export interface ProfileRegistry {
    active: string;
    profiles: Profile[];
}

export function avatarInfo(avatar: AvatarId) {
    return AVATARS.find(a => a.id === avatar) ?? AVATARS[0];
}

// The name shown and spoken, like "Swift Fox".
export function profileLabel(profile: Pick<Profile, "avatar" | "title">): string {
    return `${profile.title} ${avatarInfo(profile.avatar).label}`;
}

// A word from the list that is not in `exclude`, so shuffling always changes it.
export function randomTitle(exclude: readonly Title[] = [], random: () => number = Math.random): Title {
    const choices = TITLES.filter(t => !exclude.includes(t));
    if (choices.length === 0) return TITLES[0];
    return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

export function defaultRegistry(now: number = Date.now()): ProfileRegistry {
    return {
        active: DEFAULT_PROFILE_ID,
        profiles: [{ id: DEFAULT_PROFILE_ID, avatar: AVATARS[0].id, title: TITLES[0], createdAt: now }],
    };
}

const isAvatar = (value: unknown): value is AvatarId => AVATARS.some(a => a.id === value);
const isTitle = (value: unknown): value is Title => TITLES.some(t => t === value);

// A profile saved without a word (the list was saved before words existed) gets one worked out from its id, so the
// same profile gets the same word every time.
function titleFromId(id: string): Title {
    let sum = 0;
    for (const char of id) sum += char.charCodeAt(0);
    return TITLES[sum % TITLES.length];
}
const ID_PATTERN = /^[a-z0-9-]{1,24}$/;

// Turns saved data back into a registry, or null if any part of it is wrong.
export function parseRegistry(data: unknown): ProfileRegistry | null {
    if (data === null || typeof data !== "object") return null;
    const { active, profiles } = data as Record<string, unknown>;
    if (typeof active !== "string" || !Array.isArray(profiles)) return null;
    if (profiles.length < 1 || profiles.length > MAX_PROFILES) return null;

    const ids = new Set<string>();
    const names = new Set<string>();
    const parsed: Profile[] = [];
    for (const item of profiles) {
        if (item === null || typeof item !== "object") return null;
        const { id, avatar, title, createdAt } = item as Record<string, unknown>;
        if (typeof id !== "string" || !ID_PATTERN.test(id) || ids.has(id)) return null;
        if (!isAvatar(avatar)) return null;
        if (typeof createdAt !== "number" || !Number.isFinite(createdAt)) return null;
        const word = isTitle(title) ? title : titleFromId(id);
        const name = `${word} ${avatar}`;
        if (names.has(name)) return null;
        ids.add(id);
        names.add(name);
        parsed.push({ id, avatar, title: word, createdAt });
    }
    if (!ids.has(active)) return null;
    return { active, profiles: parsed };
}

export function newProfileId(): string {
    return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// The words other players already have with this animal. A new or edited player cannot use any of them.
export function titlesTaken(registry: ProfileRegistry, avatar: AvatarId, exceptId?: string): Title[] {
    return registry.profiles.filter(p => p.avatar === avatar && p.id !== exceptId).map(p => p.title);
}

// Adds a profile and makes it the active one. Returns the registry unchanged if that name is taken or the limit is hit.
export function addProfile(
    registry: ProfileRegistry, avatar: AvatarId, title: Title, now: number = Date.now(), id: string = newProfileId()
): ProfileRegistry {
    if (registry.profiles.length >= MAX_PROFILES) return registry;
    if (!isAvatar(avatar) || !isTitle(title) || titlesTaken(registry, avatar).includes(title)) return registry;
    if (registry.profiles.some(p => p.id === id) || !ID_PATTERN.test(id)) return registry;
    return { active: id, profiles: [...registry.profiles, { id, avatar, title, createdAt: now }] };
}

export function switchProfile(registry: ProfileRegistry, id: string): ProfileRegistry {
    if (!registry.profiles.some(p => p.id === id) || registry.active === id) return registry;
    return { ...registry, active: id };
}

// Changes a profile's animal and word, to a name no one else has. The id, and so the profile's data, stays the same.
export function changeProfile(registry: ProfileRegistry, id: string, avatar: AvatarId, title: Title): ProfileRegistry {
    const target = registry.profiles.find(p => p.id === id);
    if (!target || !isAvatar(avatar) || !isTitle(title)) return registry;
    if (titlesTaken(registry, avatar, id).includes(title)) return registry;
    if (avatar === target.avatar && title === target.title) return registry;
    return { ...registry, profiles: registry.profiles.map(p => (p.id === id ? { ...p, avatar, title } : p)) };
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
