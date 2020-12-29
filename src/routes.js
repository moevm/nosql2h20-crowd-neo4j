const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const neo4j = require('neo4j-driver');

console.log(__dirname)

const multer = require('multer')
const storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, '/import');
    },
    filename: function(req, file, callback) {
        callback(null, file.originalname);
    }
})
const upload = multer({
    storage: storage
});

const url = 'bolt://neo4j:7687';
const driver = neo4j.driver(url);

const session = driver.session();

const upload_folder = 'data';
var auth = false;
var auth_id;
var buf = [];

async function import_db() {
        await session.run(
            'USING PERIODIC COMMIT\n' +
            'LOAD CSV WITH HEADERS FROM \'file:///users.csv\' AS row\n' +
            'MERGE (:User {userId: row.userId, user_name: row.user_name, password: row.password, rating: row.rating});'
        )
        await session.run(
            'USING PERIODIC COMMIT\n' +
            'LOAD CSV WITH HEADERS FROM \'file:///solutions.csv\' AS row\n' +
            'MERGE (:Solution {solutionId: row.solutionId, solution_text: row.solution_text, status: row.status});'
        )
        await session.run(
            'USING PERIODIC COMMIT\n' +
            'LOAD CSV WITH HEADERS FROM \'file:///tasks.csv\' AS row\n' +
            'MERGE (:Task {taskId: row.taskId, userId: row.userId, task_name: row.task_name, description: row.description, like_count: row.like_count, task_status: row.task_status});'
        )
        await session.run(
            'USING PERIODIC COMMIT\n' +
            'LOAD CSV WITH HEADERS FROM \'file:///comments.csv\' AS row\n' +
            'MERGE (:Comment {commentId: row.commentId, comment_text: row.comment_text});'
        )
        await session.run(
            'USING PERIODIC COMMIT\n' +
            'LOAD CSV WITH HEADERS FROM \'file:///tasks.csv\' AS row\n' +
            'MATCH (user:User {userId: row.userId})\n' +
            'MATCH (task:Task {taskId: row.taskId})\n' +
            'MERGE (user)-[:ADD_A_TASK]->(task);'
        )
        await session.run(
            'USING PERIODIC COMMIT\n' +
            'LOAD CSV WITH HEADERS FROM \'file:///write_a_solution.csv\' AS row\n' +
            'MATCH (user:User {userId: row.userId})\n' +
            'MATCH (solution:Solution {solutionId: row.solutionId})\n' +
            'MERGE (user)-[:WRITE_A_SOLUTION{taskId: row.taskId}]->(solution);'
        )
        await session.run(
            'USING PERIODIC COMMIT\n' +
            'LOAD CSV WITH HEADERS FROM \'file:///write_a_comment.csv\' AS row\n' +
            'MATCH (user:User {userId: row.userId})\n' +
            'MATCH (comment:Comment {commentId: row.commentId})\n' +
            'MERGE (user)-[:WRITE_A_COMMENT{taskId: row.taskId}]->(comment);'
        )
}

router.get('/', (req, res, next)=>{
    if(auth)
        res.render('tasks');
    else
        res.render('authorise');
});

async function authorise(_name, _password){
    let result = await session.run(
        'MATCH (n:User {user_name: $name, password: $pass}) RETURN n;', {name: _name, pass: _password}
    )
    auth = result.records.length !== 0;
    if(auth)
        auth_id = result.records[0].get(0).properties.userId;
}

router.post('/authorise', (req, res, next)=>{
    let obj = req.body;
    authorise(obj['user_name'], obj['password']).then(() => {
        res.redirect('/');
    });
});

router.get('/register', (req, res, next)=>{
    res.render('register');
});

async function register(_name, _password){
    let result = await session.run(
        'MATCH (n:User {user_name: $name}) RETURN n;', {name: _name}
    )
    if(result.records.length === 0){
        result = await session.run('MATCH (n:User) RETURN n.userId;');
        let maxId = 0;
        for(let i = 0; i < result.records.length; i++)
            if(result.records[i].get(0) > maxId)
                maxId = result.records[i].get(0);
        maxId++;
        let par = {userId: maxId, name: _name, pass: _password, rating: '0'}
        await session.run(
            'MERGE (:User {userId: $userId, user_name: $name, password: $pass, rating: $rating});', par
        )
        auth = true;
        auth_id = maxId;
    }
}

router.post('/register', (req, res, next)=>{
    let obj = req.body;
    if(obj['password'] !== obj['password_rep'])
        res.render('register', {note_pass: "Пароли должны совпадать"});
    else{
        register(obj['user_name'], obj['password']).then(() => {
            if(auth)
                res.redirect('/');
            else
                res.render('register', {note_login: "Такой пользователь уже существует"});
        });
    }
});

router.get('/import', (req, res, next)=>{
    import_db().then(() => {res.redirect('/')});
});

async function all_task_list(filter, my_task){
    if(filter['status_filter'] === undefined){
        let result = await session.run('MATCH (n:Task) RETURN n;')
        buf = [];
        for(let i = 0; i < result.records.length; i++){
            let properties = result.records[i].get(0).properties;
            if(!my_task || auth_id === properties.userId)
                buf[i] = {
                    "my_task": properties.userId === auth_id,
                    "task_name": properties.task_name,
                    "description": properties.description,
                    "like_count": properties.like_count,
                    "task_status": properties.task_status
                }
        }
    }
    else{
        buf = [];
        let counter = 0;
        let keys = Object.keys(filter['status_filter']);
        for (const task_status of keys) {
            let ch = filter['status_filter'][task_status];
            if(ch === 'true'){
                let result = await session.run(
                    'MATCH (n:Task {task_status: $task_status}) RETURN n;', {task_status: task_status}
                )
                for(let i = 0; i < result.records.length; i++){
                    let properties = result.records[i].get(0).properties;
                    if((!my_task || auth_id === properties.userId) && (filter['search_request'] === '' || properties.task_name.indexOf(filter['search_request'], 0) !== -1))
                        buf[counter++] = {
                            "my_task": properties.userId === auth_id,
                            "task_name": properties.task_name,
                            "description": properties.description,
                            "like_count": properties.like_count,
                            "task_status": properties.task_status
                        }
                }
            }
        }
    }
}

async function sol_by_me_task_list(filter){
    if(filter['status_filter'] === undefined){
        let result = await session.run('MATCH (:User {userId: $userId})-[n:WRITE_A_SOLUTION]->(:Solution) RETURN n;', {userId: auth_id})
        buf = [];
        for(let i = 0; i < result.records.length; i++){
            let taskId = result.records[i].get(0).properties.taskId;
            let my_tasks = await session.run('MATCH (n:Task {taskId: $taskId}) RETURN n;', {taskId: taskId})
            for(let j = 0; j < my_tasks.records.length; j++){
                let properties = result.records[j].get(0).properties;
                buf[j] = {
                    "task_name": properties.task_name,
                    "description": properties.description,
                    "like_count": properties.like_count,
                    "task_status": properties.task_status
                }
            }
        }
    }
    else{
        let result = await session.run('MATCH (:User {userId: $userId})-[n:WRITE_A_SOLUTION]->(:Solution) RETURN n;', {userId: auth_id})
        buf = [];
        let counter = 0;
        let keys = Object.keys(filter['status_filter']);
        for (const task_status of keys) {
            let ch = filter['status_filter'][task_status];
            if(ch === 'true'){
                for(let i = 0; i < result.records.length; i++){
                    let taskId = result.records[i].get(0).properties.taskId;
                    let my_tasks = await session.run(
                        'MATCH (n:Task {taskId: $taskId, task_status: $task_status}) RETURN n;', {taskId: taskId, task_status: task_status}
                    )
                    for(let j = 0; j < my_tasks.records.length; j++){
                        let properties = my_tasks.records[j].get(0).properties;
                        if(filter['search_request'] === '' || properties.task_name.indexOf(filter['search_request'], 0) !== -1)
                            buf[counter++] = {
                                "task_name": properties.task_name,
                                "description": properties.description,
                                "like_count": properties.like_count,
                                "task_status": properties.task_status
                            }
                    }
                }
            }
        }
    }
}

router.get('/all_task_list', (req, res, next)=>{
    let filter = req.query;
    all_task_list(filter, false).then(() => {res.json(buf)})
});

router.get('/sol_by_me_task_list', (req, res, next)=>{
    let filter = req.query;
    sol_by_me_task_list(filter).then(() => {res.json(buf)})
});

router.get('/my_task_list', (req, res, next)=>{
    let filter = req.query;
    all_task_list(filter, true).then(() => {res.json(buf)})
});

async function new_task(task_name, description){
    let exist = false;
    let result = await session.run('MATCH (n:Task) RETURN n;');
    let maxId = 0;
    for(let i = 0; i < result.records.length; i++) {
        let properties = result.records[i].get(0).properties;
        if (properties.task_name === task_name)
            exist = true;
        if (properties.taskId > maxId)
            maxId = properties.taskId;
    }
    if(!exist){
        let par = {taskId: ''+(++maxId), userId: ''+auth_id, task_name: task_name, description: description, like_count: '0', task_status: 'open'}
        await session.run(
            'MERGE (:Task {taskId: $taskId, userId: $userId, task_name: $task_name, description: $description, like_count: $like_count, task_status: $task_status});', par
        )
        await session.run('MATCH (user:User {userId: $userId})\n' +
                                'MATCH (task:Task {taskId: $taskId})\n' +
                                'MERGE (user)-[:ADD_A_TASK]->(task);', {userId: ''+auth_id, taskId: ''+maxId})
    }
}

router.post('/new_task', (req, res, next)=>{
    let obj = req.body;
    new_task(obj['task_name'], obj['description']).then(() => {
        res.redirect('/')
    });
});

async function new_solution(taskId, solution_text){
    let result = await session.run('MATCH (n:Solution) RETURN n.solutionId;');
    let maxId = 0;
    for(let i = 0; i < result.records.length; i++)
        if(result.records[i].get(0) > maxId)
            maxId = result.records[i].get(0);
    let par = {solutionId: ''+(++maxId), solution_text: solution_text, status: 'solved'}
    await session.run('MERGE (:Solution {solutionId: $solutionId, solution_text: $solution_text, status: $status});', par)
    await session.run('MATCH (user:User {userId: $userId})\n' +
                            'MATCH (solution:Solution {solutionId: $solutionId})\n' +
                            'MERGE (user)-[:WRITE_A_SOLUTION{taskId: $taskId}]->(solution);', {userId: ''+auth_id, solutionId: ''+maxId, taskId: ''+taskId})
}

router.post('/new_solution', (req, res, next)=>{
    let obj = req.body;
    new_solution(obj['taskId'], obj['solution_text']).then(() => {
        res.redirect('/concrete_task?name='+obj['task_name'])
    });
});

async function new_comment(taskId, comment_text){
    let result = await session.run('MATCH (n:Comment) RETURN n.commentId;');
    let maxId = 0;
    for(let i = 0; i < result.records.length; i++)
        if(result.records[i].get(0) > maxId)
            maxId = result.records[i].get(0);
    let par = {commentId: ''+(++maxId), comment_text: comment_text}
    await session.run('MERGE (:Comment {commentId: $commentId, comment_text: $comment_text});', par)
    await session.run('MATCH (user:User {userId: $userId})\n' +
                            'MATCH (comment:Comment {commentId: $commentId})\n' +
                            'MERGE (user)-[:WRITE_A_COMMENT{taskId: $taskId}]->(comment);', {userId: ''+auth_id, commentId: ''+maxId, taskId: ''+taskId})
}

router.post('/new_comment', (req, res, next)=>{
    let obj = req.body;
    new_comment(obj['taskId'], obj['comment_text']).then(() => {
        res.redirect('/concrete_task?name='+obj['task_name'])
    });
});

async function get_task_name(task_name){
    let result = await session.run('MATCH (n:Task {task_name: $task_name}) RETURN n;', {task_name: task_name})
    let properties = result.records[0].get(0).properties;
    buf = { userId: properties.userId }
}

router.get('/concrete_task', (req, res, next)=>{
    let obj = req.query;
    if(obj['name'] === undefined)
        res.redirect('/')
    else{
        get_task_name(obj['name']).then(() => {
            if(buf['userId'] === auth_id)
                res.render('my_task', {task_name: obj['name']});
            else{
                res.render('just_task', {task_name: obj['name']});
            }
        })
    }
});

async function get_task(task_name){
    let result = await session.run('MATCH (n:Task {task_name: $task_name}) RETURN n;', {task_name: task_name})
    let properties = result.records[0].get(0).properties;
    buf = { task_status: properties.task_status,
            like_count: properties.like_count,
            description: properties.description,
            taskId: properties.taskId,
            solutions: [],
            comments: []
    };
    result = await session.run('MATCH (n1:User)-[:WRITE_A_SOLUTION {taskId: $taskId}]->(n2:Solution) RETURN n1, n2;', {taskId: buf['taskId']})
    for(let i = 0; i < result.records.length; i++){
        let user_properties = result.records[i].get(0).properties;
        let solution_properties = result.records[i].get(1).properties;
        buf['solutions'][i] = {
            user_name: user_properties.user_name,
            rating: user_properties.rating,
            solution_text: solution_properties.solution_text,
            status: solution_properties.status
        }
    }
    result = await session.run('MATCH (n1:User)-[:WRITE_A_COMMENT {taskId: $taskId}]->(n2:Comment) RETURN n1, n2;', {taskId: buf['taskId']})
    for(let i = 0; i < result.records.length; i++){
        let user_properties = result.records[i].get(0).properties;
        let comment_properties = result.records[i].get(1).properties;
        buf['comments'][i] = {
            user_name: user_properties.user_name,
            rating: user_properties.rating,
            comment_text: comment_properties.comment_text,
        }
    }
}

router.get('/get_task', (req, res, next)=>{
    let obj = req.query;
    get_task(obj['name']).then(() => {res.json(buf)})
});

async function close_task(task_name){
    await session.run('MATCH (n:Task {task_name: $task_name}) SET n.task_status = "close";', {task_name: task_name})
}

router.get('/close_task', (req, res, next)=>{
    let obj = req.query;
    close_task(obj['name']).then(() => {res.json(buf)})
});

async function confirm_solution(solution_text){
    let result = await session.run('MATCH (n:User)-[:WRITE_A_SOLUTION]-(:Solution {solution_text: $solution_text}) RETURN n.rating;', {solution_text: solution_text})
    await session.run('MATCH (n1:User)-[:WRITE_A_SOLUTION]-(n2:Solution {solution_text: $solution_text}) SET n1.rating = $rating, n2.status = \"confirmed\";',
        {rating: ''+(Number.parseInt(result.records[0].get(0))+1), solution_text: solution_text})
}

router.get('/confirm_solution', (req, res, next)=>{
    let obj = req.query;
    confirm_solution(obj['solution_text']).then(() => {res.redirect('/concrete_task?name='+obj['name'])})
});

router.get('/rating', (req, res, next)=>{
    res.render('rating');
});

async function get_rating(){
    buf = [];
    let result = await session.run('MATCH (n:User) RETURN n ORDER BY n.rating DESC');
    for(let i = 0; i < result.records.length; i++){
        let properties = result.records[i].get(0).properties
        buf[i] = { number: '№'+ i,
                   user_name: properties.user_name,
                   rating: properties.rating
        }
    }
}

router.get('/get_rating', (req, res, next)=>{
    get_rating().then(() => {res.json(buf)})
});

router.get('/profile', (req, res, next)=>{
    res.render('profile', {userId: auth_id});
});

async function get_profile(userId){
    let result = await session.run('MATCH (n:User {userId: $userId}) RETURN n;', {userId: userId})
    buf = {
        user_name: result.records[0].get(0).properties.user_name,
        rating: result.records[0].get(0).properties.rating,
        task_list: []
    }
    result = await session.run('MATCH (:User {userId: $userId})-[n:WRITE_A_SOLUTION]->(:Solution) RETURN n;', {userId: userId})
    for(let i = 0; i < result.records.length; i++){
        let taskId = result.records[i].get(0).properties.taskId;
        let my_tasks = await session.run('MATCH (n:Task {taskId: $taskId}) RETURN n;', {taskId: taskId})
        for(let j = 0; j < my_tasks.records.length; j++){
            let properties = my_tasks.records[j].get(0).properties;
            buf['task_list'][j] = {
                "my_task": userId === auth_id,
                "task_name": properties.task_name,
                "description": properties.description,
                "like_count": properties.like_count,
                "task_status": properties.task_status
            }
        }
    }
}

router.get('/get_profile', (req, res, next)=>{
    let obj = req.query;
    get_profile(obj['userId']).then(() => {res.json(buf)})
});

async function search_profile(search_input){
    buf = {};
    let result = await session.run('MATCH (n:User) RETURN n ORDER BY n.user_name');
    for(let i = 0; i < result.records.length; i++){
        let properties = result.records[i].get(0).properties
        if(properties.user_name.indexOf(search_input, 0) !== -1){
            buf = { userId: properties.userId }
            break
        }
    }
}

router.get('/search_profile', (req, res, next)=>{
    let obj = req.query
    search_profile(obj['search_input']).then(() => {
        if(buf['userId'] !== undefined)
            res.render('profile', {userId: buf['userId']})
        else
            res.redirect('/profile')
    })
});

function get_user_status(rating){
    if(rating >= 10)
        return 'thinker'
    if(rating >= 5)
        return 'experienced'
    return 'newbie'
}

async function get_statistics(filter){
    buf = {
        comments_count: 0,
        solutions_count: 0,
        tasks_count: 0,
        like_count: 0
    }
    let user_filter = filter['user_filter']
    let status_filter = filter['status_filter']

    let condition = await session.run('MATCH (n1:User)-[n2:WRITE_A_COMMENT]->(:Comment) RETURN n1.rating, n2.taskId;')
    for(let i = 0; i < condition.records.length; i++){
        let elem = condition.records[i]
        if(user_filter[get_user_status(elem.get(0))] === 'true'){
            let result = await session.run('MATCH (n:Task {taskId: $taskId}) RETURN n.task_status;', {taskId: elem.get(1)})
            if(status_filter[result.records[0].get(0)] === 'true'){
                buf.comments_count++
            }
        }
    }

    condition = await session.run('MATCH (n1:User)-[n2:WRITE_A_SOLUTION]->(:Solution) RETURN n1.rating, n2.taskId;')
    for(let i = 0; i < condition.records.length; i++){
        let elem = condition.records[i]
        if(user_filter[get_user_status(elem.get(0))] === 'true'){
            let result = await session.run('MATCH (n:Task {taskId: $taskId}) RETURN n.task_status;', {taskId: elem.get(1)})
            if(status_filter[result.records[0].get(0)] === 'true'){
                result = await session.run('MATCH (:User {rating: $rating})-[n:WRITE_A_SOLUTION {taskId: $taskId}]->(:Solution) RETURN count(n);', {rating: elem.get(0), taskId: elem.get(1)})
                buf.solutions_count += Number.parseInt(result.records[0].get(0))
            }
        }
    }

    condition = await session.run('MATCH (n1:User)-[:ADD_A_TASK]->(n2:Task) RETURN n1.rating, n2.task_status;')
    for(let i = 0; i < condition.records.length; i++){
        let elem = condition.records[i]
        if(user_filter[get_user_status(elem.get(0))] === 'true' && status_filter[elem.get(1)] === 'true')
            buf.tasks_count++
    }

    condition = await session.run('MATCH (n:Task) RETURN n;')
    for(let i = 0; i < condition.records.length; i++){
        let properties = condition.records[i].get(0).properties
        if(status_filter[properties.task_status] === 'true')
            buf.like_count += Number.parseInt(properties.like_count)
    }
}

router.get('/get_statistics', (req, res, next)=>{
    let filter = req.query
    get_statistics(filter).then(() => {res.json(buf)})
});

async function get_filter(){
    buf = []
    let result = await session.run('MATCH (n:Task) RETURN DISTINCT n.task_status')
    for(let i = 0; i < result.records.length; i++)
        buf[i] = result.records[i].get(0)
}

router.get('/get_filter', (req, res, next)=>{
    get_filter().then(() => {res.json(buf)})
});

router.get('/statistics', (req, res, next)=>{
    res.render('statistics');
});

async function like(task_name){
    let result = await session.run('MATCH (n:Task {task_name: $task_name}) RETURN n.like_count', {task_name: task_name})
    await session.run('MATCH (n:Task {task_name: $task_name}) SET n.like_count = $like_count', {task_name: task_name, like_count: ''+(1+Number.parseInt(result.records[0].get(0)))})
}

router.get('/like', (req, res, next)=>{
    let obj = req.query
    like(obj['name']).then(() => {res.json(obj)})
});

router.get('/storage', (req, res, next)=>{
    res.render('storage');
});

router.post('/authorise', (req, res, next)=>{
    res.render('storage');
});

router.get('/delete_db', (req, res, next)=>{
    delete_db().then(()=>{auth = false; res.redirect('/')})
});

//Запасной вариант
router.post('/upload', upload.array('files', 6), (req, res, next)=>{
    delete_db().then(()=>{import_db().then(() => {res.redirect('/')})})
});

async function export_db(){
    let write_a_solution = [['userId', 'taskId', 'solutionId']]
    let result = await session.run('MATCH (n1:User)-[n2:WRITE_A_SOLUTION]->(n3:Solution) RETURN n1.userId, n2.taskId, n3.solutionId;')
    for(let i = 0; i < result.records.length; i++){
        let r = result.records[i]
        write_a_solution.push([r.get(0), r.get(1), r.get(2)])
    }
    let write_a_comment = [['userId', 'taskId', 'commentId']]
    result = await session.run('MATCH (n1:User)-[n2:WRITE_A_COMMENT]->(n3:Comment) RETURN n1.userId, n2.taskId, n3.commentId;')
    for(let i = 0; i < result.records.length; i++){
        let r = result.records[i]
        write_a_comment.push([r.get(0), r.get(1), r.get(2)])
    }
    let tasks = [['taskId', 'userId', 'task_name', 'description', 'like_count', 'task_status']]
    result = await session.run('MATCH (n:Task) RETURN n;')
    for(let i = 0; i < result.records.length; i++){
        let p = result.records[i].get(0).properties
        tasks.push([p.taskId, p.userId, p.task_name, p.description, p.like_count, p.task_status])
    }
    let solutions = [['solutionId', 'solution_text', 'status']]
    result = await session.run('MATCH (n:Solution) RETURN n;')
    for(let i = 0; i < result.records.length; i++){
        let p = result.records[i].get(0).properties
        solutions.push([p.solutionId, p.solution_text, p.status])
    }
    let comments = [['commentId', 'comment_text']]
    result = await session.run('MATCH (n:Comment) RETURN n;')
    for(let i = 0; i < result.records.length; i++){
        let p = result.records[i].get(0).properties
        comments.push([p.commentId, p.comment_text])
    }
    let users = [['userId', 'user_name', 'password', 'rating']]
    result = await session.run('MATCH (n:User) RETURN n;')
    for(let i = 0; i < result.records.length; i++){
        let p = result.records[i].get(0).properties
        users.push([p.userId, p.user_name, p.password, p.rating])
    }
    buf = {
        write_a_solution,
        write_a_comment,
        tasks,
        solutions,
        comments,
        users
    }
}

async function delete_db(){
    await session.run('MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r')
}



router.get('/exit', (req, res, next)=>{
    auth = false;
    res.redirect('/')
});

router.get('/export', (req, res, next)=>{
    export_db().then(() => {res.json(buf)})
});

router.get('/storage', (req, res, next)=>{
    res.render('storage');
});

module.exports = router;
