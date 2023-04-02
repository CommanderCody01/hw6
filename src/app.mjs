import express from 'express';
import mongoose from 'mongoose';
import sanitize from 'mongo-sanitize';
import './db.mjs';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import path from 'path';
import url from 'url';
import {startAuthenticatedSession, endAuthenticatedSession} from './auth.mjs';

// ？？？？？
// ??????? 得在 src下run server
// ？？？？？

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();

app.set('view engine', 'hbs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
}));

const Article = mongoose.model('Article');
const User = mongoose.model('User');

const authRequired = (req, res, next) => {
  if(!req.session.user) {
    req.session.redirectPath = req.path;
    res.redirect('/login'); 
  } else {
    next();
  }
};

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

app.get('/', async (req, res) => {
  const articles = await Article.find({}).sort('-createdAt').exec();
  const name = req.session.user;
  // console.log(name);
  // const obj = {user: name, home: true, articles: articles}
  // console.log(obj);
  res.render('index', {user: req.session.user, home: true, articles: articles});
  // res.render('index', obj);
});

app.get('/article/add', authRequired, (req, res) => {
  res.render('article-add');
});

app.post('/article/add', authRequired, async (req, res) => {
  const article = new Article({
    title: sanitize(req.body.title), 
    url: sanitize(req.body.url), 
    description: sanitize(req.body.description),
    user: req.session.user._id
  });

  try {
    await article.save();
    res.redirect('/'); 
  } catch (err) {
    if(err instanceof mongoose.Error.ValidationError) {
      res.render('article-add', {message: err.message});
    } else {
      throw err;
    }
  }
});

// TODO: add a route handler for /article/some-article-title
// use populate to get associated user


// GET /article/777
app.get(/^\/article\/.*/, async(req, res)=>{
  // console.log(req.params);
  const slug = req.url.split('/article/')[1];
  // console.log(slug);
  const article = await Article.findOne({slug: slug});
  const user = await User.findOne({_id: article.user});
  article.user.username = user.username;
  res.render('article-detail', {'article': article});

});



app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const username = sanitize(req.body.username);
  const password = sanitize(req.body.password);
  const email = sanitize(req.body.email);

  try {
    // TODO: finish implementation
    const existingUser = await User.findOne({username}).exec();
    if(existingUser){
      // console.log(6666666);
      res.render('register', {message: "could not register"});
    }
    else{
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      const user = new User({
        username: username,
        password: hash,
        email: email
      })
      const savedUser = await user.save();
      // req.session.user = username;
      // console.log(req.session.user);
      await startAuthenticatedSession(req, savedUser);
      res.redirect("/");
    }

  } catch (err) {
    if(err instanceof mongoose.Error.ValidationError) {
      res.render('register', {message: err.message});
    } else {
      throw err;
    }
  }
});
        
app.post('/logout', async (req, res) => {
  await endAuthenticatedSession(req);
  res.redirect('/');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
  const username = sanitize(req.body.username);
  const password = sanitize(req.body.password);

  try {
    // TODO: finish implementation
    const existingUser = await User.findOne({username}).exec();
    if(existingUser){
      // console.log(password, existingUser.password );
      console.log(bcrypt.compareSync(password , existingUser.password));
      if(bcrypt.compareSync(password , existingUser.password)){
        await startAuthenticatedSession(req, existingUser);
        res.redirect("/");
      }
      else{
        res.render('login', {message: "Wrong password"});
      }

    }else{
      res.render('login', {message: "Did not find user"});
    }


  } catch (err) {
    if(err instanceof mongoose.Error.ValidationError) {
      res.render('login', {message: err.message});
    } else {
      throw err;
    }
  }
});

app.get('/restricted', authRequired, (req, res) => {
  let message = '<span class="error">this page is not 4 u (plz <a href="login">login</a> first)</span>';
  if(req.session.user) {
      message = '<span class="success">you are logged in, so you can see secret stuff</span>';
      res.render('restricted', {message: message});
  } else {
      res.redirect('login'); 
  } 
});

app.listen(3000);
