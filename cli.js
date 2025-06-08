#!/usr/bin/env node
"use strict";
/**
 * Meeting Whisperer CLI Tool
 * Provides command-line utilities for managing the application
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
const commander_1 = require("commander");
const axios_1 = __importDefault(require("axios"));
require("dotenv/config");
const API_BASE = process.env.API_BASE || "http://localhost:3000";
commander_1.program
    .name("meeting-whisperer")
    .description("CLI tool for Meeting Whisperer - Slack Summarizer")
    .version("1.0.0");
commander_1.program
    .command("health")
    .description("Check application health")
    .action(async () => {
    try {
        const response = await axios_1.default.get(`${API_BASE}/health`);
        console.log("✅ Application is healthy");
        console.log(JSON.stringify(response.data, null, 2));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("❌ Health check failed:", errorMessage);
        process.exit(1);
    }
});
commander_1.program
    .command("digest")
    .description("Trigger daily digest generation")
    .option("-c, --channel <channel>", "specific channel to generate digest for")
    .option("-d, --date <date>", "date for digest (YYYY-MM-DD format)")
    .action(async (options) => {
    try {
        const payload = {};
        if (options.channel)
            payload.channel = options.channel;
        if (options.date)
            payload.date = options.date;
        const response = await axios_1.default.post(`${API_BASE}/api/digest/trigger`, payload);
        if (response.data.success) {
            console.log("✅ Digest generation triggered successfully");
            if (options.channel) {
                console.log(`📊 Generated digest for #${options.channel}`);
            }
            else {
                console.log("📊 Generated digests for all watched channels");
            }
        }
    }
    catch (error) {
        console.error("❌ Failed to trigger digest:", error.response?.data?.error || error.message);
        process.exit(1);
    }
});
commander_1.program
    .command("history")
    .description("Get digest history for a channel")
    .requiredOption("-c, --channel <channel>", "channel name")
    .option("-d, --days <days>", "number of days to retrieve", "7")
    .action(async (options) => {
    try {
        const response = await axios_1.default.get(`${API_BASE}/api/digest/${options.channel}?days=${options.days}`);
        if (response.data.success && response.data.digests.length > 0) {
            console.log(`📊 Digest history for #${options.channel} (last ${options.days} days):\n`);
            response.data.digests.forEach((digest, index) => {
                console.log(`${index + 1}. ${digest.date} (${digest.messageCount} messages)`);
                console.log(`   Generated: ${new Date(digest.generatedAt).toLocaleString()}`);
                console.log(`   Participants: ${digest.participants.length}`);
                console.log("");
            });
        }
        else {
            console.log(`📭 No digest history found for #${options.channel}`);
        }
    }
    catch (error) {
        console.error("❌ Failed to get history:", error.response?.data?.error || error.message);
        process.exit(1);
    }
});
commander_1.program
    .command("config")
    .description("Show current configuration")
    .action(async () => {
    try {
        const response = await axios_1.default.get(`${API_BASE}/api/config`);
        console.log("⚙️  Current Configuration:");
        console.log(JSON.stringify(response.data, null, 2));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("❌ Failed to get config:", errorMessage);
        process.exit(1);
    }
});
commander_1.program
    .command("setup")
    .description("Run environment setup and validation")
    .action(async () => {
    try {
        console.log("🔧 Running setup validation...");
        // Dynamic import for setup module
        await Promise.resolve().then(() => __importStar(require("./setup.js")));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("❌ Setup failed:", errorMessage);
        process.exit(1);
    }
});
commander_1.program.parse();
//# sourceMappingURL=cli.js.map