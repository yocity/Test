import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'

export const useTasksStore = defineStore('tasks', () => {
  const API_BASE_URL = 'http://localhost:3000/api'

  const apiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`

  // État
  const tasks = ref([])
  const loading = ref(false)
  const error = ref(null)
  const searchQuery = ref('')
  const stats = ref({
    total: 0,
    completed: 0,
    pending: 0,
  })

  // Getters calculés
  const filteredTasks = computed(() => {
    if (!searchQuery.value) return tasks.value
    const query = searchQuery.value.toLowerCase()
    return tasks.value.filter(
      (task) =>
        task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query),
    )
  })

  const completedTasks = computed(() => tasks.value.filter((task) => task.completed))

  const pendingTasks = computed(() => tasks.value.filter((task) => !task.completed))

  const tasksByPriority = computed(() => {
    const priorities = { haute: [], moyenne: [], basse: [] }
    tasks.value.forEach((task) => {
      if (priorities[task.priority]) {
        priorities[task.priority].push(task)
      }
    })
    return priorities
  })

  const setLoading = (state) => {
    loading.value = state
  }

  const setError = (errorMessage) => {
    error.value = errorMessage
    setTimeout(() => {
      error.value = null
    }, 5000)
  }

  const clearError = () => {
    error.value = null
  }

  const fetchTasks = async () => {
    setLoading(true)
    clearError()

    try {
      const response = await fetch(apiUrl('/tasks'))
      if (!response.ok) throw new Error('Erreur lors du chargement des tâches')

      const data = await response.json()
      tasks.value = data
      await fetchStats()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (taskData) => {
    setLoading(true)
    clearError()

    try {
      const response = await fetch(apiUrl('/tasks'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) throw new Error('Erreur lors de la création de la tâche')

      const newTask = await response.json()
      
      tasks.value.unshift(newTask)

      stats.value.total++
      stats.value.pending++

      return newTask
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Mettre à jour une tâche
  const updateTask = async (id, taskData) => {
    setLoading(true)
    clearError()

    try {
      const response = await fetch(apiUrl(`/tasks/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) throw new Error('Erreur lors de la mise à jour de la tâche')

      const updatedTask = await response.json()

      const index = tasks.value.findIndex((task) => task.id === id)
      if (index !== -1) {
        const oldTask = tasks.value[index]
        tasks.value[index] = updatedTask

        if (oldTask.completed !== updatedTask.completed) {
          if (updatedTask.completed) {
            stats.value.completed++
            stats.value.pending--
          } else {
            stats.value.completed--
            stats.value.pending++
          }
        }
      }

      return updatedTask
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Basculer le statut d'une tâche
  const toggleTask = async (id) => {
    clearError()

    const taskIndex = tasks.value.findIndex((task) => task.id === id)
    if (taskIndex === -1) return

    const originalTask = { ...tasks.value[taskIndex] }
    const wasCompleted = originalTask.completed

    tasks.value[taskIndex].completed = !wasCompleted

    if (wasCompleted) {
      stats.value.completed--
      stats.value.pending++
    } else {
      stats.value.completed++
      stats.value.pending--
    }

    try {
      const response = await fetch(apiUrl(`/tasks/${id}/toggle`), {
        method: 'PATCH',
      })

      if (!response.ok) throw new Error('Erreur lors du basculement de la tâche')

      const updatedTask = await response.json()
      tasks.value[taskIndex] = updatedTask
    } catch (err) {
      
      tasks.value[taskIndex] = originalTask
      if (wasCompleted) {
        stats.value.completed++
        stats.value.pending--
      } else {
        stats.value.completed--
        stats.value.pending++
      }
      setError(err.message)
      throw err
    }
  }

  // Supprimer une tâche
  const deleteTask = async (id) => {
    setLoading(true)
    clearError()

    const taskIndex = tasks.value.findIndex((task) => task.id === id)
    if (taskIndex === -1) return

    const taskToDelete = tasks.value[taskIndex]

    tasks.value.splice(taskIndex, 1)
    stats.value.total--
    if (taskToDelete.completed) {
      stats.value.completed--
    } else {
      stats.value.pending--
    }

    try {
      const response = await fetch(apiUrl(`/tasks/${id}`), {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression de la tâche')
    } catch (err) {
      
      tasks.value.splice(taskIndex, 0, taskToDelete)
      stats.value.total++
      if (taskToDelete.completed) {
        stats.value.completed++
      } else {
        stats.value.pending++
      }
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Rechercher des tâches (côté serveur)
  const searchTasks = async (query) => {
    if (!query.trim()) {
      await fetchTasks()
      return
    }

    setLoading(true)
    clearError()
 
    try {
      const response = await fetch(apiUrl(`/search?q=${encodeURIComponent(query)}`))
      if (!response.ok) throw new Error('Erreur lors de la recherche')

      const results = await response.json()
      tasks.value = results
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const setSearchQuery = (query) => {
    searchQuery.value = query
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(apiUrl('/stats'))
      if (!response.ok) throw new Error('Erreur lors du chargement des statistiques')

      const data = await response.json()
      stats.value = data
    } catch (err) {
      setError(err.message)
    }
  }

  const getTaskById = (id) => {
    return tasks.value.find((task) => task.id === parseInt(id))
  }

  const resetStore = () => {
    tasks.value = []
    loading.value = false
    error.value = null
    searchQuery.value = ''
    stats.value = { total: 0, completed: 0, pending: 0 }
  }

  const sortTasks = (sortBy) => {
    switch (sortBy) {
      case 'date_asc':
        tasks.value.sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))
        break
      case 'date_desc':
        tasks.value.sort((a, b) => new Date(b.due_date || 0) - new Date(a.due_date || 0))
        break
      case 'priority':
        const priorityOrder = { haute: 3, moyenne: 2, basse: 1 }
        tasks.value.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
        break
      case 'title':
        tasks.value.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'status':
        tasks.value.sort((a, b) => a.completed - b.completed)
        break
      default:
        tasks.value.sort((a, b) => b.id - a.id)
    }
  }

  const markAllCompleted = async () => {
    const pendingTaskIds = tasks.value.filter((task) => !task.completed).map((task) => task.id)

    if (pendingTaskIds.length === 0) return

    tasks.value.forEach((task) => {
      if (!task.completed) task.completed = true
    })
    stats.value.completed = stats.value.total
    stats.value.pending = 0

    try {
      await Promise.all(
        pendingTaskIds.map((id) => fetch(apiUrl(`/tasks/${id}/toggle`), { method: 'PATCH' })),
      )
    } catch (err) {
      await fetchTasks()
      setError('Erreur lors de la mise à jour groupée')
      throw err
    }
  }

  return {
    // État
    tasks: readonly(tasks),
    loading: readonly(loading),
    error: readonly(error),
    searchQuery: readonly(searchQuery),
    stats: readonly(stats),

    // Getters
    filteredTasks,
    completedTasks,
    pendingTasks,
    tasksByPriority,

    // Actions
    fetchTasks,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    searchTasks,
    setSearchQuery,
    fetchStats,
    getTaskById,
    resetStore,
    sortTasks,
    markAllCompleted,
    clearError,
  }
})
