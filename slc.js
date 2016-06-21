var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/slc');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log('Connected to database');
});

var sessionSchema = mongoose.Schema({
	sessionName: String,
	msgArray : []
},{collection : 'sessions'});

var Session = mongoose.model('Session', sessionSchema);

var nsp = io.of('/slc-namespace');

app.get('/', function(req, res){
  res.sendfile('index.html');
});

io.on('connection', function(socket){
	socket.on('chat message', function(msg){
	var res = msg.split("G");
	console.log('message: ' + res[0]);
	console.log('sessionID: ' + res[1]);
	var query = {sessionName : res[1]};
	Session.update({sessionName: res[1]},{$push: {msgArray: res[0]}},{upsert:true},function(err){
			if(err){
					console.log(err);
			}else{
					console.log("Successfully added");
			}
	
	Session.findOne({ sessionName: res[1] }, function(err, session) {
		if(session)
		{
			if(session.msgArray.length>11)
			{
				console.log('deleting');
				var msgs = session.msgArray;
				console.log(msgs);
				msgs.splice(0,2);
				session = msgs;
				console.log(session);
				Session.update({sessionName: res[1]}, {$set : {msgArray : msgs}},{upsert:true});
				console.log("emitting to: " + res[1]);
				io.in(res[1]).emit('session updated', session);

			}
			else{
				Session.update();
				console.log("emitting to: " + res[1]);
				io.in(res[1]).emit('session updated', session);
			}
		}
	});
	});
	});

	socket.on('start session', function(msg){
		var newSession = new Session({ sessionName: msg});
		newSession.save();
		console.log("created: " + msg);
		socket.join(msg);
	});
	socket.on('join session', function(msg) {
	Session.findOne({ sessionName: msg }, function(err, session) {
		if(session)
		{
			socket.join(msg);
			console.log("joined: " + msg);
			io.sockets.in(msg).emit('session joined', session);
		}
		else {
			io.emit('session joined', 'session not found');
		}
	});
	});
	});

http.listen(3000, function(){
  console.log('listening on *:3000');
});