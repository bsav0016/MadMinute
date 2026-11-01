import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { MadMinuteClass } from './MadMinuteClass';
import { MadMinuteSettings } from './MadMinuteSettings';
import { loadSettings, saveSettings } from './settingsStorage';
import { addRecord, buildRoundRecord, RoundRecord } from './roundRecord';
import { clearHistory as clearStoredHistory, loadHistory, saveHistory } from './historyStorage';
import { applyRound, FactStats } from './factStats';
import { clearFacts, loadFacts, saveFacts } from './factStorage';
import { MadMinuteQuestion } from './MadMinuteQuestion';


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
}

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
    facts: {}
});

const newRoundId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const MadMinuteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [madMinute, setMadMinute] = useState<MadMinuteClass>(new MadMinuteClass());

    // Set once the player changes settings, so a slow load of the saved ones cannot overwrite that choice.
    const settingsChanged = useRef(false);

    useEffect(() => {
        loadSettings().then((saved) => {
            if (saved && !settingsChanged.current) {
                setMadMinute((current) => new MadMinuteClass(saved, current.questions));
            }
        });
    }, []);

    const [history, setHistory] = useState<RoundRecord[]>([]);
    const historyRef = useRef<RoundRecord[]>([]);
    // Each round gets an id when it starts, so the results screen saving it twice (a remount, say) cannot add it twice.
    const roundId = useRef(newRoundId());
    const recordedRound = useRef<{ id: string; record: RoundRecord | null } | null>(null);

    const changeHistory = (next: RoundRecord[]) => {
        historyRef.current = next;
        setHistory(next);
    };

    useEffect(() => {
        loadHistory().then((saved) => {
            if (!saved) return;
            // Anything recorded while the load was running is newer, so it goes on top.
            changeHistory([...historyRef.current].reverse().reduce(addRecord, saved));
        });
    }, []);

    // The player's record of each problem. Like the history it is kept on the device, loaded at launch, and added to
    // once per finished round (the round id guard in recordRound covers both).
    const [facts, setFacts] = useState<FactStats>({});
    const factsRef = useRef<FactStats>({});
    const factsLoaded = useRef(false);
    // Rounds finished while the saved facts were still loading. They are applied on top of what loads, so neither is lost.
    const roundsBeforeLoad = useRef<{ questions: MadMinuteQuestion[]; playedAt: number }[]>([]);
    // Bumped when the facts are cleared, so a load that was already running cannot bring the old ones back.
    const factsGeneration = useRef(0);

    const changeFacts = (next: FactStats) => {
        factsRef.current = next;
        setFacts(next);
    };

    useEffect(() => {
        const generation = factsGeneration.current;
        loadFacts().then((saved) => {
            if (generation !== factsGeneration.current) return; // cleared while loading
            factsLoaded.current = true;
            const queued = roundsBeforeLoad.current;
            roundsBeforeLoad.current = [];
            if (!saved && queued.length === 0) return;
            const merged = queued.reduce((stats, round) => applyRound(stats, round.questions, round.playedAt), saved ?? {});
            changeFacts(merged);
            if (queued.length > 0) saveFacts(merged);
        });
    }, []);

    const updateSettings = (newSettings: MadMinuteSettings) => {
        settingsChanged.current = true;
        saveSettings(newSettings);
        const updatedMadMinute = new MadMinuteClass(
            newSettings,
            madMinute.questions
        );
        setMadMinute(updatedMadMinute);
    };

    const addQuestion = () => {
        const newQuestion = madMinute.generateNewQuestion();
    
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

        const newQuestion = updatedMadMinute.generateNewQuestion();
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
            saveHistory(next);

            const nextFacts = applyRound(factsRef.current, madMinute.questions, playedAt);
            changeFacts(nextFacts);
            if (factsLoaded.current) {
                saveFacts(nextFacts);
            } else {
                // Saving now would overwrite facts that have not loaded yet. The load applies this round and saves.
                roundsBeforeLoad.current.push({ questions: madMinute.questions, playedAt });
            }
        }
        return record;
    };

    const clearHistory = () => {
        changeHistory([]);
        clearStoredHistory();
        // The record of each problem goes with the history, and so does anything still waiting to be added to it.
        factsGeneration.current += 1;
        factsLoaded.current = true;
        roundsBeforeLoad.current = [];
        changeFacts({});
        clearFacts();
    };

    return (
        <MadMinuteContext.Provider value={{ madMinute, updateSettings, addQuestion, submitResponse, markQuestionShown, resetMadMinute, history, recordRound, clearHistory, facts }}>
            {children}
        </MadMinuteContext.Provider>
    );
};

export const useMadMinute = () => useContext(MadMinuteContext);
