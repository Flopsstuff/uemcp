import { cleanObject } from '../../utils/safe-json.js';
import type { ITools } from '../../types/tool-interfaces.js';
import type { HandlerArgs } from '../../types/handler-types.js';
import { executeAutomationRequest } from './common-handlers.js';

export async function handleConsoleCommand(args: HandlerArgs, tools: ITools): Promise<Record<string, unknown>> {
  const rawCommand = typeof args?.command === 'string' ? args.command : '';
  const trimmed = rawCommand.trim();

  if (!trimmed) {
    return cleanObject({
      success: false,
      error: 'EMPTY_COMMAND',
      message: 'Console command is empty',
      command: rawCommand
    });
  }

  const response = await executeAutomationRequest(
    tools,
    'console_command',
    { ...args, command: trimmed },
    'Automation bridge not available for console command operations'
  );
  return cleanObject(response) as Record<string, unknown>;
}
