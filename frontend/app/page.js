"use client"; // Needed for useState and client-side interactions (navigation)

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use navigation hook for App Router

export default function HomePage() {
  const [roomId, setRoomId] = useState('');
  const router = useRouter(); // Hook for programmatic navigation

  const handleJoin = (e) => {
    e.preventDefault(); // Prevent default link behavior
    if (!roomId) return; // Don't navigate if room ID is empty
    router.push(`/editor/${encodeURIComponent(roomId)}`); // Navigate programmatically
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-6 text-gray-800 dark:text-gray-100">
        Live Code Editor 
      </h1>
      <form onSubmit={handleJoin} className="w-full max-w-xs">
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.trim())}
          placeholder="Enter Room ID"
          className="w-full px-4 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Room ID"
        />
        <button
          type="submit"
          className={`w-full px-4 py-2 text-center text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors ${
            !roomId ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={!roomId}
        >
          Join Room
        </button>
      </form>
    </div>
  );
}