"use client";

import { useState } from "react";
import { trpc } from "@/client/lib/trpc";

function CreateTodoForm({ onSuccess }: { onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const createTodo = trpc.todos.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setIsOpen(false);
      onSuccess();
    },
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Todo
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) {
          createTodo.mutate({
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
          });
        }
      }}
      className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      <div className="flex items-center gap-4">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
          className="px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 text-zinc-600 hover:text-zinc-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createTodo.isPending || !title.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {createTodo.isPending ? "Adding..." : "Add Todo"}
        </button>
      </div>
    </form>
  );
}

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export default function TodosPage() {
  const utils = trpc.useUtils();
  const { data: todosData, isLoading } = trpc.todos.list.useQuery({});

  const updateTodo = trpc.todos.update.useMutation({
    onSuccess: () => utils.todos.list.invalidate(),
  });

  const deleteTodo = trpc.todos.delete.useMutation({
    onSuccess: () => utils.todos.list.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todos = todosData?.data || [];
  const pendingTodos = todos.filter((t) => t.status === "pending");
  const completedTodos = todos.filter((t) => t.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-zinc-900">My Todos</h1>
        <CreateTodoForm onSuccess={() => utils.todos.list.invalidate()} />
      </div>

      {todos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-zinc-200">
          <svg className="w-12 h-12 text-zinc-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-zinc-900 mb-1">No todos yet</h3>
          <p className="text-zinc-500">Create your first todo to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Todos */}
          {pendingTodos.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                To Do ({pendingTodos.length})
              </h2>
              <div className="space-y-2">
                {pendingTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="bg-white rounded-lg border border-zinc-200 p-4 flex items-start gap-3 group"
                  >
                    <button
                      onClick={() => updateTodo.mutate({ id: todo.id, data: { status: "completed" } })}
                      className="mt-0.5 w-5 h-5 border-2 border-zinc-300 rounded-full hover:border-blue-500 flex-shrink-0 transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-zinc-900 truncate">{todo.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[todo.priority]}`}>
                          {todo.priority}
                        </span>
                      </div>
                      {todo.description && (
                        <p className="text-sm text-zinc-500 line-clamp-2">{todo.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTodo.mutate({ id: todo.id })}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Todos */}
          {completedTodos.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Completed ({completedTodos.length})
              </h2>
              <div className="space-y-2">
                {completedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="bg-white rounded-lg border border-zinc-200 p-4 flex items-start gap-3 group opacity-60"
                  >
                    <button
                      onClick={() => updateTodo.mutate({ id: todo.id, data: { status: "pending" } })}
                      className="mt-0.5 w-5 h-5 bg-blue-600 border-2 border-blue-600 rounded-full flex items-center justify-center flex-shrink-0"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zinc-500 line-through truncate">{todo.title}</h3>
                    </div>
                    <button
                      onClick={() => deleteTodo.mutate({ id: todo.id })}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
