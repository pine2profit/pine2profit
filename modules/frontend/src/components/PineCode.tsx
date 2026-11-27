'use client';

import { useEffect, useRef } from 'react';
import ioc from '@/lib';
import type { Theme } from '@/lib/types';
import { currentTheme } from './ThemeToggle';

const aceTheme = (t: Theme) => (t === 'dark' ? 'ace/theme/tomorrow_night' : 'ace/theme/github');

/** Read-only Ace editor with a Pine Script highlighter. Ace is bundled from node_modules (no CDN). */
export default function PineCode({ files }: { files: { name: string; code: string }[] }) {
  const host = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;
    let unTheme: (() => void) | null = null;
    (async () => {
      // ace.js must run first: the theme files call the global `ace.define`.
      const { default: ace } = await import('ace-builds/src-noconflict/ace');
      await import('ace-builds/src-noconflict/theme-github');
      await import('ace-builds/src-noconflict/theme-tomorrow_night');
      if (disposed || !host.current) return;
      const oop = ace.require('ace/lib/oop');
      const TextMode = ace.require('ace/mode/text').Mode;
      const TextHighlightRules = ace.require('ace/mode/text_highlight_rules').TextHighlightRules;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PineHighlightRules = function (this: any) {
        this.$rules = {
          start: [
            { token: 'comment', regex: '//.*$' },
            { token: 'string', regex: '"(?:[^"\\\\]|\\\\.)*"' },
            { token: 'string', regex: "'(?:[^'\\\\]|\\\\.)*'" },
            { token: 'constant.numeric', regex: '\\b\\d+(?:\\.\\d+)?\\b' },
            { token: 'constant.language', regex: '\\b(?:true|false|na)\\b' },
            { token: 'keyword', regex: '\\b(?:if|else|for|to|by|while|var|varip|import|export|method|type|switch|and|or|not|return|series|simple|const|input|int|float|bool|string|color)\\b' },
            { token: 'support.function', regex: '\\b(?:indicator|strategy|library|plot|plotshape|plotchar|plotarrow|plotcandle|plotbar|bgcolor|barcolor|hline|fill|alertcondition|alert|nz|fixnan|max_bars_back)\\b' },
            { token: 'support.class', regex: '\\b(?:ta|math|strategy|input|color|request|array|matrix|map|str|time|timeframe|syminfo|barstate|label|line|box|table|linefill|polyline|chart|runtime|ticker|session|dayofweek|plot|shape|location|size|format|scale|display|font|order|text|xloc|yloc|extend|position|currency|adjustment|backadjustment|settlement_as_close|splits|dividends|earnings|barmerge)(?=\\.)' },
            { token: 'variable.language', regex: '\\b(?:open|high|low|close|volume|hl2|hlc3|ohlc4|hlcc4|bar_index|last_bar_index|time|time_close|timenow|year|month|dayofmonth|hour|minute|second)\\b' },
            { token: 'keyword.operator', regex: ':=|==|!=|<=|>=|=>|[-+*/%<>=?:]' },
            { token: 'meta.annotation', regex: '^//@\\w+.*$' },
          ],
        };
      };
      oop.inherits(PineHighlightRules, TextHighlightRules);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PineMode: any = function (this: any) { this.HighlightRules = PineHighlightRules; };
      oop.inherits(PineMode, TextMode);
      PineMode.prototype.$id = 'ace/mode/pine';
      PineMode.prototype.lineCommentStart = '//';

      const editor = ace.edit(host.current, {
        readOnly: true, highlightActiveLine: false, showPrintMargin: false, fontSize: 12.5, tabSize: 4, useWorker: false, wrap: false,
      });
      editor.setTheme(aceTheme(currentTheme()));
      editor.session.setMode(new PineMode());
      editor.session.setValue(files[0]?.code ?? '');
      editor.renderer.setScrollMargin(8, 8, 0, 0);
      editorRef.current = editor;
      unTheme = ioc.chartService.themeSubject.subscribe((t: Theme) => editor.setTheme(aceTheme(t)));
    })();
    return () => {
      disposed = true;
      unTheme?.();
      try { editorRef.current?.destroy(); } catch { /* ignore */ }
    };
  }, [files]);

  return <div ref={host} className="ace-host" />;
}
