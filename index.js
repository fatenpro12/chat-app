var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
path = require('path');
var ss = require('socket.io-stream');
//var Redis = require('ioredis');
//var redis = new Redis();
var users = [];
var groups = [];

var port= process.env.PORT || 8890

server.listen(port);
let broadcaster
io.on('connection', function (socket) {
    socket.on("broadcaster", () => {
        broadcaster = socket.id;
        socket.broadcast.emit("broadcaster",broadcaster);
      });
      socket.on("publishComments", (comments, recievers, likes, commentData) => {
        socket.broadcast.emit("publishComments",comments, recievers, likes,commentData);
        console.log(comments, recievers, likes,commentData)
      });
      socket.on("watcher", (comment, reciever, like) => {
        socket.to(broadcaster).emit("watcher",socket.id,broadcaster, comment, reciever, like);
      });
       socket.on("disconnect", () => {
        socket.to(broadcaster).emit("disconnectPeer", socket.id);
      });
      socket.on("offer", (id, message) => {
        socket.to(id).emit("offer", socket.id, message);
    });
    socket.on("answer", (id, message) => {
      socket.to(id).emit("answer", socket.id, message);
    });
    socket.on("candidate", (id, message) => {
      socket.to(id).emit("candidate", socket.id, message);
    });
    socket.on("sendChatToServer", function (user_id,message,images,audio,sender,stream) {
        users[user_id] = socket.id;
        io.emit('updateUserStatus', users);
        console.log("user connected "+ user_id +stream);
        socket.broadcast.emit('sendChatToClient', message,images,audio,sender,stream);
        socket.on('upload-image', function (message) {
            var writer = fs.createWriteStream(path.resolve(__dirname,'public/images/chat/'+ message.name), {encoding: 'base64'});
            writer.write(message.data);
            writer.end();
            writer.on('finish', function () {
            socket.emit('image-uploaded', {
            name:  message.name
                        });
                    });
                });

    });
   socket.on('blockUser', function(id) {
      // users.filter((key, val) => val == id);
      // var i = users.indexOf(key[id]);
       console.log(id)
      // users.splice(i, 1, 0);
     //  io.emit('updateUserStatus', users);
    });
    socket.on('disconnect', function() {
        var i = users.indexOf(socket.id);
        users.splice(i, 1, 0);
        io.emit('updateUserStatus', users);
    });

    socket.on('joinGroup', function(data) {
        data['socket_id'] = socket.id;
        if (groups[data.group_id]) {
            var userExist = checkIfUserExistInGroup(data.user_id, data.group_id);

            if (!userExist) {
                groups[data.group_id].push(data);
                socket.join(data.room);
            } else {
                var index = groups[data.group_id].map(function(o) {
                    return o.user_id;
                }).indexOf(data.user_id);

                groups[data.group_id].splice(index,1);
                groups[data.group_id].push(data);
                socket.join(data.room);
            }
        } else {
        console.log("nwe group");
            groups[data.group_id] = [data];
            socket.join(data.room);
        }

      //  console.log('socket-id: '+ socket.id+' - user-id: '+data.user_id);
     //   console.log(groups);
    });
});
