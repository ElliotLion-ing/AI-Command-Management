#!/usr/bin/env node

/**
 * AI Command Tool Management - MCP Server
 * Main entry point
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getConfig } from './config';
import { logger } from './utils/logger';
import { handleError } from './utils/errors';
import { CommandLoader } from './commands/loader';
import { ReportFinder } from './reports/finder';
import { ReportLinker } from './reports/linker';
import { SearchEngine } from './search';
import { handleSearchCommands } from './tools/search-commands';
import { handleGetCommand } from './tools/get-command';
import { handleListCommands } from './tools/list-commands';
import { handleSearchReports } from './tools/search-reports';
import { handleListCommandReports } from './tools/list-command-reports';

/**
 * Main server class
 */
class ACMTServer {
  private server: Server;
  private commandLoader!: CommandLoader;
  private reportFinder!: ReportFinder;
  private reportLinker!: ReportLinker;
  private searchEngine!: SearchEngine;
  private config!: Awaited<ReturnType<typeof getConfig>>;

  constructor() {
    this.server = new Server(
      {
        name: 'ai-command-tool-management',
        version: '0.0.1',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandlers();
  }

  /**
   * Initialize server
   */
  async initialize(): Promise<void> {
    try {
      // Load configuration
      this.config = await getConfig();

      // Set log level
      logger.setLevel(this.config.log_level);

      logger.info('ACMT Server initializing...', {
        version: '0.0.1',
        commandsDir: this.config.commands_directory,
        reportsDir: this.config.reports_directory,
      });

      // Initialize modules
      this.commandLoader = new CommandLoader(
        this.config.commands_directory,
        this.config.cache_ttl_seconds,
        this.config.enable_cache
      );

      this.reportFinder = new ReportFinder(this.config.reports_directory);

      this.reportLinker = new ReportLinker(
        this.config.reports_directory,
        this.config.report_link_base_url
      );

      this.searchEngine = new SearchEngine(
        this.config.reports_directory,
        this.config.cache_ttl_seconds,
        this.config.enable_cache,
        this.config.search_timeout_ms
      );

      logger.info('ACMT Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ACMT Server', error as Error);
      throw error;
    }
  }

  /**
   * Setup request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: [
          {
            name: 'search_commands',
            description: 'Search for commands using intelligent three-tier search (filename, content, reports)',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (keywords or description)',
                },
                max_results: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 10, max: 100)',
                },
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
                command_name: {
                  type: 'string',
                  description: 'Name of the command (with or without .md extension)',
                },
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
                page: {
                  type: 'number',
                  description: 'Page number (default: 1)',
                },
                page_size: {
                  type: 'number',
                  description: 'Number of items per page (default: 50, max: 100)',
                },
              },
            },
          },
          {
            name: 'search_reports',
            description: 'Search analysis reports across all commands or filtered by command',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (keywords to find in reports)',
                },
                command_filter: {
                  type: 'string',
                  description: 'Optional: filter to reports from specific command',
                },
                max_results: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 10, max: 100)',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'list_command_reports',
            description: 'List all analysis reports for a specific command',
            inputSchema: {
              type: 'object',
              properties: {
                command_name: {
                  type: 'string',
                  description: 'Name of the command to list reports for',
                },
              },
              required: ['command_name'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.debug('Tool call received', { toolName: name });

      try {
        let result;

        switch (name) {
          case 'search_commands':
            result = await handleSearchCommands(
              args as never,
              this.searchEngine,
              this.commandLoader,
              this.config.max_search_results
            );
            break;

          case 'get_command':
            result = await handleGetCommand(args as never, this.commandLoader);
            break;

          case 'list_commands':
            result = await handleListCommands(args as never, this.commandLoader);
            break;

          case 'search_reports':
            result = await handleSearchReports(
              args as never,
              this.reportFinder,
              this.reportLinker,
              this.config.max_search_results
            );
            break;

          case 'list_command_reports':
            result = await handleListCommandReports(
              args as never,
              this.reportFinder,
              this.reportLinker
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
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    this.server.onerror = (error) => {
      logger.error('MCP Server error', error);
    };

    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      void this.shutdown().then(() => {
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      void this.shutdown().then(() => {
        process.exit(0);
      });
    });
  }

  /**
   * Start server
   */
  async start(): Promise<void> {
    await this.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('ACMT Server started and listening on stdio');
  }

  /**
   * Shutdown server
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down ACMT Server...');
    await this.server.close();
    logger.info('ACMT Server shut down successfully');
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const server = new ACMTServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start ACMT Server:', error);
    process.exit(1);
  }
}

// Run server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

