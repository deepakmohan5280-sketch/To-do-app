document.addEventListener('DOMContentLoaded', () => {
  const taskList = document.getElementById('task-list');
  const newTaskInput = document.getElementById('new-task');
  const addBtn = document.getElementById('add-btn');
  const logoutBtn = document.getElementById('logout');

  function loadTasks() {
    // If taskList isn't present, nothing to do (page might be login page)
    if (!taskList) return;

    fetch('/tasks')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load tasks');
        return res.json();
      })
      .then(tasks => {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
          const li = document.createElement('li');
          li.className = 'task';
          // Use data-index + event delegation could be better, but keep existing UI
          li.innerHTML = `
            <span>${task}</span>
            <button onclick="deleteTask(${index})">Delete</button>
          `;
          taskList.appendChild(li);
        });
      })
      .catch(err => {
        // Fail silently in UI; log to console for debugging
        console.error('Error loading tasks:', err);
      });
  }

  if (addBtn && newTaskInput) {
    addBtn.addEventListener('click', () => {
      const task = newTaskInput.value.trim();
      if (task) {
        fetch('/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task })
        }).then(res => {
          if (!res.ok) throw new Error('Failed to add task');
          newTaskInput.value = '';
          loadTasks();
        }).catch(err => console.error('Error adding task:', err));
      }
    });
  }

  function deleteTask(index) {
    fetch(`/tasks/${index}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete task');
        loadTasks();
      })
      .catch(err => console.error('Error deleting task:', err));
  }

  // Expose to window so inline onclick handlers work reliably
  window.deleteTask = deleteTask;

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      fetch('/logout', { method: 'POST' })
        .then(() => window.location.reload())
        .catch(err => console.error('Logout failed:', err));
    });
  }

  // Initial load (no-op on pages without taskList)
  loadTasks();
});
