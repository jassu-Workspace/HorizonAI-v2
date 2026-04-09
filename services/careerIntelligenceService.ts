export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type CareerIntent = 'job' | 'higher_studies' | 'entrepreneurship' | 'research' | 'undecided';

export interface CareerIntelligenceUserProfile {
  academic_background?: string;
  skills?: string[] | string;
  interests?: string[] | string;
  performance?: string | number;
  career_goals?: string | string[];
  selected_domain?: string;
  learning_capacity?: 'low' | 'medium' | 'high' | string;
}

export interface CareerKnowledgeItem {
  title?: string;
  description?: string;
  summary?: string;
  content?: string;
  link?: string;
  source?: string;
  tags?: string[];
  roles?: string[];
  skills?: string[];
  published_at?: string;
}

export interface CareerIntelligenceInput {
  user_profile: CareerIntelligenceUserProfile;
  course: string;
  web_data: unknown;
  dataset_data: unknown;
}

export interface CareerPath {
  role: string;
  description: string;
  future_scope: string;
}

export interface SkillBuckets {
  beginner: string[];
  intermediate: string[];
  advanced: string[];
}

export interface RoadmapPhase {
  phase: string;
  topics: string[];
  goals: string[];
}

export interface ResourceItem {
  type: 'course' | 'article' | 'tool';
  name: string;
  link: string;
  reason: string;
}

export interface CareerIntelligenceReport {
  user_analysis: {
    level: ProficiencyLevel;
    strengths: string[];
    weaknesses: string[];
    recommended_focus: string[];
  };
  career_paths: CareerPath[];
  skills_required: SkillBuckets;
  roadmap: RoadmapPhase[];
  resources: ResourceItem[];
  personalized_strategy: string[];
  estimated_timeline: string;
  bonus_recommendations: string[];
}

interface NormalizedKnowledge {
  title: string;
  description: string;
  link: string;
  source: 'web' | 'dataset';
  authority: number;
  roles: string[];
  skills: string[];
  tags: string[];
}

interface DomainProfile {
  roles: string[];
  skills: SkillBuckets;
  roadmapPhases: Array<{ phase: string; topics: string[] }>;
}

const TRUSTED_HOSTS = [
  'coursera.org',
  'edx.org',
  'mit.edu',
  'stanford.edu',
  'harvard.edu',
  'nptel.ac.in',
  'roadmap.sh',
  'github.com',
  'kaggle.com',
  'ieee.org',
  'acm.org',
  'bls.gov',
  'onetonline.org',
  'w3.org',
  'developer.mozilla.org',
  'learn.microsoft.com',
  'aws.amazon.com',
  'cloud.google.com',
  'azure.microsoft.com',
];

const DOMAIN_PROFILES: Record<string, DomainProfile> = {
  'machine learning': {
    roles: ['Machine Learning Engineer', 'Data Scientist', 'AI Engineer', 'MLOps Engineer'],
    skills: {
      beginner: ['Python', 'Statistics basics', 'Linear algebra', 'Data preprocessing', 'Pandas'],
      intermediate: ['Scikit-learn', 'Feature engineering', 'Model evaluation', 'SQL', 'Data visualization'],
      advanced: ['Deep learning', 'LLM fine-tuning', 'Model deployment', 'MLOps pipelines', 'Model monitoring'],
    },
    roadmapPhases: [
      { phase: 'Foundation', topics: ['Python fundamentals', 'Math for ML', 'Exploratory data analysis'] },
      { phase: 'Core Modeling', topics: ['Supervised learning', 'Unsupervised learning', 'Model validation'] },
      { phase: 'Specialization', topics: ['Deep learning', 'NLP or Computer Vision', 'Experiment tracking'] },
      { phase: 'Career Execution', topics: ['Portfolio projects', 'Deployment', 'Interview preparation'] },
    ],
  },
  'data science': {
    roles: ['Data Analyst', 'Data Scientist', 'Business Intelligence Engineer'],
    skills: {
      beginner: ['Python', 'SQL', 'Statistics', 'Excel'],
      intermediate: ['Data cleaning', 'Visualization', 'A/B testing', 'Hypothesis testing'],
      advanced: ['Machine learning', 'Causal inference', 'Data storytelling', 'Production analytics'],
    },
    roadmapPhases: [
      { phase: 'Foundation', topics: ['Python and SQL', 'Descriptive statistics', 'Data wrangling'] },
      { phase: 'Analysis', topics: ['EDA', 'Visualization', 'Experimentation'] },
      { phase: 'Modeling', topics: ['Predictive models', 'Feature engineering', 'Model diagnostics'] },
      { phase: 'Career Execution', topics: ['Dashboard portfolio', 'Case interviews', 'Domain specialization'] },
    ],
  },
  'web development': {
    roles: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer'],
    skills: {
      beginner: ['HTML', 'CSS', 'JavaScript', 'Git'],
      intermediate: ['React', 'TypeScript', 'Node.js', 'REST APIs'],
      advanced: ['System design', 'Performance optimization', 'Security hardening', 'CI/CD'],
    },
    roadmapPhases: [
      { phase: 'Foundation', topics: ['HTML/CSS', 'JavaScript basics', 'Version control'] },
      { phase: 'Application Development', topics: ['React ecosystem', 'Backend APIs', 'Databases'] },
      { phase: 'Engineering Depth', topics: ['Testing', 'Authentication', 'Scalability patterns'] },
      { phase: 'Career Execution', topics: ['Production projects', 'Open-source contribution', 'Interview prep'] },
    ],
  },
  'cybersecurity': {
    roles: ['Security Analyst', 'SOC Analyst', 'Penetration Tester', 'Cloud Security Engineer'],
    skills: {
      beginner: ['Networking basics', 'Linux fundamentals', 'Security concepts', 'Python scripting'],
      intermediate: ['Threat detection', 'SIEM tooling', 'Vulnerability assessment', 'Incident response'],
      advanced: ['Red teaming', 'Cloud security architecture', 'Threat intelligence', 'Security automation'],
    },
    roadmapPhases: [
      { phase: 'Foundation', topics: ['Networking', 'Operating systems', 'Security fundamentals'] },
      { phase: 'Defense Skills', topics: ['Monitoring and logging', 'Threat hunting', 'IR workflows'] },
      { phase: 'Specialization', topics: ['Offensive testing or cloud security', 'Compliance', 'Automation'] },
      { phase: 'Career Execution', topics: ['Hands-on labs', 'Security portfolio', 'Certification strategy'] },
    ],
  },
  default: {
    roles: ['Domain Specialist', 'Applied Engineer', 'Technical Consultant'],
    skills: {
      beginner: ['Core fundamentals', 'Problem-solving', 'Communication'],
      intermediate: ['Project execution', 'Domain tooling', 'Collaboration'],
      advanced: ['Specialization depth', 'Optimization', 'Leadership'],
    },
    roadmapPhases: [
      { phase: 'Foundation', topics: ['Fundamentals', 'Core tools', 'Basic projects'] },
      { phase: 'Growth', topics: ['Intermediate projects', 'Industry best practices', 'Collaboration'] },
      { phase: 'Specialization', topics: ['Advanced topics', 'Optimization', 'Applied case studies'] },
      { phase: 'Career Execution', topics: ['Portfolio', 'Networking', 'Interview readiness'] },
    ],
  },
};

const ROLE_CATALOG = [
  'Machine Learning Engineer',
  'Data Scientist',
  'Data Analyst',
  'AI Engineer',
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Cloud Engineer',
  'DevOps Engineer',
  'Cybersecurity Analyst',
  'SOC Analyst',
  'Product Manager',
  'Business Analyst',
  'Research Engineer',
  'Entrepreneur',
];

const SKILL_CATALOG = [
  'Python',
  'Java',
  'C++',
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'SQL',
  'Statistics',
  'Linear algebra',
  'Data structures',
  'Algorithms',
  'System design',
  'Machine learning',
  'Deep learning',
  'NLP',
  'Computer vision',
  'Cloud computing',
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'MLOps',
  'Data visualization',
  'Power BI',
  'Tableau',
  'Git',
  'Linux',
  'Cybersecurity',
  'Networking',
  'Communication',
  'Problem-solving',
];

const GENERIC_PHRASES = [
  'work hard',
  'stay motivated',
  'keep learning',
  'do your best',
  'be consistent',
];

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>);
  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      return asArray(parsed);
    } catch {
      return [value];
    }
  }
  return [];
};

const normalizeText = (value: string): string => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const unique = (items: string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items) {
    const clean = item.trim();
    const key = normalizeText(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    output.push(clean);
  }
  return output;
};

const toStringList = (value: string[] | string | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return unique(value.map(String));
  return unique(String(value).split(/[;,|]/g).map((token) => token.trim()));
};

const parsePerformanceScore = (performance: string | number | undefined): number | null => {
  if (performance === undefined || performance === null) return null;

  if (typeof performance === 'number') {
    if (performance <= 10) return performance * 10;
    return Math.max(0, Math.min(100, performance));
  }

  const text = performance.toLowerCase();
  const percent = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percent) {
    return Math.max(0, Math.min(100, Number(percent[1])));
  }

  const cgpa = text.match(/(\d+(?:\.\d+)?)\s*(?:cgpa|gpa|\/\s*10)/);
  if (cgpa) {
    return Math.max(0, Math.min(100, Number(cgpa[1]) * 10));
  }

  const raw = text.match(/(\d+(?:\.\d+)?)/);
  if (raw) {
    const numeric = Number(raw[1]);
    if (numeric <= 10) return numeric * 10;
    if (numeric <= 100) return numeric;
  }

  return null;
};

const detectIntent = (goals: string): CareerIntent => {
  const text = normalizeText(goals);
  if (!text) return 'undecided';
  if (/(startup|entrepreneur|founder|business)/.test(text)) return 'entrepreneurship';
  if (/(ms|mtech|mba|phd|higher study|graduate school|masters|research)/.test(text)) return 'higher_studies';
  if (/(research|publication|lab)/.test(text)) return 'research';
  if (/(job|placement|internship|role|salary|employment)/.test(text)) return 'job';
  return 'undecided';
};

const detectDomainKey = (course: string, profile: CareerIntelligenceUserProfile): keyof typeof DOMAIN_PROFILES => {
  const raw = `${course} ${profile.selected_domain || ''} ${toStringList(profile.interests).join(' ')}`;
  const text = normalizeText(raw);

  if (/(ml|machine learning|artificial intelligence|ai|nlp|computer vision)/.test(text)) return 'machine learning';
  if (/(data science|analytics|data analyst|bi)/.test(text)) return 'data science';
  if (/(web|frontend|backend|full stack|javascript|react)/.test(text)) return 'web development';
  if (/(security|cyber|infosec|soc|penetration|network security)/.test(text)) return 'cybersecurity';
  return 'default';
};

const inferLevel = (profile: CareerIntelligenceUserProfile, domainProfile: DomainProfile): ProficiencyLevel => {
  const skills = toStringList(profile.skills);
  const normalizedSkills = skills.map(normalizeText);
  const gradeScore = parsePerformanceScore(profile.performance);

  const beginnerHits = domainProfile.skills.beginner.filter((skill) => normalizedSkills.includes(normalizeText(skill))).length;
  const intermediateHits = domainProfile.skills.intermediate.filter((skill) => normalizedSkills.includes(normalizeText(skill))).length;
  const advancedHits = domainProfile.skills.advanced.filter((skill) => normalizedSkills.includes(normalizeText(skill))).length;

  const weighted = beginnerHits + intermediateHits * 1.5 + advancedHits * 2;

  if (weighted >= 8 || (advancedHits >= 2 && (gradeScore ?? 0) >= 75)) return 'Advanced';
  if (weighted >= 4 || (gradeScore ?? 0) >= 60) return 'Intermediate';
  return 'Beginner';
};

const extractMentionedSkills = (text: string): string[] => {
  const normalized = normalizeText(text);
  return SKILL_CATALOG.filter((skill) => normalized.includes(normalizeText(skill)));
};

const extractMentionedRoles = (text: string): string[] => {
  const normalized = normalizeText(text);
  return ROLE_CATALOG.filter((role) => normalized.includes(normalizeText(role)));
};

const authorityScoreForWeb = (link: string, sourceHint: string): number => {
  let score = 0.55;

  let host = '';
  if (link) {
    try {
      host = new URL(link).hostname.toLowerCase();
    } catch {
      host = '';
    }
  }

  if (host && TRUSTED_HOSTS.some((trusted) => host.includes(trusted))) {
    score += 0.35;
  }

  if (/official|government|university|research|journal/.test(sourceHint.toLowerCase())) {
    score += 0.1;
  }

  return Math.min(1, score);
};

const normalizeKnowledge = (input: unknown, source: 'web' | 'dataset'): NormalizedKnowledge[] => {
  const items = asArray(input);
  const normalized: NormalizedKnowledge[] = [];

  for (const entry of items) {
    let title = '';
    let description = '';
    let link = '';
    let sourceHint: string = source;
    let roles: string[] = [];
    let skills: string[] = [];
    let tags: string[] = [];

    if (typeof entry === 'string') {
      title = entry.slice(0, 120);
      description = entry;
      roles = extractMentionedRoles(entry);
      skills = extractMentionedSkills(entry);
    } else if (entry && typeof entry === 'object') {
      const record = entry as CareerKnowledgeItem;
      title = record.title || '';
      description = record.summary || record.description || record.content || '';
      link = record.link || '';
      sourceHint = record.source || source;
      roles = unique([...(record.roles || []), ...extractMentionedRoles(`${title} ${description}`)]);
      skills = unique([...(record.skills || []), ...extractMentionedSkills(`${title} ${description}`)]);
      tags = unique(record.tags || []);

      if (!title && description) {
        title = description.slice(0, 120);
      }
    }

    if (!title && !description) continue;

    const authority = source === 'dataset' ? 0.78 : authorityScoreForWeb(link, sourceHint);

    normalized.push({
      title: title || description.slice(0, 120),
      description,
      link,
      source,
      authority,
      roles,
      skills,
      tags,
    });
  }

  return normalized;
};

const buildQuerySet = (course: string, level: ProficiencyLevel, intent: CareerIntent): string[] => {
  const levelText = level.toLowerCase();
  const intentLabel = intent === 'higher_studies' ? 'higher studies' : intent;

  return unique([
    `${course} roadmap for ${levelText}`,
    `skills required for ${course} careers`,
    `latest industry trends in ${course}`,
    `best resources to learn ${course}`,
    `${course} interview preparation ${levelText}`,
    `${course} projects for ${levelText}`,
    `${course} opportunities for ${intentLabel}`,
  ]);
};

const relevanceScore = (
  item: NormalizedKnowledge,
  contextTokens: string[],
): number => {
  const haystack = normalizeText(`${item.title} ${item.description} ${item.tags.join(' ')} ${item.skills.join(' ')}`);
  let overlap = 0;

  for (const token of contextTokens) {
    if (token.length < 3) continue;
    if (haystack.includes(token)) overlap += 1;
  }

  const normalizedOverlap = contextTokens.length > 0 ? overlap / contextTokens.length : 0;
  return item.authority * 0.6 + normalizedOverlap * 0.4;
};

const dedupeKnowledge = (items: NormalizedKnowledge[]): NormalizedKnowledge[] => {
  const byKey = new Map<string, NormalizedKnowledge>();

  for (const item of items) {
    const key = normalizeText(`${item.title} ${item.link || ''}`);
    const existing = byKey.get(key);
    if (!existing || item.authority > existing.authority) {
      byKey.set(key, item);
    }
  }

  return Array.from(byKey.values());
};

const removeGeneric = (items: string[]): string[] => {
  return unique(
    items.filter((item) => {
      const text = normalizeText(item);
      return !GENERIC_PHRASES.some((phrase) => text.includes(normalizeText(phrase)));
    }),
  );
};

const takeTop = (items: string[], limit: number): string[] => {
  return unique(items).slice(0, limit);
};

const buildTimeline = (level: ProficiencyLevel, capacity: string | undefined): string => {
  const normalizedCapacity = normalizeText(capacity || 'medium');

  if (level === 'Beginner') {
    if (normalizedCapacity === 'high') return '6-9 months with 12-15 focused hours/week';
    if (normalizedCapacity === 'low') return '10-14 months with 6-8 focused hours/week';
    return '8-12 months with 8-12 focused hours/week';
  }

  if (level === 'Intermediate') {
    if (normalizedCapacity === 'high') return '4-6 months with 10-12 focused hours/week';
    if (normalizedCapacity === 'low') return '7-10 months with 5-7 focused hours/week';
    return '5-8 months with 7-10 focused hours/week';
  }

  if (normalizedCapacity === 'high') return '3-4 months with 8-10 focused hours/week';
  if (normalizedCapacity === 'low') return '5-7 months with 4-6 focused hours/week';
  return '4-6 months with 6-8 focused hours/week';
};

const ensureResourceLink = (resourceName: string, existingLink: string): string => {
  if (existingLink) return existingLink;
  return `https://www.google.com/search?q=${encodeURIComponent(resourceName)}`;
};

const qualityControl = (report: CareerIntelligenceReport): CareerIntelligenceReport => {
  const sanitized: CareerIntelligenceReport = {
    ...report,
    user_analysis: {
      ...report.user_analysis,
      strengths: takeTop(removeGeneric(report.user_analysis.strengths), 8),
      weaknesses: takeTop(removeGeneric(report.user_analysis.weaknesses), 8),
      recommended_focus: takeTop(removeGeneric(report.user_analysis.recommended_focus), 8),
    },
    career_paths: report.career_paths
      .filter((path) => path.role.trim().length > 0)
      .slice(0, 5),
    skills_required: {
      beginner: takeTop(removeGeneric(report.skills_required.beginner), 10),
      intermediate: takeTop(removeGeneric(report.skills_required.intermediate), 10),
      advanced: takeTop(removeGeneric(report.skills_required.advanced), 10),
    },
    roadmap: report.roadmap
      .map((phase) => ({
        ...phase,
        topics: takeTop(removeGeneric(phase.topics), 10),
        goals: takeTop(removeGeneric(phase.goals), 5),
      }))
      .filter((phase) => phase.phase.trim().length > 0),
    resources: report.resources
      .filter((resource) => resource.name.trim().length > 0)
      .slice(0, 8)
      .map((resource) => ({
        ...resource,
        link: ensureResourceLink(resource.name, resource.link),
      })),
    personalized_strategy: takeTop(removeGeneric(report.personalized_strategy), 10),
    bonus_recommendations: takeTop(removeGeneric(report.bonus_recommendations), 8),
  };

  if (sanitized.career_paths.length === 0) {
    sanitized.career_paths = [
      {
        role: 'Domain Specialist',
        description: 'Applies strong domain fundamentals to solve real business problems.',
        future_scope: 'Stable demand with clear growth to senior and strategic roles.',
      },
    ];
  }

  if (sanitized.resources.length === 0) {
    sanitized.resources = [
      {
        type: 'article',
        name: 'Industry roadmap overview',
        link: ensureResourceLink('industry roadmap overview', ''),
        reason: 'Provides a baseline structure while you gather more domain-specific sources.',
      },
    ];
  }

  return sanitized;
};

export const executeCareerIntelligencePipeline = (
  input: CareerIntelligenceInput,
): CareerIntelligenceReport => {
  const profile = input.user_profile || {};
  const course = (input.course || profile.selected_domain || 'selected domain').trim();

  const profileSkills = toStringList(profile.skills);
  const interests = toStringList(profile.interests);
  const goalsText = Array.isArray(profile.career_goals)
    ? profile.career_goals.join(' ')
    : String(profile.career_goals || '');

  const domainKey = detectDomainKey(course, profile);
  const domainProfile = DOMAIN_PROFILES[domainKey] || DOMAIN_PROFILES.default;

  const level = inferLevel(profile, domainProfile);
  const intent = detectIntent(goalsText);
  const generatedQueries = buildQuerySet(course, level, intent);

  const webKnowledge = normalizeKnowledge(input.web_data, 'web');
  const datasetKnowledge = normalizeKnowledge(input.dataset_data, 'dataset');
  const fusedKnowledge = dedupeKnowledge([...webKnowledge, ...datasetKnowledge]);

  const contextTokens = unique(
    normalizeText(
      [
        course,
        profile.academic_background || '',
        goalsText,
        profileSkills.join(' '),
        interests.join(' '),
        generatedQueries.join(' '),
      ].join(' '),
    ).split(' '),
  );

  const rankedInsights = fusedKnowledge
    .map((item) => ({ item, score: relevanceScore(item, contextTokens) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item)
    .slice(0, 25);

  const insightRoles = rankedInsights.flatMap((insight) => insight.roles);
  const insightSkills = rankedInsights.flatMap((insight) => insight.skills);

  const strengths = unique([
    ...profileSkills,
    ...domainProfile.skills.beginner.filter((skill) => profileSkills.map(normalizeText).includes(normalizeText(skill))),
    ...insightSkills.slice(0, 3),
  ]);

  const foundationalNeeds = domainProfile.skills.beginner.filter(
    (skill) => !profileSkills.map(normalizeText).includes(normalizeText(skill)),
  );

  const weaknesses = unique([
    ...foundationalNeeds,
    ...(parsePerformanceScore(profile.performance) !== null && (parsePerformanceScore(profile.performance) as number) < 60
      ? ['Core fundamentals retention']
      : []),
  ]);

  const recommendedFocus = unique([
    ...weaknesses.slice(0, 4),
    ...(level === 'Beginner' ? ['Consistent fundamentals practice'] : []),
    ...(level === 'Intermediate' ? ['Project depth and applied problem solving'] : []),
    ...(level === 'Advanced' ? ['Specialization and production-grade execution'] : []),
    ...(intent === 'job' ? ['Interview-ready portfolio and role alignment'] : []),
    ...(intent === 'higher_studies' ? ['Research orientation and academic depth'] : []),
    ...(intent === 'entrepreneurship' ? ['Market validation and product execution'] : []),
  ]);

  const careerPaths = unique([...insightRoles, ...domainProfile.roles]).slice(0, 4).map((role) => {
    const relatedInsight = rankedInsights.find((insight) => insight.roles.map(normalizeText).includes(normalizeText(role)));

    return {
      role,
      description:
        relatedInsight?.description ||
        `${role} pathway aligned with ${course}, emphasizing practical execution and measurable outcomes.`,
      future_scope:
        relatedInsight?.title ||
        `Strong demand trajectory in ${course} with increasing specialization opportunities.`,
    };
  });

  const skillsRequired: SkillBuckets = {
    beginner: unique([...domainProfile.skills.beginner, ...weaknesses]).slice(0, 10),
    intermediate: unique([...domainProfile.skills.intermediate, ...insightSkills]).slice(0, 10),
    advanced: unique([...domainProfile.skills.advanced, ...insightSkills]).slice(0, 10),
  };

  const roadmap: RoadmapPhase[] = domainProfile.roadmapPhases.map((phase, index) => {
    const goals: string[] = [];

    if (index === 0) {
      goals.push('Close fundamental gaps and build consistent study rhythm.');
    }
    if (index === 1) {
      goals.push('Deliver one guided project with measurable outcomes.');
    }
    if (index === 2) {
      goals.push('Build specialization depth through domain-focused projects.');
    }
    if (index === 3) {
      goals.push('Prepare for interviews, applications, or launch strategy.');
    }

    if (level === 'Beginner' && index < 2) {
      goals.push('Focus on concept clarity before speed.');
    }
    if (level === 'Advanced' && index >= 2) {
      goals.push('Optimize for production quality and measurable impact.');
    }

    return {
      phase: phase.phase,
      topics: unique([...phase.topics, ...(index === 0 ? weaknesses.slice(0, 2) : [])]),
      goals: unique(goals),
    };
  });

  const resources: ResourceItem[] = rankedInsights.slice(0, 8).map((insight) => {
    const normalizedDescription = normalizeText(insight.description);
    const type: ResourceItem['type'] =
      /course|specialization|bootcamp|curriculum/.test(normalizedDescription)
        ? 'course'
        : /tool|platform|software|framework|library/.test(normalizedDescription)
          ? 'tool'
          : 'article';

    return {
      type,
      name: insight.title,
      link: insight.link,
      reason: `High-relevance ${insight.source} source with authority score ${insight.authority.toFixed(2)}.`,
    };
  });

  const personalizedStrategy = unique([
    `Primary intent detected: ${intent === 'undecided' ? 'career exploration' : intent.replace('_', ' ')}.`,
    level === 'Beginner'
      ? 'Spend first 4-6 weeks on core concepts with weekly revision checkpoints.'
      : 'Allocate 60% time to project execution and 40% to concept reinforcement.',
    `Use generated queries to update market signals weekly: ${generatedQueries.slice(0, 2).join(' | ')}`,
    weaknesses.length > 0
      ? `Address top weakness first: ${weaknesses[0]}.`
      : 'Maintain momentum by increasing project complexity every 2-3 weeks.',
    intent === 'job'
      ? 'Create role-targeted resume bullets tied to measurable project outcomes.'
      : intent === 'higher_studies'
        ? 'Build a research-style portfolio with methodology and evaluation rigor.'
        : intent === 'entrepreneurship'
          ? 'Validate one niche problem statement through small MVP experiments.'
          : 'Track two adjacent career paths and compare fit through mini-projects.',
  ]);

  const bonusRecommendations = unique([
    'Run monthly skill-gap audits against role requirements and update roadmap topics.',
    'Build one public proof-of-work artifact per phase (GitHub, blog, or demo).',
    'Use peer review or mentorship checkpoints every two weeks to reduce blind spots.',
    'Track learning metrics: hours, completed tasks, and project outcomes.',
  ]);

  const report: CareerIntelligenceReport = {
    user_analysis: {
      level,
      strengths,
      weaknesses,
      recommended_focus: recommendedFocus,
    },
    career_paths: careerPaths,
    skills_required: skillsRequired,
    roadmap,
    resources,
    personalized_strategy: personalizedStrategy,
    estimated_timeline: buildTimeline(level, profile.learning_capacity),
    bonus_recommendations: bonusRecommendations,
  };

  return qualityControl(report);
};

export const generateCareerIntelligenceReport = executeCareerIntelligencePipeline;
