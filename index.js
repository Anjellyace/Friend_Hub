import express from "express";
import { dirname} from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

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
    res.render('index.ejs');
});

app.post('/submit', [checkPassword], (req, res) => {
    const data = { name: req.body.password };
    res.render('submitted.ejs');
});

app.listen(port, (req, res) => {
    console.log(`Server is running on port ${port}`);

})