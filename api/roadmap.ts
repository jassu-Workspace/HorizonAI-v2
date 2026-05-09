/**
 * Roadmap Generation API - Integrates NVIDIA API with dataset context
 * Datasets loaded server-side, used as reference context in prompts only
 */

import express, { Request, Response } from 'express';
import * as NvidiaClient from '../lib/nvidia-client';
import { searchCourses, getRandomCourses } from '../lib/dataset-loader';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * POST /api/assessment/generate
 * Generate assessment questions with dataset context
 */
router.post('/assessment/generate', async (req: Request, res: Response) => {
  try {
    const { skill, interestDomain } = req.body;

    if (!skill || !interestDomain) {
      return res.status(400).json({ error: 'skill and interestDomain are required' });
    }

    // Load dataset context (not stored in app)
    const datasetContext = searchCourses(skill, 5) + '\n' + getRandomCourses(3);

    console.log('[roadmap-api] Generating assessment with dataset context');

    // Call NVIDIA with dataset context
    const questions = await NvidiaClient.generateAssessmentQuestions(
      skill,
      interestDomain,
      datasetContext,
    );

    return res.json({ success: true, questions });
  } catch (error) {
    console.error('[roadmap-api] Assessment generation failed:', error);
    return res.status(500).json({
      error: 'Failed to generate assessment questions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/roadmap/generate
 * Generate personalized roadmap with dataset context
 */
router.post('/roadmap/generate', async (req: Request, res: Response) => {
  try {
    const { skill, userLevel, interestDomain, weeks = 12 } = req.body;

    if (!skill || !userLevel || !interestDomain) {
      return res
        .status(400)
        .json({ error: 'skill, userLevel, and interestDomain are required' });
    }

    // Load dataset context (not stored in app)
    const datasetContext = searchCourses(skill, 10) + '\n' + getRandomCourses(5);

    console.log('[roadmap-api] Generating roadmap with dataset context');

    // Call NVIDIA with dataset context
    const roadmap = await NvidiaClient.generateRoadmap(
      skill,
      userLevel as 'Beginner' | 'Intermediate' | 'Expert',
      interestDomain,
      weeks,
      datasetContext,
    );

    return res.json({ success: true, roadmap });
  } catch (error) {
    console.error('[roadmap-api] Roadmap generation failed:', error);
    return res.status(500).json({
      error: 'Failed to generate roadmap',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/skill-suggestions
 * Generate skill suggestions using dataset context
 */
router.post('/skill-suggestions', async (req: Request, res: Response) => {
  try {
    const { skill, interestDomain } = req.body;

    if (!skill || !interestDomain) {
      return res.status(400).json({ error: 'skill and interestDomain are required' });
    }

    const datasetContext = searchCourses(skill, 8) + '\n' + getRandomCourses(4);

    console.log('[roadmap-api] Generating skill suggestions with dataset context');

    const suggestions = await NvidiaClient.generateSkillSuggestions(
      skill,
      interestDomain,
      datasetContext,
    );

    return res.json({ success: true, suggestions });
  } catch (error) {
    console.error('[roadmap-api] Skill suggestion generation failed:', error);
    return res.status(500).json({
      error: 'Failed to generate skill suggestions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/roadmap/score
 * Score assessment answers and determine skill level
 */
router.post('/roadmap/score', async (req: Request, res: Response) => {
  try {
    const { skill, questions, answers, interestDomain } = req.body;

    if (!skill || !Array.isArray(questions) || !Array.isArray(answers)) {
      return res.status(400).json({
        error: 'skill, questions array, and answers array are required',
      });
    }

    console.log('[roadmap-api] Scoring assessment');

    const result = await NvidiaClient.scoreAssessment(
      skill,
      questions,
      answers,
      interestDomain,
    );

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[roadmap-api] Assessment scoring failed:', error);
    return res.status(500).json({
      error: 'Failed to score assessment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/career/recommendations
 * Generate career recommendations with dataset context
 */
router.post('/career/recommendations', async (req: Request, res: Response) => {
  try {
    const { skill, userLevel, interestDomain } = req.body;

    if (!skill || !userLevel || !interestDomain) {
      return res
        .status(400)
        .json({ error: 'skill, userLevel, and interestDomain are required' });
    }

    // Load job market context (not stored in app)
    const jobContext = getRandomCourses(5);

    console.log('[roadmap-api] Generating career recommendations');

    const recommendations = await NvidiaClient.generateCareerRecommendations(
      skill,
      userLevel as 'Beginner' | 'Intermediate' | 'Expert',
      interestDomain,
      jobContext,
    );

    return res.json({ success: true, recommendations });
  } catch (error) {
    console.error('[roadmap-api] Career recommendation generation failed:', error);
    return res.status(500).json({
      error: 'Failed to generate career recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
