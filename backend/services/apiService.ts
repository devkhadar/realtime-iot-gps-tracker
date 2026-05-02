import { requestTypes } from '../utils/constant';
import httpClient from '../utils/httpClient';

export const fetchExternalData = async (endpoint: string, requestType: string, data?: any): Promise<any> => {
  try {
    let response;
    if (requestType === requestTypes.GET) {
      response = await httpClient.get(endpoint, { params: data });
    } else if (requestType === requestTypes.POST) {
      response = await httpClient.post(endpoint, data);
    } else {
      throw new Error(`Unsupported request type: ${requestType}`);
    }
    return response.data;
  } catch (error: any) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};
