/**
 * Tier 3: Report Search
 * Find commands based on historical report content
 */

import { ReportMatch, SearchResult, CommandMetadata } from '../types';
import { ReportFinder } from '../reports/finder';
import { logger } from '../utils/logger';

/**
 * Report searcher class
 */
export class ReportSearcher {
  private reportFinder: ReportFinder;

  constructor(reportsDir: string) {
    this.reportFinder = new ReportFinder(reportsDir);
  }

  /**
   * Search commands based on report content
   */
  async search(query: string, commands: CommandMetadata[]): Promise<SearchResult[]> {
    try {
      // Search all reports
      const reportMatches = await this.reportFinder.search(query);

      if (reportMatches.length === 0) {
        logger.debug('Tier 3 (Reports): No matching reports found');
        return [];
      }

      // Group reports by command name
      const commandScores = new Map<string, { score: number; latestDate: Date | null; reports: number }>();

      for (const report of reportMatches) {
        const existing = commandScores.get(report.command_name);
        
        if (existing) {
          // Update score and report count
          existing.score += this.calculateReportScore(report);
          existing.reports += 1;
          
          // Update latest date
          if (report.date && (!existing.latestDate || report.date > existing.latestDate)) {
            existing.latestDate = report.date;
          }
        } else {
          commandScores.set(report.command_name, {
            score: this.calculateReportScore(report),
            latestDate: report.date,
            reports: 1,
          });
        }
      }

      // Convert to SearchResult
      const results: SearchResult[] = [];

      for (const command of commands) {
        const commandScore = commandScores.get(command.name);
        
        if (commandScore) {
          // Cap score at 100
          const relevanceScore = Math.min(100, commandScore.score);
          
          results.push({
            command,
            relevance_score: relevanceScore,
            match_tier: 3,
            match_reason: this.buildMatchReason(commandScore.reports, commandScore.latestDate),
          });
        }
      }

      // Sort by score descending
      results.sort((a, b) => b.relevance_score - a.relevance_score);

      logger.info(`Tier 3 (Reports) search completed: ${results.length} results`, {
        query,
        totalReports: reportMatches.length,
        commands: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Tier 3 (Reports) search failed', error as Error);
      return [];
    }
  }

  /**
   * Calculate score for a single report match
   */
  private calculateReportScore(report: ReportMatch): number {
    // Base score from match count
    let score = report.match_count * 10;

    // Recency bonus
    if (report.date) {
      const now = Date.now();
      const reportTime = report.date.getTime();
      const ageInDays = (now - reportTime) / (1000 * 60 * 60 * 24);

      if (ageInDays <= 30) {
        score += 20; // Recent report (within 30 days)
      } else if (ageInDays <= 90) {
        score += 10; // Moderately recent (within 90 days)
      }
      // Older reports get no bonus
    }

    return score;
  }

  /**
   * Build match reason
   */
  private buildMatchReason(reportCount: number, latestDate: Date | null): string {
    let reason = `Found in ${reportCount} analysis report${reportCount > 1 ? 's' : ''}`;

    if (latestDate) {
      const daysAgo = Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysAgo === 0) {
        reason += ' (today)';
      } else if (daysAgo === 1) {
        reason += ' (yesterday)';
      } else if (daysAgo < 30) {
        reason += ` (${daysAgo} days ago)`;
      } else if (daysAgo < 365) {
        const monthsAgo = Math.floor(daysAgo / 30);
        reason += ` (${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago)`;
      } else {
        const yearsAgo = Math.floor(daysAgo / 365);
        reason += ` (${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago)`;
      }
    }

    return reason;
  }
}

