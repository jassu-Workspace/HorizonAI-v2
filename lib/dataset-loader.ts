/**
 * Dataset Loader - Loads and provides reference context for NVIDIA prompts
 * Datasets are read-only reference material, NOT stored in app state
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

type Course = {
  title?: string;
  name?: string;
  provider?: string;
  subject?: string;
  level?: string;
  rating?: number;
  students?: number;
};

let courseCache: Course[] | null = null;

/**
 * Load courses from CSV files in the Datasets directory
 */
const loadCoursesFromCSV = (): Course[] => {
  if (courseCache) {
    return courseCache;
  }

  const courses: Course[] = [];
  const datasetsDir = path.join(process.cwd(), 'Datasets');

  try {
    const csvFiles = ['coursea_data.csv', 'udemy_courses.csv'];

    for (const file of csvFiles) {
      const filePath = path.join(datasetsDir, file);

      if (!fs.existsSync(filePath)) {
        console.warn(`[dataset-loader] File not found: ${filePath}`);
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const records = parse(content, {
          columns: true,
          skip_empty_lines: true,
          max_record_size: 100 * 1024, // 100KB per record limit
          relax_quotes: true,
        }) as Course[];

        console.log(`[dataset-loader] Loaded ${records.length} records from ${file}`);
        courses.push(...records);
      } catch (error) {
        console.error(`[dataset-loader] Error parsing ${file}:`, error);
      }
    }

    courseCache = courses;
    return courses;
  } catch (error) {
    console.error('[dataset-loader] Error loading datasets:', error);
    return [];
  }
};

/**
 * Search courses by keyword/skill
 */
export const searchCourses = (skill: string, limit: number = 5): string => {
  try {
    const courses = loadCoursesFromCSV();

    if (courses.length === 0) {
      return '(No courses available in dataset)';
    }

    const skillLower = skill.toLowerCase();
    const relevant = courses.filter(course => {
      const title = String(course.title || course.name || '').toLowerCase();
      const subject = String(course.subject || '').toLowerCase();
      return title.includes(skillLower) || subject.includes(skillLower);
    });

    const selected = relevant.slice(0, limit);

    if (selected.length === 0) {
      return `(Dataset contains ${courses.length} courses but none match "${skill}")`;
    }

    const summary = selected
      .map(
        c =>
          `- ${c.title || c.name || 'Untitled'} (${c.provider || 'Unknown'}) [${
            c.level || 'All levels'
          }]`,
      )
      .join('\n');

    return `\nTop courses for "${skill}":\n${summary}`;
  } catch (error) {
    console.error('[dataset-loader] Error searching courses:', error);
    return '(Dataset search unavailable)';
  }
};

/**
 * Get random course recommendations
 */
export const getRandomCourses = (limit: number = 3): string => {
  try {
    const courses = loadCoursesFromCSV();

    if (courses.length === 0) {
      return '(No courses available)';
    }

    const shuffled = courses.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, limit);

    const summary = selected
      .map(
        c =>
          `- ${c.title || c.name || 'Untitled'} (${c.provider || 'Unknown'})`,
      )
      .join('\n');

    return `\nAvailable courses:\n${summary}`;
  } catch (error) {
    console.error('[dataset-loader] Error getting random courses:', error);
    return '(Course recommendations unavailable)';
  }
};

/**
 * Get dataset statistics for context
 */
export const getDatasetStats = (): string => {
  try {
    const courses = loadCoursesFromCSV();
    const providers = new Set(courses.map(c => c.provider).filter(Boolean));

    return `\nDataset: ${courses.length} courses from ${providers.size} providers`;
  } catch (error) {
    return '(Dataset unavailable)';
  }
};

export default { searchCourses, getRandomCourses, getDatasetStats };
