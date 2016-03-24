
var numPoints = 3;
var range = 100;

function createServer() {

  var http = require('http');

  var urlParser = require('url');

  var server = http.createServer(function(request, response) {
    var parsedURL = urlParser.parse(request.url, true);

    if (parsedURL.pathname === '/read') {
      var result = [];
      for (var i = 0; i < numPoints; i++){
        result.push(Math.floor(Math.random() * range));
      }
      response.end(result.join(','));
    }

    if (parsedURL.pathname === '/listPorts') {
      response.writeHead(200, {"Content-Type": "application/json"});
      response.end(JSON.stringify([{comName:'COM1'}]));
    }

    response.end();
  });

  var httpPort = 23456;

  server.listen(httpPort);

  console.log("Server listening on port: " + httpPort);
}


createServer();
