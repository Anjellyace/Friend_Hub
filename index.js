import express from "express";
import { dirname} from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import path from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

// Firebase configuration                                                                                                                              
const firebaseConfig = {
    databaseURL: "https://friend-hub-60b27-default-rtdb.asia-southeast1.firebasedatabase.app/", // <-- change this to yours
};

import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set, update, remove, onValue } from "firebase/database";

let isAuthenticated = true; // Temporarily set to true for testing API

function checkPassword(req, res, next) {
    console.log(req.body.password);
    if (req.body.password === 'pleasework') {
        isAuthenticated = true;
    } else {
        isAuthenticated = false;
    }
    next();
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Global request logger middleware
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.path}`);
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public/uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('login.ejs');
});

app.post('/signup', (req, res) => {
    res.render('signup.ejs');
});

app.post('/home', [checkPassword], (req, res) => {
    if (!isAuthenticated) {
        return res.status(401).send('Unauthorized');
    }
    res.render('home.ejs');
});

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// API to get all posts
app.get('/posts', (req, res) => {
    const postsRef = ref(database, 'posts');
    onValue(postsRef, (snapshot) => {
        const data = snapshot.val();
        res.json(data || {});
    }, {
        onlyOnce: true
    });
});

// API to create a new post with file upload
app.post('/posts', upload.single('attachment'), (req, res) => {
    console.log('POST /posts body:', req.body);
    console.log('POST /posts file:', req.file);
    if (!isAuthenticated) {
        return res.status(401).send('Unauthorized');
    }
    const postsRef = ref(database, 'posts');
    const newPostRef = push(postsRef);

    let attachmentUrl = null;
    let attachmentType = null;
    if (req.file) {
        attachmentUrl = '/uploads/' + req.file.filename;
        attachmentType = req.file.mimetype;
    }

    const postData = {
        content: req.body.content,
        user: req.body.user || 'Anonymous',
        userPicture: req.body.userPicture || '/default-user.png',
        timestamp: Date.now(),
        attachmentUrl: attachmentUrl,
        attachmentType: attachmentType
    };
    set(newPostRef, postData)
        .then(() => {
            console.log('Post created with id:', newPostRef.key);
            res.status(201).json({ id: newPostRef.key, ...postData });
        })
        .catch((error) => {
            console.error('Error creating post:', error);
            res.status(500).json({ error: error.message });
        });
});

// API to update a post
app.put('/posts/:id', (req, res) => {
    if (!isAuthenticated) {
        return res.status(401).send('Unauthorized');
    }
    const postId = req.params.id;
    const postRef = ref(database, `posts/${postId}`);
    const updatedData = {
        content: req.body.content,
        timestamp: Date.now()
    };
    update(postRef, updatedData)
        .then(() => res.json({ id: postId, ...updatedData }))
        .catch((error) => res.status(500).json({ error: error.message }));
});

// API to delete a post
app.delete('/posts/:id', (req, res) => {
    if (!isAuthenticated) {
        return res.status(401).send('Unauthorized');
    }
    const postId = req.params.id;
    const postRef = ref(database, `posts/${postId}`);
    remove(postRef)
        .then(() => res.json({ id: postId }))
        .catch((error) => res.status(500).json({ error: error.message }));
});

// API to get comments for a post
app.get('/posts/:id/comments', (req, res) => {
    const postId = req.params.id;
    const commentsRef = ref(database, `comments/${postId}`);
    onValue(commentsRef, (snapshot) => {
        const data = snapshot.val();
        res.json(data || {});
    }, {
        onlyOnce: true
    });
});

// API to add a comment to a post
app.post('/posts/:id/comments', (req, res) => {
    if (!isAuthenticated) {
        return res.status(401).send('Unauthorized');
    }
    const postId = req.params.id;
    const commentsRef = ref(database, `comments/${postId}`);
    const newCommentRef = push(commentsRef);
    const commentData = {
        content: req.body.content,
        user: req.body.user || 'Anonymous',
        userPicture: req.body.userPicture || '/default-user.png',
        timestamp: Date.now()
    };
    set(newCommentRef, commentData)
        .then(() => {
            res.status(201).json({ id: newCommentRef.key, ...commentData });
        })
        .catch((error) => {
            res.status(500).json({ error: error.message });
        });
});

// API to update a comment
app.put('/posts/:postId/comments/:commentId', (req, res) => {
    if (!isAuthenticated) {
        return res.status(401).send('Unauthorized');
    }
    const { postId, commentId } = req.params;
    const commentRef = ref(database, `comments/${postId}/${commentId}`);
    const updatedData = {
        content: req.body.content,
        timestamp: Date.now()
    };
    update(commentRef, updatedData)
        .then(() => res.json({ id: commentId, ...updatedData }))
        .catch((error) => res.status(500).json({ error: error.message }));
});

// API to delete a comment
app.delete('/posts/:postId/comments/:commentId', (req, res) => {
    if (!isAuthenticated) {
        return res.status(401).send('Unauthorized');
    }
    const { postId, commentId } = req.params;
    const commentRef = ref(database, `comments/${postId}/${commentId}`);
    remove(commentRef)
        .then(() => res.json({ id: commentId }))
        .catch((error) => res.status(500).json({ error: error.message }));
});

// API to get reactions for a post
app.get('/posts/:id/reactions', (req, res) => {
    const postId = req.params.id;
    const reactionsRef = ref(database, `reactions/${postId}`);
    onValue(reactionsRef, (snapshot) => {
        const data = snapshot.val();
        res.json(data || {});
    }, {
        onlyOnce: true
    });
});

app.post('/posts/:id/reactions', (req, res) => {
    const postId = req.params.id;
    console.log('POST /posts/:id/reactions body:', req.body);
    console.log('isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) {
        return res.status(401).send('Unauthorized');
    }
    const user = req.body.user;
    const reaction = req.body.reaction;
    if (!user || !reaction) {
        return res.status(400).json({ error: 'User and reaction are required' });
    }
    const reactionRef = ref(database, `reactions/${postId}/${user}`);
    set(reactionRef, reaction)
        .then(() => res.status(201).json({ user, reaction }))
        .catch((error) => res.status(500).json({ error: error.message }));
});

// API to remove a reaction for a post
app.delete('/posts/:id/reactions', (req, res) => {
    const postId = req.params.id;
    if (!isAuthenticated) {
        return res.status(401).send('Unauthorized');
    }
    const user = req.body.user;
    if (!user) {
        return res.status(400).json({ error: 'User is required' });
    }
    const reactionRef = ref(database, `reactions/${postId}/${user}`);
    remove(reactionRef)
        .then(() => res.json({ user }))
        .catch((error) => res.status(500).json({ error: error.message }));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
