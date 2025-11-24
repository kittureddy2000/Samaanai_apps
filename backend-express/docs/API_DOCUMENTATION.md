# API Documentation with OpenAPI (Swagger)

## Why API Documentation?

**Current Issues:**
- No centralized API documentation
- Frontend developers guess request/response formats
- Testing requires reading route files
- New developers struggle to understand API

**Benefits of OpenAPI/Swagger:**
- ✅ Interactive API documentation UI
- ✅ Try endpoints directly in browser
- ✅ Auto-generated from code comments
- ✅ Industry-standard OpenAPI 3.0 format
- ✅ Export to Postman, Insomnia
- ✅ Client SDK generation

## Setup

### Install Dependencies

```bash
npm install --save swagger-jsdoc swagger-ui-express
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express
```

### Create Swagger Configuration

**src/config/swagger.js**:

```javascript
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Samaanai API',
      version: '1.0.0',
      description: 'Comprehensive productivity app with task management, nutrition tracking, and financial management',
      contact: {
        name: 'Samaanai Team',
        email: 'support@samaanai.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server'
      },
      {
        url: 'https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app',
        description: 'Staging server'
      },
      {
        url: 'https://api.samaanai.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token from the /auth/login endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string', nullable: true },
            lastName: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed']
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high']
            },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            category: { type: 'string', nullable: true },
            reminderType: {
              type: 'string',
              enum: ['none', 'on_time', 'before']
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Meal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            mealType: {
              type: 'string',
              enum: ['breakfast', 'lunch', 'dinner', 'snacks']
            },
            description: { type: 'string', nullable: true },
            calories: { type: 'integer', minimum: 0, maximum: 10000 },
            date: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: { type: 'string' },
                  param: { type: 'string' },
                  location: { type: 'string' }
                }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Invalid token' }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Resource not found' }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Internal server error' }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication and user management'
      },
      {
        name: 'Todo',
        description: 'Task management operations'
      },
      {
        name: 'Nutrition',
        description: 'Nutrition tracking and meal logging'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/features/**/*.routes.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
```

### Add to server.js

**src/server.js**:

```javascript
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// ... existing code ...

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Samaanai API Documentation'
}));

// Redirect /docs to /api-docs
app.get('/docs', (req, res) => {
  res.redirect('/api-docs');
});

// Serve OpenAPI spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

console.log('📚 API documentation available at http://localhost:8080/api-docs');
```

## Documenting Routes

### Example 1: Auth Routes

**src/routes/auth.js** (or **src/features/auth/auth.routes.js**):

```javascript
/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', registerValidation, authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', authLimiter, loginValidation, authController.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user (invalidate tokens)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', auth, authController.logout);
```

### Example 2: Todo Routes

**src/routes/todo.js** (or **src/features/todo/todo.routes.js**):

```javascript
/**
 * @swagger
 * /api/v1/todo/tasks:
 *   get:
 *     summary: Get all tasks for authenticated user
 *     tags: [Todo]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *         description: Filter by task status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/tasks', todoController.getTasks);

/**
 * @swagger
 * /api/v1/todo/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Todo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: Buy groceries
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Milk, eggs, bread
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-12-31T10:00:00Z
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *               category:
 *                 type: string
 *                 example: Shopping
 *               reminderType:
 *                 type: string
 *                 enum: [none, on_time, before]
 *                 default: none
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/tasks', taskValidation, todoController.createTask);

/**
 * @swagger
 * /api/v1/todo/tasks/{id}:
 *   put:
 *     summary: Update an existing task
 *     tags: [Todo]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/tasks/:id', taskUpdateValidation, todoController.updateTask);

/**
 * @swagger
 * /api/v1/todo/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Todo]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/tasks/:id', todoController.deleteTask);

/**
 * @swagger
 * /api/v1/todo/tasks/stats:
 *   get:
 *     summary: Get task statistics
 *     tags: [Todo]
 *     responses:
 *       200:
 *         description: Task statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 pending:
 *                   type: integer
 *                 in_progress:
 *                   type: integer
 *                 completed:
 *                   type: integer
 *                 overdue:
 *                   type: integer
 */
router.get('/tasks/stats', todoController.getTaskStats);
```

### Example 3: Nutrition Routes

**src/routes/nutrition.js** (or **src/features/nutrition/nutrition.routes.js**):

```javascript
/**
 * @swagger
 * /api/v1/nutrition/meals:
 *   get:
 *     summary: Get meals for authenticated user
 *     tags: [Nutrition]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering meals
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering meals
 *     responses:
 *       200:
 *         description: List of meals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Meal'
 */
router.get('/meals', nutritionController.getMeals);

/**
 * @swagger
 * /api/v1/nutrition/meals:
 *   post:
 *     summary: Log a new meal
 *     tags: [Nutrition]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mealType
 *               - calories
 *             properties:
 *               mealType:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner, snacks]
 *                 example: breakfast
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Oatmeal with berries
 *               calories:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10000
 *                 example: 350
 *               date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Meal logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Meal'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/meals', mealValidation, nutritionController.createMeal);

/**
 * @swagger
 * /api/v1/nutrition/dashboard:
 *   get:
 *     summary: Get nutrition dashboard with stats
 *     tags: [Nutrition]
 *     responses:
 *       200:
 *         description: Nutrition dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 todayCalories:
 *                   type: integer
 *                 weeklyAverage:
 *                   type: number
 *                 goalCalories:
 *                   type: integer
 *                 currentWeight:
 *                   type: number
 */
router.get('/dashboard', nutritionController.getDashboard);
```

## Access Documentation

### Local Development

```bash
npm run dev
```

Visit: **http://localhost:8080/api-docs**

### Staging/Production

**Staging**: https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api-docs
**Production**: https://api.samaanai.com/api-docs

## Testing with Swagger UI

### 1. Get Auth Token

1. Expand **Auth → POST /api/v1/auth/login**
2. Click "Try it out"
3. Enter credentials:
   ```json
   {
     "email": "your@email.com",
     "password": "yourpassword"
   }
   ```
4. Click "Execute"
5. Copy the `accessToken` from response

### 2. Authenticate

1. Click **"Authorize"** button at top
2. Paste token in the value field (just the token, no "Bearer" prefix)
3. Click "Authorize"
4. Click "Close"

### 3. Try Protected Endpoints

1. Expand **Todo → GET /api/v1/todo/tasks**
2. Click "Try it out"
3. Click "Execute"
4. See response with your tasks

## Export to Postman

### Download OpenAPI Spec

Visit: **http://localhost:8080/api-docs.json**

Save the JSON file.

### Import to Postman

1. Open Postman
2. Click "Import"
3. Select the `api-docs.json` file
4. All endpoints will be imported as a collection

### Import to Insomnia

1. Open Insomnia
2. Click "Create" → "Import From" → "File"
3. Select the `api-docs.json` file

## Best Practices

### 1. Keep Docs in Sync

Update Swagger comments when you:
- Add new routes
- Change request/response formats
- Add new validations
- Modify authentication requirements

### 2. Reusable Components

Define reusable schemas in `swagger.js`:

```javascript
components: {
  schemas: {
    PaginationParams: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      }
    }
  }
}
```

Reference in routes:

```javascript
/**
 * @swagger
 * /api/v1/todo/tasks:
 *   get:
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           $ref: '#/components/schemas/PaginationParams/properties/page'
 */
```

### 3. Examples

Always include examples:

```javascript
/**
 * @swagger
 * /api/v1/todo/tasks:
 *   post:
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *           examples:
 *             highPriority:
 *               summary: High priority task
 *               value:
 *                 name: Urgent client meeting
 *                 priority: high
 *                 dueDate: 2024-01-15T14:00:00Z
 *             simple:
 *               summary: Simple task
 *               value:
 *                 name: Buy milk
 */
```

### 4. Error Responses

Document all possible error codes:

```javascript
/**
 * @swagger
 * /api/v1/todo/tasks/{id}:
 *   get:
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
```

## Customization

### Custom CSS

```javascript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `,
  customSiteTitle: 'Samaanai API Docs',
  customfavIcon: '/favicon.ico'
}));
```

### Authentication Persistence

Swagger UI will save your auth token in localStorage.

### Multiple API Versions

```javascript
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecV1));
app.use('/api/v2/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecV2));
```

## CI/CD Integration

### Validate OpenAPI Spec

Add to your test suite:

```javascript
// tests/swagger.test.js
const swaggerSpec = require('../src/config/swagger');

describe('OpenAPI Specification', () => {
  it('should generate valid OpenAPI spec', () => {
    expect(swaggerSpec).toBeDefined();
    expect(swaggerSpec.openapi).toBe('3.0.0');
    expect(swaggerSpec.info.title).toBe('Samaanai API');
  });
});
```

### Generate Static Docs

For publishing to GitHub Pages or internal docs:

```bash
# Install redoc-cli
npm install -g redoc-cli

# Generate static HTML
redoc-cli bundle http://localhost:8080/api-docs.json -o docs/api.html
```

## Checklist

- [ ] Install swagger-jsdoc and swagger-ui-express
- [ ] Create `src/config/swagger.js`
- [ ] Add Swagger UI to `server.js`
- [ ] Document auth routes
- [ ] Document todo routes
- [ ] Document nutrition routes
- [ ] Document finance routes
- [ ] Add component schemas for all models
- [ ] Add security scheme (JWT Bearer)
- [ ] Test authentication flow in Swagger UI
- [ ] Export to Postman and verify
- [ ] Add to staging/production deployment

## Resources

- [Swagger UI Documentation](https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [swagger-jsdoc GitHub](https://github.com/Surnet/swagger-jsdoc)
- [Express Swagger Tutorial](https://blog.logrocket.com/documenting-express-js-api-swagger/)
