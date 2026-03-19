import React from 'react';

const PolicymakerDashboard: React.FC = () => {
    return (
        <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                National Skill Ecosystem
            </h1>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-slate-500 font-semibold mb-2">Total Learners Trained</h3>
                    <p className="text-3xl font-bold text-blue-600">45,230</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-slate-500 font-semibold mb-2">Placement Rate</h3>
                    <p className="text-3xl font-bold text-green-500">72%</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-slate-500 font-semibold mb-2">Avg. Salary</h3>
                    <p className="text-3xl font-bold text-purple-600">₹6.2 LPA</p>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-slate-500 font-semibold mb-2">NSQF Compliance</h3>
                    <p className="text-3xl font-bold text-amber-500">88%</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Regional Skill Gaps (Supply vs Demand)</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">North India (AI Specialists)</span>
                                <span className="text-red-500 font-bold">Gap: 350</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Supply: 150 | Demand: 500</p>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">South India (Web Dev)</span>
                                <span className="text-green-500 font-bold">Surplus: 200</span>
                            </div>
                             <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                             <p className="text-xs text-slate-500 mt-1">Supply: 400 | Demand: 200</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">AI Policy Recommendations</h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                            <ion-icon name="alert-circle" className="text-red-500 text-xl mt-0.5"></ion-icon>
                            <div>
                                <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">High Priority</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300">Open 5 new AI training centers in Delhi NCR region to address critical skill shortage.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <ion-icon name="trending-up" className="text-blue-500 text-xl mt-0.5"></ion-icon>
                            <div>
                                <h4 className="font-bold text-blue-700 dark:text-blue-400 text-sm">Strategic Move</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300">Increase funding for Cloud Computing courses in Mumbai as demand is projected to grow 58%.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default PolicymakerDashboard;