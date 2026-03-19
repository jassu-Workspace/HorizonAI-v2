import React from 'react';

const TrainerDashboard: React.FC = () => {
    return (
        <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Trainer Dashboard
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-slate-500 font-semibold mb-2">Active Learners</h3>
                    <p className="text-4xl font-bold text-blue-600">142</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-slate-500 font-semibold mb-2">Batch Completion Rate</h3>
                    <p className="text-4xl font-bold text-green-500">68%</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-slate-500 font-semibold mb-2">At Risk Students</h3>
                    <p className="text-4xl font-bold text-red-500">15</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
                <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Cohort Progress</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="pb-3 font-semibold text-slate-600 dark:text-slate-300">Student Name</th>
                                <th className="pb-3 font-semibold text-slate-600 dark:text-slate-300">Skill Track</th>
                                <th className="pb-3 font-semibold text-slate-600 dark:text-slate-300">Progress</th>
                                <th className="pb-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            <tr>
                                <td className="py-3 text-slate-800 dark:text-slate-200">Rahul Sharma</td>
                                <td className="py-3 text-slate-600 dark:text-slate-400">Python Development</td>
                                <td className="py-3 text-slate-600 dark:text-slate-400">85%</td>
                                <td className="py-3"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">On Track</span></td>
                            </tr>
                            <tr>
                                <td className="py-3 text-slate-800 dark:text-slate-200">Priya Patel</td>
                                <td className="py-3 text-slate-600 dark:text-slate-400">Data Science</td>
                                <td className="py-3 text-slate-600 dark:text-slate-400">42%</td>
                                <td className="py-3"><span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Lagging</span></td>
                            </tr>
                             <tr>
                                <td className="py-3 text-slate-800 dark:text-slate-200">Amit Kumar</td>
                                <td className="py-3 text-slate-600 dark:text-slate-400">Web Development</td>
                                <td className="py-3 text-slate-600 dark:text-slate-400">12%</td>
                                <td className="py-3"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">At Risk</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TrainerDashboard;