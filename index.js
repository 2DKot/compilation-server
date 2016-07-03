var connect = require('connect');
var http = require('http');
var bodyParser = require('body-parser');
var config = require('./config.json');
 
var app = connect().
            use(bodyParser.json()).
            use('/compile', compile);

if (process.env.NODE_ENV === 'development') {
    console.log('development mode');
    var errorHandler = require('errorhandler');
    app.use(errorHandler())
};

http.createServer(app).listen(config.port);
console.log('compilation-server running on port ' + config.port);

var temp = require('temp'),
    fs = require('fs'),
    cp = require('child_process'),
    os = require('os'),
    path = require('path');

function onerror(err, req, res, next) {
    console.log(err);
}

function compile(req, res) {
    console.log('COMPILE!');
    var tDir = temp.mkdirSync({});
    console.log(tDir);
    var sourcePath = tDir + "/MyStrategy.java";
    var classPath = tDir + "/MyStrategy.class";

    fs.writeFileSync(sourcePath, req.body.source);
    console.log('files:')
    console.log(fs.readdirSync(tDir));
    //HACK!!!
    var binPath = "\"";
    var template_path = config.java.template;
    if(!path.isAbsolute(template_path)) {
        template_path = process.cwd() + '/' + template_path;
    }
    var command = binPath + 
        "javac\" -encoding utf8 -implicit:none " + 
        "-sourcepath " + template_path + 
        " MyStrategy.java";
    if(os.type() == 'Windows_NT') {
        command = "chcp 65001 | " + command;
    }
    console.log(command);
    
    cp.exec(command, { cwd: tDir }, (err, stdout, stderr) => {
        console.log(`stdout: ${stdout}`);

        var mess = stderr.toString();
        console.log(`stderr: ` + mess);
        var response = {};
        if (err) {
            console.log(err.message)
            response.status = "error";
            response.errorMessage = mess;
        } else {
            response.status = "accepted";
            response.executable = fs.readFileSync(classPath);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(response));
        res.end()
        
        ifExistRemoveSync(sourcePath);
        ifExistRemoveSync(classPath);
        fs.rmdirSync(tDir);
    });
}

function ifExistRemoveSync(path) {
    if (fs.existsSync(path)) {
        fs.unlinkSync(path);
    }
}

function removeDirSync(dirPath) {
    fs.readdirSync(dirPath).forEach((name) => {
       var curPath = dirPath + "/" + name;
       if(fs.statSync(curPath).isDirectory) {
           removeDirSync(curPath);
       } else {
           fs.unlinkSync(curPath);
       }
    });
    fs.rmdirSync(dirPath);
}