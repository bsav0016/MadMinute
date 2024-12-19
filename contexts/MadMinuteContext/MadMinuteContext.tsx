import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MadMinuteClass } from './MadMinuteClass';
import { MadMinuteSettings } from './MadMinuteSettings';
import { MadMinuteQuestion } from './MadMinuteQuestion';


interface MadMinuteContextType {
    madMinute: MadMinuteClass;
    updateSettings: (newSettings: MadMinuteSettings) => void;
    addQuestion: () => void;
    submitResponse: (response: string, id: number) => void;
    resetMadMinute: () => void;
}

const MadMinuteContext = createContext<MadMinuteContextType>({
    madMinute: new MadMinuteClass(),
    updateSettings: () => {},
    addQuestion: () => {},
    submitResponse: () => {},
    resetMadMinute: () => {}
});

export const MadMinuteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [madMinute, setMadMinute] = useState<MadMinuteClass>(new MadMinuteClass());

    const updateSettings = (newSettings: MadMinuteSettings) => {
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
        const updatedQuestions = madMinute.questions.map((question) => {
            if (question.id === id) {
                const updatedQuestion = new MadMinuteQuestion(
                    question.id,
                    question.value1,
                    question.value2,
                    question.operator,
                    question.answer,
                    response
                );
                return updatedQuestion;
            }
            return question;
        });
        let updatedMadMinute = new MadMinuteClass(madMinute.settings, updatedQuestions);

        const newQuestion = updatedMadMinute.generateNewQuestion();
        updatedMadMinute = new MadMinuteClass(
            updatedMadMinute.settings,
            [...updatedMadMinute.questions, newQuestion]
        );

        setMadMinute(updatedMadMinute);
    };

    const resetMadMinute = () => {
        const updatedMadMinute = new MadMinuteClass(madMinute.settings, []);
        setMadMinute(updatedMadMinute);
    }

    return (
        <MadMinuteContext.Provider value={{ madMinute, updateSettings, addQuestion, submitResponse, resetMadMinute }}>
            {children}
        </MadMinuteContext.Provider>
    );
};

export const useMadMinute = () => useContext(MadMinuteContext);
