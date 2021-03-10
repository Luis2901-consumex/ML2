const express = require('express');
const app = express();
const path = require('path');
const helmet = require('helmet');
const session = require('cookie-session');
const multer = require('multer');
const { validateToken } = require('./middlewares/tokens');
const { MeliObject } = require('./utils');
require('dotenv').config();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './public/pictures'),
  filename: (req, file, cb) => cb(null, Date.now() + file.originalname)
});

const upload = multer({ storage });

const { SYS_PWD } = process.env;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(helmet());
app.use(session({
  name: 'session',
  keys: ['bd7126f457237e4aab0d47124ce4aac2', '9009def68579d15d871a5bf346422839'],
  cookie: {
    httpOnly: true,
    expires: new Date(Date.now() + 60 * 60 * 1000 * 2) // 2 horas
  },
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/posts', validateToken, async (req, res) => {
  try {
    const meliObject = new MeliObject(res.locals.access_token);    
    const user = await meliObject.get('/users/me');
    const items = (await meliObject.get(`/users/${user.id}/items/search`)).results || [];
    if (items.length) {
      const result = [];
      const promises = items.map(item_id => meliObject.get(`/items/${item_id}`));
      for await (item of promises) {
        result.push(item);
      }
      res.render('posts', { items: result });
    } else {
      res.status(404).send('no items were found :(');
    }
  } catch(err) {
    console.log('Something went wrong', err);
    res.status(500).send(`Error! ${err}`);
  }
});

module.exports = app;
