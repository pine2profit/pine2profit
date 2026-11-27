// ace-builds ships its own ace.d.ts for the package root; the src-noconflict entry points are untyped.
declare module 'ace-builds/src-noconflict/ace' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ace: any;
  export default ace;
}
declare module 'ace-builds/src-noconflict/theme-github';
declare module 'ace-builds/src-noconflict/theme-tomorrow_night';
