import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';


// --- Configuration ---
const API_BASE_URL = 'http://localhost:5000/api/todos'; 
const useMockApi = true; // Set to `false` when your backend is running.

// --- Gemini API Configuration ---
// The API key will be automatically provided by the environment.
const GEMINI_API_KEY = ""; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_TTS_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`;
const IMAGEN_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;


// --- ✨ New Themes ---
const themes = {
  aurora: {
    name: 'Aurora',
    '--background-start': '#0f172a',
    '--background-mid-1': '#1e1b4b',
    '--background-mid-2': '#312e81',
    '--background-end': '#0f172a',
    '--text-primary': '#e2e8f0',
    '--text-secondary': '#94a3b8',
    '--text-muted': '#64748b',
    '--panel-bg': 'rgba(15, 23, 42, 0.4)',
    '--panel-border': 'rgba(51, 65, 85, 0.5)',
    '--primary-grad-from': '#8b5cf6',
    '--primary-grad-to': '#3b82f6',
    '--secondary-grad-from': '#ec4899',
    '--secondary-grad-to': '#8b5cf6',
    '--header-grad-from': '#a78bfa',
    '--header-grad-to': '#f472b6',
    '--tab-active': '#a78bfa',
    '--category-border': '#8b5cf6',
  },
  sunset: {
    name: 'Sunset',
    '--background-start': '#4a044e',
    '--background-mid-1': '#701a75',
    '--background-mid-2': '#c2410c',
    '--background-end': '#f97316',
    '--text-primary': '#f3f4f6',
    '--text-secondary': '#d1d5db',
    '--text-muted': '#9ca3af',
    '--panel-bg': 'rgba(17, 24, 39, 0.4)',
    '--panel-border': 'rgba(55, 65, 81, 0.5)',
    '--primary-grad-from': '#f97316',
    '--primary-grad-to': '#ef4444',
    '--secondary-grad-from': '#ef4444',
    '--secondary-grad-to': '#f59e0b',
    '--header-grad-from': '#f97316',
    '--header-grad-to': '#f59e0b',
    '--tab-active': '#f97316',
    '--category-border': '#f97316',
  },
  forest: {
    name: 'Forest',
    '--background-start': '#0f172a',
    '--background-mid-1': '#064e3b',
    '--background-mid-2': '#15803d',
    '--background-end': '#0f172a',
    '--text-primary': '#d1fae5',
    '--text-secondary': '#a7f3d0',
    '--text-muted': '#6ee7b7',
    '--panel-bg': 'rgba(2, 6, 23, 0.4)',
    '--panel-border': 'rgba(22, 101, 52, 0.5)',
    '--primary-grad-from': '#10b981',
    '--primary-grad-to': '#22c55e',
    '--secondary-grad-from': '#22c55e',
    '--secondary-grad-to': '#84cc16',
    '--header-grad-from': '#34d399',
    '--header-grad-to': '#a3e635',
    '--tab-active': '#34d399',
    '--category-border': '#34d399',
  },
   monochrome: {
    name: 'Monochrome',
    '--background-start': '#0a0a0a',
    '--background-mid-1': '#171717',
    '--background-mid-2': '#262626',
    '--background-end': '#0a0a0a',
    '--text-primary': '#fafafa',
    '--text-secondary': '#a3a3a3',
    '--text-muted': '#737373',
    '--panel-bg': 'rgba(10, 10, 10, 0.4)',
    '--panel-border': 'rgba(64, 64, 64, 0.5)',
    '--primary-grad-from': '#6b7280',
    '--primary-grad-to': '#d1d5db',
    '--secondary-grad-from': '#a1a1aa',
    '--secondary-grad-to': '#e5e5e5',
    '--header-grad-from': '#e5e7eb',
    '--header-grad-to': '#f9fafb',
    '--tab-active': '#f9fafb',
    '--category-border': '#f9fafb',
  }
};


const initialMockTodos = [
  { _id: '1', text: 'Review the project requirements', isCompleted: true, completedAt: new Date(Date.now() - 2 * 86400000).toISOString(), category: 'Work', imageUrl: null }, 
  { _id: '2', text: 'Build the frontend UI', isCompleted: true, completedAt: new Date(Date.now() - 86400000).toISOString(), category: 'Work', imageUrl: null }, 
  { _id: '3', text: 'Connect frontend to the backend API', isCompleted: false, completedAt: null, category: null, imageUrl: null },
  { _id: '4', text: 'Test and deploy the application', isCompleted: false, completedAt: null, category: null, imageUrl: null },
  { _id: '5', text: 'Draft user documentation', isCompleted: false, completedAt: null, category: 'Work', imageUrl: null },
  { _id: '6', text: 'Call the dentist', isCompleted: false, completedAt: null, category: 'Health', imageUrl: null },
  { _id: '7', text: 'Buy groceries', isCompleted: false, completedAt: null, category: 'Home', imageUrl: null },
];

// --- Audio Helper Functions for TTS ---
const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

const pcmToWav = (pcmData, sampleRate) => {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // fmt sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Sub-chunk size
    view.setUint16(20, 1, true); // Audio format (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // Bits per sample
    // data sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true);

    // Write PCM data
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
};


// --- Helper Components ---

const Spinner = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--header-grad-from)]"></div>
  </div>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const SpeakerIcon = ({ state }) => {
    if (state === 'loading') {
        return <div className="animate-pulse w-5 h-5 bg-gray-400 rounded-full"></div>;
    }
     if (state === 'playing') {
        return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--secondary-grad-from)]"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>;
};

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L9.27 9.27L3 12l6.27 2.73L12 21l2.73-6.27L21 12l-6.27-2.73L12 3z" />
        <path d="M4 4l2 2" />
        <path d="M20 4l-2 2" />
        <path d="M4 20l2-2" />
        <path d="M20 20l-2-2" />
    </svg>
);

const LightbulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 14a6 6 0 0 1-6-6 6 6 0 0 1 6-6 6 6 0 0 1 6 6c0 2.22-1.21 4.16-3 5.19V14a1 1 0 0 0-1 1v0a1 1 0 0 0 1 1h.5" />
    </svg>
);

const DocumentTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
);

const FolderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
);

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
);

const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
);

const SortIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18M3 8h12M3 12h8M3 16h4M3 20h18"/></svg>
);

const BrainIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2h3Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 9 19.5v-15A2.5 2.5 0 0 1 11.5 2h3Z"></path></svg>
);

const WandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L11.5 9.51l8.13-8.13a1.21 1.21 0 0 0 0-1.74Z"/><path d="m6.06 11.52 8.13-8.13"/><path d="M4.15 13.85 2.22 15.8a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0l1.93-1.93"/><path d="M13.85 4.15 15.8 2.22a1.21 1.21 0 0 0-1.72 0l-1.28 1.28a1.21 1.21 0 0 0 0 1.72l1.93 1.93"/><path d="M9.8 17.88a2.53 2.53 0 0 1-3.58 0L2.22 13.9a2.53 2.53 0 0 1 0-3.58l.7-.7c.22-.22.22-.58 0-.8l-.35-.35a2.53 2.53 0 0 1 0-3.58l.35-.35c.22-.22.58-.22.8 0l.7.7a2.53 2.53 0 0 1 3.58 0l3.98 3.98"/><path d="M17.88 9.8a2.53 2.53 0 0 1 0 3.58l-3.98 3.98"/></svg>
);


// --- Streak Panel Component (Used inside Profile) ---
const StreakPanel = ({ contributionData }) => {
  const getColorClass = (count) => {
    if (count === 0) return 'bg-slate-300/10';
    if (count === 1) return 'bg-emerald-400/40';
    if (count <= 3) return 'bg-emerald-400/70';
    return 'bg-emerald-400';
  };

  const today = new Date();
  const daysToShow = 120; // Approx 4 months
  let dayCells = [];
  const monthLabels = [];
  const processedMonths = new Set();

  for (let i = daysToShow; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const count = contributionData.get(dateStr) || 0;
    const month = date.toLocaleString('default', { month: 'short' });
    if (!processedMonths.has(month)) {
      monthLabels.push({ label: month, position: dayCells.length });
      processedMonths.add(month);
    }
    dayCells.push({ date, dateStr, count });
  }

  const firstDayOfWeek = dayCells[0].date.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    dayCells.unshift(null);
  }

  return (
        <div className="grid grid-flow-col grid-rows-7 gap-1 relative pt-5">
            {monthLabels.map(({ label, position }) => (
                <div key={label} className="absolute -top-0 text-xs text-[var(--text-muted)]" style={{ left: `${(position / 7) * 16}px` }}>
                    {label}
                </div>
            ))}
            {dayCells.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="w-3 h-3"></div>;
                
                const { dateStr, count } = day;
                let tooltipText = `${count} ${count === 1 ? 'task' : 'tasks'} on ${dateStr}`;

                return (
                    <div key={dateStr} className="group relative">
                        <div className={`w-3 h-3 rounded-sm ${getColorClass(count)}`}></div>
                        <div className="hidden group-hover:block absolute z-10 -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-slate-800 rounded-md whitespace-nowrap shadow-lg">
                            {tooltipText}
                        </div>
                    </div>
                );
            })}
        </div>
  );
};


// --- Profile Section Component ---
const ProfileSection = ({ todos }) => {
    const [summary, setSummary] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [summaryError, setSummaryError] = useState(null);
    const [analysis, setAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);

    const { 
        contributionData, 
        totalSubmissions, 
        maxStreak, 
        currentStreak, 
        tasksCompletedToday,
        categoryData,
        weeklyData 
    } = useMemo(() => {
        const counts = new Map();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Process actual completions from todos
        todos.forEach(todo => {
            if (todo.isCompleted && todo.completedAt) {
                const completedDate = new Date(todo.completedAt);
                completedDate.setHours(0,0,0,0);
                const dateStr = completedDate.toISOString().split('T')[0];
                counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
            }
        });
        
        const completedTasks = todos.filter(t => t.isCompleted);

        const sortedDatesWithActivity = Array.from(counts.keys()).filter(key => counts.get(key) > 0).sort();
        let current = 0;
        let max = 0;

        if (sortedDatesWithActivity.length > 0) {
            let lastDate = new Date(sortedDatesWithActivity[0]);
            current = 1;
            max = 1;

            for (let i = 1; i < sortedDatesWithActivity.length; i++) {
                const currentDate = new Date(sortedDatesWithActivity[i]);
                const diffTime = currentDate - lastDate;
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    current++;
                } else if (diffDays > 1) {
                    max = Math.max(max, current);
                    current = 1;
                }
                lastDate = currentDate;
            }
            max = Math.max(max, current);
        }
        
        const lastCompletionDate = sortedDatesWithActivity.length > 0 ? new Date(sortedDatesWithActivity[sortedDatesWithActivity.length - 1]) : null;
        let isStreakActive = false;
        if(lastCompletionDate) {
            const diffTime = today - lastCompletionDate;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if(diffDays <= 1) {
                isStreakActive = true;
            } else {
                current = 0;
            }
        }

        const todayStr = today.toISOString().split('T')[0];
        const tasksToday = completedTasks.filter(t => t.completedAt?.startsWith(todayStr));
        
        const categoryCounts = completedTasks.reduce((acc, task) => {
            const category = task.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        const catData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
        
        const weekDates = [...Array(7)].map((_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const weekData = weekDates.map(dateStr => {
            const date = new Date(dateStr);
            const name = date.toLocaleDateString('en-US', { weekday: 'short' });
            return {
                name,
                tasks: counts.get(dateStr) || 0,
            };
        });

        return {
            contributionData: counts,
            totalSubmissions: completedTasks.length,
            maxStreak: max,
            currentStreak: isStreakActive ? current : 0,
            tasksCompletedToday: tasksToday,
            categoryData: catData,
            weeklyData: weekData,
        };
    }, [todos]);

    const handleGetSummary = async () => {
        if (tasksCompletedToday.length === 0) {
            alert("You haven't completed any tasks today to summarize!");
            return;
        }

        setIsGeneratingSummary(true);
        setSummaryError(null);
        setSummary('');

        const completedTasksList = tasksCompletedToday.map(t => `- ${t.text}`).join('\n');
        const systemPrompt = `You are a positive and encouraging productivity coach. Based on the following list of tasks completed today, write a short, motivational summary (2-3 sentences) of the user's accomplishments. Be positive and forward-looking.\n\nCompleted Tasks:\n${completedTasksList}`;

        const payload = {
            contents: [{ parts: [{ text: systemPrompt }] }],
        };

        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Gemini API error! Status: ${response.status}`);
            }

            const result = await response.json();
            const summaryText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (summaryText) {
                setSummary(summaryText);
            } else {
                throw new Error("Received an empty summary from Gemini.");
            }
        } catch (e) {
            setSummaryError("Failed to get your daily summary. Please try again.");
            console.error("Gemini summary error:", e);
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleGetAnalysis = async () => {
        if (totalSubmissions < 3) {
            alert("Complete at least 3 tasks to get a productivity analysis.");
            return;
        }

        setIsAnalyzing(true);
        setAnalysisError(null);
        setAnalysis('');

        const data = {
            totalTasksCompleted: totalSubmissions,
            currentStreak: currentStreak,
            maxStreak: maxStreak,
            activity: Object.fromEntries(contributionData),
        };

        const systemPrompt = `You are an insightful and supportive productivity coach. Analyze the user's task completion data. Provide a short, encouraging analysis (3-4 sentences) identifying patterns (like consistency, weekend activity, etc.). Conclude with one specific, actionable tip for improvement. Format the tip with a "Pro Tip:" prefix.\n\nData:\n${JSON.stringify(data, null, 2)}`;

        const payload = {
            contents: [{ parts: [{ text: systemPrompt }] }],
        };
        
        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Gemini API error! Status: ${response.status}`);
            }

            const result = await response.json();
            const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (analysisText) {
                setAnalysis(analysisText);
            } else {
                throw new Error("Received an empty analysis from Gemini.");
            }
        } catch (e) {
            setAnalysisError("Failed to get your analysis. Please try again.");
            console.error("Gemini analysis error:", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28'];

    return (
        <div className="bg-[var(--panel-bg)] backdrop-blur-md border border-[var(--panel-border)] p-6 rounded-2xl shadow-2xl shadow-black/20 space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Your Profile</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="bg-black/20 border border-[var(--panel-border)] p-4 rounded-lg">
                        <p className="text-sm text-[var(--text-secondary)]">Total Submissions</p>
                        <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--header-grad-from)] to-[var(--header-grad-to)]">{totalSubmissions}</p>
                    </div>
                    <div className="bg-black/20 border border-[var(--panel-border)] p-4 rounded-lg">
                        <p className="text-sm text-[var(--text-secondary)]">Max Streak</p>
                        <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--header-grad-from)] to-[var(--header-grad-to)]">{maxStreak} days</p>
                    </div>
                    <div className="bg-black/20 border border-[var(--panel-border)] p-4 rounded-lg">
                        <p className="text-sm text-[var(--text-secondary)]">Current Streak</p>
                        <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--header-grad-from)] to-[var(--header-grad-to)]">{currentStreak} days</p>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Activity Heatmap</h3>
                <StreakPanel contributionData={contributionData} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Category Breakdown</h3>
                    <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Last 7 Days</h3>
                     <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={weeklyData}>
                               <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                               <YAxis stroke="var(--text-secondary)" fontSize={12} />
                               <Tooltip contentStyle={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}/>
                               <Bar dataKey="tasks" fill="var(--header-grad-from)" radius={[4, 4, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {tasksCompletedToday.length > 0 && (
                <div className="border-t border-[var(--panel-border)] pt-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Daily Reflection</h3>
                    <button 
                        onClick={handleGetSummary}
                        disabled={isGeneratingSummary}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:from-blue-400 disabled:to-cyan-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-cyan-500/30 transform hover:scale-105"
                    >
                        {isGeneratingSummary ? ( <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>Generating...</span></> ) 
                        : ( <><DocumentTextIcon /><span>Get Daily Summary</span></> )}
                    </button>
                    {summary && (
                        <div className="mt-4 p-4 bg-black/20 border border-[var(--panel-border)] rounded-lg">
                            <p className="text-[var(--text-secondary)]">{summary}</p>
                        </div>
                    )}
                     {summaryError && <p className="mt-4 text-center text-red-400">{summaryError}</p>}
                </div>
            )}
            
            <div className="border-t border-[var(--panel-border)] pt-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Performance Analysis</h3>
                <button
                    onClick={handleGetAnalysis}
                    disabled={isAnalyzing || totalSubmissions < 3}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--secondary-grad-from)] to-[var(--secondary-grad-to)] text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-black/30 transform hover:scale-105"
                >
                    {isAnalyzing ? ( <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>Analyzing...</span></> ) 
                    : ( <><BrainIcon /><span>Analyze My Productivity</span></> )}
                </button>
                 {totalSubmissions < 3 && <p className="text-xs text-center mt-2 text-[var(--text-muted)]">Complete at least 3 tasks to unlock AI Analysis.</p>}
                 {analysis && (
                    <div className="mt-4 p-4 bg-black/20 border border-[var(--panel-border)] rounded-lg">
                        <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{analysis}</p>
                    </div>
                )}
                {analysisError && <p className="mt-4 text-center text-red-400">{analysisError}</p>}
            </div>
        </div>
    );
};


// --- ✨ New Theme Switcher Component ---
const ThemeSwitcher = ({ currentTheme, setTheme }) => {
    return (
        <div className="flex justify-center items-center gap-2 mb-8">
            {Object.keys(themes).map((themeKey) => (
                <button
                    key={themeKey}
                    onClick={() => setTheme(themeKey)}
                    className={`px-3 py-1 text-sm rounded-full transition-all border-2 ${
                        currentTheme === themeKey
                            ? 'border-[var(--header-grad-from)] text-[var(--text-primary)] font-semibold scale-110'
                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                >
                    {themes[themeKey].name}
                </button>
            ))}
        </div>
    );
};


// --- ✨ New Help Modal Component ---
const HelpModal = ({ isOpen, onClose, isLoading, content, taskText }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl shadow-2xl shadow-black/50 w-full max-w-md p-6 text-center" 
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">Getting unstuck on:</h3>
                <p className="text-xl font-bold text-[var(--text-primary)] mb-4">"{taskText}"</p>
                {isLoading ? (
                    <Spinner />
                ) : (
                    <>
                        <div className="text-left p-4 bg-black/20 border border-[var(--panel-border)] rounded-lg">
                            <p className="text-[var(--text-secondary)]">{content}</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="mt-6 w-full bg-gradient-to-r from-[var(--primary-grad-from)] to-[var(--primary-grad-to)] text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Got it!
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};


// --- Main App Component ---
function App() {
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [theme, setTheme] = useState('aurora'); // Default theme
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState(null);
  const [suggestedTaskId, setSuggestedTaskId] = useState(null);
  const [playingTaskId, setPlayingTaskId] = useState(null);
  const fileInputRef = useRef(null);
  
  // State for Help Modal
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [helpContent, setHelpContent] = useState('');
  const [isGettingHelp, setIsGettingHelp] = useState(false);
  const [helpingTaskText, setHelpingTaskText] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    const selectedTheme = themes[theme];
    Object.keys(selectedTheme).forEach((key) => {
        if (key !== 'name') {
           root.style.setProperty(key, selectedTheme[key]);
        }
    });
  }, [theme]);

  const fetchTodos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (useMockApi) {
      setTimeout(() => {
        setTodos(initialMockTodos);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setTodos(data);
    } catch (e) {
      setError('Failed to fetch tasks. Is the backend server running?');
      console.error("Fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);


  const handleInputChange = (e) => {
    setNewTodoText(e.target.value);
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (newTodoText.trim() === '') return;

    if (useMockApi) {
      const newTodo = { _id: Date.now().toString(), text: newTodoText, isCompleted: false, completedAt: null, category: null, imageUrl: null };
      setTodos(prev => [newTodo, ...prev]);
      setNewTodoText('');
      return;
    }

    try {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTodoText }),
      });
      if (!res.ok) throw new Error('Failed to add task.');
      const addedTodo = await res.json();
      setTodos(prev => [addedTodo, ...prev]);
      setNewTodoText('');
    } catch (e) {
      setError('Failed to add the task.');
      console.error("Add todo error:", e);
    }
  };

  const handleBreakdownTask = async () => {
    if (newTodoText.trim() === '') {
      alert('Please enter a task to break down.');
      return;
    }
    setIsBreakingDown(true);
    setError(null);

    const systemPrompt = "You are a world-class project manager. Your goal is to break down a complex user-provided task into a list of simple, actionable sub-tasks. Return the sub-tasks as a JSON array of strings. For example, if the user provides 'Plan a vacation', you should return something like `[\"Choose a destination\", \"Book flights\", \"Reserve hotel\", \"Plan daily itinerary\"]`. Only return the JSON array.";

    const payload = {
      contents: [{ parts: [{ text: `Task: "${newTodoText}"` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: { type: "STRING" }
        }
      }
    };

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Gemini API error! Status: ${response.status}`);
      }

      const result = await response.json();
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        const subTasks = JSON.parse(generatedText);
        const newTodos = subTasks.map(taskText => ({
          _id: Date.now().toString() + Math.random(),
          text: taskText,
          isCompleted: false,
          completedAt: null,
          category: null,
          imageUrl: null,
        }));
        setTodos(prev => [...newTodos, ...prev]);
        setNewTodoText(''); // Clear input after breakdown
      } else {
        throw new Error("Received an empty response from Gemini.");
      }
    } catch (e) {
      setError("Failed to break down task. Please try again.");
      console.error("Gemini breakdown error:", e);
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleSuggestTask = async () => {
    const incompleteTasks = todos.filter(t => !t.isCompleted);
    if (incompleteTasks.length < 2) {
      alert("You need at least two incomplete tasks to get a suggestion.");
      return;
    }

    setIsSuggesting(true);
    setError(null);
    setSuggestedTaskId(null);

    const taskList = incompleteTasks.map(t => t.text).join("\n");
    const systemPrompt = `You are a productivity expert. Analyze the following list of tasks and suggest the single best task to do next. Consider tasks that might be quick wins or that could unblock other tasks. Respond with ONLY the exact text of the task you recommend, and nothing else.\n\nTasks:\n${taskList}`;

    const payload = {
      contents: [{ parts: [{ text: systemPrompt }] }],
    };

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error! Status: ${response.status}`);
        }

        const result = await response.json();
        const suggestedTaskText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (suggestedTaskText) {
            const suggestedTodo = todos.find(t => t.text === suggestedTaskText);
            if (suggestedTodo) {
                setSuggestedTaskId(suggestedTodo._id);
                setTimeout(() => setSuggestedTaskId(null), 8000); 
            } else {
                 throw new Error("Gemini suggested a task that is not in the list.");
            }
        } else {
            throw new Error("Received an empty suggestion from Gemini.");
        }
    } catch (e) {
        setError("Failed to get a suggestion. Please try again.");
        console.error("Gemini suggestion error:", e);
    } finally {
        setIsSuggesting(false);
    }
  };
  
  const handleCategorizeTasks = async () => {
    const uncategorizedTasks = todos.filter(t => !t.category);
    if (uncategorizedTasks.length === 0) {
        alert("All your tasks are already categorized!");
        return;
    }
    
    setIsCategorizing(true);
    setError(null);

    const taskList = uncategorizedTasks.map(t => t.text);
    const systemPrompt = `You are an expert organizer. Analyze the following list of tasks. For each task, assign a single, concise category from a common set like 'Work', 'Personal', 'Home', 'Health', 'Finance', 'Learning', 'Errands'. Return the result as a JSON array of objects, where each object has an 'id' key (the original task's index in the provided array) and a 'category' key. Example: [{"id": 0, "category": "Work"}, {"id": 1, "category": "Health"}]. Do not add any extra commentary.`;
    
    const payload = {
      contents: [{ parts: [{ text: JSON.stringify(taskList) }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              "id": { "type": "NUMBER" },
              "category": { "type": "STRING" }
            },
            required: ["id", "category"]
          }
        }
      }
    };
    
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Gemini API error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        const categorizationData = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
        
        if (categorizationData && Array.isArray(categorizationData)) {
            setTodos(prevTodos => {
                const updatedTodos = [...prevTodos];
                categorizationData.forEach(item => {
                    const originalTaskIndex = uncategorizedTasks.findIndex((t, i) => i === item.id);
                    if (originalTaskIndex !== -1) {
                      const todoToUpdate = uncategorizedTasks[originalTaskIndex];
                      const mainIndex = updatedTodos.findIndex(t => t._id === todoToUpdate._id);
                      if (mainIndex !== -1) {
                          updatedTodos[mainIndex].category = item.category;
                      }
                    }
                });
                return updatedTodos;
            });
        } else {
             throw new Error("Invalid categorization data received from Gemini.");
        }

    } catch(e) {
        setError("Failed to categorize tasks. Please try again.");
        console.error("Gemini categorization error:", e);
    } finally {
        setIsCategorizing(false);
    }
  };

  const handleImageSelected = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        scanImageForTasks(file.type, base64Data);
    };
    reader.readAsDataURL(file);
    event.target.value = null; // Reset file input
  };

  const scanImageForTasks = async (mimeType, base64Data) => {
    setIsScanning(true);
    setError(null);

    const systemPrompt = `You are an intelligent assistant specializing in optical character recognition (OCR) and task extraction. Analyze the provided image, which could be a photo of a whiteboard, a handwritten note, or a screenshot. Identify all distinct, actionable to-do items. Return these items as a clean JSON array of strings. Ignore any non-task-related text. For example, if the image shows '1. Buy milk 2. Walk the dog', you should return \`["Buy milk", "Walk the dog"]\`. Only return the JSON array. If no tasks are found, return an empty array.`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: systemPrompt },
                    { inlineData: { mimeType, data: base64Data } }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: { type: "STRING" }
            }
        }
    };

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error! Status: ${response.status}`);
        }

        const result = await response.json();
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (generatedText) {
            const extractedTasks = JSON.parse(generatedText);
            if (extractedTasks.length > 0) {
                const newTodos = extractedTasks.map(taskText => ({
                    _id: Date.now().toString() + Math.random(),
                    text: taskText,
                    isCompleted: false,
                    completedAt: null,
                    category: null,
                    imageUrl: null,
                }));
                setTodos(prev => [...newTodos, ...prev]);
            } else {
                alert("No tasks were found in the image.");
            }
        } else {
            throw new Error("Received an empty response from Gemini.");
        }
    } catch (e) {
        setError("Failed to scan tasks from the image. Please try again.");
        console.error("Gemini image scan error:", e);
    } finally {
        setIsScanning(false);
    }
  };

   // --- ✨ New Gemini API Feature: Generate Image ---
  const handleGenerateImage = async (taskId, taskText) => {
    if (generatingImageId) return; // Prevent multiple requests
    setGeneratingImageId(taskId);
    setError(null);

    const payload = { 
        instances: [{ prompt: taskText }],
        parameters: { "sampleCount": 1 } 
    };

    try {
        const response = await fetch(IMAGEN_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Imagen API error! Status: ${response.status}`);
        }

        const result = await response.json();
        const base64Data = result.predictions?.[0]?.bytesBase64Encoded;

        if (base64Data) {
            const imageUrl = `data:image/png;base64,${base64Data}`;
            setTodos(prevTodos => 
                prevTodos.map(todo => 
                    todo._id === taskId ? { ...todo, imageUrl } : todo
                )
            );
        } else {
            throw new Error("Invalid image data received from API.");
        }
    } catch (e) {
        setError("Failed to generate an image for the task.");
        console.error("Imagen error:", e);
    } finally {
        setGeneratingImageId(null);
    }
  };

  // --- ✨ New Gemini API Feature: Prioritize Tasks ---
  const handlePrioritizeTasks = async () => {
    const incompleteTasks = todos.filter(t => !t.isCompleted);
    if (incompleteTasks.length < 2) {
        alert("You need at least two incomplete tasks to prioritize.");
        return;
    }

    setIsPrioritizing(true);
    setError(null);

    const taskList = incompleteTasks.map(t => t.text);
    const systemPrompt = `You are a productivity expert applying the Eisenhower Matrix. Analyze the following list of tasks. Reorder them based on priority: 1. Urgent and Important (Do first) 2. Important but not Urgent (Schedule) 3. Urgent but not Important (Delegate/Quick Task) 4. Not Urgent and Not Important (Eliminate/Do last). Return only a JSON array of the task strings in the new, prioritized order.`;

    const payload = {
        contents: [{ parts: [{ text: JSON.stringify(taskList) }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: { type: "STRING" }
            }
        }
    };

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error! Status: ${response.status}`);
        }

        const result = await response.json();
        const prioritizedTaskTexts = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
        
        if (prioritizedTaskTexts && Array.isArray(prioritizedTaskTexts)) {
            const completedTasks = todos.filter(t => t.isCompleted);
            const prioritizedIncompleteTasks = prioritizedTaskTexts.map(text => {
                return incompleteTasks.find(t => t.text === text);
            }).filter(Boolean); // Filter out any potential mismatches

            setTodos([...prioritizedIncompleteTasks, ...completedTasks]);
        } else {
            throw new Error("Invalid prioritization data from Gemini.");
        }
    } catch (e) {
        setError("Failed to prioritize tasks. Please try again.");
        console.error("Gemini prioritization error:", e);
    } finally {
        setIsPrioritizing(false);
    }
  };

  // --- ✨ New Gemini API Feature: Get Help ---
  const handleGetHelp = async (task) => {
    setHelpingTaskText(task.text);
    setIsGettingHelp(true);
    setHelpContent('');
    setHelpModalOpen(true);
    setError(null);

    const systemPrompt = `You are a helpful and creative productivity coach. The user is feeling stuck on the following task. Your goal is to help them get started. Provide a concise, actionable first step or a creative idea to make the task less daunting. You could suggest a very small initial action, reframe the task, or provide a simple starting point. Respond with a short, encouraging paragraph. Do not be overly verbose. Task: "${task.text}"`;

    const payload = {
      contents: [{ parts: [{ text: systemPrompt }] }],
    };

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error! Status: ${response.status}`);
        }

        const result = await response.json();
        const helpText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (helpText) {
            setHelpContent(helpText);
        } else {
            throw new Error("Received an empty response from Gemini.");
        }

    } catch (e) {
        setHelpContent("Sorry, I couldn't come up with a suggestion right now. Please try again.");
        console.error("Gemini help error:", e);
    } finally {
        setIsGettingHelp(false);
    }
  };

  const handleTextToSpeech = async (task) => {
    if (playingTaskId) return; // Prevent multiple requests
    setPlayingTaskId(task._id);
    setError(null);

    const payload = {
        contents: [{ parts: [{ text: task.text }] }],
        generationConfig: { responseModalities: ["AUDIO"] },
        model: "gemini-2.5-flash-preview-tts"
    };

    try {
        const response = await fetch(GEMINI_TTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Gemini TTS API error! Status: ${response.status}`);
        }

        const result = await response.json();
        const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        const mimeType = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;

        if (audioData && mimeType?.startsWith("audio/")) {
            const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
            const pcmData = base64ToArrayBuffer(audioData);
            const pcm16 = new Int16Array(pcmData);
            const wavBlob = pcmToWav(pcm16, sampleRate);
            const audioUrl = URL.createObjectURL(wavBlob);
            const audio = new Audio(audioUrl);
            audio.play();
            audio.onended = () => setPlayingTaskId(null);
        } else {
            throw new Error("Invalid audio data received from API.");
        }
    } catch (e) {
        setError("Failed to generate audio for the task.");
        console.error("Gemini TTS error:", e);
        setPlayingTaskId(null);
    }
  };
  
  const handleToggleComplete = async (id) => {
    setTodos(todos.map(todo => {
      if (todo._id === id) {
        const isNowCompleted = !todo.isCompleted;
        return { 
          ...todo, 
          isCompleted: isNowCompleted,
          completedAt: isNowCompleted ? new Date().toISOString() : null
        };
      }
      return todo;
    }));
  };

  const handleDeleteTodo = async (id) => {
    setTodos(todos.filter(todo => todo._id !== id));
  };

  const groupedTodos = useMemo(() => {
    return todos.reduce((acc, todo) => {
      const category = todo.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(todo);
      return acc;
    }, {});
  }, [todos]);

  const renderContent = () => {
    if (isLoading) return <Spinner />;
    if (error) return <p className="text-center text-red-400 bg-red-900/30 p-4 rounded-lg">{error}</p>;
    if (todos.length === 0) return <p className="text-center text-[var(--text-muted)] p-4">You have no tasks. Add one above!</p>;
    
    const allTasksCompleted = todos.length > 0 && todos.every(todo => todo.isCompleted);
    const incompleteTasksCount = todos.filter(t => !t.isCompleted).length;
    const uncategorizedCount = todos.filter(t => !t.category).length;

    return (
      <>
        {allTasksCompleted ? (
          <p className="text-center text-emerald-400 p-4 bg-emerald-900/20 rounded-lg mb-4">
            All tasks completed! Great job! 🎉
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
             {incompleteTasksCount > 1 && (
                <button 
                    onClick={handleSuggestTask} 
                    disabled={isSuggesting || isCategorizing || isScanning || isPrioritizing}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-cyan-500/30 transform hover:scale-105"
                >
                    {isSuggesting ? ( <> <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> <span>Asking AI...</span> </> ) 
                    : ( <> <LightbulbIcon /> <span>Suggest Next</span> </> )}
                </button>
              )}
               {incompleteTasksCount > 1 && (
                 <button 
                    onClick={handlePrioritizeTasks} 
                    disabled={isSuggesting || isCategorizing || isScanning || isPrioritizing}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-sky-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/30 transform hover:scale-105"
                >
                    {isPrioritizing ? ( <> <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> <span>Prioritizing...</span> </> ) 
                    : ( <> <SortIcon /> <span>Prioritize</span> </> )}
                </button>
              )}
              {uncategorizedCount > 0 && (
                 <button 
                    onClick={handleCategorizeTasks} 
                    disabled={isCategorizing || isSuggesting || isScanning || isPrioritizing}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-amber-500/30 transform hover:scale-105"
                >
                    {isCategorizing ? ( <> <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> <span>Categorizing...</span> </> ) 
                    : ( <> <FolderIcon /> <span>Categorize</span> </> )}
                </button>
              )}
          </div>
        )}
        <div className="space-y-6">
          {Object.entries(groupedTodos).sort(([categoryA], [categoryB]) => {
              if (categoryA === 'Uncategorized') return 1;
              if (categoryB === 'Uncategorized') return -1;
              return categoryA.localeCompare(categoryB);
          }).map(([category, tasks]) => (
            <div key={category}>
                <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2 pl-3 border-l-4 border-[var(--category-border)]">{category}</h3>
                <ul className="space-y-3">
                  {tasks.map((todo) => (
                    <li
                      key={todo._id}
                      className={`flex flex-col p-4 rounded-lg transition-all duration-300 border ${
                        todo.isCompleted 
                          ? 'bg-black/10 border-[var(--panel-border)] opacity-60' 
                          : 'bg-black/20 border-[var(--panel-border)] hover:bg-black/30 hover:border-slate-600'
                      } ${ suggestedTaskId === todo._id ? 'ring-2 ring-[var(--secondary-grad-to)] ring-offset-2 ring-offset-black/5' : '' }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`flex-grow ${todo.isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                          {todo.text}
                        </span>

                        {suggestedTaskId === todo._id && !todo.isCompleted && (
                          <span className="text-xs bg-purple-500/20 text-purple-300 rounded-full px-2 py-1 ml-2 font-semibold">
                              Suggested
                          </span>
                        )}

                        <div className="flex items-center ml-4 flex-shrink-0 space-x-1">
                           {!todo.isCompleted && (
                            <button onClick={() => handleGetHelp(todo)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--secondary-grad-from)] rounded-full hover:bg-black/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Get Help">
                                <WandIcon />
                            </button>
                           )}
                           {!todo.isCompleted ? (
                            <button onClick={() => handleToggleComplete(todo._id)} className="px-3 py-1 text-xs font-semibold text-white bg-emerald-500 rounded-md hover:bg-emerald-600 transition-colors">
                              Complete
                            </button>
                          ) : (
                            <button onClick={() => handleToggleComplete(todo._id)} className="px-3 py-1 text-xs font-semibold text-slate-800 bg-yellow-400 rounded-md hover:bg-yellow-500 transition-colors">
                              Incomplete
                            </button>
                          )}
                          <button onClick={() => handleGenerateImage(todo._id, todo.text)} disabled={!!generatingImageId} className="p-2 text-[var(--text-secondary)] hover:text-[var(--secondary-grad-from)] rounded-full hover:bg-black/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Generate Image">
                              {generatingImageId === todo._id ? <div className="animate-spin w-5 h-5 border-b-2 rounded-full border-[var(--header-grad-from)]"></div> : <ImageIcon />}
                          </button>
                           <button onClick={() => handleTextToSpeech(todo)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--secondary-grad-from)] rounded-full hover:bg-black/20 transition-colors" aria-label="Read task aloud">
                              <SpeakerIcon state={playingTaskId === todo._id ? 'playing' : 'default'} />
                          </button>
                          <button onClick={() => handleDeleteTodo(todo._id)} className="p-2 text-[var(--text-secondary)] hover:text-red-500 rounded-full hover:bg-black/20 transition-colors" aria-label="Delete task">
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                       {todo.imageUrl && (
                        <div className="mt-4 w-full">
                            <img src={todo.imageUrl} alt={`AI-generated image for "${todo.text}"`} className="w-full h-auto rounded-lg object-cover" />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
            </div>
          ))}
        </div>
      </>
    );
  };


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        @keyframes gradient-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animated-gradient {
          background: linear-gradient(-45deg, var(--background-start), var(--background-mid-1), var(--background-mid-2), var(--background-end));
          background-size: 400% 400%;
          animation: gradient-animation 15s ease infinite;
        }
      `}</style>
      <div className="animated-gradient text-[var(--text-primary)] min-h-screen font-sans">
        <HelpModal 
            isOpen={helpModalOpen}
            onClose={() => setHelpModalOpen(false)}
            isLoading={isGettingHelp}
            content={helpContent}
            taskText={helpingTaskText}
        />
        <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-2xl">
          <header className="text-center mb-4">
            <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--header-grad-from)] to-[var(--header-grad-to)] py-2">
              IntelliTask
            </h1>
            <p className="text-[var(--text-secondary)] mt-2">Your intelligent task manager.</p>
          </header>

          <ThemeSwitcher currentTheme={theme} setTheme={setTheme} />

          <div className="mb-8 flex justify-center border-b border-[var(--panel-border)]">
            <button onClick={() => setActiveTab('tasks')} className={`relative py-3 px-6 font-semibold transition-colors outline-none ${activeTab === 'tasks' ? 'text-[var(--tab-active)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              Tasks
              {activeTab === 'tasks' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--tab-active)] rounded-full"></div>}
            </button>
            <button onClick={() => setActiveTab('profile')} className={`relative py-3 px-6 font-semibold transition-colors outline-none ${activeTab === 'profile' ? 'text-[var(--tab-active)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              Profile
              {activeTab === 'profile' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--tab-active)] rounded-full"></div>}
            </button>
          </div>

          {activeTab === 'tasks' && (
            <>
              <div className="bg-[var(--panel-bg)] backdrop-blur-md border border-[var(--panel-border)] p-6 rounded-2xl shadow-2xl shadow-black/20 mb-8">
                <form onSubmit={handleAddTodo} className="flex flex-col gap-4">
                   <input
                    type="text"
                    value={newTodoText}
                    onChange={handleInputChange}
                    placeholder="Add a new task or a complex goal..."
                    className="w-full p-3 bg-black/20 border border-[var(--panel-border)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-grad-from)] transition placeholder:text-[var(--text-muted)]"
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                      <button type="submit" disabled={isBreakingDown || isSuggesting || isCategorizing || isScanning || generatingImageId} className="flex-1 bg-gradient-to-r from-[var(--primary-grad-from)] to-[var(--primary-grad-to)] text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-black/30 transform hover:scale-105">
                          Add Task
                      </button>
                      <button type="button" onClick={handleBreakdownTask} disabled={isBreakingDown || isSuggesting || isCategorizing || isScanning || generatingImageId} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--secondary-grad-from)] to-[var(--secondary-grad-to)] text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-black/30 transform hover:scale-105">
                          {isBreakingDown ? ( <> <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> <span>Breaking Down...</span> </> ) 
                          : ( <> <SparklesIcon /> <span>Break Down</span> </> )}
                      </button>
                       <button type="button" onClick={() => fileInputRef.current.click()} disabled={isBreakingDown || isSuggesting || isCategorizing || isScanning || generatingImageId} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-black/30 transform hover:scale-105">
                          {isScanning ? ( <> <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> <span>Scanning...</span> </> ) 
                          : ( <> <CameraIcon /> <span>Scan Image</span> </> )}
                      </button>
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelected} className="hidden" />
                  </div>
                </form>
              </div>
              <main>{renderContent()}</main>
            </>
          )}

          {activeTab === 'profile' && <ProfileSection todos={todos} />}
          
          <footer className="text-center mt-12 text-sm text-[var(--text-muted)]">
            <p>Powered by React, Tailwind CSS, and the Gemini API</p>
          </footer>
        </div>
      </div>
    </>
  );
}

export default App;

