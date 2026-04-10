
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, LearningStyle, AcademicLevel, Stream, FocusArea } from '../types';
import { saveProfileFromOnboarding, uploadResume, supabase } from '../services/supabaseService';

interface OnboardingProps {
    onComplete: (profileData: Partial<UserProfile>) => void;
}

// Comprehensive Data Mapping
const ACADEMIC_DATA: any = {
    'Arts & Commerce': {
        'Graduation': {
            'Bachelor of Fine Arts': ['Painting', 'Applied Arts', 'Sculpture', 'Graphic Design', 'Animation', 'Photography', 'Art History', 'Illustration', 'Printmaking', 'Visual Communication'],
            'B.Ed': ['Child Psychology', 'Educational Technology', 'Special Education', 'Classroom Management', 'Curriculum Development', 'Guidance & Counseling', 'Early Childhood Education', 'Subject Pedagogy', 'Educational Leadership', 'Inclusive Education']
        },
        'Post Graduation': {
            'MA-Hindi': ['Hindi Literature', 'Linguistics', 'Translation Studies', 'Folk Literature', 'Hindi Criticism', 'Functional Hindi', 'Drama & Theatre', 'Comparative Literature', 'Journalism', 'Creative Writing'],
            'M.A. Dance': ['Classical Dance', 'Choreography', 'Dance Therapy', 'Folk Dance', 'Modern Dance', 'Dance History', 'Performance Studies', 'Rhythm & Percussion', 'Stagecraft', 'Yoga for Dancers'],
            'M.A-Music': ['Vocal Music', 'Instrumental Music', 'Musicology', 'Music Therapy', 'Sound Engineering', 'Composition', 'Ethnomusicology', 'Classical Theory', 'Rhythmics', 'Folk Music'],
            'M.A-Yoga & Consciousness': ['Yoga Therapy', 'Hatha Yoga', 'Patanjali Yoga Sutras', 'Anatomy & Physiology', 'Naturopathy', 'Meditation Techniques', 'Ayurveda Basics', 'Diet & Nutrition', 'Mental Health', 'Research in Yoga'],
            'MA-Sanskrit': ['Vedic Studies', 'Classical Sanskrit Literature', 'Sanskrit Grammar', 'Indian Philosophy', 'Epigraphy', 'Manuscriptology', 'Puranas', 'Dharmashastra', 'Poetics', 'Ancient Indian Culture']
        }
    },
    'Engineering': {
        'Graduation': {
            'Architecture': ['Interior Design', 'Urban Design', 'Landscape Architecture', 'Sustainable Architecture', 'History of Architecture', 'Building Construction', 'Town Planning', 'Architectural Conservation', 'Green Building', 'Digital Architecture'],
            'Civil': ['Structural Engineering', 'Construction Management', 'Geotechnical Engineering', 'Environmental Engineering', 'Transportation Engineering', 'Urban Planning', 'Surveying', 'Concrete Technology', 'Water Resources', 'BIM'],
            'CSE': ['Machine Learning', 'Web Development', 'Data Science', 'Cloud Computing', 'Cyber Security', 'Artificial Intelligence', 'Blockchain', 'DevOps', 'Full Stack Development', 'IoT'],
            'ECE': ['VLSI Design', 'Embedded Systems', 'Signal Processing', 'Robotics', 'Communication Systems', 'IoT', 'Nanoelectronics', 'Wireless Networks', 'Analog Electronics', 'Digital Electronics'],
            'IT': ['Data Analytics', 'Network Security', 'Software Engineering', 'Cloud Architecture', 'IT Management', 'System Administration', 'ERP', 'Database Management', 'Business Intelligence', 'Web Technologies'],
            'Mech': ['Robotics', 'Mechatronics', 'Automobile Engineering', 'CAD/CAM', 'Thermodynamics', 'Fluid Mechanics', 'Manufacturing Technology', 'HVAC', '3D Printing', 'Industrial Automation']
        },
        'Post Graduation': {
            'Geo Technical Engineering': ['Soil Mechanics', 'Foundation Engineering', 'Rock Mechanics', 'Earthquake Engineering', 'Ground Improvement', 'Geo-Environmental Engineering', 'Tunneling', 'Slope Stability', 'Offshore Geotechnics', 'Pavement Geotechnics'],
            'Computer Science & Technology': ['Advanced Algorithms', 'Distributed Systems', 'High Performance Computing', 'Computer Vision', 'NLP', 'Big Data Analytics', 'Quantum Computing', 'Cryptography', 'Soft Computing', 'Human Computer Interaction'],
            'Heat Power Engineering': ['Advanced Thermodynamics', 'Gas Dynamics', 'IC Engines', 'Refrigeration & Cryogenics', 'Heat Transfer', 'Power Plant Engineering', 'Solar Energy', 'Combustion Technology', 'Fluid Dynamics', 'Energy Management']
        }
    },
    'Science & Technology': {
        'Post Graduation': {
            'Biochemistry': ['Molecular Biology', 'Genetics', 'Enzymology', 'Immunology', 'Clinical Biochemistry', 'Metabolism', 'Biotechnology', 'Cell Biology', 'Bioinformatics', 'Pharmacology'],
            'Microbiology': ['Virology', 'Bacteriology', 'Immunology', 'Industrial Microbiology', 'Medical Microbiology', 'Microbial Genetics', 'Food Microbiology', 'Environmental Microbiology', 'Mycology', 'Parasitology'],
            'Environmental Sciences': ['Ecology', 'Pollution Control', 'Natural Resource Management', 'Environmental Law', 'Climate Change', 'Waste Management', 'Environmental Chemistry', 'Biodiversity Conservation', 'Toxicology', 'Remote Sensing'],
            'Mathematics': ['Algebra', 'Analysis', 'Topology', 'Differential Equations', 'Number Theory', 'Probability & Statistics', 'Discrete Mathematics', 'Operations Research', 'Computational Mathematics', 'Fluid Dynamics']
        }
    },
    'Medical': {
        'All': {
            'Anatomy': ['Gross Anatomy', 'Histology', 'Embryology', 'Neuroanatomy', 'Clinical Anatomy', 'Radiological Anatomy', 'Genetics', 'Surgical Anatomy', 'Anthropology', 'Comparative Anatomy'],
            'Cardiology': ['Interventional Cardiology', 'Pediatric Cardiology', 'Electrophysiology', 'Echocardiography', 'Nuclear Cardiology', 'Heart Failure', 'Preventive Cardiology', 'Cardiac Imaging', 'Hypertension', 'Vascular Medicine'],
            'Dentist': ['Orthodontics', 'Oral Surgery', 'Periodontics', 'Endodontics', 'Prosthodontics', 'Pediatric Dentistry', 'Oral Pathology', 'Public Health Dentistry', 'Dental Anatomy', 'Forensic Odontology'],
            'Neuro Surgery': ['Pediatric Neurosurgery', 'Spine Surgery', 'Neuro-Oncology', 'Cerebrovascular Surgery', 'Skull Base Surgery', 'Functional Neurosurgery', 'Peripheral Nerve Surgery', 'Neurotrauma', 'Epilepsy Surgery', 'Pain Management'],
            'Forensic': ['Forensic Pathology', 'Clinical Forensic Medicine', 'Forensic Toxicology', 'Forensic Serology', 'Forensic Psychiatry', 'Digital Forensics', 'Forensic Anthropology', 'Crime Scene Investigation', 'Medical Jurisprudence', 'DNA Profiling']
        }
    }
};

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const totalSteps = 4; // Reduced Steps (Removed Rapid Test)

    // Step 1: Name
    const [fullName, setFullName] = useState('');
    
    // Step 2: Academic Details
    const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('Graduation');
    const [stream, setStream] = useState<Stream>('Engineering'); 
    const [branch, setBranch] = useState<string>(''); 
    const [academics, setAcademics] = useState<string>(''); // Specialization

    // Step 3: Focus & Style
    const [focusArea, setFocusArea] = useState<FocusArea>('General');
    const [learningStyle, setLearningStyle] = useState<LearningStyle>('Balanced');
    
    // Step 4: Resume
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic Options Logic
    const [availableStreams, setAvailableStreams] = useState<Stream[]>([]);
    const [availableBranches, setAvailableBranches] = useState<string[]>([]);
    const [availableAcademics, setAvailableAcademics] = useState<string[]>([]);

    useEffect(() => {
        let newStreams: Stream[] = [];
        if (academicLevel === 'Graduation' || academicLevel === 'Post Graduation') {
            newStreams = ['Engineering', 'Arts & Commerce', 'Science & Technology', 'Medical'];
        } else if (academicLevel === 'Diploma / Polytechnic') {
             newStreams = ['Diploma Engineering', 'Commerce', 'Arts'];
        } else { 
            newStreams = ['Science', 'Commerce', 'Biology', 'Arts', 'General'];
        }
        setAvailableStreams(newStreams);
        if (!newStreams.includes(stream)) setStream(newStreams[0]);
    }, [academicLevel]);

    useEffect(() => {
        let branches: string[] = [];
        const isGradOrPG = academicLevel === 'Graduation' || academicLevel === 'Post Graduation';
        if (isGradOrPG) {
            const streamData = ACADEMIC_DATA[stream as any];
            if (streamData) {
                if (stream === 'Medical') {
                    branches = Object.keys(streamData['All'] || {});
                } else {
                    branches = Object.keys(streamData[academicLevel] || {});
                }
            }
        } else if (academicLevel === 'Diploma / Polytechnic') {
             branches = ['Computer Science', 'Mechanical', 'Electrical', 'Civil'];
        }
        setAvailableBranches(branches);
        if (branches.length > 0) setBranch(branches[0]);
        else setBranch('');
    }, [academicLevel, stream]);

    useEffect(() => {
        let specs: string[] = [];
        const streamData = ACADEMIC_DATA[stream as any];
        if (streamData) {
             if (stream === 'Medical') {
                specs = streamData['All']?.[branch] || [];
             } else {
                specs = streamData[academicLevel]?.[branch] || [];
             }
        } else if (academicLevel === 'Diploma / Polytechnic') {
            specs = ['General', 'Applied'];
        }
        setAvailableAcademics(specs);
        if (specs.length > 0) setAcademics(specs[0]);
        else setAcademics('');
    }, [academicLevel, stream, branch]);
    
    const stepTitles = ["Your Name", "Academics", "Learning Focus", "Resume"];

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(s => s + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(s => s - 1);
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setResumeFile(event.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Please sign in before completing onboarding.');
            navigate('/auth');
            return;
        }
        
        // Critical Fix: If we are not at the final step, move to next step instead of saving.
        if (step < totalSteps) {
            handleNext();
            return;
        }

        // Only proceed to save if we are on the final step
        setIsUploading(true);
        let resumePath;

        try {
            if (resumeFile) {
                resumePath = await uploadResume(resumeFile);
            }

            const profileData: UserProfile = {
                fullName,
                academicLevel,
                stream, 
                academicCourse: branch, 
                specialization: academics, 
                learningStyle,
                focusArea,
                resumePath,
                skills: '',
                interests: ''
            };

            await saveProfileFromOnboarding(profileData);
            onComplete(profileData);

        } catch (err: any) {
            console.error("Failed to save profile or upload resume", err);
            const errorMessage = err?.message || "An error occurred. Please try again.";

            if (
                String(errorMessage).toLowerCase().includes('full_name') ||
                String(errorMessage).toLowerCase().includes('schema cache') ||
                String(errorMessage).toLowerCase().includes('column')
            ) {
                onComplete({
                    fullName,
                    academicLevel,
                    stream,
                    academicCourse: branch,
                    specialization: academics,
                    learningStyle,
                    focusArea,
                    resumePath,
                    skills: '',
                    interests: '',
                });
                return;
            }

            if (String(errorMessage).toLowerCase().includes('not authenticated')) {
                alert('Please sign in to save your profile.');
                navigate('/auth');
                return;
            }

            alert(`Failed to save profile: ${errorMessage}`);
        } finally {
            setIsUploading(false);
        }
    };

    const PillGroup: React.FC<{label: string, options: string[], selected: string, onSelect: (value: any) => void, className?: string}> = ({label, options, selected, onSelect, className}) => (
        <div className={className}>
            <label className="block text-sm font-medium text-slate-700 mb-3 text-center">{label}</label>
            <div className="flex flex-wrap justify-center gap-2">
                {options.map(opt => (
                     <button type="button" key={opt} onClick={() => onSelect(opt)} className={`pill-button ${selected === opt ? 'selected' : ''}`}>{opt}</button>
                ))}
            </div>
        </div>
    );
    
    const ProgressBar = () => (
        <div className="flex items-center justify-center mb-8">
            {stepTitles.map((title, index) => {
                const stepIndex = index + 1;
                const isActive = step === stepIndex;
                const isCompleted = step > stepIndex;

                return (
                    <React.Fragment key={stepIndex}>
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isActive ? 'bg-blue-500 border-blue-500 text-white shadow-lg' : isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-400'
                            }`}>
                                <ion-icon name={isCompleted ? "checkmark-done" : (isActive ? "pencil" : "lock-closed")}></ion-icon>
                            </div>
                            <p className={`text-[10px] md:text-xs mt-2 font-semibold transition-colors ${isActive || isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>{title}</p>
                        </div>
                        {stepIndex < totalSteps && (
                            <div className={`flex-auto h-1 mx-2 transition-colors duration-500 ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );

    return (
        <div className="glass-card p-6 md:p-10 max-w-3xl mx-auto mt-10 relative z-10">
            <h2 className="roadmap-title-font text-3xl font-bold text-slate-900 mb-2 text-center">Setup Your Profile</h2>
            
            <ProgressBar />
            
            <form onSubmit={handleSubmit} className="mt-8">
                <div className="min-h-[350px]">
                    {step === 1 && (
                        <div className="animate-fadeIn">
                            <h3 className="font-semibold text-center text-xl text-slate-800 mb-6">First, what should we call you?</h3>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                            <input type="text" autoFocus required title="Full name" placeholder="Enter your full name" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-3 bg-slate-100/80 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-slate-900"/>
                        </div>
                    )}
                    {step === 2 && (
                         <div className="animate-fadeIn space-y-8">
                            <PillGroup label="Academic Level" options={['Class 10', 'Class 12', 'Diploma / Polytechnic', 'Graduation', 'Post Graduation']} selected={academicLevel} onSelect={setAcademicLevel} />
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3 text-center">Field of Study</label>
                                <div className="relative max-w-xs mx-auto">
                                    <select value={stream} onChange={(e) => setStream(e.target.value as Stream)} title="Field of study" aria-label="Field of study" className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 appearance-none text-center font-medium">
                                        {availableStreams.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500"><ion-icon name="chevron-down"></ion-icon></div>
                                </div>
                            </div>

                            {availableBranches.length > 0 && (
                                <div className="animate-fadeIn">
                                    <label className="block text-sm font-bold text-slate-800 mb-3 text-center uppercase tracking-wider">BRANCHES</label>
                                    <div className="relative max-w-sm mx-auto">
                                        <select value={branch} onChange={(e) => setBranch(e.target.value)} title="Branch" aria-label="Branch" className="w-full p-3 border-2 border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 appearance-none text-center font-bold">
                                            {availableBranches.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500"><ion-icon name="git-branch-outline"></ion-icon></div>
                                    </div>
                                </div>
                            )}

                            {availableAcademics.length > 0 && (
                                <div className="animate-fadeIn">
                                    <label className="block text-sm font-bold text-blue-700 mb-3 text-center uppercase tracking-wider">ACADEMICS (Top Courses)</label>
                                    <div className="relative max-w-sm mx-auto">
                                        <select value={academics} onChange={(e) => setAcademics(e.target.value)} title="Academic specialization" aria-label="Academic specialization" className="w-full p-3 border-2 border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none text-blue-900 appearance-none text-center font-bold">
                                            {availableAcademics.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-blue-500"><ion-icon name="school"></ion-icon></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {step === 3 && (
                        <div className="animate-fadeIn space-y-8">
                             <PillGroup 
                                label="What's your main goal right now?"
                                options={['General', 'NCVET/NSQF Aligned', 'Govt. Job Exams', 'Higher Education Abroad', 'Startup / Entrepreneurship', 'Freelancing & Gigs']} 
                                selected={focusArea} 
                                onSelect={setFocusArea}
                            />
                             <PillGroup 
                                label="How do you prefer to learn?"
                                options={['Balanced', 'Visual (Videos, Diagrams)', 'Practical (Hands-on)', 'Theoretical (Reading)']} 
                                selected={learningStyle} 
                                onSelect={setLearningStyle}
                            />
                        </div>
                    )}
                    {step === 4 && (
                        <div className="animate-fadeIn text-center">
                             <h3 className="font-semibold text-center text-xl text-slate-800 mb-4">Upload Your Resume</h3>
                             <p className="text-slate-500 text-sm mb-6">Optional. Helps us tailor career paths.</p>
                            <div 
                                className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                    <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".pdf"
                                    title="Upload resume PDF"
                                />
                                {resumeFile ? (
                                    <>
                                        <ion-icon name="document-text" className="text-4xl text-green-500"></ion-icon>
                                        <p className="font-semibold mt-2 text-slate-700">{resumeFile.name}</p>
                                    </>
                                ) : (
                                    <>
                                        <ion-icon name="cloud-upload-outline" className="text-4xl text-slate-400"></ion-icon>
                                        <p className="font-semibold mt-2 text-slate-700">Click to upload PDF</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between">
                    <button 
                        type="button" 
                        onClick={handleBack} 
                        className={`dynamic-button bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 shadow-sm hover:shadow-md transition-opacity ${step === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                        Back
                    </button>
                    
                    <button type="submit" disabled={isUploading} className="dynamic-button">
                        {step < totalSteps ? 'Next' : (isUploading ? 'Saving...' : 'Complete Profile & Start')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Onboarding;
