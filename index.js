import express from "express";
import { dirname} from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

// Firebase configuration                                                                                                                              
const firebaseConfig = {
    databaseURL: "https://friend-hub-60b27-default-rtdb.asia-southeast1.firebasedatabase.app/", // <-- change this to yours
};

let isAuthenticated = false;


function checkPassword (req, res, next) {
    console.log(req.body.password);
    if (req.body.password === 'pleasework') {
        isAuthenticated = true;
    } else {
        isAuthenticated = false;
    }
    next ();
}


app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


app.get('/', (req, res) => {
    res.render('login.ejs');
});

app.post('/signup', (req, res) => {
    res.render('signup.ejs');
});

app.post('/home', [checkPassword], (req, res) => {
    const data = { name: req.body.password };
    res.render('home.ejs');
});

app.listen(port, (req, res) => {
    console.log(`Server is running on port ${port}`);

})
