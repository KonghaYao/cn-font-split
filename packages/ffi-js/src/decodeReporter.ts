import { api_interface } from './gen';

export const decodeReporter = (reporterBin: Uint8Array) => {
    return api_interface.OutputReport.deserialize(reporterBin);
};
