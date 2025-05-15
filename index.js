import express from "express";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import session from 'express-session';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Enable parsing of form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Session configuration
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true only if using HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    },
    name: 'friendhub.sid' // Custom session ID name
}));

// Initialize users Map if it doesn't exist
if (!global.users) {
    global.users = new Map();
}

// Middleware to check session
app.use((req, res, next) => {
    if (req.session.userId) {
        currentUser = users.get(req.session.userId);
    }
    next();
});

// Firebase configuration
const firebaseConfig = {
    databaseURL: "https://friend-hub-60b27-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

let currentUser = null;

// In-memory storage for posts (replace with database in production)
let posts = [];

// In-memory user storage (replace with database in production)
const users = new Map();

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/');
}

// Post routes
app.post('/create-post', upload.single('image'), (req, res) => {
    console.log('Create post request received:', req.body);
    console.log('File:', req.file);

    if (!currentUser) {
        return res.status(401).json({ error: 'Must be logged in to create posts' });
    }

    const newPost = {
        _id: Date.now().toString(),
        content: req.body.content,
        username: currentUser.username,
        createdAt: new Date().toLocaleString(),
        image: req.file ? `/uploads/${req.file.filename}` : null,
        likes: 0,
        comments: []
    };

    posts.unshift(newPost); // Add to beginning of array
    console.log('New post created:', newPost);
    res.redirect('/home');
});

app.post('/edit-post/:id', (req, res) => {
    console.log('Edit post request received:', req.params.id, req.body);
    
    if (!currentUser) {
        return res.status(401).json({ error: 'Must be logged in to edit posts' });
    }

    const postId = req.params.id;
    const post = posts.find(p => p._id === postId);
    
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    if (post.username !== currentUser.username) {
        return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    if (!req.body.content || req.body.content.trim() === '') {
        return res.status(400).json({ error: 'Post content cannot be empty' });
    }

    post.content = req.body.content.trim();
    console.log('Post updated:', post);
    res.json({ success: true, post: post });
});

app.delete('/delete-post/:id', (req, res) => {
    const postId = req.params.id;
    const postIndex = posts.findIndex(p => p._id === postId);
    
    if (postIndex === -1 || posts[postIndex].username !== currentUser.username) {
        return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    posts.splice(postIndex, 1);
    res.json({ success: true });
});

app.post('/like-post/:id', (req, res) => {
    const postId = req.params.id;
    const post = posts.find(p => p._id === postId);
    
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    post.likes += 1;
    res.json({ likes: post.likes });
});

app.post('/comment-post/:id', (req, res) => {
    if (!currentUser) {
        return res.status(401).json({ error: 'Must be logged in to comment' });
    }

    const postId = req.params.id;
    const post = posts.find(p => p._id === postId);
    
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    const newComment = {
        username: currentUser.username,
        content: req.body.comment,
        createdAt: new Date().toLocaleString()
    };

    post.comments.push(newComment);
    res.json({ comment: newComment });
});

// Profile picture update route
app.post('/update-profile-pic', upload.single('profilePic'), (req, res) => {
    if (!currentUser) {
        return res.status(401).json({ error: 'Must be logged in to update profile picture' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Update the user's profile picture path
    currentUser.profilePic = `/uploads/${req.file.filename}`;

    // Send back the new profile picture path
    res.json({
        success: true,
        profilePic: currentUser.profilePic
    });
});

// Routes
app.get('/', (req, res) => {
    res.render('login.ejs');
});

app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);
    console.log('Stored users:', Array.from(users.keys()));
    
    const user = users.get(username);
    if (!user) {
        console.log('User not found');
        return res.status(401).render('login.ejs', { error: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', validPassword);
    
    if (!validPassword) {
        console.log('Invalid password');
        return res.status(401).render('login.ejs', { error: 'Invalid username or password' });
    }

    req.session.userId = username;
    currentUser = user;
    console.log('Login successful for user:', username);
    res.redirect('/home');
});

// Signup route
app.post('/signup', async (req, res) => {
    console.log('Signup request received:', req.body);
    const { username, email, password, confirm_password } = req.body;

    if (!username || !email || !password || !confirm_password) {
        console.log('Missing required fields');
        return res.status(400).render('signup.ejs', { error: 'All fields are required' });
    }

    if (password !== confirm_password) {
        console.log('Passwords do not match');
        return res.status(400).render('signup.ejs', { error: 'Passwords do not match' });
    }

    if (users.has(username)) {
        console.log('Username already exists:', username);
        return res.status(400).render('signup.ejs', { error: 'Username already exists' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            username,
            email,
            password: hashedPassword,
            profilePic: '/assets/usericon.png'  // Default profile picture
        };

        users.set(username, user);
        console.log('New user created:', username);
        console.log('Current users:', Array.from(users.keys()));

        req.session.userId = username;
        currentUser = user;
        res.redirect('/home');
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).render('signup.ejs', { error: 'An error occurred during signup' });
    }
});

// Protect routes that require authentication
app.get('/home', isAuthenticated, (req, res) => {
    res.render('home.ejs', { user: currentUser, posts: posts });
});

app.get('/profile', isAuthenticated, (req, res) => {
    res.render('profile.ejs', { user: currentUser });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    currentUser = null;
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

