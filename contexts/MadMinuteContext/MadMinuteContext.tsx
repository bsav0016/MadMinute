import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { MadMinuteClass } from './MadMinuteClass';
import { MadMinuteSettings } from './MadMinuteSettings';
import { loadSettings, saveSettings } from './settingsStorage';
import { addRecord, buildRoundRecord, RoundRecord } from './roundRecord';
import { clearHistory as clearStoredHistory, loadHistory, saveHistory } from './historyStorage';
import { applyRound, FactStats } from './factStats';
import { clearFacts, loadFacts, saveFacts } from './factStorage';
import { MadMinuteQuestion } from './MadMinuteQuestion';
import { focusPool } from './focus';
import {
    addProfile as addToRegistry, AvatarId, changeAvatar, defaultRegistry, loadRegistry, Profile, ProfileRegistry,
    removeProfile as removeFromRegistry, removeProfileData, saveRegistry, switchProfile as switchInRegistry,
} from '@/storage/profiles';


interface MadMinuteContextType {
    madMinute: MadMinuteClass;
    updateSettings: (newSettings: MadMinuteSettings) => void;
    addQuestion: () => void;
    submitResponse: (response: string, id: number) => void;
    markQuestionShown: () => void;
    resetMadMinute: () => void;
    history: RoundRecord[];
    recordRound: () => RoundRecord | null;
    clearHistory: () => void;
    facts: FactStats;
    // The people who share this device. Each has their own settings, history and record of problems.
    profiles: Profile[];
    activeProfile: Profile;
    addProfile: (avatar: AvatarId) => void;
    switchProfile: (id: string) => void;
    changeProfileAvatar: (id: string, avatar: AvatarId) => void;
    removeProfile: (id: string) => void;
}

const initialRegistry = defaultRegistry(0);

const MadMinuteContext = createContext<MadMinuteContextType>({
    madMinute: new MadMinuteClass(),
    updateSettings: () => {},
    addQuestion: () => {},
    submitResponse: () => {},
    markQuestionShown: () => {},
    resetMadMinute: () => {},
    history: [],
    recordRound: () => null,
    clearHistory: () => {},
    facts: {},
    profiles: initialRegistry.profiles,
    activeProfile: initialRegistry.profiles[0],
    addProfile: () => {},
    switchProfile: () => {},
    changeProfileAvatar: () => {},
    removeProfile: () => {},
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
                setMadMinute((current) => new MadMinuteClass(saved, current.questions));
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

    const updateSettings = (newSettings: MadMinuteSettings) => {
        settingsChanged.current = true;
        saveForActiveProfile((id) => saveSettings(newSettings, id));
        const updatedMadMinute = new MadMinuteClass(
            newSettings,
            madMinute.questions
        );
        setMadMinute(updatedMadMinute);
    };

    const addQuestion = () => {
        const newQuestion = madMinute.generateNewQuestion(Date.now(), focusPool(factsRef.current, madMinute.settings));
    
        const updatedMadMinute = new MadMinuteClass(
            madMinute.settings,
            [...madMinute.questions, newQuestion]
        );
    
        setMadMinute(updatedMadMinute);
    }

    const submitResponse = (response: string, id: number) => {
        const answeredAt = Date.now();
        const updatedQuestions = madMinute.questions.map((question) =>
            question.id === id ? question.withResponse(response, answeredAt) : question
        );
        let updatedMadMinute = new MadMinuteClass(madMinute.settings, updatedQuestions);

        const newQuestion = updatedMadMinute.generateNewQuestion(
            Date.now(), focusPool(factsRef.current, updatedMadMinute.settings)
        );
        updatedMadMinute = new MadMinuteClass(
            updatedMadMinute.settings,
            [...updatedMadMinute.questions, newQuestion]
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
            return new MadMinuteClass(current.settings, [...current.questions.slice(0, -1), newest.withShownAt(shownAt)]);
        });
    };

    const resetMadMinute = () => {
        roundId.current = newRoundId();
        const updatedMadMinute = new MadMinuteClass(madMinute.settings, []);
        setMadMinute(updatedMadMinute);
    }

    // Called by the results screen. Saves the finished round once and returns its record (null if nothing was attempted).
    const recordRound = (): RoundRecord | null => {
        if (recordedRound.current?.id === roundId.current) return recordedRound.current.record;
        const playedAt = Date.now();
        const record = buildRoundRecord(madMinute.settings, madMinute.questions, roundId.current, playedAt);
        recordedRound.current = { id: roundId.current, record };
        if (record) {
            const next = addRecord(historyRef.current, record);
            changeHistory(next);
            if (historyLoaded.current) saveHistory(next, registryRef.current.active);

            const nextFacts = applyRound(factsRef.current, madMinute.questions, playedAt);
            changeFacts(nextFacts);
            if (factsLoaded.current) {
                saveFacts(nextFacts, registryRef.current.active);
            } else {
                // Saving now would overwrite facts that have not loaded yet. The load applies this round and saves.
                roundsBeforeLoad.current.push({ questions: madMinute.questions, playedAt });
            }
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
        roundId.current = newRoundId();
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

    const addProfile = (avatar: AvatarId) => applyRegistry(addToRegistry(registryRef.current, avatar));
    const switchProfile = (id: string) => applyRegistry(switchInRegistry(registryRef.current, id));
    const changeProfileAvatar = (id: string, avatar: AvatarId) => applyRegistry(changeAvatar(registryRef.current, id, avatar));
    const removeProfile = (id: string) => {
        const next = removeFromRegistry(registryRef.current, id);
        if (next === registryRef.current) return;
        removeProfileData(id);
        applyRegistry(next);
    };

    const activeProfile = registry.profiles.find((profile) => profile.id === registry.active) ?? registry.profiles[0];

    return (
        <MadMinuteContext.Provider value={{
            madMinute, updateSettings, addQuestion, submitResponse, markQuestionShown, resetMadMinute, history, recordRound,
            clearHistory, facts, profiles: registry.profiles, activeProfile, addProfile, switchProfile, changeProfileAvatar,
            removeProfile,
        }}>
            {children}
        </MadMinuteContext.Provider>
    );
};

export const useMadMinute = () => useContext(MadMinuteContext);
