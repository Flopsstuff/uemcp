import { cleanObject } from '../../utils/safe-json.js';
import type { ITools } from '../../types/tool-interfaces.js';
import type { PipelineArgs } from '../../types/handler-types.js';
import { handleRunUbt } from './pipeline-ubt-runner.js';

export async function handlePipelineTools(action: string, args: PipelineArgs, tools: ITools) {
  switch (action) {
    case 'run_ubt':
      return await handleRunUbt(args, tools);

    default:
      return cleanObject({ success: false, error: 'UNKNOWN_ACTION', message: `Unknown system_control pipeline action: ${action}` });
  }
}
