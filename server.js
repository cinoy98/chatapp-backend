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

    var connectionArray = [];
    var wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });
    console.log("***CREATED WEBSOCKET SERVER***");

    ///////////////////////////////////////////////////////////////////////

    function originIsAllowed(origin) {
        return true;
    }

    var online = {};
    let userlist = [];
    var cleaned;
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
                console.log("username exists for ", username);
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

        console.log(`new username for ${username} is  ${newUsername}`);
        return newUsername

    }



    wsServer.on("request", (request) => {
        if (!originIsAllowed(request.origin)) {
            request.reject();
            console.log((new Date()) + " Connection from origin " + request.origin + " rejected.");
            return;
        }
        const connection = request.accept(undefined, request.origin);
        console.log((new Date()) + " Connection accepted for userId", userId);
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
                switch (data.type) {
                    case "register":
                        let registerMessage = {}
                        if (checkUniqueUsername(data.username)) {
                            addUsername(data.username, data.userId);
                            registerMessage = {
                                type: "username",
                                username: data.username
                            }
                        }

                        else {

                            let newUsername = createUniqueUsername(data.username);
                            addUsername(newUsername, data.userId);
                            registerMessage = {
                                type: "username",
                                username: newUsername
                            }
                        }

                        connectionArray.forEach((connect) => {
                            userlist.push(connect.username);
                            cleaned = [...new Set(userlist)];
                            online = {
                                online: cleaned,
                                type: "online"
                            }
                        })
                        console.log("Users connected to server", cleaned);
                        connectionArray.forEach((client) => {
                            client.sendUTF(JSON.stringify(online));
                        })
                        connectionArray.forEach((connection) => {
                            if (connection.userId == data.userId) {
                                connection.sendUTF(JSON.stringify(registerMessage));
                            }
                        })
                        break;
                    case "text":

                        // SenderConnection.sendUTF(JSON.stringify(data));
                        connectionArray.forEach((connect) => {
                            if (connect.username == data.reciever) {

                                let sendMessage = {
                                    type: "text",
                                    from: data.username,
                                    message: data.message
                                };
                                // connection.sendUTF(JSON.stringify(recieveMessage));
                                connect.sendUTF(JSON.stringify(sendMessage));
                            }
                        })

                        break;
                    case "online":
                        break;
                }
            }
        })

        connection.on("close", (connection) => {

            connectionArray = connectionArray.filter(function (el, idx, ar) {
                return el.connected;
            });
            userlist = [];
            cleand = [];
            connectionArray.forEach((connect) => {
                userlist.push(connect.username);
                cleaned = [...new Set(userlist)];
                online = {
                    online: cleaned,
                    type: "online"
                }
            })

            connectionArray.forEach((client) => {
                client.sendUTF(JSON.stringify(online));
            })

            console.log("after disconnected", userlist);
        })
    });
}
