const http = require('http');
const websocket = require('websocket');

export class SocketServerWrapper {
    connection;
    wsServer;
    originIsAllowed = (origin) => {
        return true;
    }

    send = (message) => {
        this.connection.sendUTF(message);
    }

    constructor(onMessage: Function) {
        const WebSocketServer = websocket.server;
        const server = http.createServer(function (request, response) {
            console.log((new Date()) + ' Received request for ' + request.url);
            response.writeHead(404);
            response.end();
        });
        server.listen(8888, function () {
            console.log((new Date()) + ' Server is listening on port 8888');
        });

        this.wsServer = new WebSocketServer({
            httpServer: server,
            // You should not use autoAcceptConnections for production
            // applications, as it defeats all standard cross-origin protection
            // facilities built into the protocol and the browser.  You should
            // *always* verify the connection's origin and decide whether or not
            // to accept it.
            autoAcceptConnections: false
        });

        this.wsServer.on('request', (request) => {
            if (!this.originIsAllowed(request.origin)) {
                // Make sure we only accept requests from an allowed origin
                request.reject();
                console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
                return;
            }
            this.connection = request.accept('echo-protocol', request.origin);
            console.log((new Date()) + ' Connection accepted.');
            this.connection.on('message', onMessage);
            this.connection.on('close', (reasonCode, description) => {
                console.log((new Date()) + ' Peer ' + this.connection.remoteAddress + ' disconnected.', reasonCode, description);
            });
        });
    }
}
