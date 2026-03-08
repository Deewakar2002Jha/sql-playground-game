import React, { useState, useEffect } from 'react';
import { Layout, Database, Play, HelpCircle, ChevronLeft, Moon, Sun, Table, Code, FileText, CheckCircle, AlertCircle, Terminal, Copy, ExternalLink, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

// --- Types ---

type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface Assignment {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  timeEstimate: string;
  question: string;
  expectedOutput: string;
  hints: string[];
}

interface SchemaInfo {
  [tableName: string]: {
    columns: { name: string; type: string; pk: number }[];
    sample: any[];
  };
}

// --- Components ---

const Badge = ({ children, variant }: { children: React.ReactNode; variant: Difficulty }) => {
  const colors = {
    Easy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    Hard: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", colors[variant])}>
      {children}
    </span>
  );
};

const Dashboard = ({ onStartLab }: { onStartLab: (assignment: Assignment) => void }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Fetching assignments...');
    fetch('/api/assignments')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Assignments fetched:', data);
        setAssignments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="h-screen flex items-center justify-center text-slate-400 font-mono">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        Loading CipherSQLStudio...
      </div>
    </div>
  );

  if (error) return (
    <div className="h-screen flex items-center justify-center text-rose-400 font-mono p-4 text-center">
      <div className="max-w-md">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Failed to load assignments</h2>
        <p className="text-sm opacity-70">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">CipherSQLStudio</h1>
        <p className="text-slate-400 text-lg">Master SQL with hands-on practice in a modern developer environment.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map((assignment) => (
          <motion.div
            key={assignment.id}
            whileHover={{ y: -4 }}
            className="group relative bg-slate-900/50 border border-slate-800 rounded-2xl p-6 transition-all hover:border-sky-500/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.1)]"
          >
            <div className="flex justify-between items-start mb-4">
              <Badge variant={assignment.difficulty}>{assignment.difficulty}</Badge>
              <div className="flex items-center text-slate-500 text-sm">
                <Clock className="w-4 h-4 mr-1" />
                {assignment.timeEstimate}
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-sky-400 transition-colors">{assignment.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3">
              {assignment.description}
            </p>
            <button
              onClick={() => onStartLab(assignment)}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Start Lab
              <ExternalLink className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Workspace = ({ assignment, onBack }: { assignment: Assignment; onBack: () => void }) => {
  const [query, setQuery] = useState(assignment.expectedOutput);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [hintIndex, setHintIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<'desc' | 'code' | 'data'>('desc');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    fetch('/api/schema')
      .then(res => res.json())
      .then(setSchema);
  }, []);

  const executeQuery = async () => {
    setIsExecuting(true);
    setError(null);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        setActiveTab('data');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to execute query');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      executeQuery();
    }
    if (e.key === 'Escape') {
      setHintIndex(-1);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden" onKeyDown={handleKeyDown}>
      {/* Header */}
      <header className="h-14 border-bottom border-slate-800 flex items-center justify-between px-4 shrink-0 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <h2 className="font-semibold text-sm tracking-tight truncate max-w-[200px] md:max-w-none">
            {assignment.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={executeQuery}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg transition-all shadow-lg shadow-sky-500/10"
          >
            <Play className={cn("w-4 h-4 fill-current", isExecuting && "animate-pulse")} />
            <span className="hidden sm:inline">Execute</span>
          </button>
        </div>
      </header>

      {/* Mobile Tabs */}
      <div className="flex md:hidden border-b border-slate-800 bg-slate-900/30">
        {[
          { id: 'desc', icon: FileText, label: 'Description' },
          { id: 'code', icon: Code, label: 'Code' },
          { id: 'data', icon: Table, label: 'Results' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center py-2 gap-1 text-[10px] font-medium transition-colors",
              activeTab === tab.id ? "text-sky-400 bg-sky-400/5" : "text-slate-500"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Description & Schema */}
        <aside className={cn(
          "flex-1 md:flex-none md:w-[400px] lg:w-[450px] border-r border-slate-800 flex flex-col overflow-hidden bg-slate-950/50",
          activeTab !== 'desc' && "hidden md:flex"
        )}>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                Problem Description
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-slate-400 leading-relaxed">
                <ReactMarkdown>{assignment.description}</ReactMarkdown>
                <div className="mt-4 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <p className="font-medium text-slate-200 mb-2">Your Task:</p>
                  <p>{assignment.question}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-400" />
                Schema Browser
              </h3>
              <div className="space-y-4">
                {schema && Object.entries(schema).map(([tableName, info]) => (
                  <div key={tableName} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30">
                    <div className="px-4 py-2 bg-slate-800/50 flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-sky-400">{tableName}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Table</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {info.columns.map(col => (
                        <div 
                          key={col.name} 
                          className="flex items-center justify-between group cursor-pointer"
                          onClick={() => copyToClipboard(col.name)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn("font-mono text-xs", col.pk ? "text-amber-400" : "text-slate-300")}>
                              {col.name}
                            </span>
                            {col.pk === 1 && <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1 rounded border border-amber-500/20">PK</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-500">{col.type}</span>
                            <Copy className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          
          {/* Hint Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Need a hand?</span>
              <button 
                onClick={() => setHintIndex(prev => Math.min(prev + 1, assignment.hints.length - 1))}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
              >
                <HelpCircle className="w-3 h-3" />
                Get Hint
              </button>
            </div>
            <AnimatePresence mode="wait">
              {hintIndex >= 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg text-sm text-sky-200/80 italic"
                >
                  {assignment.hints[hintIndex]}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* Right Panel: Editor & Results */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden",
          activeTab === 'desc' && "hidden md:flex"
        )}>
          {/* Editor Section */}
          <div className={cn(
            "flex-1 flex flex-col min-h-0",
            activeTab === 'data' && "hidden md:flex"
          )}>
            <div className="h-8 bg-slate-900/80 border-b border-slate-800 flex items-center px-4 justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SQL Editor</span>
              </div>
              <span className="text-[10px] text-slate-600 font-mono">Ctrl + Enter to run</span>
            </div>
            <div className="flex-1 relative">
              <Editor
                height="100%"
                defaultLanguage="sql"
                theme="vs-dark"
                value={query}
                onChange={(v) => setQuery(v || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono',
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: false,
                  automaticLayout: true,
                  padding: { top: 16 },
                }}
              />
            </div>
          </div>

          {/* Results Section */}
          <div className={cn(
            "h-[300px] lg:h-[400px] border-t border-slate-800 flex flex-col bg-slate-950",
            activeTab === 'code' && "hidden md:flex"
          )}>
            <div className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-4 justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400">Query Results</span>
                {results && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-2">
                    {results.length} rows
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              {error ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-rose-500 mb-4 opacity-20" />
                  <p className="text-rose-400 font-mono text-sm max-w-md">{error}</p>
                </div>
              ) : results ? (
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full divide-y divide-slate-800 font-mono text-sm">
                    <thead className="bg-slate-900/50 sticky top-0 z-10">
                      <tr>
                        {results.length > 0 && Object.keys(results[0]).map(key => (
                          <th key={key} className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {results.map((row, i) => (
                        <tr key={i} className={cn("hover:bg-sky-500/5 transition-colors", i % 2 === 0 ? "bg-transparent" : "bg-slate-900/20")}>
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-6 py-3 whitespace-nowrap text-slate-300">
                              {val === null ? <span className="text-slate-600 italic">NULL</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                  <Play className="w-12 h-12 mb-4 opacity-10" />
                  <p className="text-sm">Run your query to see results.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-sky-500/30">
      <AnimatePresence mode="wait">
        {!currentAssignment ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard onStartLab={setCurrentAssignment} />
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-screen"
          >
            <Workspace 
              assignment={currentAssignment} 
              onBack={() => setCurrentAssignment(null)} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
        
        /* Monaco Editor Customization */
        .monaco-editor, .monaco-editor .margin, .monaco-editor-background {
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
}
