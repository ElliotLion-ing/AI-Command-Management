/**
 * Command file loader
 * Handles command discovery, metadata extraction, and content loading
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { marked } from 'marked';
import { Command, CommandMetadata, FileSystemError } from '../types';
import { Cache, createCache } from '../cache';
import { validateCommandName, sanitizePath } from '../utils/validators';
import { logger } from '../utils/logger';

/**
 * Command loader class
 */
export class CommandLoader {
  private commandsDir: string;
  private metadataCache: Cache<CommandMetadata>;
  private contentCache: Cache<Command>;
  private cacheEnabled: boolean;

  constructor(commandsDir: string, cacheTTL: number, cacheEnabled: boolean) {
    this.commandsDir = commandsDir;
    this.cacheEnabled = cacheEnabled;
    this.metadataCache = createCache<CommandMetadata>({ ttl: cacheTTL, maxSize: 1000 });
    this.contentCache = createCache<Command>({ ttl: cacheTTL, maxSize: 500 });
  }

  /**
   * List all commands
   */
  async listAll(): Promise<CommandMetadata[]> {
    const cacheKey = 'commands:list';

    // Check cache
    if (this.cacheEnabled) {
      const cached = this.metadataCache.get(cacheKey);
      if (cached) {
        logger.debug('Commands list cache hit');
        return [cached]; // Return as array since cache stores single value
      }
    }

    try {
      const files = await fs.readdir(this.commandsDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const commands: CommandMetadata[] = [];

      for (const file of mdFiles) {
        try {
          const metadata = await this.getMetadata(file.replace('.md', ''));
          commands.push(metadata);
        } catch (error) {
          logger.warn(`Failed to load command metadata: ${file}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info(`Loaded ${commands.length} commands from ${this.commandsDir}`);
      return commands;
    } catch (error) {
      throw new FileSystemError(
        `Failed to list commands: ${error instanceof Error ? error.message : String(error)}`,
        this.commandsDir
      );
    }
  }

  /**
   * Get command by name
   */
  async getCommand(name: string): Promise<Command> {
    // Validate name
    if (!validateCommandName(name)) {
      throw new FileSystemError(`Invalid command name: ${name}`);
    }

    const cacheKey = `command:content:${name}`;

    // Check cache
    if (this.cacheEnabled) {
      const cached = this.contentCache.get(cacheKey);
      if (cached) {
        logger.debug(`Command content cache hit: ${name}`);
        return cached;
      }
    }

    // Load from file
    const filename = name.endsWith('.md') ? name : `${name}.md`;
    const filePath = path.join(this.commandsDir, sanitizePath(filename));

    // Security check: ensure path is within commands directory
    if (!filePath.startsWith(this.commandsDir)) {
      throw new FileSystemError(`Invalid command path: ${filename}`);
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);

      const command: Command = {
        name: name.replace('.md', ''),
        path: filePath,
        content,
        size: stats.size,
        last_modified: stats.mtime,
        description: this.extractDescription(content),
      };

      // Cache the command
      if (this.cacheEnabled) {
        this.contentCache.set(cacheKey, command);
      }

      logger.debug(`Loaded command: ${name}`, { size: stats.size });
      return command;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileSystemError(`Command not found: ${name}`, filePath);
      }
      throw new FileSystemError(
        `Failed to read command: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  /**
   * Get command metadata without loading full content
   */
  async getMetadata(name: string): Promise<CommandMetadata> {
    // Validate name
    if (!validateCommandName(name)) {
      throw new FileSystemError(`Invalid command name: ${name}`);
    }

    const cacheKey = `command:meta:${name}`;

    // Check cache
    if (this.cacheEnabled) {
      const cached = this.metadataCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Load from file
    const filename = name.endsWith('.md') ? name : `${name}.md`;
    const filePath = path.join(this.commandsDir, sanitizePath(filename));

    // Security check
    if (!filePath.startsWith(this.commandsDir)) {
      throw new FileSystemError(`Invalid command path: ${filename}`);
    }

    try {
      const stats = await fs.stat(filePath);

      // Read first 500 bytes for description
      const handle = await fs.open(filePath, 'r');
      const buffer = Buffer.alloc(500);
      const { bytesRead } = await handle.read(buffer, 0, 500, 0);
      await handle.close();

      const preview = buffer.toString('utf-8', 0, bytesRead);

      const metadata: CommandMetadata = {
        name: name.replace('.md', ''),
        path: filePath,
        size: stats.size,
        last_modified: stats.mtime,
        description: this.extractDescription(preview),
      };

      // Cache metadata
      if (this.cacheEnabled) {
        this.metadataCache.set(cacheKey, metadata);
      }

      return metadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileSystemError(`Command not found: ${name}`, filePath);
      }
      throw new FileSystemError(
        `Failed to read command metadata: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  /**
   * Extract description from markdown content
   */
  private extractDescription(content: string): string {
    // Parse markdown
    const tokens = marked.lexer(content);

    // Find first paragraph or description section
    for (const token of tokens) {
      if (token.type === 'heading' && token.depth === 2) {
        // Found a heading, look for next paragraph
        const headingText = typeof token.text === 'string' ? token.text.toLowerCase() : '';
        if (headingText.includes('description') || headingText.includes('purpose')) {
          continue;
        }
      }

      if (token.type === 'paragraph') {
        // Found a paragraph, use it as description
        const tokenText = typeof token.text === 'string' ? token.text : '';
        let desc = tokenText.trim();
        // Limit to 200 chars
        if (desc.length > 200) {
          desc = desc.substring(0, 197) + '...';
        }
        return desc;
      }
    }

    // Fallback: use first 200 characters
    const text = content.replace(/^#.*$/gm, '').trim();
    if (text.length > 200) {
      return text.substring(0, 197) + '...';
    }
    return text || 'No description available';
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.metadataCache.clear();
    this.contentCache.clear();
    logger.debug('Command caches cleared');
  }

  /**
   * Refresh cache (reload all command metadata)
   */
  async refreshCache(): Promise<void> {
    this.clearCache();
    await this.listAll();
    logger.info('Command cache refreshed');
  }
}

