import { isBrowserRuntime } from './runtime';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

export const vscode: { postMessage(msg: unknown): void } = isBrowserRuntime
  ? { postMessage: (msg: unknown) => {
        console.log('[vscode.postMessage]', msg);
        if (msg && (msg as any).type === 'openClaude') {
           fetch('http://localhost:3000/api/spawn-agent', { method: 'POST' });
        }
      }
    }
  : (acquireVsCodeApi() as { postMessage(msg: unknown): void });
