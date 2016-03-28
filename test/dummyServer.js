var numPoints = 3;
var range = 100;

function createServer() {

  var http = require('http');

  var urlParser = require('url');
  var fs = require('fs');

  var server = http.createServer(function(request, response) {
    var parsedURL = urlParser.parse(request.url, true);
    console.log(parsedURL.pathname);
    if (parsedURL.pathname === '/read') {
      var result = [];
      for (var i = 0; i < numPoints; i++) {
        result.push(Math.floor(Math.random() * range));
      }
      response.writeHead(200, {
        "Content-Type": "application/json"
      });
      response.end('["' + result.join(',') + '"]');
    }

    if (parsedURL.pathname === '/listPorts') {
      response.writeHead(200, {
        "Content-Type": "application/json"
      });
      response.end(JSON.stringify([{
        comName: 'COM1'
      }]));
    }

    if (parsedURL.pathname === '/') {
      parsedURL.pathname = '/index.html';
    }
    var staticFiles = {
      "html": "html",
      "css": "css",
      "js": "javascript"
    };

    Object.keys(staticFiles).forEach(function(fileType) {
      if (endsWith(parsedURL.pathname, fileType)) {
        fs.readFile(parsedURL.pathname.substring(1), "utf8", function(err, data) {
          response.writeHead(200, {
            'Content-Type': 'text/' + staticFiles[fileType]
          });
          response.end(data);
        });
      }
    });


    setTimeout(function() {
      response.end();
    }, 1000);
  });

  var httpPort = 23456;

  server.listen(httpPort);

  console.log("Server listening on port: " + httpPort);
}


createServer();



function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
