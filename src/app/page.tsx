"use client";

import { useState } from "react";
import { TRPCProvider } from "@/client/components/TRPCProvider";
import { TodoList } from "@/client/components/features/TodoList";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">Multi-Tenant Todo App</h1>
          <p className="text-zinc-600 mb-4">Enter your API key to access your todos.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (apiKey.trim()) setIsAuthenticated(true);
            }}
          >
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="tk_..."
              className="w-full px-3 py-2 border rounded-md mb-4"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
            >
              Connect
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <TRPCProvider apiKey={apiKey}>
      <main className="min-h-screen bg-zinc-50 p-4">
        <div className="max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Todos</h1>
            <button
              onClick={() => {
                setApiKey("");
                setIsAuthenticated(false);
              }}
              className="px-4 py-2 bg-zinc-200 rounded-md hover:bg-zinc-300"
            >
              Logout
            </button>
          </header>
          <TodoList />
        </div>
      </main>
    </TRPCProvider>
  );
}
