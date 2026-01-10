<template>
  <v-container fluid>
    <!-- Toolbar -->
    <v-row>
      <v-col>
        <v-card>
          <v-card-title>
            <span class="text-h5">User Management</span>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="openImportDialog">
              <v-icon start>mdi-upload</v-icon>
              CSV Import
            </v-btn>
            <v-btn color="success" @click="openCreateDialog">
              <v-icon start>mdi-plus</v-icon>
              Neuer User
            </v-btn>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filter-Bereich -->
    <v-row>
      <v-col>
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>Filter & Sortierung</v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="filters.active"
                    label="Active"
                    :items="[{title: 'Alle', value: null}, {title: 'Aktiv', value: true}, {title: 'Inaktiv', value: false}]"
                    clearable
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="filters.blocked"
                    label="Blocked"
                    :items="[{title: 'Alle', value: null}, {title: 'Blockiert', value: true}, {title: 'Nicht blockiert', value: false}]"
                    clearable
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="filters.location"
                    label="Location"
                    clearable
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="sortBy"
                    label="Sortieren nach"
                    :items="sortOptions"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="sortOrder"
                    label="Reihenfolge"
                    :items="[{title: 'Aufsteigend', value: 'asc'}, {title: 'Absteigend', value: 'desc'}]"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-btn @click="resetFilters">Filter zurücksetzen</v-btn>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>

    <!-- User-Tabelle -->
    <v-row>
      <v-col>
        <v-card>
          <v-data-table
            :headers="headers"
            :items="users"
            :loading="loading"
            :items-per-page="itemsPerPage"
            :page="page"
            @update:page="page = $event"
            @update:items-per-page="itemsPerPage = $event"
            :sort-by="[{key: sortBy, order: sortOrder}]"
            class="elevation-1"
          >
            <template v-slot:item.active="{ item }">
              <v-chip :color="item.active ? 'success' : 'error'" small>
                {{ item.active ? 'Aktiv' : 'Inaktiv' }}
              </v-chip>
            </template>
            <template v-slot:item.blocked="{ item }">
              <v-chip :color="item.blocked ? 'warning' : 'success'" small>
                {{ item.blocked ? 'Blockiert' : 'Frei' }}
              </v-chip>
            </template>
            <template v-slot:item.lastLogin="{ item }">
              {{ formatDate(item.lastLogin) }}
            </template>
            <template v-slot:item.actions="{ item }">
              <v-btn icon="mdi-pencil" size="small" @click="openEditDialog(item)"></v-btn>
              <v-btn 
                :icon="item.blocked ? 'mdi-lock-open' : 'mdi-lock'" 
                size="small" 
                @click="toggleBlock(item)"
              ></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- User Dialog (Create/Edit) -->
    <v-dialog v-model="userDialog" max-width="600px">
      <v-card>
        <v-card-title>{{ editingUser ? 'User bearbeiten' : 'Neuer User' }}</v-card-title>
        <v-card-text>
          <v-form ref="userForm">
            <v-text-field v-model="userFormData.name" label="Name" required></v-text-field>
            <v-text-field v-model="userFormData.email" label="Email" type="email" required></v-text-field>
            <v-text-field v-model="userFormData.ipAddress" label="IP Address"></v-text-field>
            <v-text-field v-model="userFormData.location" label="Location"></v-text-field>
            <v-checkbox v-model="userFormData.active" label="Aktiv"></v-checkbox>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="userDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" @click="saveUser">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- CSV Import Dialog -->
    <v-dialog v-model="importDialog" max-width="600px">
      <v-card>
        <v-card-title>CSV Import</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="csvFile"
            label="CSV Datei auswählen"
            accept=".csv"
            show-size
            :disabled="importing"
          ></v-file-input>
          <v-alert v-if="importResult" type="info" class="mt-4">
            <v-list density="compact" class="pa-0">
              <v-list-item class="pa-0">
                <v-list-item-title>Total: {{ importResult.total }}</v-list-item-title>
              </v-list-item>
              <v-list-item class="pa-0">
                <v-list-item-title>Importiert: {{ importResult.imported }}</v-list-item-title>
              </v-list-item>
              <v-list-item class="pa-0">
                <v-list-item-title>Aktualisiert: {{ importResult.updated }}</v-list-item-title>
              </v-list-item>
              <v-list-item class="pa-0">
                <v-list-item-title>Übersprungen: {{ importResult.skipped }}</v-list-item-title>
              </v-list-item>
              <template v-if="importResult.errors?.length > 0">
                <v-list-item class="pa-0 mt-2">
                  <v-list-item-title class="font-weight-bold">Fehler:</v-list-item-title>
                </v-list-item>
                <v-list-item 
                  v-for="error in importResult.errors" 
                  :key="error.row"
                  class="pa-0"
                >
                  <v-list-item-title class="text-caption">
                    Zeile {{ error.row }}: {{ error.error || error.errors?.map(e => e.message).join(', ') }}
                  </v-list-item-title>
                </v-list-item>
              </template>
            </v-list>
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="importDialog = false">Schließen</v-btn>
          <v-btn color="primary" @click="importCSV" :loading="importing" :disabled="!csvFile">
            Importieren
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar Notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { userService } from '@/services/api'

// Data
const users = ref([])
const loading = ref(false)
const page = ref(1)
const itemsPerPage = ref(10)

// Filters & Sort
const filters = reactive({
  active: null,
  blocked: null,
  location: null
})
const sortBy = ref('name')
const sortOrder = ref('asc')
const sortOptions = [
  { title: 'Name', value: 'name' },
  { title: 'Email', value: 'email' },
  { title: 'Location', value: 'location' },
  { title: 'Last Login', value: 'lastLogin' }
]

// Header
const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'IP Address', key: 'ipAddress' },
  { title: 'Location', key: 'location', sortable: true },
  { title: 'Active', key: 'active' },
  { title: 'Blocked', key: 'blocked' },
  { title: 'Last Login', key: 'lastLogin', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// User individuell Dialog
const userDialog = ref(false)
const editingUser = ref(null)
const userFormData = reactive({
  name: '',
  email: '',
  ipAddress: '',
  location: '',
  active: true
})

// Import Dialog
const importDialog = ref(false)
const csvFile = ref(null)
const importing = ref(false)
const importResult = ref(null)

// Snackbar
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

const loadUsers = async () => {
  loading.value = true
  try {
    const params = {}
    if (filters.active !== null) params.active = filters.active
    if (filters.blocked !== null) params.blocked = filters.blocked
    if (filters.location) params.location = filters.location
    
    const response = await userService.getUsers(params, sortBy.value, sortOrder.value)
    users.value = response.data || response
  } catch (error) {
    showSnackbar('Fehler beim Laden der User', 'error')
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  editingUser.value = null
  Object.assign(userFormData, {
    name: '',
    email: '',
    ipAddress: '',
    location: '',
    active: true
  })
  userDialog.value = true
}

const openEditDialog = (user) => {
  editingUser.value = user
  Object.assign(userFormData, {
    name: user.name,
    email: user.email,
    ipAddress: user.ipAddress || '',
    location: user.location || '',
    active: user.active
  })
  userDialog.value = true
}

const saveUser = async () => {
  try {
    if (editingUser.value) {
      await userService.updateUser(editingUser.value._id, userFormData)
      showSnackbar('User erfolgreich aktualisiert', 'success')
    } else {
      await userService.createUser(userFormData)
      showSnackbar('User erfolgreich erstellt', 'success')
    }
    userDialog.value = false
    await loadUsers()
  } catch (error) {
    showSnackbar('Fehler beim Speichern', 'error')
  }
}

const toggleBlock = async (user) => {
  try {
    if (user.blocked) {
      await userService.unblockUser(user._id)
      showSnackbar('User erfolgreich freigeschaltet', 'success')
    } else {
      await userService.blockUser(user._id)
      showSnackbar('User erfolgreich blockiert', 'success')
    }
    await loadUsers()
  } catch (error) {
    showSnackbar('Fehler beim Blockieren/Freischalten', 'error')
  }
}

const openImportDialog = () => {
  importDialog.value = true
  csvFile.value = null
  importResult.value = null
}

const importCSV = async () => {
  if (!csvFile.value) return
  
  importing.value = true
  try {
    const response = await userService.importUsers(csvFile.value)
    // Response-Struktur vom Backend: { success: true, data: { imported, updated, skipped, errors, total } }
    // Axios Interceptor gibt response.data zurück, also ist response = { success: true, data: {...} }
    // Daher: response.data enthält die eigentlichen Ergebnisse (imported, updated, etc.)
    const result = response.data || response // response.data ist das results-Objekt
    importResult.value = result
    showSnackbar(`Import abgeschlossen: ${result.imported} importiert, ${result.updated} aktualisiert`, 'success')
    await loadUsers()
  } catch (error) {
    showSnackbar('Fehler beim Import', 'error')
  } finally {
    importing.value = false
  }
}

const resetFilters = () => {
  filters.active = null
  filters.blocked = null
  filters.location = null
  sortBy.value = 'name'
  sortOrder.value = 'asc'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('de-DE')
}

const showSnackbar = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

// Watchers
watch([filters, sortBy, sortOrder], () => {
  loadUsers()
}, { deep: true })

// Lifecycle
onMounted(() => {
  loadUsers()
})
</script>
