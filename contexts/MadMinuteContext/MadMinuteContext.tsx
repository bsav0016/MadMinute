import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import { MadMinuteClass } from './MadMinuteClass';
import { MadMinuteSettings } from './MadMinuteSettings';
import { loadSettings, saveSettings } from './settingsStorage';
import { addRecord, buildRoundRecord, RoundRecord } from './roundRecord';
import { clearHistory as clearStoredHistory, loadHistory, saveHistory } from './historyStorage';
import { applyRound, FactStats } from './factStats';
import { clearFacts, loadFacts, saveFacts } from './factStorage';
import { MadMinuteQuestion } from './MadMinuteQuestion';
import { focusPool, tablePool } from './focus';
import {
    emptyPractice, Goal, goalProgress, levelUps, nextPractice, PracticeRecord, PracticeSetup, recordPracticeRound, TableStatus, withGoal,
} from './practice';
import { clearPractice, loadPractice, savePractice } from './practiceStorage';
import { DEFAULT_REMINDER, Reminder, upcomingReminders } from './reminder';
import { loadReminder, saveReminder } from './reminderStorage';
import { reminderPermission, setScheduledReminders } from './notifications';
import {
    addProfile as addToRegistry, AvatarId, changeProfile as changeInRegistry, defaultRegistry, loadRegistry, MAX_PROFILES,
    newProfileId, Profile, profileLabel, ProfileRegistry, randomTitle, removeProfile as removeFromRegistry,
    removeProfileData, saveRegistry, switchProfile as switchInRegistry, Title, titlesTaken,
} from '@/storage/profiles';
import { Backup, buildBackupText } from './backup';


// Turning the reminder on asks the phone for permission, and the player may say no (or the phone may not have it).
export type ReminderResult = { ok: true } | { ok: false; reason: 'denied' | 'unavailable' };

export type ImportResult = { ok: true; label: string } | { ok: false; reason: string };

interface MadMinuteContextType {
    madMinute: MadMinuteClass;
    updateSettings: (newSettings: MadMinuteSettings) => void;
    addQuestion: () => void;
    submitResponse: (response: string, id: number) => void;
    markQuestionShown: () => void;
    resetMadMinute: () => void;
    // Starts a round with the setup suggested for today (see nextPractice), or of the given times table, and returns it.
    startPractice: (table?: number) => PracticeSetup;
    // The tables that went up a level in the round just recorded.
    latestLevelUps: () => TableStatus[];
    history: RoundRecord[];
    recordRound: () => RoundRecord | null;
    clearHistory: () => void;
    facts: FactStats;
    // The daily goal and streak (see practice.ts), and a way to change the goal.
    practice: PracticeRecord;
    setGoal: (goal: Goal) => void;
    // The optional daily reminder, a notification on this device. Turning it on asks for permission.
    reminder: Reminder;
    setReminder: (next: Reminder) => Promise<ReminderResult>;
    // The people who share this device. Each has their own settings, history and record of problems.
    profiles: Profile[];
    activeProfile: Profile;
    addProfile: (avatar: AvatarId, title: Title) => void;
    switchProfile: (id: string) => void;
    changeProfile: (id: string, avatar: AvatarId, title: Title) => void;
    removeProfile: (id: string) => void;
    // The active player's progress as text to share, and a way to bring a backup back in as a new player.
    exportProgress: () => string;
    importProgress: (backup: Backup) => Promise<ImportResult>;
}

const initialRegistry = defaultRegistry(0);

const MadMinuteContext = createContext<MadMinuteContextType>({
    madMinute: new MadMinuteClass(),
    updateSettings: () => {},
    addQuestion: () => {},
    submitResponse: () => {},
    markQuestionShown: () => {},
    resetMadMinute: () => {},
    startPractice: () => nextPractice({}, new MadMinuteSettings()),
    latestLevelUps: () => [],
    history: [],
    recordRound: () => null,
    clearHistory: () => {},
    facts: {},
    practice: emptyPractice(),
    setGoal: () => {},
    reminder: DEFAULT_REMINDER,
    setReminder: async () => ({ ok: false, reason: 'unavailable' }),
    profiles: initialRegistry.profiles,
    activeProfile: initialRegistry.profiles[0],
    addProfile: () => {},
    switchProfile: () => {},
    changeProfile: () => {},
    removeProfile: () => {},
    exportProgress: () => '',
    importProgress: async () => ({ ok: false, reason: '' }),
});

const newRoundId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const MadMinuteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [madMinute, setMadMinute] = useState<MadMinuteClass>(new MadMinuteClass());

    // Who is playing. Nothing else loads until the saved list of profiles has, so the right profile's data is read.
    const [registry, setRegistry] = useState<ProfileRegistry>(() => defaultRegistry());
    const registryRef = useRef(registry);
    const [registryLoaded, setRegistryLoaded] = useState(false);
    const registryReady = useRef(false);
    const waitingForRegistry = useRef<(() => void)[]>([]);
    // Bumped when the player switches profile, so a load that was already running cannot fill in the old profile's data.
    const profileGeneration = useRef(0);
    const profileId = registry.active;

    useEffect(() => {
        loadRegistry().then((saved) => {
            if (saved) {
                registryRef.current = saved;
                setRegistry(saved);
            }
            registryReady.current = true;
            setRegistryLoaded(true);
            waitingForRegistry.current.splice(0).forEach((run) => run());
        });
    }, []);

    // Runs a settings save for the active profile now, or as soon as the profile list has loaded if it has not yet.
    const saveForActiveProfile = (save: (id: string) => void) => {
        if (registryReady.current) save(registryRef.current.active);
        else waitingForRegistry.current.push(() => save(registryRef.current.active));
    };

    // Set once the player changes settings, so a slow load of the saved ones cannot overwrite that choice.
    const settingsChanged = useRef(false);

    useEffect(() => {
        if (!registryLoaded) return;
        const generation = profileGeneration.current;
        loadSettings(profileId).then((saved) => {
            if (generation !== profileGeneration.current) return; // switched while loading
            if (saved && !settingsChanged.current) {
                setMadMinute((current) => new MadMinuteClass(saved, current.questions, current.table));
            }
        });
    }, [registryLoaded, profileId]);

    const [history, setHistory] = useState<RoundRecord[]>([]);
    const historyRef = useRef<RoundRecord[]>([]);
    // Rounds finished before the saved history has loaded are saved by the load, on top of what it finds. Saving
    // them sooner would replace the saved history with only those rounds.
    const historyLoaded = useRef(false);
    // Bumped when the history is cleared, so a load that was already running cannot bring the old rounds back.
    const historyGeneration = useRef(0);
    // Each round gets an id when it starts, so the results screen saving it twice (a remount, say) cannot add it twice.
    const roundId = useRef(newRoundId());
    const recordedRound = useRef<{ id: string; record: RoundRecord | null } | null>(null);
    // The tables that moved up a level when the round was recorded, for the results screen.
    const roundLevelUps = useRef<TableStatus[]>([]);

    const changeHistory = (next: RoundRecord[]) => {
        historyRef.current = next;
        setHistory(next);
    };

    useEffect(() => {
        if (!registryLoaded) return;
        const profile = profileGeneration.current;
        const generation = historyGeneration.current;
        loadHistory(profileId).then((saved) => {
            if (profile !== profileGeneration.current || generation !== historyGeneration.current) return; // switched or cleared while loading
            historyLoaded.current = true;
            // Anything recorded while the load was running is newer, so it goes on top.
            const recordedMeanwhile = historyRef.current.length > 0;
            if (!saved && !recordedMeanwhile) return;
            const merged = [...historyRef.current].reverse().reduce(addRecord, saved ?? []);
            changeHistory(merged);
            if (recordedMeanwhile) saveHistory(merged, profileId);
        });
    }, [registryLoaded, profileId]);

    // The player's record of each problem. Like the history it is kept on the device, loaded at launch, and added to
    // once per finished round (the round id guard in recordRound covers both).
    const [facts, setFacts] = useState<FactStats>({});
    const factsRef = useRef<FactStats>({});
    const factsLoaded = useRef(false);
    // Rounds finished while the saved facts were still loading. They are applied on top of what loads, so neither is lost.
    const roundsBeforeLoad = useRef<{ questions: MadMinuteQuestion[]; playedAt: number }[]>([]);
    // Bumped when the facts are cleared or the profile changes, so a load that was already running cannot bring the old ones back.
    const factsGeneration = useRef(0);

    const changeFacts = (next: FactStats) => {
        factsRef.current = next;
        setFacts(next);
    };

    useEffect(() => {
        if (!registryLoaded) return;
        const generation = factsGeneration.current;
        loadFacts(profileId).then((saved) => {
            if (generation !== factsGeneration.current) return; // cleared or switched while loading
            factsLoaded.current = true;
            const queued = roundsBeforeLoad.current;
            roundsBeforeLoad.current = [];
            if (!saved && queued.length === 0) return;
            const merged = queued.reduce((stats, round) => applyRound(stats, round.questions, round.playedAt), saved ?? {});
            changeFacts(merged);
            if (queued.length > 0) saveFacts(merged, profileId);
        });
    }, [registryLoaded, profileId]);

    // The daily goal and streak. Like the facts, they are loaded at launch and added to once per finished round.
    const [practice, setPractice] = useState<PracticeRecord>(() => emptyPractice());
    const practiceRef = useRef<PracticeRecord>(practice);
    const practiceLoaded = useRef(false);
    // When rounds finished before the saved record loaded, so the load can add them on top of what it finds.
    const practiceRoundsBeforeLoad = useRef<number[]>([]);
    // A goal picked before the load finishes wins over the saved one.
    const goalBeforeLoad = useRef<Goal | null>(null);
    // Bumped when the record is cleared or the profile changes, so a load that was already running cannot bring the old one back.
    const practiceGeneration = useRef(0);

    const changePractice = (next: PracticeRecord) => {
        practiceRef.current = next;
        setPractice(next);
    };

    useEffect(() => {
        if (!registryLoaded) return;
        const generation = practiceGeneration.current;
        loadPractice(profileId).then((saved) => {
            if (generation !== practiceGeneration.current) return; // cleared or switched while loading
            practiceLoaded.current = true;
            const queued = practiceRoundsBeforeLoad.current;
            practiceRoundsBeforeLoad.current = [];
            const goal = goalBeforeLoad.current;
            goalBeforeLoad.current = null;
            if (!saved && queued.length === 0 && goal === null) return;
            let merged = queued.reduce(recordPracticeRound, saved ?? emptyPractice());
            if (goal !== null) merged = withGoal(merged, goal);
            changePractice(merged);
            if (queued.length > 0 || goal !== null) savePractice(merged, profileId);
        });
    }, [registryLoaded, profileId]);

    const setGoal = (goal: Goal) => {
        changePractice(withGoal(practiceRef.current, goal));
        if (practiceLoaded.current) savePractice(practiceRef.current, registryRef.current.active);
        else goalBeforeLoad.current = goal;
    };

    // The reminder belongs to the device. It is loaded at launch, and scheduled for the next few days whenever it changes,
    // the app comes back to the front, or a round is finished (today's is skipped once the goal is done).
    const [reminder, setReminderState] = useState<Reminder>(DEFAULT_REMINDER);
    const [reminderLoaded, setReminderLoaded] = useState(false);
    const reminderChanged = useRef(false);
    const [foregroundCount, setForegroundCount] = useState(0);
    // True while reminders may be scheduled with the phone, so turning them off cancels them once and a player who
    // never used them never loads the notifications module.
    const reminderScheduled = useRef(false);

    useEffect(() => {
        loadReminder().then((saved) => {
            if (saved && !reminderChanged.current) setReminderState(saved);
            setReminderLoaded(true);
        });
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') setForegroundCount((count) => count + 1);
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (!reminderLoaded) return;
        if (!reminder.enabled && !reminderScheduled.current) return;
        reminderScheduled.current = reminder.enabled;
        const now = Date.now();
        setScheduledReminders(upcomingReminders(reminder, now, goalProgress(practice, now).met));
    }, [reminder, reminderLoaded, practice, foregroundCount]);

    const setReminder = async (next: Reminder): Promise<ReminderResult> => {
        reminderChanged.current = true;
        if (next.enabled && !reminder.enabled) {
            const permission = await reminderPermission(true);
            if (permission !== 'granted') return { ok: false, reason: permission };
        }
        setReminderState(next);
        saveReminder(next);
        return { ok: true };
    };

    const updateSettings = (newSettings: MadMinuteSettings) => {
        settingsChanged.current = true;
        saveForActiveProfile((id) => saveSettings(newSettings, id));
        // New settings mean a round the player set up themselves, so a round of one table ends.
        const updatedMadMinute = new MadMinuteClass(
            newSettings,
            madMinute.questions
        );
        setMadMinute(updatedMadMinute);
    };

    const addQuestion = () => {
        const newQuestion = madMinute.generateNewQuestion(Date.now(), weakSpotsFor(madMinute));
    
        const updatedMadMinute = new MadMinuteClass(
            madMinute.settings,
            [...madMinute.questions, newQuestion],
            madMinute.table
        );
    
        setMadMinute(updatedMadMinute);
    }

    const submitResponse = (response: string, id: number) => {
        const answeredAt = Date.now();
        const updatedQuestions = madMinute.questions.map((question) =>
            question.id === id ? question.withResponse(response, answeredAt) : question
        );
        let updatedMadMinute = new MadMinuteClass(madMinute.settings, updatedQuestions, madMinute.table);

        const newQuestion = updatedMadMinute.generateNewQuestion(Date.now(), weakSpotsFor(updatedMadMinute));
        updatedMadMinute = new MadMinuteClass(
            updatedMadMinute.settings,
            [...updatedMadMinute.questions, newQuestion],
            updatedMadMinute.table
        );

        setMadMinute(updatedMadMinute);
    };

    // The first question is made while the 3-2-1 countdown is still showing, so the play screen calls this when the
    // round really starts, to stop that countdown counting as thinking time.
    const markQuestionShown = () => {
        const shownAt = Date.now();
        setMadMinute((current) => {
            const newest = current.questions.at(-1);
            if (!newest || newest.response) return current;
            return new MadMinuteClass(current.settings, [...current.questions.slice(0, -1), newest.withShownAt(shownAt)], current.table);
        });
    };

    const resetMadMinute = () => {
        roundId.current = newRoundId();
        roundLevelUps.current = [];
        const updatedMadMinute = new MadMinuteClass(madMinute.settings, [], madMinute.table);
        setMadMinute(updatedMadMinute);
    }

    // The facts to ask more often: the weak ones of the table in a round of one table, otherwise focus mode's.
    const weakSpotsFor = (round: MadMinuteClass) =>
        round.table !== null ? tablePool(factsRef.current, round.table) : focusPool(factsRef.current, round.settings);

    // "Today's practice": a new round with the suggested setup. The player's own settings are not changed or saved.
    const startPractice = (table?: number): PracticeSetup => {
        const suggested = nextPractice(factsRef.current, madMinute.settings);
        const setup = table === undefined ? suggested : { ...suggested, table };
        roundId.current = newRoundId();
        roundLevelUps.current = [];
        setMadMinute(new MadMinuteClass(madMinute.settings, [], setup.table));
        return setup;
    }

    // Called by the results screen. Saves the finished round once and returns its record (null if nothing was attempted).
    const recordRound = (): RoundRecord | null => {
        if (recordedRound.current?.id === roundId.current) return recordedRound.current.record;
        const playedAt = Date.now();
        const record = buildRoundRecord(madMinute.effectiveSettings(), madMinute.questions, roundId.current, playedAt, madMinute.table);
        recordedRound.current = { id: roundId.current, record };
        if (record) {
            const next = addRecord(historyRef.current, record);
            changeHistory(next);
            if (historyLoaded.current) saveHistory(next, registryRef.current.active);

            const nextFacts = applyRound(factsRef.current, madMinute.questions, playedAt);
            // Before the saved facts have loaded the old level is not known, so nothing is claimed.
            roundLevelUps.current = factsLoaded.current ? levelUps(factsRef.current, nextFacts) : [];
            changeFacts(nextFacts);
            if (factsLoaded.current) {
                saveFacts(nextFacts, registryRef.current.active);
            } else {
                // Saving now would overwrite facts that have not loaded yet. The load applies this round and saves.
                roundsBeforeLoad.current.push({ questions: madMinute.questions, playedAt });
            }

            const nextPractice = recordPracticeRound(practiceRef.current, playedAt);
            changePractice(nextPractice);
            if (practiceLoaded.current) savePractice(nextPractice, registryRef.current.active);
            else practiceRoundsBeforeLoad.current.push(playedAt);
        }
        return record;
    };

    const clearHistory = () => {
        changeHistory([]);
        historyGeneration.current += 1;
        historyLoaded.current = true;
        clearStoredHistory(registryRef.current.active);
        // The record of each problem goes with the history, and so does anything still waiting to be added to it.
        factsGeneration.current += 1;
        factsLoaded.current = true;
        roundsBeforeLoad.current = [];
        changeFacts({});
        clearFacts(registryRef.current.active);
        // The streak is made of the same rounds, so it starts again too (the goal the player chose stays).
        const goal = practiceRef.current.goal;
        practiceGeneration.current += 1;
        practiceLoaded.current = true;
        practiceRoundsBeforeLoad.current = [];
        goalBeforeLoad.current = null;
        changePractice(withGoal(emptyPractice(), goal));
        if (goal === emptyPractice().goal) clearPractice(registryRef.current.active);
        else savePractice(practiceRef.current, registryRef.current.active);
    };

    // Everything held in memory belongs to the profile that was playing, so a switch starts the next one from empty
    // and the effects above load their saved data.
    const resetForProfile = () => {
        profileGeneration.current += 1;
        settingsChanged.current = false;
        changeHistory([]);
        historyLoaded.current = false;
        factsGeneration.current += 1;
        factsLoaded.current = false;
        roundsBeforeLoad.current = [];
        changeFacts({});
        practiceGeneration.current += 1;
        practiceLoaded.current = false;
        practiceRoundsBeforeLoad.current = [];
        goalBeforeLoad.current = null;
        changePractice(emptyPractice());
        roundId.current = newRoundId();
        roundLevelUps.current = [];
        recordedRound.current = null;
        setMadMinute(new MadMinuteClass());
    };

    const applyRegistry = (next: ProfileRegistry) => {
        // Before the saved list has loaded, a change would be overwritten by it, and nothing can ask for one that soon.
        if (!registryReady.current || next === registryRef.current) return;
        const switched = next.active !== registryRef.current.active;
        registryRef.current = next;
        setRegistry(next);
        saveRegistry(next);
        if (switched) resetForProfile();
    };

    const addProfile = (avatar: AvatarId, title: Title) => applyRegistry(addToRegistry(registryRef.current, avatar, title));
    const switchProfile = (id: string) => applyRegistry(switchInRegistry(registryRef.current, id));
    const changeProfile = (id: string, avatar: AvatarId, title: Title) => applyRegistry(changeInRegistry(registryRef.current, id, avatar, title));
    const removeProfile = (id: string) => {
        const next = removeFromRegistry(registryRef.current, id);
        if (next === registryRef.current) return;
        removeProfileData(id);
        applyRegistry(next);
    };

    const activeProfile = registry.profiles.find((profile) => profile.id === registry.active) ?? registry.profiles[0];

    const exportProgress = (): string => buildBackupText({
        exportedAt: Date.now(),
        profile: { id: activeProfile.id, avatar: activeProfile.avatar, title: activeProfile.title },
        settings: madMinute.settings,
        history,
        facts,
        practice,
    });

    // Adds a backup as a new player and switches to them. The id is kept if this device has no such player (so a
    // restore after a reinstall is the same player again), otherwise the copy gets its own, and if the name is taken
    // the word changes. The data is saved first, so the new player opens with it.
    const importProgress = async (backup: Backup): Promise<ImportResult> => {
        if (!registryReady.current) return { ok: false, reason: 'Mad Minute is still starting. Try again in a moment.' };
        const current = registryRef.current;
        if (current.profiles.length >= MAX_PROFILES) {
            return { ok: false, reason: `This device already has ${MAX_PROFILES} players. Delete one first.` };
        }
        const id = current.profiles.some((p) => p.id === backup.profile.id) ? newProfileId() : backup.profile.id;
        const { avatar } = backup.profile;
        const taken = titlesTaken(current, avatar);
        const title = taken.includes(backup.profile.title) ? randomTitle(taken) : backup.profile.title;

        const saved = await Promise.all([
            saveHistory(backup.history, id),
            saveFacts(backup.facts, id),
            backup.practice ? savePractice(backup.practice, id) : Promise.resolve(true),
            backup.settings ? saveSettings(backup.settings, id) : Promise.resolve(true),
        ]);
        if (!saved.every(Boolean)) {
            await removeProfileData(id);
            return { ok: false, reason: 'Could not save the backup on this device. Free up some space and try again.' };
        }
        // The list may have changed while the data was saving.
        const next = addToRegistry(registryRef.current, avatar, title, Date.now(), id);
        if (next === registryRef.current) {
            await removeProfileData(id);
            return { ok: false, reason: 'Could not add the player. Try again.' };
        }
        applyRegistry(next);
        return { ok: true, label: profileLabel({ avatar, title }) };
    };

    return (
        <MadMinuteContext.Provider value={{
            madMinute, updateSettings, addQuestion, submitResponse, markQuestionShown, resetMadMinute, startPractice, latestLevelUps: () => roundLevelUps.current, history, recordRound,
            clearHistory, facts, practice, setGoal, reminder, setReminder, profiles: registry.profiles, activeProfile, addProfile, switchProfile, changeProfile,
            removeProfile, exportProgress, importProgress,
        }}>
            {children}
        </MadMinuteContext.Provider>
    );
};

export const useMadMinute = () => useContext(MadMinuteContext);
