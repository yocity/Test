<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-6xl mx-auto mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Gestionnaire de Tâches</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-sm font-medium text-gray-500">Total</div>
          <div class="text-3xl font-bold text-gray-900">{{ stats.total }}</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-sm font-medium text-gray-500">Terminées</div>
          <div class="text-3xl font-bold text-green-600">{{ stats.completed }}</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-sm font-medium text-gray-500">En cours</div>
          <div class="text-3xl font-bold text-orange-600">{{ stats.pending }}</div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow mb-6">
        <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div class="flex gap-2">
            <button 
              @click="openCreateModal"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Nouvelle tâche
            </button>
            <button 
              @click="markAllCompleted"
              :disabled="stats.pending === 0"
              class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
            >
              Tout marquer terminé
            </button>
            <button 
              @click="fetchTasks"
              class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Actualiser
            </button>
          </div>
          
          <div class="flex gap-4 items-center">
            <input
              v-model="localSearchQuery"
              @input="updateSearchQuery"
              placeholder="Rechercher..."
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select 
              @change="sortTasks($event.target.value)"
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Trier par...</option>
              <option value="priority">Priorité</option>
              <option value="date_asc">Date (croissant)</option>
              <option value="date_desc">Date (décroissant)</option>
              <option value="title">Titre</option>
              <option value="status">Statut</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto">
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Chargement...</p>
      </div>

      <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {{ error }}
        <button @click="clearError" class="float-right text-red-600 hover:text-red-800">×</button>
      </div>

      <div v-else-if="filteredTasks.length === 0" class="text-center py-12">
        <div class="text-gray-400 text-6xl mb-4">📝</div>
        <p class="text-gray-600">Aucune tâche trouvée</p>
      </div>

      <div v-else class="grid gap-4">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          :class="{ 'opacity-60': task.completed }"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-4 flex-1">
              <input
                type="checkbox"
                :checked="task.completed"
                @change="toggleTask(task.id)"
                class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900" :class="{ 'line-through': task.completed }">
                  {{ task.title }}
                </h3>
                <p v-if="task.description" class="text-gray-600 mt-1">{{ task.description }}</p>
                
                <div class="flex items-center space-x-4 mt-3">
                  <span 
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="{
                      'bg-red-100 text-red-800': task.priority === 'haute',
                      'bg-yellow-100 text-yellow-800': task.priority === 'moyenne',
                      'bg-green-100 text-green-800': task.priority === 'basse'
                    }"
                  >
                    {{ task.priority }}
                  </span>
                  
                  <span v-if="task.due_date" class="text-sm text-gray-500">
                    📅 {{ formatDate(task.due_date) }}
                  </span>
                  
                  <span 
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="{
                      'bg-green-100 text-green-800': task.completed,
                      'bg-orange-100 text-orange-800': !task.completed
                    }"
                  >
                    {{ task.completed ? 'Terminée' : 'En cours' }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex space-x-2 ml-4">
              <button
                @click="openEditModal(task)"
                class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                title="Modifier"
              >
                ✏️
              </button>
              <button
                @click="openDeleteModal(task)"
                class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Supprimer"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Create/Edit -->
    <div v-if="showFormModal" class="fixed inset-0 backdrop-blur-sm bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            {{ isEditing ? 'Modifier la tâche' : 'Nouvelle tâche' }}
          </h2>
          
          <form @submit.prevent="submitForm">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  v-model="formData.title"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  v-model="formData.description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <select
                  v-model="formData.priority"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="basse">Basse</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
                <input
                  v-model="formData.due_date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div v-if="isEditing">
                <label class="flex items-center">
                  <input
                    v-model="formData.completed"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">Tâche terminée</span>
                </label>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="closeFormModal"
                class="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
              >
                {{ isEditing ? 'Modifier' : 'Créer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Delete -->
    <div v-if="showDeleteModal" class="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Supprimer la tâche</h2>
          <p class="text-gray-600 mb-6">
            Êtes-vous sûr de vouloir supprimer la tâche "{{ taskToDelete?.title }}" ? 
            Cette action est irréversible.
          </p>
          
          <div class="flex justify-end space-x-3">
            <button
              @click="closeDeleteModal"
              class="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              Annuler
            </button>
            <button
              @click="confirmDelete"
              :disabled="loading"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTasksStore } from '@/stores/tasks'

const tasksStore = useTasksStore()

// États locaux pour les modals
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const isEditing = ref(false)
const taskToEdit = ref(null)
const taskToDelete = ref(null)
const localSearchQuery = ref('')

// Données du formulaire
const formData = ref({
  title: '',
  description: '',
  priority: 'moyenne',
  due_date: '',
  completed: false
})

// Accès aux données du store (getters réactifs)
const tasks = computed(() => tasksStore.tasks)
const loading = computed(() => tasksStore.loading)
const error = computed(() => tasksStore.error)
const searchQuery = computed(() => tasksStore.searchQuery)
const stats = computed(() => tasksStore.stats)

// Tâches filtrées avec les complétées en bas
const filteredTasks = computed(() => {
  const filtered = tasksStore.filteredTasks
  // Séparer les tâches non complétées et complétées
  const pending = filtered.filter(task => !task.completed)
  const completed = filtered.filter(task => task.completed)
  // Retourner les non complétées en premier, puis les complétées
  return [...pending, ...completed]
})

// Actions du store (pas besoin de ref/computed pour les méthodes)
const {
  fetchTasks,
  createTask,
  updateTask,
  toggleTask,
  deleteTask,
  setSearchQuery,
  markAllCompleted,
  clearError
} = tasksStore

// Fonction de tri personnalisée
function sortTasks(sortBy) {
  tasksStore.sortTasks(sortBy)
}

// Fonctions pour les modals
function openCreateModal() {
  resetForm()
  isEditing.value = false
  showFormModal.value = true
}

function openEditModal(task) {
  taskToEdit.value = task
  formData.value = {
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    due_date: task.due_date ? task.due_date.split('T')[0] : '',
    completed: task.completed
  }
  isEditing.value = true
  showFormModal.value = true
}

function openDeleteModal(task) {
  taskToDelete.value = task
  showDeleteModal.value = true
}

function closeFormModal() {
  showFormModal.value = false
  taskToEdit.value = null
  resetForm()
}

function closeDeleteModal() {
  showDeleteModal.value = false
  taskToDelete.value = null
}

function resetForm() {
  formData.value = {
    title: '',
    description: '',
    priority: 'moyenne',
    due_date: '',
    completed: false
  }
}

async function submitForm() {
  try {
    if (isEditing.value) {
      await updateTask(taskToEdit.value.id, formData.value)
    } else {
      await createTask(formData.value)
    }
    closeFormModal()
  } catch (err) {
    console.error('Erreur lors de la soumission:', err)
  }
}

async function confirmDelete() {
  try {
    await deleteTask(taskToDelete.value.id)
    closeDeleteModal()
  } catch (err) {
    console.error('Erreur lors de la suppression:', err)
  }
}

function updateSearchQuery() {
  setSearchQuery(localSearchQuery.value)
}

// Computed pour formater les dates
const formatDate = computed(() => {
  return (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date)) return ''
    return date.toLocaleDateString('fr-FR')
  }
})

// Lifecycle hooks
onMounted(async () => {
  console.log('Component mounted, fetching tasks...')
  try {
    await fetchTasks()
    console.log('Tasks fetched successfully:', tasks.value.length, 'tasks loaded')
  } catch (error) {
    console.error('Error fetching tasks:', error)
  }
})
</script>