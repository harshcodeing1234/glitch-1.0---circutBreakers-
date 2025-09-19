document.addEventListener('DOMContentLoaded', function() {
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
            document.getElementById('profile-img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3b82f6&color=fff&size=40`;
        }
    }

    // Load dashboard data
    async function loadDashboardData() {
        try {
            // Load tasks first
            const tasksResponse = await fetch('/api/tasks');
            const tasks = await tasksResponse.json();
            
            // Calculate stats from tasks
            const stats = {
                totalTasks: tasks.length,
                claimedTasks: tasks.filter(t => t.status === 'claimed').length,
                unclaimedTasks: tasks.filter(t => t.status === 'unclaimed').length,
                myTasks: tasks.filter(t => t.claimed_by_id == currentUser.id).length
            };
            
            updateDashboardStats(stats);
            renderRecentTasks(tasks.slice(-6));
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Show fallback data
            updateDashboardStats({
                totalTasks: 0,
                claimedTasks: 0,
                unclaimedTasks: 0,
                myTasks: 0
            });
        }
    }

    // Update dashboard stats
    function updateDashboardStats(stats) {
        const statCards = document.querySelectorAll('.stat-card h3');
        if (statCards.length >= 4) {
            statCards[0].textContent = stats.totalTasks || 0;
            statCards[1].textContent = stats.claimedTasks || 0;
            statCards[2].textContent = stats.unclaimedTasks || 0;
            statCards[3].textContent = stats.myTasks || 0;
        }
    }

    // Render recent tasks
    function renderRecentTasks(tasks) {
        const tasksGrid = document.querySelector('.tasks-grid');
        if (!tasksGrid || !tasks) return;
        
        tasksGrid.innerHTML = tasks.map(task => `
            <div class="task-card ${task.status}">
                <div class="task-header">
                    <h3>${task.title}</h3>
                    <span class="priority ${task.priority}">${task.priority}</span>
                </div>
                <p class="task-description">${task.description}</p>
                <div class="task-meta">
                    <span><i class="fas fa-calendar"></i> Due: ${task.due_date}</span>
                </div>
                <div class="task-footer">
                    <span class="status ${task.status}">
                        ${task.status === 'claimed' ? `Claimed by ${task.claimed_by}` : 'Unclaimed'}
                    </span>
                    <button class="claim-btn ${task.status}" onclick="toggleClaim(${task.id})">
                        ${task.status === 'claimed' && task.claimed_by_id == currentUser.id ? 'Unclaim' : 
                          task.status === 'claimed' ? 'Claimed' : 'Claim Task'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Toggle claim/unclaim
    window.toggleClaim = async function(taskId) {
        try {
            const tasksResponse = await fetch('/api/tasks');
            const tasks = await tasksResponse.json();
            const task = tasks.find(t => t.id === taskId);
            
            if (!task) return;
            
            const endpoint = task.status === 'claimed' ? 'unclaim' : 'claim';
            const body = endpoint === 'claim' ? 
                JSON.stringify({ name: currentUser.name, userId: currentUser.id }) : 
                JSON.stringify({});
                
            await fetch(`/api/tasks/${taskId}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body
            });
            
            loadDashboardData(); // Reload data
        } catch (error) {
            console.error('Error toggling claim:', error);
        }
    };

    // Filter functionality
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.textContent.toLowerCase();
            
            try {
                const response = await fetch('/api/tasks');
                const tasks = await response.json();
                let filteredTasks = tasks;
                
                if (filter === 'my tasks') {
                    filteredTasks = tasks.filter(task => task.claimed_by_id == currentUser.id);
                } else if (filter === 'unclaimed') {
                    filteredTasks = tasks.filter(task => task.status === 'unclaimed');
                }
                
                renderRecentTasks(filteredTasks.slice(-6));
            } catch (error) {
                console.error('Error filtering tasks:', error);
            }
        });
    });

    // Profile dropdown functionality
    document.querySelector('.profile-dropdown').addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelector('.dropdown-menu').classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        document.querySelector('.dropdown-menu').classList.remove('show');
    });

    // Logout functionality
    document.getElementById('logout').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = '/auth.html';
    });

    // Edit profile functionality
    document.getElementById('edit-profile').addEventListener('click', function(e) {
        e.preventDefault();
        const newName = prompt('Enter new name:', currentUser.name);
        if (newName && newName.trim()) {
            currentUser.name = newName.trim();
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUserProfile();
        }
    });

    // Initialize app
    if (checkAuth()) {
        loadDashboardData();
    }
});
