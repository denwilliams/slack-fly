#!/usr/bin/env node
/**
 * Setup script for Meeting Whisperer
 * Run this script to validate your environment and test connections
 */
import "dotenv/config";
declare function validateSlackConnection(): Promise<boolean>;
declare function validateOpenAI(): Promise<boolean>;
declare function validateRedis(): Promise<boolean>;
export { validateSlackConnection, validateOpenAI, validateRedis };
//# sourceMappingURL=setup.d.ts.map