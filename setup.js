#!/usr/bin/env node
"use strict";
/**
 * Setup script for Meeting Whisperer
 * Run this script to validate your environment and test connections
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSlackConnection = validateSlackConnection;
exports.validateOpenAI = validateOpenAI;
exports.validateRedis = validateRedis;
require("dotenv/config");
const redis_js_1 = __importDefault(require("./src/services/redis.js"));
const web_api_1 = require("@slack/web-api");
const openai_1 = __importDefault(require("openai"));
const fs = __importStar(require("fs"));
async function validateSlackConnection() {
    console.log("🔍 Testing Slack connection...");
    if (!process.env.SLACK_BOT_TOKEN) {
        throw new Error("SLACK_BOT_TOKEN is not set");
    }
    const client = new web_api_1.WebClient(process.env.SLACK_BOT_TOKEN);
    try {
        const auth = await client.auth.test();
        console.log(`✅ Slack connected as: ${auth.user} (${auth.team})`);
        return true;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Slack connection failed: ${errorMessage}`);
    }
}
async function validateOpenAI() {
    console.log("🔍 Testing OpenAI connection...");
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not set");
    }
    const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    try {
        const models = await openai.models.list();
        console.log(`✅ OpenAI connected - ${models.data.length} models available`);
        return true;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`OpenAI connection failed: ${errorMessage}`);
    }
}
async function validateRedis() {
    console.log("🔍 Testing Redis connection...");
    try {
        await redis_js_1.default.connect();
        await redis_js_1.default.set("test-key", "test-value", 10);
        const value = await redis_js_1.default.get("test-key");
        if (value === "test-value") {
            console.log("✅ Redis connected and working");
            await redis_js_1.default.del("test-key");
            return true;
        }
        else {
            throw new Error("Redis read/write test failed");
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Redis connection failed: ${errorMessage}`);
    }
}
async function main() {
    console.log("🚀 Meeting Whisperer - Environment Setup\n");
    try {
        // Check environment file
        if (!fs.existsSync(".env")) {
            console.log("⚠️  .env file not found. Please copy .env.example to .env and configure it.");
            process.exit(1);
        }
        // Validate all connections
        await validateSlackConnection();
        await validateOpenAI();
        await validateRedis();
        console.log("\n✅ All connections validated successfully!");
        console.log("\n🎉 Meeting Whisperer is ready to run!");
        console.log("\nNext steps:");
        console.log("  1. Make sure your Slack bot is added to the channels you want to monitor");
        console.log("  2. Run: npm start (production) or npm run dev (development)");
        console.log("  3. Test the /recap command in your Slack channels");
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`\n❌ Setup failed: ${errorMessage}`);
        console.log("\nPlease check your .env configuration and try again.");
        process.exit(1);
    }
    finally {
        if (redis_js_1.default.isConnected) {
            await redis_js_1.default.disconnect();
        }
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
//# sourceMappingURL=setup.js.map