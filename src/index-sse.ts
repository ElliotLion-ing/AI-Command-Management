#!/usr/bin/env node

/**
 * AI Commands Management Tool - MCP Server (SSE Mode)
 * Entry point for SSE transport
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import http from 'http';
import { URL } from 'url';

import { getConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { handleError } from './utils/errors.js';
import { CommandLoader } from './commands/loader.js';
import { ReportFinder } from './reports/finder.js';
import { ReportLinker } from './reports/linker.js';
import { ReportUploader } from './reports/uploader.js';
import { SearchEngine } from './search/index.js';
import { handleSearchCommands } from './tools/search-commands.js';
import { handleGetCommand } from './tools/get-command.js';
import { handleListCommands } from './tools/list-commands.js';
import { handleSearchReports } from './tools/search-reports.js';
import { handleListCommandReports } from './tools/list-command-reports.js';
import { handleReportFeedback } from './tools/report-feedback.js';
import { handleGetReport } from './tools/get-report.js';

/**
 * SSE Server class for remote MCP access
 */
class ACMTSSEServer {
  private httpServer: http.Server;
  private port: number;
  private transports: Map<string, SSEServerTransport> = new Map();

  constructor(port: number = 5090) {
    this.port = port;
    this.httpServer = http.createServer((req, res) => {
      void this.handleRequest(req, res);
    });
  }

  /**
   * Handle HTTP requests
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Health check endpoint
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        service: 'AI Commands Management Tool MCP Server',
        version: '0.0.7'
      }));
      return;
    }

    // SSE endpoint - establish SSE stream (GET)
    if (url.pathname === '/sse' && req.method === 'GET') {
      // To solve body timeout error, add a heartbeat event to the SSE connection
      // Create a timer to send a heartbeat event every 30 seconds
      const heartbeat = setInterval(() => {
        if (!res.finished) {
          res.write(`event: heartbeat\ndata: {}\n\n`);
        }
      }, 30000);

      // Wrap res.end to ensure the timer is cleared when the connection closes
      const originalEnd = res.end.bind(res);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.end = function (this: http.ServerResponse, ...args: any[]) {
        clearInterval(heartbeat);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return originalEnd(...args);
      };

      await this.handleSSEConnection(res);
      return;
    }

    // Messages endpoint - receive client messages (POST)
    if (url.pathname === '/message' && req.method === 'POST') {
      await this.handleMessage(req, res);
      return;
    }

    // 404 for other paths
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  /**
   * Handle SSE connection establishment
   */
  private async handleSSEConnection(
    res: http.ServerResponse
  ): Promise<void> {
    try {
      logger.info('Establishing SSE stream');

      // Create new MCP server instance
      const server = await this.createMCPServer();

      // Create SSE transport with message endpoint
      const transport = new SSEServerTransport('/message', res);
      
      // Store transport by session ID
      const sessionId = transport.sessionId;
      this.transports.set(sessionId, transport);

      // Set up onclose handler
      transport.onclose = () => {
        logger.info(`SSE transport closed for session ${sessionId}`);
        this.transports.delete(sessionId);
      };

      // Connect server to transport
      await server.connect(transport);

      logger.info(`SSE stream established with session ID: ${sessionId}`);

    } catch (error) {
      logger.error('Error establishing SSE stream', error as Error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error establishing SSE stream');
      }
    }
  }

  /**
   * Handle incoming messages from client
   */
  private async handleMessage(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      // Get session ID from query parameter
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        logger.error('No session ID provided in request URL');
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing sessionId parameter');
        return;
      }

      const transport = this.transports.get(sessionId);
      if (!transport) {
        logger.error(`No active transport found for session ID: ${sessionId}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Session not found');
        return;
      }

      // Read request body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>;

      logger.info(`Received message for session ${sessionId}`);

      // Handle the POST message with the transport
      await transport.handlePostMessage(req, res, body);

    } catch (error) {
      logger.error('Error handling message', error as Error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error handling message');
      }
    }
  }

  /**
   * Create and initialize MCP server instance
   */
  private async createMCPServer(): Promise<Server> {
    // Load configuration
    const config = await getConfig();

    // Initialize components
    const commandLoader = new CommandLoader(
      config.commands_directory,
      config.cache_ttl_seconds,
      config.enable_cache
    );
    const reportFinder = new ReportFinder(config.reports_directory);
    const reportLinker = new ReportLinker(
      config.reports_directory,
      config.report_link_base_url
    );
    const reportUploader = new ReportUploader(
      config.reports_directory,
      {
        enableUpload: config.enable_report_upload ?? true,
        maxSizeMB: config.report_upload_max_size_mb ?? 10,
        autoVersioning: config.report_auto_versioning ?? true,
        filePermissions: config.report_file_permissions ?? '644',
        linkBaseUrl: config.report_link_base_url,
      }
    );
    const searchEngine = new SearchEngine(
      config.reports_directory,
      config.cache_ttl_seconds,
      config.enable_cache,
      config.search_timeout_ms
    );

    // Create MCP server
    const server = new Server(
      {
        name: 'ai-command-tool',
        version: '0.0.7',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register tools
    server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: [
          {
            name: 'search_commands',
            description: 'Search for commands using intelligent three-tier search (filename, content, reports)',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                max_results: { type: 'number', description: 'Maximum results to return (default: 10)' },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_command',
            description: 'Get full command definition by name',
            inputSchema: {
              type: 'object',
              properties: {
                command_name: { type: 'string', description: 'Command name (without .md extension)' },
              },
              required: ['command_name'],
            },
          },
          {
            name: 'list_commands',
            description: 'List all available commands with pagination',
            inputSchema: {
              type: 'object',
              properties: {
                page: { type: 'number', description: 'Page number (default: 1)' },
                page_size: { type: 'number', description: 'Items per page (default: 50, max: 100)' },
              },
            },
          },
          {
            name: 'search_reports',
            description: 'Search analysis reports across all or specific commands',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                command_filter: { type: 'string', description: 'Filter by command name (optional)' },
                max_results: { type: 'number', description: 'Maximum results to return (default: 10)' },
              },
              required: ['query'],
            },
          },
          {
            name: 'list_command_reports',
            description: 'List all reports for a specific command',
            inputSchema: {
              type: 'object',
              properties: {
                command_name: { type: 'string', description: 'Command name' },
              },
              required: ['command_name'],
            },
          },
          {
            name: 'get_report',
            description: 'Get full content of a specific report by command name and report name',
            inputSchema: {
              type: 'object',
              properties: {
                command_name: { type: 'string', description: 'Command name that the report belongs to' },
                report_name: { type: 'string', description: 'Report filename (e.g., "analyze_zoom_speech_sdk_log_报告_20251126_141059_v1.md")' },
              },
              required: ['command_name', 'report_name'],
            },
          },
          {
            name: 'report_feedback',
            description: 'Handle report upload/save operations. **TWO USAGE SCENARIOS**: (1) **[AUTO-TRIGGER]** After analysis command generates a report - AI should ask user first before uploading; (2) **[USER REQUEST]** When user explicitly asks to upload/submit a report (e.g., "帮我提交这个报告", "上传报告") - set user_wants_upload=true directly. **WORKFLOW FOR SCENARIO 1**: Analysis completes → AI asks user "是否上传?" → Wait for response → Call with user_wants_upload based on answer. **WORKFLOW FOR SCENARIO 2**: User requests upload → Read report content → Call with user_wants_upload=true.',
            inputSchema: {
              type: 'object',
              properties: {
                command_name: {
                  type: 'string',
                  description: 'Name of the command/category for the report (e.g., "analyze_zoom_speech_sdk_log"). For user-requested uploads, use an appropriate command name based on the report content.',
                },
                report_content: {
                  type: 'string',
                  description: 'Full report content in Markdown format. For user-requested uploads, read the file content first.',
                },
                report_name: {
                  type: 'string',
                  description: 'Optional custom name for the report. If not provided, uses default format: {command}_报告_{timestamp}_v1.md',
                },
                user_wants_upload: {
                  type: 'boolean',
                  description: 'true = upload to server, false = save locally only. For auto-trigger scenario, ask user first. For user-requested uploads, set to true directly.',
                },
              },
              required: ['command_name', 'report_content', 'user_wants_upload'],
            },
          },
        ],
      };
    });

    // Register tool handlers
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.debug('Tool call received', { toolName: name });

      try {
        let result;

        switch (name) {
          case 'search_commands':
            result = await handleSearchCommands(
              args as never,
              searchEngine,
              commandLoader,
              config.max_search_results
            );
            break;

          case 'get_command':
            result = await handleGetCommand(args as never, commandLoader);
            break;

          case 'list_commands':
            result = await handleListCommands(args as never, commandLoader);
            break;

          case 'search_reports':
            result = await handleSearchReports(
              args as never,
              reportFinder,
              reportLinker,
              config.max_search_results
            );
            break;

          case 'list_command_reports':
            result = await handleListCommandReports(
              args as never,
              reportFinder,
              reportLinker
            );
            break;

          case 'get_report':
            result = await handleGetReport(
              args as never,
              reportFinder,
              reportLinker,
              config.reports_directory
            );
            break;

          case 'report_feedback':
            result = await handleReportFeedback(
              args as never,
              reportUploader
            );
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        // Check if result is an error
        if ('error' in result) {
          const mcpError = handleError(result.error as Error);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(mcpError, null, 2),
              },
            ],
            isError: true,
          };
        }

        // Return success result
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Tool call failed', error as Error, { toolName: name });
        const mcpError = handleError(error as Error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mcpError, null, 2),
            },
          ],
          isError: true,
        };
      }
    });

    return server;
  }

  /**
   * Start HTTP server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        logger.info(`AI Commands Management Tool SSE Server started`);
        logger.info(`Port: ${this.port}`);
        logger.info(`SSE endpoint: http://localhost:${this.port}/sse`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }

  /**
   * Stop HTTP server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close all transport connections
      for (const [sessionId, transport] of this.transports.entries()) {
        logger.info(`Closing transport for session: ${sessionId}`);
        transport.close().catch(console.error);
      }
      this.transports.clear();

      // Close HTTP server
      this.httpServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          logger.info('AI Commands Management Tool SSE Server stopped');
          resolve();
        }
      });
    });
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const port = parseInt(process.env.PORT || '5090', 10);
  const server = new ACMTSSEServer(port);

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    void server.stop().then(() => {
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    void server.stop().then(() => {
      process.exit(0);
    });
  });

  await server.start();
}

// Run server
main().catch((error) => {
  console.error('Failed to start AI Commands Management Tool SSE Server:', error);
  process.exit(1);
});
