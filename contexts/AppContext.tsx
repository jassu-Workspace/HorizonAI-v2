import React, { createContext, useContext } from 'react';
import { AssessmentFlowResult, RoadmapData, UserProfile } from '../types';

export interface AppContextValue {
    userProfile: UserProfile;
    setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
    selectedSkill: string;
    setSelectedSkill: React.Dispatch<React.SetStateAction<string>>;
    selectedCareer: string;
    setSelectedCareer: React.Dispatch<React.SetStateAction<string>>;
    assessmentResult: AssessmentFlowResult | null;
    setAssessmentResult: React.Dispatch<React.SetStateAction<AssessmentFlowResult | null>>;
    roadmapResult: RoadmapData | null;
    setRoadmapResult: React.Dispatch<React.SetStateAction<RoadmapData | null>>;
    isRoadmapLoading: boolean;
    setIsRoadmapLoading: React.Dispatch<React.SetStateAction<boolean>>;
    roadmapError: string;
    setRoadmapError: React.Dispatch<React.SetStateAction<string>>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = () => {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error('useAppContext must be used within AppContext.Provider');
    }

    return context;
};