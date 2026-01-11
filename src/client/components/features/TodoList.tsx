"use client";

import { useState } from "react";
import { trpc } from "@/client/lib/trpc";
import type { TodoStatus, TodoPriority } from "@/shared/types";

export function TodoList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TodoStatus | "">("");
  const [priority, setPriority] = useState<TodoPriority | "">("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data, isLoading, error, refetch } = trpc.todos.list.useQuery({
    page,
    limit: 10,
    status: status || undefined,
    priority: priority || undefined,
    search: search || undefined,
  });

  const createMutation = trpc.todos.create.useMutation({
    onSuccess: () => {
      setNewTitle("");
      setShowForm(false);
      refetch();
    },
  });

  const updateMutation = trpc.todos.update.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.todos.delete.useMutation({ onSuccess: () => refetch() });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="px-3 py-2 border rounded-md"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TodoStatus | "")}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TodoPriority | "")}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add Todo"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim()) {
              createMutation.mutate({ title: newTitle.trim() });
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New todo title..."
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Create
          </button>
        </form>
      )}

      {/* Todo List */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">No todos found.</div>
      ) : (
        <ul className="space-y-2">
          {data?.data.map((todo) => (
            <li
              key={todo.id}
              className={`bg-white rounded-lg shadow p-4 flex items-center gap-3 ${
                todo.status === "completed" ? "opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={todo.status === "completed"}
                onChange={() =>
                  updateMutation.mutate({
                    id: todo.id,
                    data: { status: todo.status === "pending" ? "completed" : "pending" },
                  })
                }
                className="h-5 w-5"
              />
              <div className="flex-1">
                <span className={todo.status === "completed" ? "line-through" : ""}>
                  {todo.title}
                </span>
                <div className="flex gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      todo.priority === "high"
                        ? "bg-red-100 text-red-800"
                        : todo.priority === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {todo.priority}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm("Delete this todo?")) {
                    deleteMutation.mutate({ id: todo.id });
                  }
                }}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {data && data.pagination.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {data.pagination.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pagination.total_pages, p + 1))}
            disabled={page === data.pagination.total_pages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
