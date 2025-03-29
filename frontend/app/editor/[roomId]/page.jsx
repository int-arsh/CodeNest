"use client"; // VERY IMPORTANT! This component uses client-side hooks and browser APIs

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation'; // Hook to get dynamic route parameters
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
// No need for Head component from next/head, manage title via layout.js or metadata

// Define socket connection outside component
let socket = null;

// Simple Debounce function (same as before)
function debounce(func, waitFor) {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitFor);
  };
}

export default function EditorPage() {
  const params = useParams(); // Get route parameters { roomId: '...' }
  const roomId = params?.roomId; // Extract roomId

  const [code, setCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [backendUrl, setBackendUrl] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('python');

  const isRemoteUpdate = useRef(false);
  const editorRef = useRef(null);

  // Determine Backend URL on component mount (client-side)
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    setBackendUrl(url);
  }, []);

  // Socket.IO Connection Logic (largely same as before)
  useEffect(() => {
    if (!roomId || !backendUrl) return;

    if (!socket || !socket.connected) {
      console.log(`Connecting to backend: ${backendUrl}`);
      socket = io(backendUrl, { reconnectionAttempts: 5, timeout: 10000 });

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        setIsConnected(true);
        socket?.emit('join_room', { roomId });
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        // Optional: Add reconnection logic or user feedback
      });

      socket.on('connect_error', (error) => {
        console.error('Socket Connection Error:', error);
        setIsConnected(false);
      });

      socket.on('initial_code', (data) => {
        console.log('Received initial code.');
        isRemoteUpdate.current = true;
        setCode(data.code);
        setTimeout(() => { isRemoteUpdate.current = false; }, 50);
      });

      socket.on('code_update', (data) => {
        // Prevent unnecessary updates if code is already the same
        if (data.code !== code) {
             console.log('Received code update.');
            isRemoteUpdate.current = true;
            setCode(data.code);
            setTimeout(() => { isRemoteUpdate.current = false; }, 50);
        }
      });

      socket.on('error', (data) => {
        console.error('Server Error:', data.message);
        // Consider adding user-facing error display
      });
    }

    // Cleanup Logic
    return () => {
      console.log('EditorPage cleanup running...');
      if (socket) {
        console.log('Leaving room and cleaning up socket listeners...');
        socket.emit('leave_room', { roomId });
        // Remove listeners to prevent memory leaks on page change
         socket.off('connect');
         socket.off('disconnect');
         socket.off('connect_error');
         socket.off('initial_code');
         socket.off('code_update');
         socket.off('error');
         // Consider if socket.disconnect() is needed here or managed globally
      }
    };
    // Ensure 'code' is NOT in dependencies to avoid loop on code_update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, backendUrl]);


  // Debounced Code Sending Function (same as before)
  const sendCodeChange = useCallback(debounce((newCode) => {
      if (socket && isConnected) {
          console.log("Emitting code_change via debounce");
          socket.emit('code_change', { roomId, code: newCode });
      }
  }, 500), [socket, isConnected, roomId]);


  // Editor Change Handler (same as before)
  const handleEditorChange = (value) => {
      const currentCode = value || '';
      setCode(currentCode); // Update local state immediately

      if (!isRemoteUpdate.current) {
          sendCodeChange(currentCode);
      }
  };

  // Store Editor Instance (same as before)
  function handleEditorDidMount(editor, monaco) {
      editorRef.current = editor;
      console.log('Monaco Editor Mounted');
      editor.focus();
  }

   // Basic Language Detection (Example - same as before)
  useEffect(() => {
    if (!code) return; // Avoid running on initial empty state
    // Simple heuristic, can be improved
    if (code.toLowerCase().includes('def ') || code.toLowerCase().includes('import ')) {
        setEditorLanguage('python');
    } else if (code.toLowerCase().includes('function') || code.toLowerCase().includes('const ') || code.toLowerCase().includes('let ')) {
        setEditorLanguage('javascript');
    } else if (code.toLowerCase().includes('<html') || code.toLowerCase().includes('<div')) {
        setEditorLanguage('html');
    }
   }, [code]);

  // Render Logic
  if (!roomId) {
      return <div className="flex items-center justify-center h-screen">Loading room...</div>;
  }

  return (
    // Use a wrapper div with fixed height for the editor layout
    <div className="flex flex-col h-screen p-1 sm:p-4 bg-gray-100 dark:bg-gray-900">
        {/* Header remains similar */}
        <header className="flex-shrink-0 mb-2 sm:mb-4 px-2 sm:px-0">
             <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">
                Room: <span className="text-blue-600 dark:text-blue-400 font-mono">{roomId}</span>
             </h1>
             <div className="flex items-center space-x-2 text-xs sm:text-sm">
                 <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                 <span className={isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                 </span>
                 <span className="text-gray-500 dark:text-gray-400">| Lang: {editorLanguage}</span>
             </div>
        </header>

        {/* Editor container */}
        <div className="flex-grow border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden shadow-lg">
            {!backendUrl ? (
                <div className="flex items-center justify-center h-full text-gray-500">Loading editor...</div>
            ) : (
            <Editor
                height="100%" // Critical for filling the container
                language={editorLanguage}
                theme="vs-dark"
                value={code}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                    fontSize: 14,
                    minimap: { enabled: true, scale: 1 },
                    automaticLayout: true,
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                }}
                loading={<div className="flex items-center justify-center h-full text-gray-500">Loading Monaco Editor...</div>}
            />
            )}
        </div>
         {/* Footer remains similar */}
         <footer className="flex-shrink-0 mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            App Router Version | {new Date().getFullYear()}
        </footer>
    </div>
  );
}