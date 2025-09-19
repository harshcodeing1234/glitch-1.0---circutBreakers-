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
        
        // Auto-refresh notifications every 5 minutes
        setInterval(() => this.loadNotifications(), 300000);
    }

    async loadNotifications() {
        try {
            const response = await fetch(`/api/notifications/${this.userId}`);
            this.notifications = await response.json();
            this.updateBadge();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    updateBadge() {
        const badge = document.querySelector('.notifications .badge');
        if (badge) {
            badge.textContent = this.notifications.length;
            badge.style.display = this.notifications.length > 0 ? 'block' : 'none';
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
            alert('No new notifications');
            return;
        }

        const messages = this.notifications.map(n => n.message).join('\n\n');
        alert(`Notifications:\n\n${messages}`);
    }
}

// Auto-initialize notification system when user is authenticated
document.addEventListener('DOMContentLoaded', function() {
    const userData = localStorage.getItem('user');
    if (userData) {
        const user = JSON.parse(userData);
        window.notificationSystem = new NotificationSystem(user.id);
    }
});
