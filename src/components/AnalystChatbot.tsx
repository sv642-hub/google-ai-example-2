import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  Layers,
  ChevronDown
} from 'lucide-react';
import { RegressionModelResult } from '../lib/regression';
import { ClusteringResult } from '../lib/clustering';
import { ParsedDataset } from '../lib/excelParser';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelUsed?: string;
}

interface AnalystChatbotProps {
  dataset: ParsedDataset | null;
  regressionModel: RegressionModelResult | null;
  clusterResult: ClusteringResult | null;
  activeMode: 'dashboard' | 'regression' | 'clustering';
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AnalystChatbot: React.FC<AnalystChatbotProps> = ({
  dataset,
  regressionModel,
  clusterResult,
  activeMode,
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    setInternalIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your **AI Statistical Analyst**. I can help you interpret regression coefficients, validate model significance ($p$-values, $R^2$), explain cluster personas, or suggest data transformations. What questions do you have about your findings?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelSpeed, setModelSpeed] = useState<'flash' | 'pro' | 'fast'>('flash');
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Build context payload for Gemini
  const buildContextPayload = () => {
    const ctx: any = {
      activeMode,
      dataset: dataset
        ? {
            fileName: dataset.fileName,
            sheetName: dataset.sheetName,
            rowCount: dataset.rowCount,
            columns: dataset.columns.map((c) => ({
              name: c.name,
              isNumeric: c.isNumeric,
              mean: c.mean,
              min: c.min,
              max: c.max,
              stdDev: c.stdDev,
            })),
          }
        : null,
    };

    if (regressionModel) {
      ctx.regressionModel = {
        targetVariable: regressionModel.targetVariable,
        predictors: regressionModel.predictorVariables,
        equation: regressionModel.equationString,
        rSquared: regressionModel.rSquared,
        adjustedRSquared: regressionModel.adjustedRSquared,
        rmse: regressionModel.rmse,
        mae: regressionModel.mae,
        sampleCount: regressionModel.sampleCount,
        coefficients: regressionModel.coefficients.map((c) => ({
          feature: c.feature,
          beta: c.beta,
          stdError: c.stdError,
          tStat: c.tStat,
          pValue: c.pValue,
          significant: c.pValue !== undefined && c.pValue < 0.05,
        })),
      };
    }
    if (clusterResult) {
      ctx.clusterModel = {
        k: clusterResult.k,
        features: clusterResult.features,
        inertia: clusterResult.inertia,
        clusters: clusterResult.clusters.map((c) => ({
          name: c.name,
          size: c.size,
          percentage: c.percentage,
          centroidOriginalMeans: c.centroidOriginal,
        })),
        elbowInertias: clusterResult.elbowData,
      };
    }

    return ctx;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyst/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: buildContextPayload(),
          modelChoice: modelSpeed,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Unable to complete analysis**: ${err.message || 'Please check your connection and try again.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick suggestion chips based on active mode & findings
  const getPromptSuggestions = () => {
    if (activeMode === 'dashboard') {
      return [
        'Provide an executive statistical briefing summarizing this dataset and its distribution patterns.',
        'Are there any multicollinearity concerns or high correlations I should know about?',
        regressionModel
          ? `How well does our fitted regression model predict ${regressionModel.targetVariable}?`
          : 'What target and predictor variables do you recommend selecting for linear regression?',
        clusterResult
          ? `Summarize the strategic distinction between our ${clusterResult.k} clusters.`
          : 'Could this dataset benefit from customer or behavioral cluster segmentation?',
      ];
    } else if (activeMode === 'regression' && regressionModel) {
      return [
        `Explain the equation: ${regressionModel.equationString}`,
        `Is the R² of ${(regressionModel.rSquared * 100).toFixed(1)}% good, and which predictors are significant?`,
        `What are the economic or practical implications of these coefficients?`,
        `How can we improve this model (check for collinearity or non-linearity)?`,
      ];
    } else if (activeMode === 'clustering' && clusterResult) {
      return [
        `Describe the persona profile for each of the ${clusterResult.k} clusters.`,
        `According to the Elbow curve, is k=${clusterResult.k} the optimal choice?`,
        `What business strategies or targeted actions do you recommend for each segment?`,
      ];
    } else {
      return [
        'How should I prepare my spreadsheet for linear regression?',
        'What is the difference between simple and multiple regression?',
        'When should I use K-Means clustering instead of regression?',
      ];
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-fresh',
        role: 'assistant',
        content:
          "Conversation history cleared. I'm ready to analyze your latest dataset and statistical models! Ask me anything.",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button - Navy Theme */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#071329] to-[#0E234A] hover:from-[#0B1A38] hover:to-[#143264] text-white rounded-full shadow-xl shadow-blue-950/40 hover:shadow-2xl transition-all duration-200 active:scale-95 group cursor-pointer border border-blue-500/30"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-sky-300 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-400 rounded-full" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">Ask AI Analyst</span>
          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Slide-out / Floating Chat Window - Navy Theme */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[480px] h-[620px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#061226] to-[#0D2146] text-white flex items-center justify-between border-b border-blue-900/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-950 text-sky-400 border border-blue-600/30 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                  AI Statistical Consultant
                  <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded font-mono">
                    Gemini
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  {activeMode === 'dashboard'
                    ? dataset
                      ? `Context: Dashboard (${dataset.rowCount} rows, ${dataset.columns.length} cols)`
                      : 'Context: Executive Analytics'
                    : activeMode === 'regression'
                    ? regressionModel
                      ? `Context: Regression on ${regressionModel.targetVariable}`
                      : 'Context: Regression Lab'
                    : clusterResult
                    ? `Context: K-Means (k=${clusterResult.k})`
                    : 'Context: Cluster Lab'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Model selection dropdown */}
              <select
                value={modelSpeed}
                onChange={(e: any) => setModelSpeed(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-1 font-medium focus:outline-hidden"
                title="Select Gemini Model Tier"
              >
                <option value="flash">Gemini 3.8 Flash (Balanced)</option>
                <option value="fast">Gemini 3.1 Flash-Lite (Fast)</option>
                <option value="pro">Gemini 3.1 Pro (Deep STEM)</option>
              </select>

              <button
                onClick={clearChat}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                title="Clear conversation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                title="Minimize chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Context Pill Banner */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 truncate">
              {activeMode === 'dashboard' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">
                    {dataset
                      ? `Dataset: ${dataset.fileName} · ${dataset.rowCount} rows · ${dataset.columns.length} columns`
                      : 'No dataset loaded yet'}
                  </span>
                </>
              ) : activeMode === 'regression' ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">
                    {regressionModel
                      ? `Model: R²=${(regressionModel.rSquared * 100).toFixed(1)}% | ${regressionModel.sampleCount} rows`
                      : 'No regression fitted yet'}
                  </span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    {clusterResult
                      ? `Clustering: ${clusterResult.k} segments | ${clusterResult.features.length} features`
                      : 'No clusters computed yet'}
                  </span>
                </>
              )}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Live Synced
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0E244B] text-white border border-blue-800/40 rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans text-xs break-words">
                    {msg.content}
                  </div>
                  <div
                    className={`mt-1.5 text-[9px] flex items-center gap-2 ${
                      msg.role === 'user' ? 'text-sky-200 justify-end' : 'text-slate-400 justify-between'
                    }`}
                  >
                    <span>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.modelUsed && (
                      <span className="font-mono text-[9px] text-slate-400">
                        via {msg.modelUsed}
                      </span>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-500 italic text-xs">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-3 rounded-tl-xs shadow-2xs flex items-center gap-1.5 text-slate-600">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  Analyzing model statistics with Gemini...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="p-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 no-scrollbar">
            {getPromptSuggestions().map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-medium transition shrink-0 border border-slate-200/60"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                activeMode === 'regression'
                  ? 'Ask about coefficients, R², p-values, or predictions...'
                  : 'Ask about cluster personas, separation, or business recommendations...'
              }
              className="flex-1 resize-none text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className={`p-2.5 rounded-xl transition font-bold shrink-0 ${
                !inputValue.trim() || isLoading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-[#0E2044] hover:bg-[#183973] text-white shadow-md active:scale-95 cursor-pointer'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
