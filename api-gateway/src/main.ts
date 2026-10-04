import 'dotenv/config'
import { createGatewayApp } from './app'
const PORT = Number(process.env.PORT ?? 4000)
createGatewayApp().listen(PORT, () => console.log(`api-gateway listening on :${PORT}`))
