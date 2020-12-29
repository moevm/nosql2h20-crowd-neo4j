const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('./routes');

const server = express();

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));

server.use('/', routes);
//server.use('/data', express.static(path.join(process.cwd(), "/data")));

server.use('/css', express.static('css'));
server.use('/js', express.static('src/js'));
server.set('view engine', 'pug');
server.set('views', './src/pug');

const app = server.listen(3000, ()=>{
    console.log("HTTP server started at http://localhost:3000");
});
