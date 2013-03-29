var express = require('express')
var app = express()
var port = process.env.PORT || 8080
app.listen(port)
app.use('/', express.static(__dirname + '/'))
console.log('Server started to port', port)
