import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

interface FlowProtectedRouteProps {
    children: React.ReactNode;
    requireAssessment?: boolean;
    requireRoadmap?: boolean;
}

const FlowProtectedRoute: React.FC<FlowProtectedRouteProps> = ({ children, requireAssessment = false, requireRoadmap = false }) => {
    const { assessmentResult, roadmapResult, isRoadmapLoading } = useAppContext();

    if (requireAssessment && !assessmentResult) {
        return <Navigate to="/create" replace />;
    }

    if (requireRoadmap && !roadmapResult) {
        if (isRoadmapLoading && assessmentResult) {
            return <Navigate to="/processing" replace />;
        }

        return <Navigate to={assessmentResult ? '/assessment-result' : '/create'} replace />;
    }

    return <>{children}</>;
};

export default FlowProtectedRoute;