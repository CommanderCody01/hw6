import express from 'express';

const app = express();

app.get('/', function(req, res){
	res.send('hello');
});

app.listen(10002);
console.log('Started server on port 10002');
