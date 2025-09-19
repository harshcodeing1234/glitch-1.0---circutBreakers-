const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files FIRST (CSS, JS, images)
app.use(express.static('public'));

// THEN serve HTML pages explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize SQLite database
const db = new sqlite3.Database('./tasks.db');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // User settings table
  db.run(`CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    email_notifications BOOLEAN DEFAULT 1,
    push_notifications BOOLEAN DEFAULT 0,
    task_reminders BOOLEAN DEFAULT 1,
    compact_mode BOOLEAN DEFAULT 0,
    theme TEXT DEFAULT 'light',
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL,
    due_date TEXT NOT NULL,
    category TEXT,
    claimed_by TEXT,
    claimed_by_id INTEGER,
    status TEXT DEFAULT 'unclaimed'
  )`);

  // Insert sample tasks if table is empty
  db.get("SELECT COUNT(*) as count FROM tasks", (err, row) => {
    if (row.count === 0) {
      const tasks = [
        ['Frontend Development', 'Build responsive user interface with React components', 'high', 'Oct 15'],
        ['API Integration', 'Connect frontend to backend services with proper error handling', 'medium', 'Oct 18'],
        ['Database Design', 'Design and implement database schema with proper relationships', 'high', 'Oct 12'],
        ['Testing & QA', 'Write comprehensive tests and perform quality assurance', 'low', 'Oct 25'],
        ['Documentation', 'Create user guides and technical documentation', 'medium', 'Oct 30'],
        ['Deployment Setup', 'Configure CI/CD pipeline and production environment', 'high', 'Nov 5']
      ];

      const stmt = db.prepare("INSERT INTO tasks (title, description, priority, due_date) VALUES (?, ?, ?, ?)");
      tasks.forEach(task => stmt.run(task));
      stmt.finalize();
    }
  });
});

// Auth Routes
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  
  db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, password], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    const user = { id: this.lastID, name, email };
    res.json({ user, message: 'Registration successful' });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get("SELECT * FROM users WHERE email = ? AND password = ?", [email.trim(), password.trim()], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = { id: row.id, name: row.name, email: row.email };
    res.json({ user, message: 'Login successful' });
  });
});

app.get('/api/users', (req, res) => {
  db.all("SELECT id, name, email FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  // First, unclaim all tasks assigned to this user
  db.run("UPDATE tasks SET claimed_by = NULL, claimed_by_id = NULL, status = 'unclaimed' WHERE claimed_by_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Delete user settings
    db.run("DELETE FROM user_settings WHERE user_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Then delete the user
      db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'User deleted successfully' });
      });
    });
  });
});

// Settings Routes
app.get('/api/users/:id/settings', (req, res) => {
  const { id } = req.params;
  
  db.get("SELECT * FROM user_settings WHERE user_id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!row) {
      // Create default settings if none exist
      const defaultSettings = {
        email_notifications: 1,
        push_notifications: 0,
        task_reminders: 1,
        compact_mode: 0,
        theme: 'light'
      };
      
      db.run("INSERT INTO user_settings (user_id, email_notifications, push_notifications, task_reminders, compact_mode, theme) VALUES (?, ?, ?, ?, ?, ?)",
        [id, defaultSettings.email_notifications, defaultSettings.push_notifications, defaultSettings.task_reminders, defaultSettings.compact_mode, defaultSettings.theme],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json(defaultSettings);
        });
    } else {
      res.json(row);
    }
  });
});

app.put('/api/users/:id/settings', (req, res) => {
  const { id } = req.params;
  const { email_notifications, push_notifications, task_reminders, compact_mode, theme } = req.body;
  
  db.run(`INSERT OR REPLACE INTO user_settings 
    (user_id, email_notifications, push_notifications, task_reminders, compact_mode, theme) 
    VALUES (?, ?, ?, ?, ?, ?)`,
    [id, email_notifications, push_notifications, task_reminders, compact_mode, theme],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Settings updated successfully' });
    });
});

app.put('/api/users/:id/profile', (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  
  db.run("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Profile updated successfully' });
  });
});

app.put('/api/users/:id/password', (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;
  
  // Verify current password
  db.get("SELECT password FROM users WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!row || row.password !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    db.run("UPDATE users SET password = ? WHERE id = ?", [newPassword, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Password updated successfully' });
    });
  });
});

app.get('/api/users/:id/export', (req, res) => {
  const { id } = req.params;
  
  // Get user data
  db.get("SELECT id, name, email FROM users WHERE id = ?", [id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Get user tasks
    db.all("SELECT * FROM tasks WHERE claimed_by_id = ?", [id], (err, tasks) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get user settings
      db.get("SELECT * FROM user_settings WHERE user_id = ?", [id], (err, settings) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const exportData = {
          user,
          tasks,
          settings,
          exportDate: new Date().toISOString()
        };
        
        res.json(exportData);
      });
    });
  });
});

// Dashboard Analytics API
app.get('/api/dashboard/stats', (req, res) => {
  const queries = {
    totalTasks: "SELECT COUNT(*) as count FROM tasks",
    claimedTasks: "SELECT COUNT(*) as count FROM tasks WHERE status = 'claimed'",
    unclaimedTasks: "SELECT COUNT(*) as count FROM tasks WHERE status = 'unclaimed'",
    totalUsers: "SELECT COUNT(*) as count FROM users",
    highPriorityTasks: "SELECT COUNT(*) as count FROM tasks WHERE priority = 'high'",
    recentTasks: "SELECT * FROM tasks ORDER BY id DESC LIMIT 6"
  };

  const stats = {};
  let completed = 0;
  let responseSent = false;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    if (key === 'recentTasks') {
      db.all(query, (err, rows) => {
        if (err && !responseSent) {
          responseSent = true;
          return res.status(500).json({ error: err.message });
        }
        if (!responseSent) {
          stats[key] = rows;
          completed++;
          if (completed === total) {
            responseSent = true;
            res.json(stats);
          }
        }
      });
    } else {
      db.get(query, (err, row) => {
        if (err && !responseSent) {
          responseSent = true;
          return res.status(500).json({ error: err.message });
        }
        if (!responseSent) {
          stats[key] = row.count;
          completed++;
          if (completed === total) {
            responseSent = true;
            res.json(stats);
          }
        }
      });
    }
  });
});

app.get('/api/dashboard/user-stats/:id', (req, res) => {
  const { id } = req.params;
  
  const queries = {
    myTasks: "SELECT COUNT(*) as count FROM tasks WHERE claimed_by_id = ?",
    myHighPriority: "SELECT COUNT(*) as count FROM tasks WHERE claimed_by_id = ? AND priority = 'high'",
    myRecentTasks: "SELECT * FROM tasks WHERE claimed_by_id = ? ORDER BY id DESC LIMIT 3"
  };

  const stats = {};
  let completed = 0;
  let responseSent = false;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    if (key === 'myRecentTasks') {
      db.all(query, [id], (err, rows) => {
        if (err && !responseSent) {
          responseSent = true;
          return res.status(500).json({ error: err.message });
        }
        if (!responseSent) {
          stats[key] = rows;
          completed++;
          if (completed === total) {
            responseSent = true;
            res.json(stats);
          }
        }
      });
    } else {
      db.get(query, [id], (err, row) => {
        if (err && !responseSent) {
          responseSent = true;
          return res.status(500).json({ error: err.message });
        }
        if (!responseSent) {
          stats[key] = row.count;
          completed++;
          if (completed === total) {
            responseSent = true;
            res.json(stats);
          }
        }
      });
    }
  });
});

// Analytics API
app.get('/api/analytics/overview', (req, res) => {
  const queries = {
    tasksByStatus: `
      SELECT status, COUNT(*) as count 
      FROM tasks 
      GROUP BY status
    `,
    tasksByPriority: `
      SELECT priority, COUNT(*) as count 
      FROM tasks 
      GROUP BY priority
    `,
    tasksByCategory: `
      SELECT COALESCE(category, 'Other') as category, COUNT(*) as count 
      FROM tasks 
      GROUP BY category
    `,
    teamPerformance: `
      SELECT claimed_by as name, COUNT(*) as count 
      FROM tasks 
      WHERE claimed_by IS NOT NULL 
      GROUP BY claimed_by
    `,
    totalStats: `
      SELECT 
        COUNT(*) as totalTasks,
        COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimedTasks,
        COUNT(DISTINCT claimed_by_id) as activeMembers,
        (SELECT COUNT(*) FROM users) as totalMembers
      FROM tasks
    `
  };

  const analytics = {};
  let completed = 0;
  let responseSent = false;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    if (key === 'totalStats') {
      db.get(query, (err, row) => {
        if (err && !responseSent) {
          responseSent = true;
          return res.status(500).json({ error: err.message });
        }
        if (!responseSent) {
          analytics[key] = row;
          completed++;
          if (completed === total) {
            responseSent = true;
            res.json(analytics);
          }
        }
      });
    } else {
      db.all(query, (err, rows) => {
        if (err && !responseSent) {
          responseSent = true;
          return res.status(500).json({ error: err.message });
        }
        if (!responseSent) {
          analytics[key] = rows;
          completed++;
          if (completed === total) {
            responseSent = true;
            res.json(analytics);
          }
        }
      });
    }
  });
});

// Team API enhancements
app.get('/api/team/overview', (req, res) => {
  const query = `
    SELECT 
      u.id, u.name, u.email,
      COUNT(t.id) as taskCount,
      COUNT(CASE WHEN t.priority = 'high' THEN 1 END) as highPriorityCount
    FROM users u
    LEFT JOIN tasks t ON u.id = t.claimed_by_id
    GROUP BY u.id, u.name, u.email
    ORDER BY taskCount DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Notification system
app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  
  // Get tasks due soon for the user
  const query = `
    SELECT title, due_date, priority, status
    FROM tasks 
    WHERE claimed_by_id = ? 
    AND date(due_date) <= date('now', '+7 days')
    ORDER BY due_date ASC
  `;
  
  db.all(query, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const notifications = [];
    
    // Add task deadline notifications
    rows.forEach(task => {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        notifications.push({
          type: 'urgent',
          message: `⚠️ Task "${task.title}" is due ${diffDays === 0 ? 'today' : 'tomorrow'}!`,
          priority: 'high'
        });
      } else if (diffDays <= 3) {
        notifications.push({
          type: 'reminder',
          message: `📅 Task "${task.title}" is due in ${diffDays} days`,
          priority: 'medium'
        });
      }
    });
    
    // Add general notifications for all users
    notifications.push({
      type: 'info',
      message: '👋 Welcome to Group project task claimer!',
      priority: 'low'
    });
    
    if (rows.length === 0) {
      notifications.push({
        type: 'suggestion',
        message: '💡 Claim some tasks to get started!',
        priority: 'low'
      });
    }
    
    res.json(notifications);
  });
});

// Task Routes
app.get('/api/tasks', (req, res) => {
  db.all("SELECT * FROM tasks ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tasks', (req, res) => {
  const { title, description, priority, due_date, category } = req.body;
  
  db.run("INSERT INTO tasks (title, description, priority, due_date, category) VALUES (?, ?, ?, ?, ?)", 
    [title, description, priority, due_date, category || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Task created successfully' });
  });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, priority, due_date, category } = req.body;
  
  db.run("UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ?, category = ? WHERE id = ?", 
    [title, description, priority, due_date, category || null, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Task updated successfully' });
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM tasks WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Task deleted successfully' });
  });
});

app.post('/api/tasks/:id/claim', (req, res) => {
  const { id } = req.params;
  const { name, userId } = req.body;
  
  db.run("UPDATE tasks SET claimed_by = ?, claimed_by_id = ?, status = 'claimed' WHERE id = ?", [name, userId, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/tasks/:id/unclaim', (req, res) => {
  const { id } = req.params;
  
  db.run("UPDATE tasks SET claimed_by = NULL, claimed_by_id = NULL, status = 'unclaimed' WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
