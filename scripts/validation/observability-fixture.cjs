const http = require('node:http')
for (const port of [3000,4000,4001,4002,4003,4004,4005,4006]) {
  http.createServer((req,res) => {
    console.log(JSON.stringify({ event:'http', requestId:req.headers['x-request-id'] ?? 'fixture', port, status:200 }))
    res.setHeader('Content-Type','text/plain')
    res.end(`# TYPE operum_process_uptime_seconds gauge\noperum_process_uptime_seconds ${process.uptime()}\n`)
  }).listen(port)
}
