import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Pencil,
  Save,
  X
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { toast } from "sonner";

export default function TodoList({ user }) {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState("Normal"); // Normal, Acil, Kritik

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState("Normal");

  const startEditing = (todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditPriority("Normal");
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return;

    try {
      // Optimistic update
      setTodos(todos.map(t => 
        t.id === editingId 
          ? { ...t, title: editTitle, priority: editPriority } 
          : t
      ));

      await axios.put(`/api/todos/${editingId}`, {
        title: editTitle,
        priority: editPriority
      });

      toast.success("Görev güncellendi");
      cancelEditing();
    } catch (error) {
      console.error("Error updating todo:", error);
      toast.error("Güncelleme başarısız");
      fetchTodos();
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await axios.get("/api/todos");
      setTodos(response.data);
    } catch (error) {
      console.error("Error fetching todos:", error);
      toast.error("Görevler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      const response = await axios.post("/api/todos", {
        title: newTask,
        priority: priority,
        userId: user.id,
        userName: user.adSoyad,
      });

      setTodos([response.data, ...todos]);
      setNewTask("");
      setPriority("Normal");
      toast.success("Görev eklendi");
    } catch (error) {
      console.error("Error adding todo:", error);
      toast.error("Görev eklenirken bir hata oluştu");
    }
  };

  const toggleStatus = async (todo) => {
    try {
      const newStatus = todo.status === "completed" ? "pending" : "completed";

      // Optimistic update
      setTodos(
        todos.map((t) => (t.id === todo.id ? { ...t, status: newStatus } : t)),
      );

      await axios.put(`/api/todos/${todo.id}`, {
        status: newStatus,
        userId: user.id,
        userName: user.adSoyad,
      });
    } catch (error) {
      console.error("Error updating todo:", error);
      toast.error("Durum güncellenemedi");
      fetchTodos(); // Revert on error
    }
  };

  const deleteTodo = async (id) => {
    if (!confirm("Bu görevi silmek istediğinize emin misiniz?")) return;

    try {
      // Optimistic update
      setTodos(todos.filter((t) => t.id !== id));

      await axios.delete(`/api/todos/${id}`, {
        data: { userId: user.id, userName: user.adSoyad },
      });
      toast.success("Görev silindi");
    } catch (error) {
      console.error("Error deleting todo:", error);
      toast.error("Silme işlemi başarısız");
      fetchTodos();
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case "Kritik":
        return "text-red-600 bg-red-50 border-red-200";
      case "Acil":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">To-Do Listesi</h1>
        <span className="text-sm text-gray-500">
          {todos.filter((t) => t.status === "pending").length} Bekleyen Görev
        </span>
      </div>

      {/* Add New Task */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleAddTodo} className="flex gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-gray-500 ml-1">
              Yeni Görev
            </label>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Yapılacak bir şeyler yazın..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>

          <div className="w-32 space-y-1">
            <label className="text-xs font-medium text-gray-500 ml-1">
              Öncelik
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
            >
              <option value="Normal">Normal</option>
              <option value="Acil">Acil</option>
              <option value="Kritik">Kritik</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!newTask.trim()}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            Ekle
          </button>
        </form>
      </div>

      {/* Task List - Pending */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
          <Circle size={20} className="text-teal-600" />
          Yapılacaklar ({todos.filter(t => t.status === 'pending').length})
        </h2>
        {todos.filter(t => t.status === 'pending').length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p>Harika! Yapılacak iş kalmadı.</p>
          </div>
        ) : (
          todos.filter(t => t.status === 'pending').map((todo) => (
            <div
              key={todo.id}
              className="group flex items-center gap-4 p-4 rounded-xl border bg-white border-gray-100 hover:border-teal-100 hover:shadow-sm transition-all"
            >
              {editingId === todo.id ? (
                // Edit Mode
                <div className="flex-1 flex gap-2 items-center w-full">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    autoFocus
                  />
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none text-sm"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Acil">Acil</option>
                    <option value="Kritik">Kritik</option>
                  </select>
                  <button
                    onClick={saveEdit}
                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg"
                    title="Kaydet"
                  >
                    <Save size={18} />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    title="İptal"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                // View Mode
                <>
                  <button
                    onClick={() => toggleStatus(todo)}
                    className="flex-shrink-0 text-gray-300 hover:text-teal-500 transition-colors"
                    title="Tamamla"
                  >
                    <Circle size={24} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {todo.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span
                        className={`px-2 py-0.5 rounded-full border ${getPriorityColor(todo.priority)}`}
                      >
                        {todo.priority}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(todo.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                      <span>Ekleyen: {todo.createdBy}</span>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => startEditing(todo)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                      title="Düzenle"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="Görevi Sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Task List - Completed */}
      <div className="space-y-3 pt-6 border-t border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
          <CheckCircle size={20} className="text-gray-400" />
          Tamamlananlar ({todos.filter(t => t.status === 'completed').length})
        </h2>

        {todos.filter(t => t.status === 'completed').length > 0 && (
          <div className="space-y-2 opacity-75 hover:opacity-100 transition-opacity">
            {todos.filter(t => t.status === 'completed').map((todo) => (
              <div
                key={todo.id}
                className="group flex items-center gap-4 p-3 rounded-lg border bg-gray-50 border-gray-100 transition-all"
              >
                <button
                  onClick={() => toggleStatus(todo)}
                  className="flex-shrink-0 text-teal-500 hover:text-gray-400 transition-colors"
                  title="Geri Al"
                >
                  <CheckCircle size={24} />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-500 line-through truncate">
                    {todo.title}
                  </p>
                </div>

                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Görevi Sil"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
