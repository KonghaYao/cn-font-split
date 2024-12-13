import { api_interface } from '../gen/index'
export type FontSplitProps = Parameters<
    (typeof api_interface.InputTemplate)["fromObject"]
>[0];