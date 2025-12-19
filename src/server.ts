import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { jwt } from '@elysiajs/jwt';
import { authRoutes } from './routes/auth';
import { insightRoutes } from './routes/insights';
import { masterRoutes } from './routes/masters';

const app = new Elysia()
  .use(cors())
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'your-secret-key',
    })
  )
  // Health check endpoint
  .get('/health', () => ({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }))
  .use(authRoutes)
  .use(insightRoutes)
  .use(masterRoutes)
  .get('/assets/*', ({ params }) => {
    const path = (params as any)['*'];
    return Bun.file(`dist/assets/${path}`);
  })
  .get('/uploads/*', ({ params }) => {
    const path = (params as any)['*'];
    return Bun.file(`uploads/${path}`);
  })
  .get('/', () => Bun.file('dist/index.html'))
  .get('*', ({ path }) => {
    // Serve static files if they exist, otherwise serve index.html for SPA routing
    const file = Bun.file(`dist${path}`);
    return file.exists() ? file : Bun.file('dist/index.html');
  })
  .listen(process.env.PORT || 3000);

console.log(`🦊 Server running at http://${app.server?.hostname}:${app.server?.port}`);
