import { inject } from '../../core/di';
import { TYPES } from '../../core/types';
import LoggerService from './LoggerService';
import ChartService from './ChartService';
import type { ChartRef } from '../../types';

/**
 * Every link inside the agent's text ends up here. A chart reference (`<a class="ref" data-ref="…">`,
 * written as [[t:…]], [[range:…]], [[trade:N]] or [text](ref:…) in markdown) goes to the chart;
 * an ordinary link opens in a new tab. Returns true when the click was consumed.
 */
export class LinkService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  private readonly chartService = inject<ChartService>(TYPES.chartService);

  public openLink = (href: string, dataRef?: string | null): boolean => {
    this.loggerService.log('linkService openLink', { href, dataRef });
    if (dataRef) {
      try {
        const ref = JSON.parse(dataRef) as ChartRef;
        this.chartService.goto(ref);
        return true;
      } catch {
        return false;
      }
    }
    if (!href || href.startsWith('#')) {
      return false;
    }
    if (typeof window !== 'undefined') {
      window.open(href, '_blank', 'noreferrer');
    }
    return true;
  };
}

export default LinkService;
