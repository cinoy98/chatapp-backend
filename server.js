const express = require("express");
const http = require("http");
const cors = require("cors");
const WebSocketServer = require("websocket").server;
const app = express();
app.use(cors());
const port = 8080;
const host = "0.0.0.0";
const server = http.createServer(app);
var userId = 1;
try {
    server
        .listen(port, host)
        .on("error", (error) => {
            if (error.syscall !== "listen") {
                throw error;
            }
            // handle specific listen errors with friendly messages
            switch (error.code) {
                case "EACCES":
                    console.log(
                        `BOOT :: ${port}:${host} requires elevated privileges`
                    );
                    process.exit(1);
                    break;
                case "EADDRINUSE":
                    console.log(
                        `BOOT :: ${port}:${host} is already in use`
                    );
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        })
        .on("listening", () => {
            console.log(
                `BOOT :: <> <> <> <> <> <> <> <> <> <> Listening on ${port}:${host} <> <> <> <> <> <> <> <> <> <>`
            );
        });

    initializeWebsocket(server);
}

catch (error) {
    console.log("error::", error);
}


function initializeWebsocket(server) {


    var wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });
    console.log("***CREATED WEBSOCKET SERVER***");

    ///////////////////////////////////////////////////////////////////////

    function originIsAllowed(origin) {
        return true;
    }
    var connectionArray = [];
    var online = {};
    let userlist = [];
    function getConnectionForUserId(userId) {
        let connect = connectionArray.find(connection => connection.userId = userId);
        console.log("connect.username in getConnectionForUserId", connect.userId);
        return connect
    }

    function addUsername(username, userId) {
        for (let j = 0; j < connectionArray.length; j++) {
            if (connectionArray[j].userId == userId) {
                connectionArray[j]["username"] = username;
            }
        }
    }
    function checkUniqueUsername(username) {
        let unique = true;
        connectionArray.forEach((connect) => {
            if (connect.username == username) {
                console.log("username exists");
                unique = false;
            }
        })
        return unique;
    }

    function createUniqueUsername(username) {

        let newUsername = username;
        while (!checkUniqueUsername(newUsername)) {
            let usernameIterator = Math.floor(Math.random() * 100);
            newUsername = `${username}${usernameIterator}`;

        }

        console.log("new username is ", newUsername);
        return newUsername

    }



    wsServer.on("request", (request) => {
        if (!originIsAllowed(request.origin)) {
            request.reject();
            console.log((new Date()) + " Connection from origin " + request.origin + " rejected.");
            return;
        }
        const connection = request.accept(undefined, request.origin);
        console.log((new Date()) + " Connection accepted.");
        connection["userId"] = userId;

        // create a array of connections 
        connectionArray.push(connection);
        var message = {
            userId: userId,
            type: "userId"

        }
        connection.sendUTF(JSON.stringify(message));
        userId++;

        // on message fetch the type of message operation

        connection.on("message", (message) => {
            if (message.type == "utf8") {
                let data = JSON.parse(message.utf8Data);
                console.log("recieved message ::: ", data);
                switch (data.type) {
                    case "register":
                        let registerMessage = {}
                        if (checkUniqueUsername(data.username)) {
                            console.log("unique username ", data.username);
                            addUsername(data.username, data.userId);
                            registerMessage = {
                                type: "username",
                                username: data.username
                            }
                        }

                        else {
                            console.log("username not unique");
                            let newUsername = createUniqueUsername(data.username);
                            addUsername(newUsername, data.userId);
                            registerMessage = {
                                type: "username",
                                username: newUsername
                            }
                        }

                        connectionArray.forEach((connect) => {
                            userlist.push(connect.username);
                            var cleaned = [...new Set(userlist)];
                            online = {
                                online: cleaned,
                                type: "online"
                            }
                        })

                        console.log(online, "server connected list")
                        connectionArray.forEach((client) => {
                            client.sendUTF(JSON.stringify(online));
                        })
                        connectionArray.forEach((connection) => {
                            console.log("connected usernames", connection.username);
                            if (connection.userId == data.userId) {
                                console.log("reciever connection", connection.username);
                                connection.sendUTF(JSON.stringify(registerMessage));
                            }
                        })
                        break;
                    case "text":
                        let sendMessage = {
                            type: "text",
                            from: data.username,
                            message: data.message
                        }
                        // SenderConnection.sendUTF(JSON.stringify(data));
                        connectionArray.forEach((connect) => {
                            if (connect.username == data.reciever) {
                                console.log("reciever connection", connect.username);
                                connection.sendUTF(JSON.stringify(sendMessage));
                                connect.sendUTF(JSON.stringify(sendMessage));
                            }
                        })
                        // var recieverConnection = getConnectionForUserId(data.reciever);
                        // console.log("recievername", recieverConnection.username);
                        // SenderConnection.sendUTF(JSON.stringify(data));
                        // recieverConnection.sendUTF(JSON.stringify(data));
                        // console.log("sender name", SenderConnection.username);
                        break;
                    case "online":
                        break;
                }
            }
        })

    });
}
// handleError();