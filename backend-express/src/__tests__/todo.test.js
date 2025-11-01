const request = require('supertest');
const app = require('../server');

describe('Todo Endpoints', () => {
  const validToken = 'fake-jwt-token'; // In real tests, generate a valid token

  describe('POST /api/v1/todo/tasks', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/v1/todo/tasks')
        .send({
          name: 'Test task'
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject empty task name', async () => {
      const res = await request(app)
        .post('/api/v1/todo/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: '   '
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject task name longer than 200 characters', async () => {
      const longName = 'a'.repeat(201);
      const res = await request(app)
        .post('/api/v1/todo/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: longName
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject invalid reminder type', async () => {
      const res = await request(app)
        .post('/api/v1/todo/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Test task',
          reminderType: 'invalid'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/todo/tasks/stats', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/todo/tasks/stats');

      expect(res.statusCode).toBe(401);
    });
  });
});
