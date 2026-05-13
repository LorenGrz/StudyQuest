import { useState, useEffect } from 'react'
import type { PomodoroState } from '../hooks/usePomodoro'
import { partyService } from '../services/partyService'
import type { PartyTodo } from '../services/partyService'

interface PomodoroTimerProps {
  state: PomodoroState
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onConfigChange: (work: number, breakTime: number) => void
  isLeader: boolean
}

export const PomodoroTimer = ({
  state,
  onStart,
  onPause,
  onReset,
  onConfigChange,
  isLeader,
}: PomodoroTimerProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [workInput, setWorkInput] = useState(25)
  const [breakInput, setBreakInput] = useState(5)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleSaveConfig = () => {
    onConfigChange(workInput, breakInput)
    setIsEditing(false)
  }

  // Calculate progress circle (circumference = 2 * Math.PI * r, r=40 => ~251)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const totalDuration = state.mode === 'work' ? state.workDuration : state.breakDuration
  const progress = totalDuration > 0 ? ((totalDuration - state.timeLeft) / totalDuration) * circumference : 0

  return (
    <div className="bg-dark/50 backdrop-blur border border-white/10 rounded-2xl p-6 flex flex-col items-center">
      <div className="mb-4">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            state.mode === 'work' ? 'bg-primary/20 text-primary' : 'bg-green-500/20 text-green-400'
          }`}
        >
          {state.mode === 'work' ? '🧠 Tiempo de Estudio' : '☕ Descanso'}
        </span>
      </div>

      <div className="relative w-48 h-48 flex items-center justify-center mb-6">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r={radius}
            className="stroke-dark-lighter fill-none"
            strokeWidth="8"
          />
          <circle
            cx="96"
            cy="96"
            r={radius}
            className={`fill-none transition-all duration-1000 ease-linear ${
              state.mode === 'work' ? 'stroke-primary' : 'stroke-green-400'
            }`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-5xl font-bold font-mono text-white">
          {formatTime(state.timeLeft)}
        </span>
      </div>

      {isLeader ? (
        <div className="flex flex-col w-full items-center gap-4">
          {!isEditing ? (
            <div className="flex gap-3">
              {state.isRunning ? (
                <button onClick={onPause} className="btn-secondary px-6">
                  Pausar
                </button>
              ) : (
                <button onClick={onStart} className="btn-primary px-6">
                  Iniciar
                </button>
              )}
              <button onClick={onReset} className="btn-secondary">
                ↺
              </button>
              <button onClick={() => setIsEditing(true)} className="btn-secondary">
                ⚙️
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-400">Estudio (min):</label>
                <input
                  type="number"
                  value={workInput}
                  onChange={(e) => setWorkInput(Number(e.target.value))}
                  className="input-field w-20 text-center"
                  min={1}
                />
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-400">Descanso (min):</label>
                <input
                  type="number"
                  value={breakInput}
                  onChange={(e) => setBreakInput(Number(e.target.value))}
                  className="input-field w-20 text-center"
                  min={1}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveConfig} className="btn-primary flex-1">
                  Guardar
                </button>
                <button onClick={() => setIsEditing(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-400">
          Solo el líder puede controlar el temporizador.
        </div>
      )}
    </div>
  )
}

interface SharedTodoListProps {
  partyId: string
  currentUserId: string
}

export const SharedTodoList = ({ partyId, currentUserId }: SharedTodoListProps) => {
  const [todos, setTodos] = useState<PartyTodo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchTodos = async () => {
    try {
      const data = await partyService.getTodos(partyId)
      setTodos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
    // Poll every 5s since we didn't add full websocket sync for todos yet
    const interval = setInterval(fetchTodos, 5000)
    return () => clearInterval(interval)
  }, [partyId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return
    const text = newTodo
    setNewTodo('')
    try {
      const todo = await partyService.addTodo(partyId, text)
      setTodos((prev) => [...prev, todo])
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggle = async (todo: PartyTodo) => {
    const updated = !todo.isCompleted
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, isCompleted: updated } : t))
    )
    try {
      await partyService.toggleTodo(partyId, todo.id, updated)
    } catch (err) {
      console.error(err)
      // Revert
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, isCompleted: !updated } : t))
      )
    }
  }

  const handleDelete = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    try {
      await partyService.deleteTodo(partyId, id)
    } catch (err) {
      console.error(err)
      fetchTodos()
    }
  }

  return (
    <div className="bg-dark/50 backdrop-blur border border-white/10 rounded-2xl p-6 flex flex-col h-full max-h-[500px]">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span>📋</span> Tareas Compartidas
      </h3>

      <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="text-center text-gray-500 py-4">Cargando tareas...</div>
        ) : todos.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No hay tareas pendientes</div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                todo.isCompleted
                  ? 'bg-dark-lighter/30 border-white/5 opacity-60'
                  : 'bg-dark-lighter border-white/10'
              }`}
            >
              <input
                type="checkbox"
                checked={todo.isCompleted}
                onChange={() => handleToggle(todo)}
                className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary bg-dark cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm break-words ${
                    todo.isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'
                  }`}
                >
                  {todo.text}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Por {todo.user?.displayName || todo.user?.username || 'Usuario'}
                </p>
              </div>
              {todo.userId === currentUserId && (
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mt-auto">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Añadir tarea..."
          className="input-field flex-1"
        />
        <button type="submit" disabled={!newTodo.trim()} className="btn-primary px-4">
          +
        </button>
      </form>
    </div>
  )
}
