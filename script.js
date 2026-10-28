class Node {
  constructor(task, next = null) {
    this.task = task;
    this.next = next;
  }
}

class LinkedTaskList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  add(task) {
    const newNode = new Node(task);

    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }

    this.size += 1;
    return newNode;
  }

  toArray() {
    const result = [];
    let current = this.head;

    while (current) {
      result.push(current.task);
      current = current.next;
    }

    return result;
  }

  update(id, updatedTask) {
    let current = this.head;

    while (current) {
      if (current.task.id === id) {
        current.task = { ...current.task, ...updatedTask };
        return current.task;
      }
      current = current.next;
    }

    return null;
  }

  delete(id) {
    if (!this.head) return false;

    if (this.head.task.id === id) {
      this.head = this.head.next;
      if (!this.head) this.tail = null;
      this.size -= 1;
      return true;
    }

    let previous = this.head;
    let current = this.head.next;

    while (current) {
      if (current.task.id === id) {
        previous.next = current.next;
        if (!current.next) this.tail = previous;
        this.size -= 1;
        return true;
      }
      previous = current;
      current = current.next;
    }

    return false;
  }

  loadFromArray(tasks) {
    this.head = null;
    this.tail = null;
    this.size = 0;

    tasks.forEach((task) => {
      this.add(task);
    });
  }
}

const storageKey = 'task-manager-data';
const taskForm = document.getElementById('taskForm');
const taskListContainer = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const taskNameInput = document.getElementById('taskName');
const taskDescriptionInput = document.getElementById('taskDescription');
const taskStatusInput = document.getElementById('taskStatus');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const updateTaskBtn = document.getElementById('updateTaskBtn');
const resetFormBtn = document.getElementById('resetFormBtn');
const exportBtn = document.getElementById('exportBtn');
const importFileInput = document.getElementById('importFile');

const taskList = new LinkedTaskList();
let editingTaskId = null;

function formatStatusClass(status) {
  switch (status.toLowerCase()) {
    case 'pendiente':
      return 'status-pendiente';
    case 'en proceso':
      return 'status-proceso';
    case 'completada':
      return 'status-completada';
    default:
      return 'status-pendiente';
  }
}

function saveToLocalStorage() {
  localStorage.setItem(storageKey, JSON.stringify(taskList.toArray()));
}

function renderTasks() {
  const tasks = taskList.toArray();
  taskCount.textContent = tasks.length;

  if (!tasks.length) {
    taskListContainer.innerHTML = '<div class="empty-state">No hay actividades registradas todavía.</div>';
    return;
  }

  taskListContainer.innerHTML = tasks
    .map(
      (task) => `
        <article class="task-card" data-id="${task.id}">
          <div class="task-card-header">
            <h3 class="task-name">${escapeHtml(task.name)}</h3>
            <span class="status-badge ${formatStatusClass(task.status)}">${escapeHtml(task.status)}</span>
          </div>
          <p class="task-description">${escapeHtml(task.description)}</p>
          <div class="task-actions">
            <button type="button" class="edit-task" data-action="edit" data-id="${task.id}">Editar</button>
            <button type="button" class="delete-task" data-action="delete" data-id="${task.id}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resetForm() {
  taskForm.reset();
  taskStatusInput.value = 'Pendiente';
  editingTaskId = null;
  saveTaskBtn.classList.remove('hidden');
  updateTaskBtn.classList.add('hidden');
}

function fillForm(task) {
  taskNameInput.value = task.name;
  taskDescriptionInput.value = task.description;
  taskStatusInput.value = task.status;
  editingTaskId = task.id;
  saveTaskBtn.classList.add('hidden');
  updateTaskBtn.classList.remove('hidden');
  taskNameInput.focus();
}

function loadTasksFromStorage() {
  const savedTasks = localStorage.getItem(storageKey);

  if (!savedTasks) {
    return;
  }

  try {
    const tasks = JSON.parse(savedTasks);
    if (Array.isArray(tasks) && tasks.length) {
      taskList.loadFromArray(tasks);
      renderTasks();
    }
  } catch (error) {
    console.warn('No se pudo cargar la información del almacenamiento local.', error);
  }
}

async function loadTasksFromTextFile() {
  try {
    const response = await fetch('tasks.txt', { cache: 'no-store' });
    if (!response.ok) return;

    const text = await response.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed) && parsed.length) {
      taskList.loadFromArray(parsed);
      saveToLocalStorage();
      renderTasks();
    }
  } catch (error) {
    console.warn('No hay un archivo tasks.txt disponible o aún no se creó.', error);
  }
}

function exportTasksToTextFile() {
  const tasks = taskList.toArray();
  const fileContent = JSON.stringify(tasks, null, 2);
  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'tasks.txt';
  link.click();

  URL.revokeObjectURL(url);
}

function importTasksFromTextFile(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);

      if (!Array.isArray(parsed)) {
        throw new Error('El archivo no contiene una lista válida.');
      }

      taskList.loadFromArray(parsed);
      saveToLocalStorage();
      renderTasks();
      resetForm();
      alert('Archivo cargado correctamente.');
    } catch (error) {
      alert('No se pudo leer el archivo .txt. Asegúrate de que sea un archivo válido del gestor.');
      console.error(error);
    }
  };

  reader.readAsText(file);
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = taskNameInput.value.trim();
  const description = taskDescriptionInput.value.trim();
  const status = taskStatusInput.value;

  if (!name || !description) {
    alert('Debes completar el nombre y la descripción de la actividad.');
    return;
  }

  if (editingTaskId !== null) {
    const result = taskList.update(editingTaskId, { name, description, status });
    if (!result) {
      alert('No fue posible actualizar la actividad.');
      return;
    }
  } else {
    taskList.add({
      id: Date.now(),
      name,
      description,
      status,
    });
  }

  saveToLocalStorage();
  renderTasks();
  resetForm();
});

updateTaskBtn.addEventListener('click', () => {
  taskForm.requestSubmit();
});

resetFormBtn.addEventListener('click', () => {
  resetForm();
});

taskListContainer.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const taskId = Number(button.dataset.id);

  if (action === 'edit') {
    const task = taskList.toArray().find((item) => item.id === taskId);
    if (task) fillForm(task);
  }

  if (action === 'delete') {
    const confirmed = window.confirm('¿Deseas eliminar esta actividad?');
    if (!confirmed) return;

    taskList.delete(taskId);
    saveToLocalStorage();
    renderTasks();

    if (editingTaskId === taskId) {
      resetForm();
    }
  }
});

exportBtn.addEventListener('click', () => {
  exportTasksToTextFile();
});

importFileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  importTasksFromTextFile(file);
  event.target.value = '';
});

loadTasksFromStorage();
loadTasksFromTextFile();
renderTasks();
resetForm();