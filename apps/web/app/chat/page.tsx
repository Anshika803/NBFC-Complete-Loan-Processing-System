'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../../components/theme-toggle';
import axios from 'axios';

// Typewriter effect component
function TypewriterText({ text }: { text: string }) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, 10);

            return () => clearTimeout(timeout);
        }
    }, [currentIndex, text]);

    useEffect(() => {
        setDisplayedText('');
        setCurrentIndex(0);
    }, [text]);

    return (
        <span>
            {displayedText}
            {currentIndex < text.length && (
                <span className="inline-block w-0.5 h-4 bg-blue-600 dark:bg-blue-400 ml-0.5 animate-pulse" />
            )}
        </span>
    );
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [loanId, setLoanId] = useState<number | null>(null);
    const [files, setFiles] = useState<FileList | undefined>(undefined);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [currentDocType, setCurrentDocType] = useState<
    "PAN" | "AADHAAR" | "SALARY_SLIP" | null
  >(null);
  

    // Initialize session
    useEffect(() => {
        const initSession = async () => {
            try {
                const response = await axios.post('/api/chat/start');
                setSessionId(response.data.sessionId);
                setUserId(response.data.userId);
                console.log(' Session initialized:', response.data.sessionId);
            } catch (error) {
                console.error('Failed to initialize session:', error);
            }
        };
        initSession();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

const handleFileUpload = async (
      userId: number,
      loanId: number
) => {
    if (!files || files.length === 0 || !userId || !loanId) return false;

    try {
        const uploadPromises = Array.from(files).map(async (file) => {
            const formData = new FormData();
            if (!currentDocType) {
                alert("No document expected right now.");
                return false;
              }
            formData.append('file', file); // file is now properly typed as File, not File | undefined
            formData.append('userId', userId.toString());
            formData.append('loanId', loanId.toString());
            formData.append("type", currentDocType);

            // const response = await axios.post('/api/documents/upload', formData, {
            //     headers: {
            //         'Content-Type': 'multipart/form-data',
            //     },
            // });
           const response= await axios.post('/api/documents/upload', formData);


            console.log(' File uploaded:', response.data);
            return response.data;
        });

        await Promise.all(uploadPromises);

        // Clear files after successful upload
        setFiles(undefined);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        return true;
    } catch (error) {
        console.error(' Error uploading files:', error);
        alert('Failed to upload files. Please try again.');
        return false;
    }
};
// const handleFileUpload = async (userId: number, loanId: number) => {
//     if (!files || files.length === 0) return false;
//     if (!currentDocType) return false;
  
//     const file = files[0]; // ✅ one file only
//   if(!file) throw new Error ("File not found");
//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("userId", userId.toString());
//     formData.append("loanId", loanId.toString());
//     formData.append("type", currentDocType);
  
//     await axios.post("/api/documents/upload", formData);
  
//     setFiles(undefined);
//     if (fileInputRef.current) fileInputRef.current.value = "";
  
//     return true;
//   };
  
  function inferDocTypeFromReply(reply: string) {
    const text = reply.toLowerCase();
      if (text.includes("pan card")) return "PAN";
    if (text.includes("aadhaar card") || text.includes("aadhar card")) return "AADHAAR";
    if (text.includes("salary slip")) return "SALARY_SLIP";
  
    return null;
  }
  
  
    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if ((!input.trim() && !files) || !sessionId || isLoading) return;

        const hasFiles = files && files.length > 0;
        const fileNames = hasFiles ? Array.from(files).map(f => f.name).join(', ') : '';
        
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim() || `📎 Uploading: ${fileNames}`
        };
        setMessages(prev => [...prev, userMessage]);
        const messageText = input.trim();
        setInput('');
        setIsLoading(true);

        try {
            // Send the text message
            const response = await axios.post('/api/chat', {
                sessionId,
                message: messageText || (hasFiles ? `I am uploading ${files.length} document(s): ${fileNames}` : '')
            });
            // const  doctype=response.data.
            console.log(response.data.reply);
            const inferredDocType = inferDocTypeFromReply(response.data.reply);
            if (inferredDocType) {
                setCurrentDocType(inferredDocType);
              }
              


            // Extract loanId if present in the response
            if (response.data.loanId) {
                setLoanId(response.data.loanId);
            }
            const resolvedLoanId = response.data.loanId ?? loanId;

            // If we have files and a loanId, upload them
            if (hasFiles && userId !== null && resolvedLoanId !== null) {
                const uploadSuccess = await handleFileUpload(userId, resolvedLoanId);
                if (uploadSuccess) {
                    const uploadMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: `✅ Successfully uploaded ${files.length} document(s).`
                    };
                    setMessages(prev => [...prev, uploadMessage]);
                }
            }

            const assistantMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: response.data.reply
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error(' Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: ' Sorry, something went wrong. Please try again.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    // const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    //     e.preventDefault();
      
    //     // CASE 1️⃣: FILE UPLOAD
    //     if (files && files.length > 0) {
    //       if (!currentDocType || !userId || !loanId) {
    //         alert("Please wait for document request before uploading.");
    //         return;
    //       }
      
    //       setIsLoading(true);
      
    //       const uploadSuccess = await handleFileUpload(userId, loanId);
      
    //       if (uploadSuccess) {
    //         setMessages(prev => [
    //           ...prev,
    //           {
    //             id: Date.now().toString(),
    //             role: "assistant",
    //             content: `✅ ${currentDocType} uploaded successfully.`,
    //           },
    //         ]);
      
    //         setCurrentDocType(null);
    //       }
      
    //       setIsLoading(false);
    //       return;
    //     }
      
    //     // CASE 2️⃣: NORMAL CHAT
    //     if (!input.trim() || !sessionId || isLoading) return;
      
    //     setIsLoading(true);
      
    //     const response = await axios.post("/api/chat", {
    //       sessionId,
    //       message: input,
    //     });
      
    //     setInput("");
      
    //     // Infer doc type ONLY from assistant reply
    //     const inferred = inferDocTypeFromReply(response.data.reply);
    //     if (inferred) setCurrentDocType(inferred);
      
    //     if (response.data.loanId) setLoanId(response.data.loanId);
      
    //     setMessages(prev => [
    //       ...prev,
    //       { id: Date.now().toString(), role: "user", content: input },
    //       { id: Date.now().toString(), role: "assistant", content: response.data.reply },
    //     ]);
      
    //     setIsLoading(false);
    //   };
      
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(e.target.files);
        }
    };

    return (
        <div className="flex h-screen w-full flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Header */}
            <header className="flex h-20 items-center justify-between border-b border-blue-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-8 shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:shadow-blue-600/50 transition-all duration-300 group-hover:scale-110">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </div>
                            <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${sessionId ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-blue-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                NBFC Loan Assistant
                            </h1>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                {sessionId ? 'Connected' : 'Connecting...'}
                            </p>
                        </div>
                    </Link>
                </div>
                <ThemeToggle />
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="mx-auto flex max-w-4xl flex-col gap-6">
                    {messages.length === 0 && (
                        <div className="my-auto flex flex-col items-center justify-center gap-8 text-center py-20 animate-fadeIn">
                            <div className="relative">
                                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-600/30 animate-float">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </div>
                                <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-blue-400/20 to-blue-600/20 dark:from-blue-500/10 dark:to-blue-700/10 blur-2xl -z-10 animate-pulse" />
                            </div>

                            <div className="space-y-4 max-w-2xl">
                                <h2 className="text-3xl md:text-4xl font-bold text-blue-900 dark:text-white tracking-tight">
                                    How can I assist you today?
                                </h2>
                                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                                    I'm your NBFC loan assistant, ready to help with eligibility checks, document requirements, and application tracking.
                                </p>
                            </div>

                            {/* Quick Action Chips */}
                            <div className="flex flex-wrap gap-3 mt-4 justify-center">
                                {[
                                    { text: 'Check Eligibility', icon: '✓' },
                                    { text: 'Required Documents', icon: '📄' },
                                    { text: 'Track Application', icon: '📍' }
                                ].map((action) => (
                                    <button
                                        key={action.text}
                                        onClick={() => setInput(action.text)}
                                        disabled={!sessionId}
                                        className="group px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-gray-700 text-sm font-semibold text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span>{action.icon}</span>
                                        {action.text}
                                    </button>
                                ))}
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-xl">
                                {[
                                    { label: 'Instant Responses', icon: '⚡' },
                                    { label: 'Secure & Private', icon: '🔒' },
                                    { label: '24/7 Available', icon: '🌐' }
                                ].map((feature) => (
                                    <div key={feature.label} className="text-center">
                                        <div className="text-2xl mb-2">{feature.icon}</div>
                                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{feature.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m, idx) => (
                        <div
                            key={m.id}
                            className={`flex w-full gap-4 animate-slideUp ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            {m.role === 'assistant' && (
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                        <path d="M12 8V4H8"></path>
                                        <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                                        <path d="M2 14h2"></path>
                                        <path d="M20 14h2"></path>
                                        <path d="M15 13v2"></path>
                                        <path d="M9 13v2"></path>
                                    </svg>
                                </div>
                            )}

                            <div
                                className={`group flex max-w-[80%] flex-col gap-2 rounded-2xl px-6 py-4 shadow-md hover:shadow-lg transition-all duration-200 ${
                                    m.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm'
                                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-blue-100 dark:border-gray-700'
                                }`}
                            >
                                <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                                    {m.role === 'assistant' ? (
                                        <TypewriterText text={m.content} />
                                    ) : (
                                        m.content
                                    )}
                                </div>
                                <div className={`flex items-center gap-2 text-xs mt-1 ${m.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>

                            {m.role === 'user' && (
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex w-full justify-start gap-4 animate-fadeIn">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30 animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <path d="M12 8V4H8"></path>
                                    <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                                </svg>
                            </div>
                            <div className="bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 p-5 rounded-2xl rounded-tl-sm flex gap-2 items-center shadow-md">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-blue-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 shadow-2xl transition-colors duration-300">
                <form onSubmit={onSubmit} className={`mx-auto flex max-w-4xl items-end gap-3 rounded-2xl bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 p-4 border-2 transition-all duration-300 ${
                    isInputFocused ? 'border-blue-500 dark:border-blue-600 shadow-lg shadow-blue-500/20 dark:shadow-blue-600/20' : 'border-blue-200 dark:border-gray-700 shadow-sm'
                }`}>

                    <input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!sessionId}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Attach files"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                        </svg>
                    </button>

                    <div className="flex-1">
                        <textarea
                            ref={textareaRef}
                            className="w-full bg-transparent px-4 py-3 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-600 focus:outline-none text-gray-900 dark:text-gray-100 resize-none max-h-32"
                            value={input}
                            placeholder={sessionId ? "Type your message... (Press Enter to send, Shift+Enter for new line)" : "Connecting..."}
                            onChange={(e) => setInput(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    onSubmit(e as any);
                                }
                            }}
                            disabled={isLoading || !sessionId}
                            rows={1}
                            autoFocus
                        />

                        {files && files.length > 0 && (
                            <div className="flex items-center gap-2 px-4 pb-2 pt-2 animate-slideUp">
                                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 font-semibold bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                    </svg>
                                    <span>{files.length} file{files.length > 1 ? 's' : ''} attached</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFiles(undefined);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    title="Remove files"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={(!input.trim() && !files) || isLoading || !sessionId}
                        className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-blue-600/40 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        title="Send message"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </form>

                <div className="text-center mt-4 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Secured & Encrypted
                    </div>
                    <div className="h-3 w-px bg-gray-300 dark:bg-gray-700" />
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <span>Powered by</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">Gemini AI</span>
                    </div>
                </div>
            </div>
        </div>
    );
}