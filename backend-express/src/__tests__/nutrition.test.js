const request = require('supertest');
const app = require('../server');

describe('Nutrition Endpoints', () => {
  const validToken = 'fake-jwt-token'; // In real tests, generate a valid token

  describe('POST /api/v1/nutrition/meals', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/v1/nutrition/meals')
        .send({
          mealType: 'breakfast',
          calories: 500
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid meal type', async () => {
      const res = await request(app)
        .post('/api/v1/nutrition/meals')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          mealType: 'invalid',
          calories: 500
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject negative calories', async () => {
      const res = await request(app)
        .post('/api/v1/nutrition/meals')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          mealType: 'breakfast',
          calories: -100
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject excessive calories (>10000)', async () => {
      const res = await request(app)
        .post('/api/v1/nutrition/meals')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          mealType: 'breakfast',
          calories: 15000
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/nutrition/exercises', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/v1/nutrition/exercises')
        .send({
          description: 'Running',
          caloriesBurned: 300
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject negative calories burned', async () => {
      const res = await request(app)
        .post('/api/v1/nutrition/exercises')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          description: 'Running',
          caloriesBurned: -100
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
