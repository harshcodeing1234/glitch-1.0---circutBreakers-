// Notification system for all pages
class NotificationSystem {
    constructor(userId) {
        this.userId = userId;
        this.notifications = [];
        this.init();
    }

    async init() {
        await this.loadNotifications();
        this.updateBadge();
        this.setupClickHandler();
        
        // Auto-refresh notifications every 30 seconds for testing
        setInterval(() => this.loadNotifications(), 30000);
    }

    async loadNotifications() {
        try {
            const response = await fetch(`/api/notifications/${this.userId}`);
            this.notifications = await response.json();
            this.updateBadge();
        } catch (error) {
            console.error('Error loading notifications:', error);
            // Show default notifications if API fails
            this.notifications = [
                { message: '👋 Welcome to Group project task claimer!', type: 'info' },
                { message: '💡 Click on tasks to claim them!', type: 'tip' }
            ];
            this.updateBadge();
        }
    }

    updateBadge() {
        const badge = document.querySelector('.notifications .badge');
        if (badge) {
            const count = this.notifications.length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
            
            // Change badge color based on urgency
            const hasUrgent = this.notifications.some(n => n.type === 'urgent');
            badge.style.backgroundColor = hasUrgent ? '#ef4444' : '#3b82f6';
        }
    }

    setupClickHandler() {
        const notificationBtn = document.querySelector('.notifications');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => this.showNotifications());
        }
    }

    showNotifications() {
        if (this.notifications.length === 0) {
            alert('No notifications available');
            return;
        }

        const messages = this.notifications.map(n => n.message).join('\n\n');
        alert(`🔔 Notifications:\n\n${messages}`);
        
        // Optional: Mark as read (reduce count)
        // this.markAsRead();
    }

    markAsRead() {
        this.notifications = [];
        this.updateBadge();
    }
}

// Auto-initialize notification system when user is authenticated
document.addEventListener('DOMContentLoaded', function() {
    const userData = localStorage.getItem('user');
    if (userData) {
        const user = JSON.parse(userData);
        window.notificationSystem = new NotificationSystem(user.id);
    } else {
        // Show guest notifications
        const badge = document.querySelector('.notifications .badge');
        if (badge) {
            badge.textContent = '1';
            badge.style.display = 'block';
        }
        
        const notificationBtn = document.querySelector('.notifications');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                alert('🔔 Please login to see personalized notifications!');
            });
        }
    }
});
