import swaggerJsdoc from "swagger-jsdoc";
import "dotenv/config";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Fleet Management & IoT Tracking API",
      version: "1.0.0",
      description: "Comprehensive API documentation for the Fleet Management and IoT Tracking system.",
    },
    servers: [
      {
        url: `http://localhost:${process.env.APP_PORT || 5000}`,
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
      },
    },
    // We can define paths here instead of in the routes
    paths: {
      "/api/all-vehicles": {
        get: {
          summary: "Get all vehicles",
          tags: ["Vehicles"],
          responses: {
            200: { description: "List of all vehicles" },
            500: { description: "Internal server error" },
          },
        },
      },
      "/api/duty-vehicles": {
        get: {
          summary: "Get duty vehicles",
          tags: ["Vehicles"],
          responses: {
            200: { description: "List of duty vehicles" },
            500: { description: "Internal server error" },
          },
        },
      },
      "/api/live": {
        post: {
          summary: "Ingest live vehicle telemetry",
          tags: ["Vehicles"],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      vehicleNumber: { type: "string" },
                      latitude: { type: "number" },
                      longitude: { type: "number" },
                      speed: { type: "number" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Data ingested" },
            403: { description: "Forbidden" },
          },
        },
      },
      "/api/geofence": {
        get: {
          summary: "Get all geofences",
          tags: ["Geofences"],
          responses: {
            200: { description: "List of geofences" },
          },
        },
        post: {
          summary: "Create or update a geofence",
          tags: ["Geofences"],
          responses: {
            201: { description: "Created" },
          },
        },
      },
      "/health": {
        get: {
          summary: "Health check",
          tags: ["System"],
          responses: {
            200: { description: "System health" },
          },
        },
      },
    },
  },
  apis: [], // No longer scanning route files for comments
};

const swaggerSpecs = swaggerJsdoc(options);
export default swaggerSpecs;
