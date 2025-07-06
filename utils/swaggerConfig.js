let swaggerJsdoc = require('swagger-jsdoc');
let { _configs } = require("../utils/config")

let options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: _configs.APP_NAME || 'My API',
            version: '1.0.0',
            description: _configs.APP_DESC || 'API Documentation for My Project',
        },
        components: {
            securitySchemes: {
                quantumAccessToken: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'quantumaccesstoken',
                    description: 'Custom access token for authentication'
                }
            },
            schemas: {
                Log: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Log ID'
                        },
                        userId: {
                            type: 'string',
                            description: 'User ID (optional for failed logins)'
                        },
                        userEmail: {
                            type: 'string',
                            description: 'User email'
                        },
                        userRole: {
                            type: 'string',
                            enum: ['admin', 'user', 'guest'],
                            description: 'User role'
                        },
                        isAdmin: {
                            type: 'boolean',
                            description: 'Whether user is admin'
                        },
                        method: {
                            type: 'string',
                            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                            description: 'HTTP method'
                        },
                        endpoint: {
                            type: 'string',
                            description: 'API endpoint'
                        },
                        fullUrl: {
                            type: 'string',
                            description: 'Full request URL'
                        },
                        ipAddress: {
                            type: 'string',
                            description: 'Client IP address'
                        },
                        userAgent: {
                            type: 'string',
                            description: 'User agent string'
                        },
                        origin: {
                            type: 'string',
                            description: 'Request origin'
                        },
                        requestBody: {
                            type: 'object',
                            description: 'Request body (sanitized)'
                        },
                        requestParams: {
                            type: 'object',
                            description: 'Request parameters'
                        },
                        requestQuery: {
                            type: 'object',
                            description: 'Query parameters'
                        },
                        statusCode: {
                            type: 'integer',
                            description: 'HTTP status code'
                        },
                        responseBody: {
                            type: 'object',
                            description: 'Response body (sanitized)'
                        },
                        responseTime: {
                            type: 'number',
                            description: 'Response time in milliseconds'
                        },
                        action: {
                            type: 'string',
                            description: 'Action type'
                        },
                        description: {
                            type: 'string',
                            description: 'Human readable description'
                        },
                        details: {
                            type: 'object',
                            description: 'Additional details'
                        },
                        isSuspicious: {
                            type: 'boolean',
                            description: 'Whether activity is suspicious'
                        },
                        securityFlags: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'Security flags if suspicious'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp'
                        }
                    },
                    required: ['userRole', 'method', 'endpoint', 'fullUrl', 'ipAddress', 'statusCode', 'action', 'description']
                }
            }
        },
        security: [
            { quantumAccessToken: [] }
        ]
    },
    apis: ['./routes/*.js'],
};

let swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
