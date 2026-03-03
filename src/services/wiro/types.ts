export type WiroModel = 'google/nano-banana-2' | 'google/nano-banana-pro';

export type AspectRatio =
  | '' // Match Input Image
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9';

export type Resolution = '1K' | '2K' | '4K';

export type SafetySetting =
  | 'BLOCK_LOW_AND_ABOVE'
  | 'BLOCK_MEDIUM_AND_ABOVE'
  | 'BLOCK_ONLY_HIGH'
  | 'BLOCK_NONE'
  | 'OFF';

export interface WiroRunRequest {
  inputImage?: File | string;
  prompt: string;
  aspectRatio?: AspectRatio;
  resolution?: Resolution;
  safetySetting?: SafetySetting;
  callbackUrl?: string;
}

export interface WiroRunResponse {
  errors: string[];
  taskid: string;
  socketaccesstoken: string;
  result: boolean;
}

export type WiroTaskStatus =
  | 'task_queue'
  | 'task_accept'
  | 'task_assign'
  | 'task_preprocess_start'
  | 'task_preprocess_end'
  | 'task_start'
  | 'task_output'
  | 'task_postprocess_end'
  | 'task_cancel';

export interface WiroTaskOutput {
  id: string;
  name: string;
  contenttype: string;
  parentid: string;
  uuid: string;
  size: string;
  addedtime: string;
  modifiedtime: string;
  accesskey: string;
  url: string;
}

export interface WiroTask {
  id: string;
  uuid: string;
  socketaccesstoken: string;
  parameters: Record<string, any>;
  debugoutput: string;
  debugerror: string;
  starttime: string;
  endtime: string;
  elapsedseconds: string;
  status: WiroTaskStatus;
  createtime: string;
  canceltime: string;
  assigntime: string;
  accepttime: string;
  preprocessstarttime: string;
  preprocessendtime: string;
  postprocessstarttime: string;
  postprocessendtime: string;
  outputs?: WiroTaskOutput[];
  size: string;
}

export interface WiroDetailResponse {
  total: string;
  errors: string[];
  tasklist: WiroTask[];
  result: boolean;
}
