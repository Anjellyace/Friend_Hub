import express from "express";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import session from 'express-session';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set, get, child } from 'firebase/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDRqAqQbKYopqVEuKuZb0tdosIQ3cb4G08",
    authDomain: "friend-hub-60b27.firebaseapp.com",
    databaseURL: "https://friend-hub-60b27-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "friend-hub-60b27",
    storageBucket: "friend-hub-60b27.appspot.com",
    messagingSenderId: "1098979553777",
    appId: "1:1098979553777:web:aa0d1bae04cae1d5f9f0b9"
};

// Initialize Firebase with error handling
let auth;
let database;

try {
    console.log('Initializing Firebase with config:', { ...firebaseConfig, apiKey: 'HIDDEN' });
    const firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    database = getDatabase(firebaseApp);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

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
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    },
    name: 'friendhub.sid'
}));

// Initialize users Map if it doesn't exist
if (!global.users) {
    global.users = new Map();
}

// Middleware to check session
app.use((req, res, next) => {
    console.log('Session middleware - Session ID:', req.session.id);
    console.log('Session middleware - User ID:', req.session.userId);
    
    if (req.session.userId) {
        // Get user data from Firebase
        const userRef = ref(database, 'users/' + req.session.userId);
        get(userRef).then(snapshot => {
            if (snapshot.exists()) {
                currentUser = snapshot.val();
                console.log('Session middleware - Current user loaded:', currentUser.username);
            } else {
                console.log('Session middleware - User data not found in database');
                currentUser = null;
            }
            next();
        }).catch(error => {
            console.error('Session middleware - Error loading user:', error);
            currentUser = null;
            next();
        });
    } else {
        currentUser = null;
        next();
    }
});

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
    console.log('Current user:', currentUser);
    console.log('Current posts array length:', posts.length);

    if (!currentUser) {
        console.log('No current user found');
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
    console.log('Updated posts array length:', posts.length);
    console.log('All posts:', posts);
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
    
    try {
        // Get user data from Firebase Database
        const userRef = ref(database, 'users/' + username);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
            console.log('User not found in database');
            return res.status(401).render('login.ejs', { error: 'Invalid username or password' });
        }

        const userData = snapshot.val();
        console.log('User found:', { username: userData.username, email: userData.email });

        // Verify password
        const validPassword = await bcrypt.compare(password, userData.password);
        console.log('Password validation result:', validPassword);
        
        if (!validPassword) {
            console.log('Invalid password');
            return res.status(401).render('login.ejs', { error: 'Invalid username or password' });
        }

        try {
            // Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
            console.log('Firebase Auth successful:', userCredential.user.uid);

            // Set session and current user
            req.session.userId = username;
            currentUser = userData;
            
            console.log('Session data set:', {
                sessionId: req.session.id,
                userId: req.session.userId,
                currentUser: currentUser.username
            });

            // Save session explicitly
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).render('login.ejs', { error: 'Session error occurred' });
                }
                console.log('Session saved successfully, redirecting to /home');
                return res.redirect('/home');
            });
        } catch (authError) {
            console.error('Firebase Auth error:', authError);
            return res.status(401).render('login.ejs', { error: 'Authentication failed' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).render('login.ejs', { error: 'Login failed. Please try again.' });
    }
});

// Signup route
app.post('/signup', async (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    if (!username || !email || !password || !confirm_password) {
        return res.status(400).render('signup.ejs', { error: 'All fields are required' });
    }

    if (password !== confirm_password) {
        return res.status(400).render('signup.ejs', { error: 'Passwords do not match' });
    }

    try {
        // Check if username exists in Firebase Database
        const userRef = ref(database, 'users/' + username);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            return res.status(400).render('signup.ejs', { error: 'Username already exists' });
        }

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Hash password for database storage
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user data object
        const userData = {
            username,
            email,
            password: hashedPassword,
            profilePic: '/assets/usericon.png',
            uid: user.uid,
            createdAt: new Date().toISOString()
        };

        // Save user data to Firebase Database
        await set(ref(database, 'users/' + username), userData);

        // Set current user and session
        currentUser = userData;
        req.session.userId = username;
        
        console.log('User created successfully:', {
            username: userData.username,
            email: userData.email,
            profilePic: userData.profilePic
        });

        res.redirect('/home');
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'An error occurred during signup';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password should be at least 6 characters';
        }
        res.status(500).render('signup.ejs', { error: errorMessage });
    }
});

// Protect routes that require authentication
app.get('/home', isAuthenticated, (req, res) => {
    console.log('Home route - Session ID:', req.session.id);
    console.log('Home route - User ID:', req.session.userId);
    console.log('Home route - Current User:', currentUser);
    console.log('Home route - Number of posts:', posts.length);
    console.log('Home route - All posts:', posts);

    try {
        if (!currentUser) {
            console.log('No current user found, redirecting to login');
            return res.redirect('/');
        }
   
        console.log('Rendering home page with user:', { 
            username: currentUser.username,
            email: currentUser.email
        });
        
        res.render('home.ejs', { 
            user: currentUser,
            posts: posts
        });
    } catch (error) {
        console.error('Error in home route:', error);
        res.redirect('/');
    }
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

