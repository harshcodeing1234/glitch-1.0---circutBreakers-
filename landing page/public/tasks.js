let tasks = [];
let currentUser = null;

// Check authentication
function checkAuth() {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '/auth.html';
        return false;
    }
    currentUser = JSON.parse(userData);
    updateUserProfile();
    return true;
}

// Update user profile
function updateUserProfile() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.name;
        document.getElementById('profile-img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3b82f6&color=fff`;
    }
}

// Load tasks
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Render tasks
function renderTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';

    tasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${task.status}`;
        taskCard.innerHTML = `
            <div class="task-header">
                <h3>${task.title}</h3>
                <span class="priority ${task.priority}">${task.priority}</span>
            </div>
            <p class="task-description">${task.description}</p>
            <div class="task-meta">
                <span><i class="fas fa-calendar"></i> Due: ${task.due_date}</span>
                <span><i class="fas fa-user"></i> ${task.claimed_by || 'Unassigned'}</span>
            </div>
            <div class="task-footer">
                <span class="status ${task.status}">${task.status === 'claimed' ? `Claimed by ${task.claimed_by}` : 'Unclaimed'}</span>
                <button class="claim-btn ${task.status}" onclick="toggleClaim(${task.id})">
                    ${task.status === 'claimed' ? 'Unclaim' : 'Claim Task'}
                </button>
            </div>
            <div class="task-actions">
                <button class="btn-small btn-edit" onclick="editTask(${task.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-small btn-delete" onclick="deleteTask(${task.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(taskCard);
    });
}

// Toggle claim/unclaim
async function toggleClaim(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const endpoint = task.status === 'claimed' ? 'unclaim' : 'claim';
    
    try {
        const body = endpoint === 'claim' ? 
            JSON.stringify({ name: currentUser.name, userId: currentUser.id }) : 
            JSON.stringify({});
            
        await fetch(`/api/tasks/${taskId}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });
        loadTasks();
    } catch (error) {
        console.error('Error toggling claim:', error);
    }
}

// Open task modal
function openTaskModal(taskId = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const title = document.getElementById('modal-title');
    
    if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        title.textContent = 'Edit Task';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-due-date').value = task.due_date;
    } else {
        title.textContent = 'Add New Task';
        form.reset();
        document.getElementById('task-id').value = '';
    }
    
    modal.style.display = 'block';
}

// Close task modal
function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

// Edit task
function editTask(taskId) {
    openTaskModal(taskId);
}

// Delete task
async function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            loadTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }
}

// Handle form submission
document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskId = document.getElementById('task-id').value;
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        priority: document.getElementById('task-priority').value,
        due_date: document.getElementById('task-due-date').value
    };
    
    try {
        const method = taskId ? 'PUT' : 'POST';
        const url = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        closeTaskModal();
        loadTasks();
    } catch (error) {
        console.error('Error saving task:', error);
    }
});

// Filter functionality
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const filter = this.textContent.toLowerCase();
        const taskCards = document.querySelectorAll('.task-card');
        
        taskCards.forEach((card, index) => {
            const task = tasks[index];
            let show = true;
            
            if (filter === 'my tasks') {
                show = task.claimed_by_id == currentUser.id;
            } else if (filter === 'unclaimed') {
                show = task.status === 'unclaimed';
            } else if (filter === 'high priority') {
                show = task.priority === 'high';
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    });
});

// Sidebar navigation - remove the navigation override
// Let the browser handle the href links naturally

// Profile dropdown
document.querySelector('.profile-dropdown').addEventListener('click', function(e) {
    e.stopPropagation();
    document.querySelector('.dropdown-menu').classList.toggle('show');
});

document.addEventListener('click', function() {
    document.querySelector('.dropdown-menu').classList.remove('show');
});

// Logout
document.getElementById('logout').addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('user');
    window.location.href = '/auth.html';
});

// Edit profile
document.getElementById('edit-profile').addEventListener('click', function(e) {
    e.preventDefault();
    const newName = prompt('Enter new name:', currentUser.name);
    if (newName && newName.trim()) {
        currentUser.name = newName.trim();
        localStorage.setItem('user', JSON.stringify(currentUser));
        updateUserProfile();
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('taskModal');
    if (event.target === modal) {
        closeTaskModal();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (checkAuth()) {
        loadTasks();
    }
});
