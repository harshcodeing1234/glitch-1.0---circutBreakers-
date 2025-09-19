document.addEventListener('DOMContentLoaded', function() {
    // Filter functionality
    const filterBtns = document.querySelectorAll('.filter-btn');
    const taskCards = document.querySelectorAll('.task-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');

            const filter = this.textContent.toLowerCase();
            
            taskCards.forEach(card => {
                if (filter === 'all') {
                    card.style.display = 'block';
                } else if (filter === 'my tasks') {
                    // Show only claimed tasks
                    if (card.classList.contains('claimed')) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                } else if (filter === 'unclaimed') {
                    // Show only unclaimed tasks
                    if (card.classList.contains('unclaimed')) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
        });
    });

    // Task claiming functionality
    const claimBtns = document.querySelectorAll('.claim-btn');
    
    claimBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const taskCard = this.closest('.task-card');
            const statusElement = taskCard.querySelector('.status');
            const metaUser = taskCard.querySelector('.task-meta span:last-child');
            
            if (this.classList.contains('claimed')) {
                // Unclaim task
                taskCard.classList.remove('claimed');
                taskCard.classList.add('unclaimed');
                statusElement.textContent = 'Unclaimed';
                statusElement.className = 'status unclaimed';
                metaUser.innerHTML = '<i class="fas fa-user"></i> Unassigned';
                this.textContent = 'Claim Task';
                this.classList.remove('claimed');
            } else {
                // Claim task
                const userName = prompt('Enter your name:');
                if (userName && userName.trim()) {
                    taskCard.classList.remove('unclaimed');
                    taskCard.classList.add('claimed');
                    statusElement.textContent = `Claimed by ${userName.trim()}`;
                    statusElement.className = 'status claimed';
                    metaUser.innerHTML = `<i class="fas fa-user"></i> ${userName.trim()}`;
                    this.textContent = 'Unclaim';
                    this.classList.add('claimed');
                }
            }
        });
    });

    // Profile dropdown (placeholder)
    const profile = document.querySelector('.profile');
    profile.addEventListener('click', function() {
        alert('Profile menu would open here');
    });

    // Notifications (placeholder)
    const notifications = document.querySelector('.notifications');
    notifications.addEventListener('click', function() {
        alert('Notifications panel would open here');
    });

    // Sidebar navigation
    const navLinks = document.querySelectorAll('.sidebar nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');
            
            // Update header title based on navigation
            const headerTitle = document.querySelector('.header-left h1');
            const linkText = this.textContent.trim();
            headerTitle.textContent = linkText;
        });
    });

    // Add some dynamic stats updates
    function updateStats() {
        const totalTasks = document.querySelectorAll('.task-card').length;
        const claimedTasks = document.querySelectorAll('.task-card.claimed').length;
        const unclaimedTasks = totalTasks - claimedTasks;
        
        const statCards = document.querySelectorAll('.stat-card h3');
        statCards[0].textContent = totalTasks;
        statCards[1].textContent = claimedTasks;
        statCards[2].textContent = unclaimedTasks;
    }

    // Update stats initially and after task changes
    updateStats();
    
    // Listen for task changes to update stats
    const observer = new MutationObserver(updateStats);
    document.querySelector('.tasks-grid').addEventListener('click', function() {
        setTimeout(updateStats, 100);
    });
});
