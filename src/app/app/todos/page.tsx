"use client";

import { useState } from "react";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { trpc } from "@/client/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

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
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="size-5" />
        Add Todo
      </Button>
    );
  }

  return (
    <Card className="py-4">
      <CardContent>
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
          className="space-y-3"
        >
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="resize-none"
          />
          <div className="flex items-center gap-4">
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as "low" | "medium" | "high")}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTodo.isPending || !title.trim()}>
              {createTodo.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Adding...
                </>
              ) : (
                "Add Todo"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const priorityVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "outline",
  high: "destructive",
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
        <Spinner className="size-8" />
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
        <Card>
          <CardContent>
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No todos yet</EmptyTitle>
                <EmptyDescription>Create your first todo to get started.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingTodos.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                To Do ({pendingTodos.length})
              </h2>
              <div className="space-y-2">
                {pendingTodos.map((todo) => (
                  <Card key={todo.id} className="py-3 group">
                    <CardContent className="flex items-start gap-3">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() =>
                          updateTodo.mutate({
                            id: todo.id,
                            data: { status: "completed" },
                          })
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-zinc-900 truncate">{todo.title}</h3>
                          <Badge variant={priorityVariants[todo.priority]}>{todo.priority}</Badge>
                        </div>
                        {todo.description && (
                          <p className="text-sm text-zinc-500 line-clamp-2">{todo.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteTodo.mutate({ id: todo.id })}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-opacity"
                      >
                        <Trash2 className="size-5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completedTodos.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Completed ({completedTodos.length})
              </h2>
              <div className="space-y-2">
                {completedTodos.map((todo) => (
                  <Card key={todo.id} className="py-3 group opacity-60">
                    <CardContent className="flex items-start gap-3">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() =>
                          updateTodo.mutate({
                            id: todo.id,
                            data: { status: "pending" },
                          })
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-zinc-500 line-through truncate">
                          {todo.title}
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteTodo.mutate({ id: todo.id })}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-opacity"
                      >
                        <Trash2 className="size-5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
