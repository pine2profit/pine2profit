import { Subject } from 'functools-kit';
import { inject } from '../../core/di';
import { TYPES } from '../../core/types';
import LoggerService from './LoggerService';
import type { ChartRef, Theme } from '../../types';

/** The one channel between the agent's text and the chart: a reference goes in, the chart frames it. */
export class ChartService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public readonly gotoSubject = new Subject<ChartRef>();
  public readonly resetSubject = new Subject<void>();
  public readonly themeSubject = new Subject<Theme>();

  public goto = (ref: ChartRef) => {
    this.loggerService.log('chartService goto', { ref });
    void this.gotoSubject.next(ref);
  };

  public reset = () => {
    this.loggerService.log('chartService reset');
    void this.resetSubject.next();
  };

  public setTheme = (theme: Theme) => {
    this.loggerService.log('chartService setTheme', { theme });
    void this.themeSubject.next(theme);
  };
}

export default ChartService;
