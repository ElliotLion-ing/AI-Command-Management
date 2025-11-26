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
import { CommandLoader } from './commands/loader.js';
import { ReportFinder } from './reports/finder.js';
import { ReportLinker } from './reports/linker.js';
import { SearchEngine } from './search/index.js';
import { handleSearchCommands } from './tools/search-commands.js';
import { handleGetCommand } from './tools/get-command.js';
import { handleListCommands } from './tools/list-commands.js';
import { handleSearchReports } from './tools/search-reports.js';
import { handleListCommandReports } from './tools/list-command-reports.js';

/**
 * SSE Server class for remote MCP access
 */
class ACMTSSEServer {
  private httpServer: http.Server;
  private port: number;
  private mcpServers: Map<string, Server> = new Map();

  constructor(port: number = 5090) {
    this.port = port;
    this.httpServer = http.createServer(this.handleRequest.bind(this));
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
        version: '0.0.3'
      }));
      return;
    }

    // SSE endpoint
    if (url.pathname === '/sse' && req.method === 'GET') {
      await this.handleSSE(res);
      return;
    }

    // 404 for other paths
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  /**
   * Handle SSE connections
   */
  private async handleSSE(
    res: http.ServerResponse
  ): Promise<void> {
    try {
      logger.info('New SSE connection established');

      // Create new MCP server instance for this connection
      const server = await this.createMCPServer();
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      this.mcpServers.set(clientId, server);

      // Create SSE transport
      const transport = new SSEServerTransport('/message', res);
      await server.connect(transport);

      logger.info(`MCP Server connected for client: ${clientId}`);

      // Cleanup on connection close
      res.on('close', () => {
        logger.info(`SSE connection closed for client: ${clientId}`);
        this.mcpServers.delete(clientId);
        server.close().catch(console.error);
      });
    } catch (error) {
      logger.error('Error handling SSE connection', error as Error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
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
        version: '0.0.3',
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
        ],
      };
    });

    // Register tool handlers
    server.setRequestHandler(CallToolRequestSchema, (async (request) => {
      const { name, arguments: args } = request.params;
      
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

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: `Unknown tool: ${name}`,
                },
              ],
              isError: true,
            };
        }

        return result;
      } catch (error) {
        logger.error('Tool execution error', error as Error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }) as any);

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
      // Close all MCP server connections
      for (const [clientId, server] of this.mcpServers.entries()) {
        logger.info(`Closing MCP server for client: ${clientId}`);
        server.close().catch(console.error);
      }
      this.mcpServers.clear();

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
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down...');
    await server.stop();
    process.exit(0);
  });

  await server.start();
}

// Run server
main().catch((error) => {
  console.error('Failed to start AI Commands Management Tool SSE Server:', error);
  process.exit(1);
});
