const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/todo-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Define Task schema
const taskSchema = new mongoose.Schema({
  username: { type: String, required: true },
  task: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));
app.use(express.static('public'));

// Routes
// Home / landing
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

// Login page (GET)
app.get('/login', (req, res) => {
  if (req.session.loggedIn) {
    return res.redirect('/app');
  }
  res.sendFile(__dirname + '/public/login.html');
});

// Authenticated app page
app.get('/app', (req, res) => {
  if (req.session.loggedIn) {
    return res.sendFile(__dirname + '/public/index.html');
  }
  res.redirect('/login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && user.password === password) {
      req.session.loggedIn = true;
      req.session.username = username;
      res.redirect('/app');
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Handle signup
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send('Username already exists');
    }

    // Store new user
    const newUser = new User({ username, password });
    await newUser.save();

    // Auto-login after signup
    req.session.loggedIn = true;
    req.session.username = username;

    res.redirect('/app');
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    // ignore errors destroying session for this simple app
    res.redirect('/');
  });
});

app.get('/tasks', async (req, res) => {
  if (req.session.loggedIn) {
    try {
      const tasks = await Task.find({ username: req.session.username }).sort({ createdAt: 1 });
      res.json(tasks.map(t => t.task));
    } catch (err) {
      res.status(500).send('Server error');
    }
  } else {
    res.status(401).send('Unauthorized');
  }
});

app.post('/tasks', async (req, res) => {
  if (req.session.loggedIn) {
    const { task } = req.body;
    try {
      const newTask = new Task({ username: req.session.username, task });
      await newTask.save();
      res.json({ success: true });
    } catch (err) {
      res.status(500).send('Server error');
    }
  } else {
    res.status(401).send('Unauthorized');
  }
});

app.delete('/tasks/:index', async (req, res) => {
  if (req.session.loggedIn) {
    const index = parseInt(req.params.index);
    try {
      const tasks = await Task.find({ username: req.session.username }).sort({ createdAt: 1 });
      if (tasks[index]) {
        await Task.findByIdAndDelete(tasks[index]._id);
        res.json({ success: true });
      } else {
        res.status(404).send('Task not found');
      }
    } catch (err) {
      res.status(500).send('Server error');
    }
  } else {
    res.status(401).send('Unauthorized');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
